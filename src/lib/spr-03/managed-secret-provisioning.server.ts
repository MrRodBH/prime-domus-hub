import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const CLOUDFLARE_ACCOUNT_ID = "68ec853e6b04a038f09fca5712d6b26b";
const TARGET_WORKER = "rm-prime-wri01-hml";
const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const SOURCE_MAIN_MODULE = "index.mjs";
const FINAL_SECRET_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDFLARE_API_TOKEN_DCA01_HML",
] as const;

const VERSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CEREMONY_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/;

export type Spr03Phase = "canary" | "final";

export interface Spr03ProvisionRequest {
  ceremony_id: string;
  expected_worker_id: string;
  expected_bootstrap_version_id: string;
  phase: Spr03Phase;
}

export interface Spr03ProvisionResult {
  ok: true;
  phase: Spr03Phase;
  ceremonyId: string;
  workerId: string;
  bootstrapVersionId: string;
  createdVersionId: string;
  sourceFingerprint: string;
  reconciledExistingVersion: boolean;
  activeDeploymentUnchanged: true;
  deployed: false;
  secretBindingNames: string[];
}

export class Spr03ProvisioningError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "Spr03ProvisioningError";
  }
}

interface CloudflareEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
}

interface SourcePart {
  field: string;
  filename: string;
  blob: Blob;
}

interface WorkerSourceSnapshot {
  mainModule: string;
  compatibilityDate: string;
  compatibilityFlags: string[];
  parts: SourcePart[];
  nonSecretBindings: Array<Record<string, any>>;
  fingerprint: string;
}

function safeProviderError(status: number, payload: unknown): Spr03ProvisioningError {
  const envelope = payload as CloudflareEnvelope<unknown> | null;
  const code = envelope?.errors?.[0]?.code;
  return new Spr03ProvisioningError(
    "spr03_cloudflare_request_failed",
    `Cloudflare request failed closed (${status}${code ? `/${code}` : ""})`,
    502,
  );
}

async function parseCloudflareJson<T>(response: Response): Promise<T> {
  let payload: CloudflareEnvelope<T>;
  try {
    payload = (await response.json()) as CloudflareEnvelope<T>;
  } catch {
    throw new Spr03ProvisioningError("spr03_cloudflare_invalid_response", "Cloudflare returned a non-JSON control response", 502);
  }
  if (!response.ok || payload.success !== true) throw safeProviderError(response.status, payload);
  return payload.result;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Spr03ProvisioningError("spr03_missing_server_dependency", `Missing required server dependency: ${name}`, 503);
  return value;
}

function providerHeaders(provisioner: string): HeadersInit {
  return { Authorization: `Bearer ${provisioner}` };
}

async function cloudflareGet<T>(path: string, provisioner: string): Promise<T> {
  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    method: "GET",
    headers: providerHeaders(provisioner),
    cache: "no-store",
  });
  return parseCloudflareJson<T>(response);
}

async function authenticateGlobalSuperAdmin(request: Request): Promise<string> {
  if (request.headers.has("x-tenant-id")) {
    throw new Spr03ProvisioningError("spr03_tenant_header_prohibited", "x-tenant-id is prohibited for this global infrastructure ceremony", 400);
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new Spr03ProvisioningError("spr03_unauthorized", "Bearer authentication is required", 401);
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new Spr03ProvisioningError("spr03_unauthorized", "Bearer authentication is required", 401);

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const publishableKey = requireEnv("SUPABASE_PUBLISHABLE_KEY");
  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string" || !userId) {
    throw new Spr03ProvisioningError("spr03_unauthorized", "Invalid authenticated subject", 401);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles, error: roleError } = await (supabaseAdmin as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin");
  if (roleError || !roles || roles.length !== 1) {
    throw new Spr03ProvisioningError("spr03_forbidden", "Exact global super_admin authority is required", 403);
  }
  return userId;
}

export function parseSpr03ProvisionRequest(input: unknown): Spr03ProvisionRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Spr03ProvisioningError("spr03_invalid_request", "Request body must be an object");
  }
  const record = input as Record<string, unknown>;
  const allowed = new Set(["ceremony_id", "expected_worker_id", "expected_bootstrap_version_id", "phase"]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key) || /(tenant|secret|token|authorization|role|user|key)/i.test(key)) {
      throw new Spr03ProvisioningError("spr03_unknown_or_sensitive_field", `Field is not allowed: ${key}`);
    }
  }

  const ceremonyId = record.ceremony_id;
  const workerId = record.expected_worker_id;
  const bootstrapVersionId = record.expected_bootstrap_version_id;
  const phase = record.phase;
  if (typeof ceremonyId !== "string" || !CEREMONY_ID_RE.test(ceremonyId)) {
    throw new Spr03ProvisioningError("spr03_invalid_ceremony_id", "ceremony_id is invalid");
  }
  if (workerId !== TARGET_WORKER) {
    throw new Spr03ProvisioningError("spr03_worker_mismatch", "Worker identity does not match server authority");
  }
  if (typeof bootstrapVersionId !== "string" || !VERSION_ID_RE.test(bootstrapVersionId)) {
    throw new Spr03ProvisioningError("spr03_invalid_bootstrap_version", "Bootstrap version identifier is invalid");
  }
  if (phase !== "canary" && phase !== "final") {
    throw new Spr03ProvisioningError("spr03_invalid_phase", "phase must be canary or final");
  }
  return {
    ceremony_id: ceremonyId,
    expected_worker_id: TARGET_WORKER,
    expected_bootstrap_version_id: bootstrapVersionId,
    phase,
  };
}

function deploymentVersions(result: any): Array<{ version_id: string; percentage: number }> {
  const deployments = Array.isArray(result?.deployments) ? result.deployments : Array.isArray(result) ? result : [];
  if (deployments.length === 0) {
    throw new Spr03ProvisioningError("spr03_deployment_cardinality", "At least one deployment record must exist", 409);
  }
  // Cloudflare returns deployment history newest-first; only the first item is the deployment actively serving traffic.
  const latestDeployment = deployments[0];
  const versions = Array.isArray(latestDeployment?.versions) ? latestDeployment.versions : [];
  if (versions.length !== 1 || versions[0]?.percentage !== 100 || typeof versions[0]?.version_id !== "string") {
    throw new Spr03ProvisioningError("spr03_deployment_shape", "Active deployment must reference exactly one version at 100%", 409);
  }
  return versions;
}

async function assertBootstrapProviderState(provisioner: string, expectedBootstrapVersionId: string): Promise<void> {
  const deployments = await cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${TARGET_WORKER}/deployments`,
    provisioner,
  );
  const versions = deploymentVersions(deployments);
  if (versions[0].version_id !== expectedBootstrapVersionId) {
    throw new Spr03ProvisioningError("spr03_bootstrap_version_drift", "Active deployment does not match the pinned bootstrap version", 409);
  }

  const subdomain = await cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${TARGET_WORKER}/subdomain`,
    provisioner,
  );
  if (subdomain?.enabled !== false || subdomain?.previews_enabled !== false) {
    throw new Spr03ProvisioningError("spr03_ingress_not_zero", "workers.dev and Preview URLs must both be disabled", 409);
  }

  const schedules = await cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${TARGET_WORKER}/schedules`,
    provisioner,
  );
  const scheduleList = Array.isArray(schedules?.schedules) ? schedules.schedules : Array.isArray(schedules) ? schedules : [];
  if (scheduleList.length !== 0) {
    throw new Spr03ProvisioningError("spr03_cron_not_zero", "Cron trigger count must remain zero", 409);
  }
}

function bindingName(binding: Record<string, any>): string {
  return typeof binding?.name === "string" ? binding.name : "";
}

function secretBindingNames(detail: any): string[] {
  const bindings = Array.isArray(detail?.resources?.bindings) ? detail.resources.bindings : [];
  return bindings
    .filter((binding: any) => binding?.type === "secret_text" || binding?.type === "secret_key")
    .map((binding: any) => bindingName(binding))
    .filter(Boolean)
    .sort();
}

function readVersionTag(detail: any): string | null {
  const candidates = [
    detail?.annotations?.["workers/tag"],
    detail?.metadata?.annotations?.["workers/tag"],
    detail?.resources?.script?.annotations?.["workers/tag"],
  ];
  return candidates.find((value) => typeof value === "string") ?? null;
}

async function listVersions(provisioner: string): Promise<any[]> {
  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${TARGET_WORKER}/versions?per_page=100`,
    { method: "GET", headers: providerHeaders(provisioner), cache: "no-store" },
  );
  const result = await parseCloudflareJson<any>(response);
  return Array.isArray(result) ? result : [];
}

async function versionDetail(versionId: string, provisioner: string): Promise<any> {
  return cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${TARGET_WORKER}/versions/${versionId}`,
    provisioner,
  );
}

async function findTaggedVersion(tag: string, provisioner: string): Promise<{ id: string; detail: any } | null> {
  const versions = await listVersions(provisioner);
  for (const candidate of versions.slice(0, 20)) {
    if (typeof candidate?.id !== "string") continue;
    if (readVersionTag(candidate) === tag) return { id: candidate.id, detail: candidate };
    const detail = await versionDetail(candidate.id, provisioner);
    if (readVersionTag(detail) === tag) return { id: candidate.id, detail };
  }
  return null;
}

async function readWorkerSource(provisioner: string, expectedBootstrapVersionId: string): Promise<WorkerSourceSnapshot> {
  const bootstrapDetail = await versionDetail(expectedBootstrapVersionId, provisioner);
  const runtime = bootstrapDetail?.resources?.script_runtime;
  const compatibilityDate = runtime?.compatibility_date;
  const compatibilityFlags = runtime?.compatibility_flags;
  if (typeof compatibilityDate !== "string" || !compatibilityDate) {
    throw new Spr03ProvisioningError("spr03_compatibility_date_missing", "Bootstrap compatibility_date is missing", 502);
  }
  if (!Array.isArray(compatibilityFlags) || compatibilityFlags.some((flag: unknown) => typeof flag !== "string")) {
    throw new Spr03ProvisioningError("spr03_compatibility_flags_invalid", "Bootstrap compatibility_flags are invalid", 502);
  }

  const sourceBindings = Array.isArray(bootstrapDetail?.resources?.bindings) ? bootstrapDetail.resources.bindings : [];
  if (sourceBindings.some((binding: any) => binding?.type === "secret_text" || binding?.type === "secret_key")) {
    throw new Spr03ProvisioningError("spr03_bootstrap_secret_detected", "Bootstrap Version unexpectedly contains a secret binding", 409);
  }
  if (sourceBindings.length !== 1 || bindingName(sourceBindings[0]) !== "ASSETS" || sourceBindings[0]?.type !== "assets") {
    throw new Spr03ProvisioningError("spr03_bootstrap_binding_mismatch", "Bootstrap Version must expose exactly the ASSETS/assets binding", 409);
  }
  const nonSecretBindings = sourceBindings.map((binding: any) => ({ ...binding }));

  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${TARGET_WORKER}/content/v2`,
    { method: "GET", headers: providerHeaders(provisioner), cache: "no-store" },
  );
  if (!response.ok) throw safeProviderError(response.status, null);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Spr03ProvisioningError("spr03_source_format_unexpected", "Worker source must be returned as multipart form data", 502);
  }
  const form = await response.formData();
  const parts: SourcePart[] = [];
  for (const [field, value] of form.entries()) {
    if (typeof value === "string") {
      throw new Spr03ProvisioningError("spr03_source_part_shape", "Worker source multipart must contain module File parts only", 502);
    }
    const filename = typeof (value as any).name === "string" && (value as any).name ? (value as any).name : field;
    parts.push({ field, filename, blob: value });
  }
  if (parts.length === 0) throw new Spr03ProvisioningError("spr03_source_parts_missing", "Worker source contains no module parts", 502);

  const mainModuleMatches = parts.filter((part) => part.field === SOURCE_MAIN_MODULE && part.filename === SOURCE_MAIN_MODULE);
  if (mainModuleMatches.length !== 1) {
    throw new Spr03ProvisioningError("spr03_main_module_cardinality", "Worker source must contain exactly one root index.mjs main module", 502);
  }

  const hash = createHash("sha256");
  hash.update(SOURCE_MAIN_MODULE);
  hash.update(compatibilityDate);
  hash.update(JSON.stringify(compatibilityFlags));
  hash.update(JSON.stringify(nonSecretBindings.map((binding) => ({ name: bindingName(binding), type: binding.type ?? null })).sort((a, b) => a.name.localeCompare(b.name))));
  const sorted = [...parts].sort((a, b) => `${a.field}:${a.filename}`.localeCompare(`${b.field}:${b.filename}`));
  for (const part of sorted) {
    hash.update(part.field);
    hash.update(part.filename);
    hash.update(new Uint8Array(await part.blob.arrayBuffer()));
  }

  return {
    mainModule: SOURCE_MAIN_MODULE,
    compatibilityDate,
    compatibilityFlags: [...compatibilityFlags],
    parts,
    nonSecretBindings,
    fingerprint: hash.digest("hex"),
  };
}

function cloneMetadata(source: WorkerSourceSnapshot, tag: string, secrets: Array<{ name: string; text: string }>): Record<string, any> {
  return {
    main_module: source.mainModule,
    compatibility_date: source.compatibilityDate,
    compatibility_flags: source.compatibilityFlags,
    keep_assets: true,
    bindings: [
      ...source.nonSecretBindings,
      ...secrets.map(({ name, text }) => ({ type: "secret_text", name, text })),
    ],
    annotations: {
      "workers/tag": tag,
      "workers/message": tag.startsWith("spr03-canary-")
        ? "SPR-03 synthetic inactive canary"
        : "SPR-03 final inactive managed-secret version",
    },
  };
}

async function uploadInactiveVersion(
  source: WorkerSourceSnapshot,
  tag: string,
  provisioner: string,
  secrets: Array<{ name: string; text: string }>,
): Promise<string> {
  const form = new FormData();
  form.set("metadata", JSON.stringify(cloneMetadata(source, tag, secrets)));
  for (const part of source.parts) form.append(part.field, part.blob, part.filename);

  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${TARGET_WORKER}/versions`,
    { method: "POST", headers: providerHeaders(provisioner), body: form },
  );
  const result = await parseCloudflareJson<any>(response);
  const id = result?.id;
  if (typeof id !== "string" || !VERSION_ID_RE.test(id)) {
    throw new Spr03ProvisioningError("spr03_version_id_missing", "Cloudflare did not return a valid version identifier", 502);
  }
  return id;
}

async function assertVersionInactive(versionId: string, provisioner: string, bootstrapVersionId: string): Promise<any> {
  await assertBootstrapProviderState(provisioner, bootstrapVersionId);
  const detail = await versionDetail(versionId, provisioner);
  const deployments = await cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${TARGET_WORKER}/deployments`,
    provisioner,
  );
  const active = deploymentVersions(deployments)[0].version_id;
  if (active === versionId) {
    throw new Spr03ProvisioningError("spr03_inactive_version_deployed", "New SPR-03 version must remain inactive", 409);
  }
  return detail;
}

function loadFinalSecrets(): Array<{ name: string; text: string }> {
  return FINAL_SECRET_NAMES.map((name) => ({ name, text: requireEnv(name) }));
}

export async function executeSpr03Provisioning(request: Request, rawBody: unknown): Promise<Spr03ProvisionResult> {
  await authenticateGlobalSuperAdmin(request);
  const input = parseSpr03ProvisionRequest(rawBody);

  // Must fail before any Cloudflare access when the stage-specific credential is absent.
  const provisioner = requireEnv("CLOUDFLARE_API_TOKEN_SPR03_PROVISIONER");
  await assertBootstrapProviderState(provisioner, input.expected_bootstrap_version_id);

  const canaryTag = `spr03-canary-${input.ceremony_id}`;
  const finalTag = `spr03-final-${input.ceremony_id}`;
  const existingFinal = await findTaggedVersion(finalTag, provisioner);
  if (input.phase === "canary" && existingFinal) {
    throw new Spr03ProvisioningError("spr03_final_already_exists", "Final version already exists for this ceremony", 409);
  }

  const source = await readWorkerSource(provisioner, input.expected_bootstrap_version_id);

  if (input.phase === "canary") {
    const existingCanary = await findTaggedVersion(canaryTag, provisioner);
    if (existingCanary) {
      const detail = await assertVersionInactive(existingCanary.id, provisioner, input.expected_bootstrap_version_id);
      const secrets = secretBindingNames(detail);
      if (secrets.length !== 0) throw new Spr03ProvisioningError("spr03_canary_secret_detected", "Synthetic canary contains a secret binding", 409);
      return {
        ok: true,
        phase: "canary",
        ceremonyId: input.ceremony_id,
        workerId: TARGET_WORKER,
        bootstrapVersionId: input.expected_bootstrap_version_id,
        createdVersionId: existingCanary.id,
        sourceFingerprint: source.fingerprint,
        reconciledExistingVersion: true,
        activeDeploymentUnchanged: true,
        deployed: false,
        secretBindingNames: [],
      };
    }

    let versionId: string;
    try {
      versionId = await uploadInactiveVersion(source, canaryTag, provisioner, []);
    } catch (error) {
      const reconciled = await findTaggedVersion(canaryTag, provisioner).catch(() => null);
      if (!reconciled) throw error;
      versionId = reconciled.id;
    }
    const detail = await assertVersionInactive(versionId, provisioner, input.expected_bootstrap_version_id);
    if (secretBindingNames(detail).length !== 0) {
      throw new Spr03ProvisioningError("spr03_canary_secret_detected", "Synthetic canary contains a secret binding", 409);
    }
    return {
      ok: true,
      phase: "canary",
      ceremonyId: input.ceremony_id,
      workerId: TARGET_WORKER,
      bootstrapVersionId: input.expected_bootstrap_version_id,
      createdVersionId: versionId,
      sourceFingerprint: source.fingerprint,
      reconciledExistingVersion: false,
      activeDeploymentUnchanged: true,
      deployed: false,
      secretBindingNames: [],
    };
  }

  const existingCanary = await findTaggedVersion(canaryTag, provisioner);
  if (!existingCanary) {
    throw new Spr03ProvisioningError("spr03_canary_required", "An inactive non-secret canary is required before the final version", 409);
  }
  const canaryDetail = await assertVersionInactive(existingCanary.id, provisioner, input.expected_bootstrap_version_id);
  if (secretBindingNames(canaryDetail).length !== 0) {
    throw new Spr03ProvisioningError("spr03_canary_secret_detected", "Synthetic canary contains a secret binding", 409);
  }

  if (existingFinal) {
    const detail = await assertVersionInactive(existingFinal.id, provisioner, input.expected_bootstrap_version_id);
    const names = secretBindingNames(detail);
    if (JSON.stringify(names) !== JSON.stringify([...FINAL_SECRET_NAMES].sort())) {
      throw new Spr03ProvisioningError("spr03_final_binding_mismatch", "Final version secret binding names do not match the frozen allowlist", 409);
    }
    return {
      ok: true,
      phase: "final",
      ceremonyId: input.ceremony_id,
      workerId: TARGET_WORKER,
      bootstrapVersionId: input.expected_bootstrap_version_id,
      createdVersionId: existingFinal.id,
      sourceFingerprint: source.fingerprint,
      reconciledExistingVersion: true,
      activeDeploymentUnchanged: true,
      deployed: false,
      secretBindingNames: names,
    };
  }

  const finalSecrets = loadFinalSecrets();
  let versionId: string;
  try {
    versionId = await uploadInactiveVersion(source, finalTag, provisioner, finalSecrets);
  } catch (error) {
    const reconciled = await findTaggedVersion(finalTag, provisioner).catch(() => null);
    if (!reconciled) throw error;
    versionId = reconciled.id;
  }
  const detail = await assertVersionInactive(versionId, provisioner, input.expected_bootstrap_version_id);
  const names = secretBindingNames(detail);
  if (JSON.stringify(names) !== JSON.stringify([...FINAL_SECRET_NAMES].sort())) {
    throw new Spr03ProvisioningError("spr03_final_binding_mismatch", "Final version secret binding names do not match the frozen allowlist", 409);
  }
  return {
    ok: true,
    phase: "final",
    ceremonyId: input.ceremony_id,
    workerId: TARGET_WORKER,
    bootstrapVersionId: input.expected_bootstrap_version_id,
    createdVersionId: versionId,
    sourceFingerprint: source.fingerprint,
    reconciledExistingVersion: false,
    activeDeploymentUnchanged: true,
    deployed: false,
    secretBindingNames: names,
  };
}

export const SPR03_FROZEN_CONTRACT = {
  accountId: CLOUDFLARE_ACCOUNT_ID,
  workerId: TARGET_WORKER,
  finalSecretNames: [...FINAL_SECRET_NAMES],
} as const;
