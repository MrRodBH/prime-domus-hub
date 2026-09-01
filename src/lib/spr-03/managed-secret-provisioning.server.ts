import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  expectedBindingNames,
  materializeManagedBindings,
  PCA11_DEDICATED_WORKER,
  PCA11_PREVIEW_ALIAS,
  resolveManagedInactiveVersionTarget,
  SPR03_HISTORICAL_WORKER,
  type ManagedInactiveVersionTarget,
} from "@/lib/cloudflare/managed-inactive-version-contract.server";

const CLOUDFLARE_ACCOUNT_ID = "68ec853e6b04a038f09fca5712d6b26b";
const TARGET_WORKER = SPR03_HISTORICAL_WORKER;
const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const SOURCE_MAIN_MODULE = "index.mjs";

const VERSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_FINGERPRINT_RE = /^[0-9a-f]{64}$/;
const CEREMONY_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/;

export type Spr03Phase = "canary" | "final";

export interface Spr03ProvisionRequest {
  ceremony_id: string;
  expected_worker_id: string;
  expected_bootstrap_version_id: string;
  phase: Spr03Phase;
}

export interface Pca11ManagedBindingRequest extends Spr03ProvisionRequest {
  expected_source_fingerprint: string;
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
  bindingNames: string[];
  secretBindingNames: string[];
  unavailableProviderBindings: string[];
}

export class Spr03ProvisioningError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
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

type ProvisioningNamespace = ManagedInactiveVersionTarget["tagPrefix"];
type EnvironmentReader = (name: string) => string | undefined;

export interface Pca11NodeProvisioningDependencies {
  authenticateGlobalSuperAdmin?: (request: Request) => Promise<string>;
  readEnvironment?: EnvironmentReader;
}

const readProcessEnvironment: EnvironmentReader = (name) => process.env[name];
const provisioningCode = (namespace: ProvisioningNamespace, suffix: string) =>
  `${namespace}_${suffix}`;

function safeProviderError(
  status: number,
  payload: unknown,
  namespace: ProvisioningNamespace = "spr03",
): Spr03ProvisioningError {
  const envelope = payload as CloudflareEnvelope<unknown> | null;
  const code = envelope?.errors?.[0]?.code;
  return new Spr03ProvisioningError(
    provisioningCode(namespace, "cloudflare_request_failed"),
    `Cloudflare request failed closed (${status}${code ? `/${code}` : ""})`,
    502,
  );
}

async function parseCloudflareJson<T>(
  response: Response,
  namespace: ProvisioningNamespace = "spr03",
): Promise<T> {
  let payload: CloudflareEnvelope<T>;
  try {
    payload = (await response.json()) as CloudflareEnvelope<T>;
  } catch {
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "cloudflare_invalid_response"),
      "Cloudflare returned a non-JSON control response",
      502,
    );
  }
  if (!response.ok || payload.success !== true)
    throw safeProviderError(response.status, payload, namespace);
  return payload.result;
}

function requireEnvironment(
  name: string,
  namespace: ProvisioningNamespace = "spr03",
  readEnvironment: EnvironmentReader = readProcessEnvironment,
): string {
  const value = readEnvironment(name);
  if (!value)
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "missing_server_dependency"),
      `Missing required server dependency: ${name}`,
      503,
    );
  return value;
}

function providerHeaders(provisioner: string): HeadersInit {
  return { Authorization: `Bearer ${provisioner}` };
}

async function cloudflareGet<T>(
  path: string,
  provisioner: string,
  namespace: ProvisioningNamespace = "spr03",
): Promise<T> {
  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    method: "GET",
    headers: providerHeaders(provisioner),
    cache: "no-store",
  });
  return parseCloudflareJson<T>(response, namespace);
}

async function authenticateGlobalSuperAdmin(
  request: Request,
  namespace: ProvisioningNamespace = "spr03",
  readEnvironment: EnvironmentReader = readProcessEnvironment,
): Promise<string> {
  if (request.headers.has("x-tenant-id")) {
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "tenant_header_prohibited"),
      "x-tenant-id is prohibited for this global infrastructure ceremony",
      400,
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "unauthorized"),
      "Bearer authentication is required",
      401,
    );
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token)
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "unauthorized"),
      "Bearer authentication is required",
      401,
    );

  const supabaseUrl = requireEnvironment("SUPABASE_URL", namespace, readEnvironment);
  const publishableKey = requireEnvironment("SUPABASE_PUBLISHABLE_KEY", namespace, readEnvironment);
  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string" || !userId) {
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "unauthorized"),
      "Invalid authenticated subject",
      401,
    );
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles, error: roleError } = await (supabaseAdmin as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin");
  if (roleError || !roles || roles.length !== 1) {
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "forbidden"),
      "Exact global super_admin authority is required",
      403,
    );
  }
  return userId;
}

export function parseSpr03ProvisionRequest(input: unknown): Spr03ProvisionRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Spr03ProvisioningError("spr03_invalid_request", "Request body must be an object");
  }
  const record = input as Record<string, unknown>;
  const allowed = new Set([
    "ceremony_id",
    "expected_worker_id",
    "expected_bootstrap_version_id",
    "phase",
  ]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key) || /(tenant|secret|token|authorization|role|user|key)/i.test(key)) {
      throw new Spr03ProvisioningError(
        "spr03_unknown_or_sensitive_field",
        `Field is not allowed: ${key}`,
      );
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
    throw new Spr03ProvisioningError(
      "spr03_worker_mismatch",
      "Worker identity does not match server authority",
    );
  }
  if (typeof bootstrapVersionId !== "string" || !VERSION_ID_RE.test(bootstrapVersionId)) {
    throw new Spr03ProvisioningError(
      "spr03_invalid_bootstrap_version",
      "Bootstrap version identifier is invalid",
    );
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

export function parsePca11ManagedBindingRequest(input: unknown): Pca11ManagedBindingRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Spr03ProvisioningError("pca11_invalid_request", "Request body must be an object");
  }
  const record = input as Record<string, unknown>;
  const allowed = new Set([
    "ceremony_id",
    "expected_worker_id",
    "expected_bootstrap_version_id",
    "expected_source_fingerprint",
    "phase",
  ]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key) || /(tenant|secret|token|authorization|role|user|key)/i.test(key)) {
      throw new Spr03ProvisioningError(
        "pca11_unknown_or_sensitive_field",
        `Field is not allowed: ${key}`,
      );
    }
  }

  const ceremonyId = record.ceremony_id;
  const workerId = record.expected_worker_id;
  const bootstrapVersionId = record.expected_bootstrap_version_id;
  const sourceFingerprint = record.expected_source_fingerprint;
  const phase = record.phase;
  if (typeof ceremonyId !== "string" || !CEREMONY_ID_RE.test(ceremonyId)) {
    throw new Spr03ProvisioningError("pca11_invalid_ceremony_id", "ceremony_id is invalid");
  }
  if (workerId !== PCA11_DEDICATED_WORKER) {
    throw new Spr03ProvisioningError(
      "pca11_worker_mismatch",
      "Worker identity does not match PCA-11 server authority",
    );
  }
  if (typeof bootstrapVersionId !== "string" || !VERSION_ID_RE.test(bootstrapVersionId)) {
    throw new Spr03ProvisioningError(
      "pca11_invalid_bootstrap_version",
      "Bootstrap version identifier is invalid",
    );
  }
  if (typeof sourceFingerprint !== "string" || !SOURCE_FINGERPRINT_RE.test(sourceFingerprint)) {
    throw new Spr03ProvisioningError(
      "pca11_invalid_source_fingerprint",
      "Source fingerprint must be an exact SHA-256 digest",
    );
  }
  if (phase !== "canary" && phase !== "final") {
    throw new Spr03ProvisioningError("pca11_invalid_phase", "phase must be canary or final");
  }
  return {
    ceremony_id: ceremonyId,
    expected_worker_id: PCA11_DEDICATED_WORKER,
    expected_bootstrap_version_id: bootstrapVersionId,
    expected_source_fingerprint: sourceFingerprint,
    phase,
  };
}

function deploymentRecords(result: any): any[] {
  const deployments = Array.isArray(result?.deployments)
    ? result.deployments
    : Array.isArray(result)
      ? result
      : [];
  return deployments;
}

function deploymentVersions(
  result: any,
  namespace: ProvisioningNamespace = "spr03",
): Array<{ version_id: string; percentage: number }> {
  const deployments = deploymentRecords(result);
  if (deployments.length === 0) {
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "deployment_cardinality"),
      "At least one deployment record must exist",
      409,
    );
  }
  // Cloudflare returns deployment history newest-first; only the first item is the deployment actively serving traffic.
  const latestDeployment = deployments[0];
  const versions = Array.isArray(latestDeployment?.versions) ? latestDeployment.versions : [];
  if (
    versions.length !== 1 ||
    versions[0]?.percentage !== 100 ||
    typeof versions[0]?.version_id !== "string"
  ) {
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "deployment_shape"),
      "Active deployment must reference exactly one version at 100%",
      409,
    );
  }
  return versions;
}

async function assertBootstrapProviderState(
  provisioner: string,
  target: ManagedInactiveVersionTarget,
  expectedBootstrapVersionId: string,
): Promise<void> {
  const deployments = await cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${target.workerId}/deployments`,
    provisioner,
    target.tagPrefix,
  );
  const records = deploymentRecords(deployments);
  if (target.expectedActiveDeploymentCount === 0) {
    if (records.length !== 0) {
      throw new Spr03ProvisioningError(
        "pca11_deployment_not_zero",
        "PCA-11 candidate must have zero active deployments",
        409,
      );
    }
  } else {
    const versions = deploymentVersions(deployments, target.tagPrefix);
    if (versions[0].version_id !== expectedBootstrapVersionId) {
      throw new Spr03ProvisioningError(
        provisioningCode(target.tagPrefix, "bootstrap_version_drift"),
        "Active deployment does not match the pinned bootstrap version",
        409,
      );
    }
  }

  const subdomain = await cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${target.workerId}/subdomain`,
    provisioner,
    target.tagPrefix,
  );
  if (
    subdomain?.enabled !== false ||
    subdomain?.previews_enabled !== target.expectedPreviewsEnabled
  ) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "ingress_not_zero"),
      "workers.dev and Preview URLs must both be disabled",
      409,
    );
  }

  const schedules = await cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${target.workerId}/schedules`,
    provisioner,
    target.tagPrefix,
  );
  const scheduleList = Array.isArray(schedules?.schedules)
    ? schedules.schedules
    : Array.isArray(schedules)
      ? schedules
      : [];
  if (scheduleList.length !== 0) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "cron_not_zero"),
      "Cron trigger count must remain zero",
      409,
    );
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

function runtimeBindingNames(detail: any): string[] {
  const bindings = Array.isArray(detail?.resources?.bindings) ? detail.resources.bindings : [];
  return bindings
    .filter(
      (binding: any) =>
        binding?.type === "plain_text" ||
        binding?.type === "secret_text" ||
        binding?.type === "secret_key",
    )
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

function versionListItems(result: any, namespace: ProvisioningNamespace = "spr03"): any[] {
  const items = result?.items;
  if (!Array.isArray(items)) {
    throw new Spr03ProvisioningError(
      provisioningCode(namespace, "version_list_shape"),
      "Cloudflare version list result.items must be an array",
      502,
    );
  }
  for (const item of items) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !VERSION_ID_RE.test(item.id)
    ) {
      throw new Spr03ProvisioningError(
        provisioningCode(namespace, "version_list_item_shape"),
        "Cloudflare version list contains an invalid version item",
        502,
      );
    }
  }
  return items;
}

async function listVersions(
  target: ManagedInactiveVersionTarget,
  provisioner: string,
): Promise<any[]> {
  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${target.workerId}/versions?per_page=100`,
    { method: "GET", headers: providerHeaders(provisioner), cache: "no-store" },
  );
  const result = await parseCloudflareJson<any>(response, target.tagPrefix);
  return versionListItems(result, target.tagPrefix);
}

async function versionDetail(
  target: ManagedInactiveVersionTarget,
  versionId: string,
  provisioner: string,
): Promise<any> {
  return cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${target.workerId}/versions/${versionId}`,
    provisioner,
    target.tagPrefix,
  );
}

async function findTaggedVersion(
  target: ManagedInactiveVersionTarget,
  tag: string,
  provisioner: string,
): Promise<{ id: string; detail: any } | null> {
  const versions = await listVersions(target, provisioner);
  for (const candidate of versions.slice(0, 20)) {
    if (typeof candidate?.id !== "string") continue;
    if (readVersionTag(candidate) === tag) return { id: candidate.id, detail: candidate };
    const detail = await versionDetail(target, candidate.id, provisioner);
    if (readVersionTag(detail) === tag) return { id: candidate.id, detail };
  }
  return null;
}

async function readWorkerSource(
  target: ManagedInactiveVersionTarget,
  provisioner: string,
  expectedBootstrapVersionId: string,
): Promise<WorkerSourceSnapshot> {
  const bootstrapDetail = await versionDetail(target, expectedBootstrapVersionId, provisioner);
  const runtime = bootstrapDetail?.resources?.script_runtime;
  const compatibilityDate = runtime?.compatibility_date;
  const compatibilityFlags = runtime?.compatibility_flags;
  if (typeof compatibilityDate !== "string" || !compatibilityDate) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "compatibility_date_missing"),
      "Bootstrap compatibility_date is missing",
      502,
    );
  }
  if (
    !Array.isArray(compatibilityFlags) ||
    compatibilityFlags.some((flag: unknown) => typeof flag !== "string")
  ) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "compatibility_flags_invalid"),
      "Bootstrap compatibility_flags are invalid",
      502,
    );
  }

  const sourceBindings = Array.isArray(bootstrapDetail?.resources?.bindings)
    ? bootstrapDetail.resources.bindings
    : [];
  if (
    sourceBindings.some(
      (binding: any) => binding?.type === "secret_text" || binding?.type === "secret_key",
    )
  ) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "bootstrap_secret_detected"),
      "Bootstrap Version unexpectedly contains a secret binding",
      409,
    );
  }
  if (
    sourceBindings.length !== 1 ||
    bindingName(sourceBindings[0]) !== "ASSETS" ||
    sourceBindings[0]?.type !== "assets"
  ) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "bootstrap_binding_mismatch"),
      "Bootstrap Version must expose exactly the ASSETS/assets binding",
      409,
    );
  }
  const nonSecretBindings: Array<Record<string, any>> = sourceBindings.map((binding: any) => ({
    ...binding,
  }));

  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${target.workerId}/content/v2`,
    { method: "GET", headers: providerHeaders(provisioner), cache: "no-store" },
  );
  if (!response.ok) throw safeProviderError(response.status, null, target.tagPrefix);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "source_format_unexpected"),
      "Worker source must be returned as multipart form data",
      502,
    );
  }
  const form = await response.formData();
  const parts: SourcePart[] = [];
  for (const [field, value] of form.entries()) {
    if (typeof value === "string") {
      throw new Spr03ProvisioningError(
        provisioningCode(target.tagPrefix, "source_part_shape"),
        "Worker source multipart must contain module File parts only",
        502,
      );
    }
    const filename =
      typeof (value as any).name === "string" && (value as any).name ? (value as any).name : field;
    parts.push({ field, filename, blob: value });
  }
  if (parts.length === 0)
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "source_parts_missing"),
      "Worker source contains no module parts",
      502,
    );

  const mainModuleMatches = parts.filter(
    (part) => part.field === SOURCE_MAIN_MODULE && part.filename === SOURCE_MAIN_MODULE,
  );
  if (mainModuleMatches.length !== 1) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "main_module_cardinality"),
      "Worker source must contain exactly one root index.mjs main module",
      502,
    );
  }

  const hash = createHash("sha256");
  hash.update(SOURCE_MAIN_MODULE);
  hash.update(compatibilityDate);
  hash.update(JSON.stringify(compatibilityFlags));
  hash.update(
    JSON.stringify(
      nonSecretBindings
        .map((binding) => ({ name: bindingName(binding), type: binding.type ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ),
  );
  const sorted = [...parts].sort((a, b) =>
    `${a.field}:${a.filename}`.localeCompare(`${b.field}:${b.filename}`),
  );
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

function cloneMetadata(
  source: WorkerSourceSnapshot,
  target: ManagedInactiveVersionTarget,
  tag: string,
  bindings: Array<{ type: "plain_text" | "secret_text"; name: string; text: string }>,
): Record<string, any> {
  return {
    main_module: source.mainModule,
    compatibility_date: source.compatibilityDate,
    compatibility_flags: source.compatibilityFlags,
    keep_assets: true,
    bindings: [...source.nonSecretBindings, ...bindings],
    annotations: {
      "workers/tag": tag,
      ...(target.tagPrefix === "pca11" && tag.startsWith("pca11-final-")
        ? { "workers/alias": PCA11_PREVIEW_ALIAS }
        : {}),
      "workers/message": tag.startsWith(`${target.tagPrefix}-canary-`)
        ? `${target.tagPrefix.toUpperCase()} synthetic inactive canary`
        : `${target.tagPrefix.toUpperCase()} final inactive managed-binding version`,
    },
  };
}

async function uploadInactiveVersion(
  source: WorkerSourceSnapshot,
  target: ManagedInactiveVersionTarget,
  tag: string,
  provisioner: string,
  bindings: Array<{ type: "plain_text" | "secret_text"; name: string; text: string }>,
): Promise<string> {
  const form = new FormData();
  form.set("metadata", JSON.stringify(cloneMetadata(source, target, tag, bindings)));
  for (const part of source.parts) form.append(part.field, part.blob, part.filename);

  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${target.workerId}/versions`,
    { method: "POST", headers: providerHeaders(provisioner), body: form },
  );
  const result = await parseCloudflareJson<any>(response, target.tagPrefix);
  const id = result?.id;
  if (typeof id !== "string" || !VERSION_ID_RE.test(id)) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "version_id_missing"),
      "Cloudflare did not return a valid version identifier",
      502,
    );
  }
  return id;
}

async function assertVersionInactive(
  target: ManagedInactiveVersionTarget,
  versionId: string,
  provisioner: string,
  bootstrapVersionId: string,
): Promise<any> {
  await assertBootstrapProviderState(provisioner, target, bootstrapVersionId);
  const detail = await versionDetail(target, versionId, provisioner);
  const deployments = await cloudflareGet<any>(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${target.workerId}/deployments`,
    provisioner,
    target.tagPrefix,
  );
  const records = deploymentRecords(deployments);
  const active =
    records.length === 0 ? null : deploymentVersions(deployments, target.tagPrefix)[0].version_id;
  if (active === versionId) {
    throw new Spr03ProvisioningError(
      provisioningCode(target.tagPrefix, "inactive_version_deployed"),
      `New ${target.tagPrefix.toUpperCase()} version must remain inactive`,
      409,
    );
  }
  return detail;
}

function loadBindings(target: ManagedInactiveVersionTarget, phase: Spr03Phase) {
  try {
    return materializeManagedBindings(
      phase === "canary" ? target.canaryBindings : target.finalBindings,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "missing_required_managed_binding";
    throw new Spr03ProvisioningError(`${target.tagPrefix}_missing_server_dependency`, message, 503);
  }
}

function assertBindingSet(
  detail: any,
  expectedNames: string[],
  target: ManagedInactiveVersionTarget,
): { bindingNames: string[]; secretNames: string[] } {
  const bindingNames = runtimeBindingNames(detail);
  if (JSON.stringify(bindingNames) !== JSON.stringify(expectedNames)) {
    throw new Spr03ProvisioningError(
      `${target.tagPrefix}_binding_mismatch`,
      "Managed runtime binding names do not match the frozen allowlist",
      409,
    );
  }
  return { bindingNames, secretNames: secretBindingNames(detail) };
}

async function executeManagedInactiveVersionProvisioning(
  request: Request,
  input: Spr03ProvisionRequest | Pca11ManagedBindingRequest,
  target: ManagedInactiveVersionTarget,
  readEnvironment: EnvironmentReader = readProcessEnvironment,
): Promise<Spr03ProvisionResult> {
  // Stage-specific provisioners fail closed before any provider request.
  const provisionerName =
    target.tagPrefix === "pca11"
      ? "CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER"
      : "CLOUDFLARE_API_TOKEN_SPR03_PROVISIONER";
  const requireEnv = (name: string) => requireEnvironment(name, target.tagPrefix, readEnvironment);
  const provisioner = requireEnv(provisionerName);
  await assertBootstrapProviderState(provisioner, target, input.expected_bootstrap_version_id);

  const canaryTag = `${target.tagPrefix}-canary-${input.ceremony_id}`;
  const finalTag = `${target.tagPrefix}-final-${input.ceremony_id}`;
  const existingFinal = await findTaggedVersion(target, finalTag, provisioner);
  if (input.phase === "canary" && existingFinal) {
    throw new Spr03ProvisioningError(
      `${target.tagPrefix}_final_already_exists`,
      "Final version already exists for this ceremony",
      409,
    );
  }

  const source = await readWorkerSource(target, provisioner, input.expected_bootstrap_version_id);
  const expectedFingerprint =
    "expected_source_fingerprint" in input ? input.expected_source_fingerprint : null;
  if (target.requireSourceFingerprint && source.fingerprint !== expectedFingerprint) {
    throw new Spr03ProvisioningError(
      "pca11_source_fingerprint_mismatch",
      "Provider source fingerprint does not match the exact authorized artifact",
      409,
    );
  }

  if (input.phase === "canary") {
    const canary = loadBindings(target, "canary");
    const expectedNames = canary.bindings.map(({ name }) => name).sort();
    const existingCanary = await findTaggedVersion(target, canaryTag, provisioner);
    if (existingCanary) {
      const detail = await assertVersionInactive(
        target,
        existingCanary.id,
        provisioner,
        input.expected_bootstrap_version_id,
      );
      const observed = assertBindingSet(detail, expectedNames, target);
      if (observed.secretNames.length !== 0) {
        throw new Spr03ProvisioningError(
          `${target.tagPrefix}_canary_secret_detected`,
          "Synthetic canary contains a secret binding",
          409,
        );
      }
      return {
        ok: true,
        phase: "canary",
        ceremonyId: input.ceremony_id,
        workerId: target.workerId,
        bootstrapVersionId: input.expected_bootstrap_version_id,
        createdVersionId: existingCanary.id,
        sourceFingerprint: source.fingerprint,
        reconciledExistingVersion: true,
        activeDeploymentUnchanged: true,
        deployed: false,
        bindingNames: observed.bindingNames,
        secretBindingNames: [],
        unavailableProviderBindings: canary.unavailableOptionalBindings,
      };
    }

    let versionId: string;
    try {
      versionId = await uploadInactiveVersion(
        source,
        target,
        canaryTag,
        provisioner,
        canary.bindings,
      );
    } catch (error) {
      const reconciled = await findTaggedVersion(target, canaryTag, provisioner).catch(() => null);
      if (!reconciled) throw error;
      versionId = reconciled.id;
    }
    const detail = await assertVersionInactive(
      target,
      versionId,
      provisioner,
      input.expected_bootstrap_version_id,
    );
    const observed = assertBindingSet(detail, expectedNames, target);
    if (observed.secretNames.length !== 0) {
      throw new Spr03ProvisioningError(
        `${target.tagPrefix}_canary_secret_detected`,
        "Synthetic canary contains a secret binding",
        409,
      );
    }
    return {
      ok: true,
      phase: "canary",
      ceremonyId: input.ceremony_id,
      workerId: target.workerId,
      bootstrapVersionId: input.expected_bootstrap_version_id,
      createdVersionId: versionId,
      sourceFingerprint: source.fingerprint,
      reconciledExistingVersion: false,
      activeDeploymentUnchanged: true,
      deployed: false,
      bindingNames: observed.bindingNames,
      secretBindingNames: [],
      unavailableProviderBindings: canary.unavailableOptionalBindings,
    };
  }

  const existingCanary = await findTaggedVersion(target, canaryTag, provisioner);
  if (!existingCanary) {
    throw new Spr03ProvisioningError(
      `${target.tagPrefix}_canary_required`,
      "An inactive non-secret canary is required before the final version",
      409,
    );
  }
  const canaryBindings = loadBindings(target, "canary");
  const canaryDetail = await assertVersionInactive(
    target,
    existingCanary.id,
    provisioner,
    input.expected_bootstrap_version_id,
  );
  const observedCanary = assertBindingSet(
    canaryDetail,
    canaryBindings.bindings.map(({ name }) => name).sort(),
    target,
  );
  if (observedCanary.secretNames.length !== 0) {
    throw new Spr03ProvisioningError(
      `${target.tagPrefix}_canary_secret_detected`,
      "Synthetic canary contains a secret binding",
      409,
    );
  }

  const finalBindings = loadBindings(target, "final");
  const expectedFinalNames = finalBindings.bindings.map(({ name }) => name).sort();
  if (existingFinal) {
    const detail = await assertVersionInactive(
      target,
      existingFinal.id,
      provisioner,
      input.expected_bootstrap_version_id,
    );
    const observed = assertBindingSet(detail, expectedFinalNames, target);
    return {
      ok: true,
      phase: "final",
      ceremonyId: input.ceremony_id,
      workerId: target.workerId,
      bootstrapVersionId: input.expected_bootstrap_version_id,
      createdVersionId: existingFinal.id,
      sourceFingerprint: source.fingerprint,
      reconciledExistingVersion: true,
      activeDeploymentUnchanged: true,
      deployed: false,
      bindingNames: observed.bindingNames,
      secretBindingNames: observed.secretNames,
      unavailableProviderBindings: finalBindings.unavailableOptionalBindings,
    };
  }

  let versionId: string;
  try {
    versionId = await uploadInactiveVersion(
      source,
      target,
      finalTag,
      provisioner,
      finalBindings.bindings,
    );
  } catch (error) {
    const reconciled = await findTaggedVersion(target, finalTag, provisioner).catch(() => null);
    if (!reconciled) throw error;
    versionId = reconciled.id;
  }
  const detail = await assertVersionInactive(
    target,
    versionId,
    provisioner,
    input.expected_bootstrap_version_id,
  );
  const observed = assertBindingSet(detail, expectedFinalNames, target);
  return {
    ok: true,
    phase: "final",
    ceremonyId: input.ceremony_id,
    workerId: target.workerId,
    bootstrapVersionId: input.expected_bootstrap_version_id,
    createdVersionId: versionId,
    sourceFingerprint: source.fingerprint,
    reconciledExistingVersion: false,
    activeDeploymentUnchanged: true,
    deployed: false,
    bindingNames: observed.bindingNames,
    secretBindingNames: observed.secretNames,
    unavailableProviderBindings: finalBindings.unavailableOptionalBindings,
  };
}

export async function executeSpr03Provisioning(
  request: Request,
  rawBody: unknown,
): Promise<Spr03ProvisionResult> {
  await authenticateGlobalSuperAdmin(request, "spr03");
  const input = parseSpr03ProvisionRequest(rawBody);
  const target = resolveManagedInactiveVersionTarget(input.expected_worker_id);
  if (!target || target.workerId !== SPR03_HISTORICAL_WORKER) {
    throw new Spr03ProvisioningError(
      "spr03_worker_mismatch",
      "Worker identity does not match SPR-03 server authority",
    );
  }
  return executeManagedInactiveVersionProvisioning(request, input, target);
}

export async function executePca11ManagedBindingProvisioning(
  request: Request,
  rawBody: unknown,
  dependencies: Pca11NodeProvisioningDependencies = {},
): Promise<Spr03ProvisionResult> {
  const readEnvironment = dependencies.readEnvironment ?? readProcessEnvironment;
  const authenticate =
    dependencies.authenticateGlobalSuperAdmin ??
    ((candidate: Request) => authenticateGlobalSuperAdmin(candidate, "pca11", readEnvironment));
  await authenticate(request);
  const input = parsePca11ManagedBindingRequest(rawBody);
  const target = resolveManagedInactiveVersionTarget(input.expected_worker_id);
  if (!target || target.workerId !== PCA11_DEDICATED_WORKER) {
    throw new Spr03ProvisioningError(
      "pca11_worker_mismatch",
      "Worker identity does not match PCA-11 server authority",
    );
  }
  return executeManagedInactiveVersionProvisioning(request, input, target, readEnvironment);
}

const spr03Target = resolveManagedInactiveVersionTarget(SPR03_HISTORICAL_WORKER)!;
const pca11Target = resolveManagedInactiveVersionTarget(PCA11_DEDICATED_WORKER)!;

export const SPR03_FROZEN_CONTRACT = {
  accountId: CLOUDFLARE_ACCOUNT_ID,
  workerId: TARGET_WORKER,
  finalSecretNames: expectedBindingNames(spr03Target.finalBindings),
} as const;

export const PCA11_MANAGED_BINDING_CONTRACT = {
  accountId: CLOUDFLARE_ACCOUNT_ID,
  workerId: PCA11_DEDICATED_WORKER,
  expectedActiveDeploymentCount: 0,
  canaryBindingNames: expectedBindingNames(pca11Target.canaryBindings),
  finalBindingNames: expectedBindingNames(pca11Target.finalBindings),
  sourceFingerprintRequired: true,
  provisionerEnvironmentName: "CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER",
} as const;
