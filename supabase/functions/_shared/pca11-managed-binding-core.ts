export const PCA11_CLOUDFLARE_ACCOUNT_ID = "68ec853e6b04a038f09fca5712d6b26b";
export const PCA11_DEDICATED_WORKER = "rm-prime-pca11-hml";
export const PCA11_PREVIEW_ALIAS = "pca11-hml";
export const PCA11_PROVISIONER_ENVIRONMENT_NAME = "CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const SOURCE_MAIN_MODULE = "index.mjs";
const VERSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_FINGERPRINT_RE = /^[0-9a-f]{64}$/;
const CEREMONY_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/;

export type Pca11Phase = "canary" | "final";
export type Pca11EnvironmentReader = (name: string) => string | undefined;
export type Pca11Sha256 = (chunks: ReadonlyArray<string | Uint8Array>) => Promise<string>;

export const sha256WithWebCrypto: Pca11Sha256 = async (chunks) => {
  const encoder = new TextEncoder();
  const encoded = chunks.map((chunk) =>
    typeof chunk === "string" ? encoder.encode(chunk) : chunk,
  );
  const size = encoded.reduce((total, chunk) => total + chunk.byteLength, 0);
  const input = new Uint8Array(size);
  let offset = 0;
  for (const chunk of encoded) {
    input.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export interface Pca11ManagedBindingRequest {
  ceremony_id: string;
  expected_worker_id: string;
  expected_bootstrap_version_id: string;
  expected_source_fingerprint: string;
  phase: Pca11Phase;
}

export interface Pca11ProvisionResult {
  ok: true;
  phase: Pca11Phase;
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

export interface Pca11ExecutionDependencies {
  fetcher: typeof fetch;
  readEnvironment: Pca11EnvironmentReader;
  sha256: Pca11Sha256;
}

export class Pca11ProvisioningError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "Pca11ProvisioningError";
  }
}

interface ManagedBindingDefinition {
  name: string;
  kind: "plain_text" | "secret_text";
  required: boolean;
}

interface CloudflareEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number }>;
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
  nonSecretBindings: Array<Record<string, unknown>>;
  fingerprint: string;
}

const CANARY_BINDINGS: readonly ManagedBindingDefinition[] = Object.freeze(
  [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "RM_PRIME_AUTH_SITE_ORIGIN",
    "RM_PRIME_EMAIL_SITE_NAME",
    "RM_PRIME_EMAIL_SENDER_DOMAIN",
    "RM_PRIME_EMAIL_FROM_DOMAIN",
  ].map((name) => Object.freeze({ name, kind: "plain_text" as const, required: true })),
);

const FINAL_BINDINGS: readonly ManagedBindingDefinition[] = Object.freeze([
  ...CANARY_BINDINGS,
  Object.freeze({
    name: "SUPABASE_SERVICE_ROLE_KEY",
    kind: "secret_text" as const,
    required: true,
  }),
  Object.freeze({ name: "LOVABLE_API_KEY", kind: "secret_text" as const, required: false }),
  Object.freeze({
    name: "CLOUDFLARE_API_TOKEN_DCA01_HML",
    kind: "secret_text" as const,
    required: false,
  }),
  Object.freeze({ name: "PORTAL_DLQ_RETRY_SECRET", kind: "secret_text" as const, required: false }),
]);

export const PCA11_EDGE_BINDING_CONTRACT = Object.freeze({
  accountId: PCA11_CLOUDFLARE_ACCOUNT_ID,
  workerId: PCA11_DEDICATED_WORKER,
  previewAlias: PCA11_PREVIEW_ALIAS,
  expectedActiveDeploymentCount: 0,
  canaryBindingNames: Object.freeze(CANARY_BINDINGS.map(({ name }) => name).sort()),
  finalBindingNames: Object.freeze(FINAL_BINDINGS.map(({ name }) => name).sort()),
  provisionerEnvironmentName: PCA11_PROVISIONER_ENVIRONMENT_NAME,
  sourceFingerprintRequired: true,
});

function fail(code: string, message: string, status = 400): never {
  throw new Pca11ProvisioningError(code, message, status);
}

export function parsePca11ManagedBindingRequest(input: unknown): Pca11ManagedBindingRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("pca11_invalid_request", "Request body must be an object");
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
      return fail("pca11_unknown_or_sensitive_field", `Field is not allowed: ${key}`);
    }
  }

  if (typeof record.ceremony_id !== "string" || !CEREMONY_ID_RE.test(record.ceremony_id)) {
    return fail("pca11_invalid_ceremony_id", "ceremony_id is invalid");
  }
  if (record.expected_worker_id !== PCA11_DEDICATED_WORKER) {
    return fail("pca11_worker_mismatch", "Worker identity does not match PCA-11 authority");
  }
  if (
    typeof record.expected_bootstrap_version_id !== "string" ||
    !VERSION_ID_RE.test(record.expected_bootstrap_version_id)
  ) {
    return fail("pca11_invalid_bootstrap_version", "Bootstrap version identifier is invalid");
  }
  if (
    typeof record.expected_source_fingerprint !== "string" ||
    !SOURCE_FINGERPRINT_RE.test(record.expected_source_fingerprint)
  ) {
    return fail(
      "pca11_invalid_source_fingerprint",
      "Source fingerprint must be an exact SHA-256 digest",
    );
  }
  if (record.phase !== "canary" && record.phase !== "final") {
    return fail("pca11_invalid_phase", "phase must be canary or final");
  }

  return {
    ceremony_id: record.ceremony_id,
    expected_worker_id: PCA11_DEDICATED_WORKER,
    expected_bootstrap_version_id: record.expected_bootstrap_version_id,
    expected_source_fingerprint: record.expected_source_fingerprint,
    phase: record.phase,
  };
}

function requireEnvironment(readEnvironment: Pca11EnvironmentReader, name: string): string {
  const value = readEnvironment(name);
  if (!value)
    return fail(
      "pca11_missing_server_dependency",
      `Missing required server dependency: ${name}`,
      503,
    );
  return value;
}

function safeProviderError(status: number, payload: unknown): Pca11ProvisioningError {
  const envelope = payload as CloudflareEnvelope<unknown> | null;
  const providerCode = envelope?.errors?.[0]?.code;
  return new Pca11ProvisioningError(
    "pca11_cloudflare_request_failed",
    `Cloudflare request failed closed (${status}${providerCode ? `/${providerCode}` : ""})`,
    502,
  );
}

async function parseCloudflareJson<T>(response: Response): Promise<T> {
  let payload: CloudflareEnvelope<T>;
  try {
    payload = (await response.json()) as CloudflareEnvelope<T>;
  } catch {
    return fail(
      "pca11_cloudflare_invalid_response",
      "Cloudflare returned a non-JSON control response",
      502,
    );
  }
  if (!response.ok || payload.success !== true) throw safeProviderError(response.status, payload);
  return payload.result;
}

function providerHeaders(provisioner: string): HeadersInit {
  return { Authorization: `Bearer ${provisioner}` };
}

function providerUrl(path: string): string {
  return `${CLOUDFLARE_API_BASE}${path}`;
}

async function cloudflareGet<T>(
  path: string,
  provisioner: string,
  fetcher: typeof fetch,
): Promise<T> {
  const response = await fetcher(providerUrl(path), {
    method: "GET",
    headers: providerHeaders(provisioner),
    cache: "no-store",
  });
  return parseCloudflareJson<T>(response);
}

function deploymentRecords(result: unknown): unknown[] {
  const candidate = result as { deployments?: unknown } | null;
  return Array.isArray(candidate?.deployments)
    ? candidate.deployments
    : Array.isArray(result)
      ? result
      : [];
}

function bindingName(binding: Record<string, unknown>): string {
  return typeof binding?.name === "string" ? binding.name : "";
}

function runtimeBindings(detail: unknown): Array<Record<string, unknown>> {
  const bindings = (detail as { resources?: { bindings?: unknown } } | null)?.resources?.bindings;
  return Array.isArray(bindings) ? (bindings as Array<Record<string, unknown>>) : [];
}

function runtimeBindingNames(detail: unknown): string[] {
  return runtimeBindings(detail)
    .filter(({ type }) => type === "plain_text" || type === "secret_text" || type === "secret_key")
    .map(bindingName)
    .filter(Boolean)
    .sort();
}

function secretBindingNames(detail: unknown): string[] {
  return runtimeBindings(detail)
    .filter(({ type }) => type === "secret_text" || type === "secret_key")
    .map(bindingName)
    .filter(Boolean)
    .sort();
}

function readVersionTag(detail: unknown): string | null {
  const value = detail as {
    annotations?: Record<string, unknown>;
    metadata?: { annotations?: Record<string, unknown> };
    resources?: { script?: { annotations?: Record<string, unknown> } };
  } | null;
  const candidates = [
    value?.annotations?.["workers/tag"],
    value?.metadata?.annotations?.["workers/tag"],
    value?.resources?.script?.annotations?.["workers/tag"],
  ];
  return candidates.find((candidate) => typeof candidate === "string") ?? null;
}

async function assertBootstrapProviderState(
  provisioner: string,
  fetcher: typeof fetch,
): Promise<void> {
  const prefix = `/accounts/${PCA11_CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${PCA11_DEDICATED_WORKER}`;
  const deployments = await cloudflareGet<unknown>(`${prefix}/deployments`, provisioner, fetcher);
  if (deploymentRecords(deployments).length !== 0) {
    return fail(
      "pca11_deployment_not_zero",
      "PCA-11 candidate must have zero active deployments",
      409,
    );
  }

  const subdomain = await cloudflareGet<Record<string, unknown>>(
    `${prefix}/subdomain`,
    provisioner,
    fetcher,
  );
  if (subdomain?.enabled !== false || subdomain?.previews_enabled !== false) {
    return fail(
      "pca11_ingress_not_zero",
      "workers.dev and Preview URLs must both be disabled",
      409,
    );
  }

  const schedules = await cloudflareGet<unknown>(`${prefix}/schedules`, provisioner, fetcher);
  const scheduleCandidate = schedules as { schedules?: unknown } | null;
  const scheduleList = Array.isArray(scheduleCandidate?.schedules)
    ? scheduleCandidate.schedules
    : Array.isArray(schedules)
      ? schedules
      : [];
  if (scheduleList.length !== 0)
    return fail("pca11_cron_not_zero", "Cron trigger count must remain zero", 409);
}

function versionListItems(result: unknown): Array<Record<string, unknown>> {
  const items = (result as { items?: unknown } | null)?.items;
  if (!Array.isArray(items))
    return fail("pca11_version_list_shape", "Cloudflare result.items must be an array", 502);
  for (const item of items) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !VERSION_ID_RE.test(item.id)
    ) {
      return fail(
        "pca11_version_list_item_shape",
        "Cloudflare version list contains an invalid item",
        502,
      );
    }
  }
  return items as Array<Record<string, unknown>>;
}

async function listVersions(
  provisioner: string,
  fetcher: typeof fetch,
): Promise<Array<Record<string, unknown>>> {
  const path = `/accounts/${PCA11_CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${PCA11_DEDICATED_WORKER}/versions?per_page=100`;
  const response = await fetcher(providerUrl(path), {
    method: "GET",
    headers: providerHeaders(provisioner),
    cache: "no-store",
  });
  return versionListItems(await parseCloudflareJson<unknown>(response));
}

async function versionDetail(
  versionId: string,
  provisioner: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  return cloudflareGet<unknown>(
    `/accounts/${PCA11_CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${PCA11_DEDICATED_WORKER}/versions/${versionId}`,
    provisioner,
    fetcher,
  );
}

async function findTaggedVersion(
  tag: string,
  provisioner: string,
  fetcher: typeof fetch,
): Promise<{ id: string; detail: unknown } | null> {
  const versions = await listVersions(provisioner, fetcher);
  for (const candidate of versions.slice(0, 20)) {
    const id = candidate.id as string;
    if (readVersionTag(candidate) === tag) return { id, detail: candidate };
    const detail = await versionDetail(id, provisioner, fetcher);
    if (readVersionTag(detail) === tag) return { id, detail };
  }
  return null;
}

async function readWorkerSource(
  bootstrapVersionId: string,
  provisioner: string,
  fetcher: typeof fetch,
  sha256: Pca11Sha256,
): Promise<WorkerSourceSnapshot> {
  const bootstrapDetail = (await versionDetail(bootstrapVersionId, provisioner, fetcher)) as {
    resources?: {
      script_runtime?: { compatibility_date?: unknown; compatibility_flags?: unknown };
      bindings?: unknown;
    };
  };
  const runtime = bootstrapDetail?.resources?.script_runtime;
  if (typeof runtime?.compatibility_date !== "string" || !runtime.compatibility_date) {
    return fail("pca11_compatibility_date_missing", "Bootstrap compatibility_date is missing", 502);
  }
  if (
    !Array.isArray(runtime.compatibility_flags) ||
    runtime.compatibility_flags.some((flag: unknown) => typeof flag !== "string")
  ) {
    return fail(
      "pca11_compatibility_flags_invalid",
      "Bootstrap compatibility_flags are invalid",
      502,
    );
  }

  const sourceBindings = runtimeBindings(bootstrapDetail);
  if (sourceBindings.some(({ type }) => type === "secret_text" || type === "secret_key")) {
    return fail(
      "pca11_bootstrap_secret_detected",
      "Bootstrap version unexpectedly contains a secret binding",
      409,
    );
  }
  if (
    sourceBindings.length !== 1 ||
    bindingName(sourceBindings[0]) !== "ASSETS" ||
    sourceBindings[0].type !== "assets"
  ) {
    return fail(
      "pca11_bootstrap_binding_mismatch",
      "Bootstrap version must expose only ASSETS/assets",
      409,
    );
  }
  const nonSecretBindings = sourceBindings.map((binding) => ({ ...binding }));

  const response = await fetcher(
    providerUrl(
      `/accounts/${PCA11_CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${PCA11_DEDICATED_WORKER}/content/v2`,
    ),
    { method: "GET", headers: providerHeaders(provisioner), cache: "no-store" },
  );
  if (!response.ok) throw safeProviderError(response.status, null);
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("multipart/form-data")) {
    return fail("pca11_source_format_unexpected", "Worker source must be multipart form data", 502);
  }

  const sourceForm = await response.formData();
  const parts: SourcePart[] = [];
  for (const [field, value] of sourceForm.entries()) {
    if (typeof value === "string")
      return fail("pca11_source_part_shape", "Worker source must contain File parts only", 502);
    const filename = typeof value.name === "string" && value.name ? value.name : field;
    parts.push({ field, filename, blob: value });
  }
  if (parts.length === 0)
    return fail("pca11_source_parts_missing", "Worker source contains no module parts", 502);
  if (
    parts.filter(
      ({ field, filename }) => field === SOURCE_MAIN_MODULE && filename === SOURCE_MAIN_MODULE,
    ).length !== 1
  ) {
    return fail(
      "pca11_main_module_cardinality",
      "Worker source must contain exactly one root index.mjs",
      502,
    );
  }

  const chunks: Array<string | Uint8Array> = [
    SOURCE_MAIN_MODULE,
    runtime.compatibility_date,
    JSON.stringify(runtime.compatibility_flags),
    JSON.stringify(
      nonSecretBindings
        .map((binding) => ({ name: bindingName(binding), type: binding.type ?? null }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    ),
  ];
  const sorted = [...parts].sort((left, right) =>
    `${left.field}:${left.filename}`.localeCompare(`${right.field}:${right.filename}`),
  );
  for (const part of sorted) {
    chunks.push(part.field, part.filename, new Uint8Array(await part.blob.arrayBuffer()));
  }

  return {
    mainModule: SOURCE_MAIN_MODULE,
    compatibilityDate: runtime.compatibility_date,
    compatibilityFlags: [...runtime.compatibility_flags],
    parts,
    nonSecretBindings,
    fingerprint: await sha256(chunks),
  };
}

function materializeBindings(
  definitions: readonly ManagedBindingDefinition[],
  readEnvironment: Pca11EnvironmentReader,
): {
  bindings: Array<{ type: "plain_text" | "secret_text"; name: string; text: string }>;
  unavailableOptionalBindings: string[];
} {
  const bindings: Array<{ type: "plain_text" | "secret_text"; name: string; text: string }> = [];
  const unavailableOptionalBindings: string[] = [];
  for (const definition of definitions) {
    const value = readEnvironment(definition.name);
    if (!value) {
      if (definition.required)
        return fail(
          "pca11_missing_server_dependency",
          `Missing required server dependency: ${definition.name}`,
          503,
        );
      unavailableOptionalBindings.push(definition.name);
      continue;
    }
    bindings.push({ type: definition.kind, name: definition.name, text: value });
  }
  return { bindings, unavailableOptionalBindings: unavailableOptionalBindings.sort() };
}

function cloneMetadata(
  source: WorkerSourceSnapshot,
  tag: string,
  bindings: Array<{ type: "plain_text" | "secret_text"; name: string; text: string }>,
): Record<string, unknown> {
  return {
    main_module: source.mainModule,
    compatibility_date: source.compatibilityDate,
    compatibility_flags: source.compatibilityFlags,
    keep_assets: true,
    bindings: [...source.nonSecretBindings, ...bindings],
    annotations: {
      "workers/tag": tag,
      ...(tag.startsWith("pca11-final-") ? { "workers/alias": PCA11_PREVIEW_ALIAS } : {}),
      "workers/message": tag.startsWith("pca11-canary-")
        ? "PCA11 synthetic inactive canary"
        : "PCA11 final inactive managed-binding version",
    },
  };
}

async function uploadInactiveVersion(
  source: WorkerSourceSnapshot,
  tag: string,
  provisioner: string,
  bindings: Array<{ type: "plain_text" | "secret_text"; name: string; text: string }>,
  fetcher: typeof fetch,
): Promise<string> {
  const form = new FormData();
  form.set("metadata", JSON.stringify(cloneMetadata(source, tag, bindings)));
  for (const part of source.parts) form.append(part.field, part.blob, part.filename);
  const response = await fetcher(
    providerUrl(
      `/accounts/${PCA11_CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${PCA11_DEDICATED_WORKER}/versions`,
    ),
    { method: "POST", headers: providerHeaders(provisioner), body: form },
  );
  const result = await parseCloudflareJson<Record<string, unknown>>(response);
  if (typeof result?.id !== "string" || !VERSION_ID_RE.test(result.id)) {
    return fail(
      "pca11_version_id_missing",
      "Cloudflare did not return a valid version identifier",
      502,
    );
  }
  return result.id;
}

function assertBindingSet(
  detail: unknown,
  expectedNames: string[],
): { bindingNames: string[]; secretNames: string[] } {
  const bindingNames = runtimeBindingNames(detail);
  if (JSON.stringify(bindingNames) !== JSON.stringify(expectedNames)) {
    return fail(
      "pca11_binding_mismatch",
      "Managed binding names do not match the frozen allowlist",
      409,
    );
  }
  return { bindingNames, secretNames: secretBindingNames(detail) };
}

async function assertVersionInactive(
  versionId: string,
  bootstrapVersionId: string,
  provisioner: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  await assertBootstrapProviderState(provisioner, fetcher);
  const detail = await versionDetail(versionId, provisioner, fetcher);
  const deployments = await cloudflareGet<unknown>(
    `/accounts/${PCA11_CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${PCA11_DEDICATED_WORKER}/deployments`,
    provisioner,
    fetcher,
  );
  if (
    deploymentRecords(deployments).some((record) => {
      if (!record || typeof record !== "object") return false;
      const versions = (record as { versions?: unknown }).versions;
      return (
        Array.isArray(versions) &&
        versions.some(
          (version) =>
            !!version &&
            typeof version === "object" &&
            (version as { version_id?: unknown }).version_id === versionId,
        )
      );
    })
  ) {
    return fail("pca11_inactive_version_deployed", "New version must remain inactive", 409);
  }
  if (versionId === bootstrapVersionId) {
    return fail(
      "pca11_version_identity_reused",
      "Managed version must differ from bootstrap version",
      409,
    );
  }
  return detail;
}

function makeResult(
  input: Pca11ManagedBindingRequest,
  versionId: string,
  sourceFingerprint: string,
  reconciledExistingVersion: boolean,
  observed: { bindingNames: string[]; secretNames: string[] },
  unavailableProviderBindings: string[],
): Pca11ProvisionResult {
  return {
    ok: true,
    phase: input.phase,
    ceremonyId: input.ceremony_id,
    workerId: PCA11_DEDICATED_WORKER,
    bootstrapVersionId: input.expected_bootstrap_version_id,
    createdVersionId: versionId,
    sourceFingerprint,
    reconciledExistingVersion,
    activeDeploymentUnchanged: true,
    deployed: false,
    bindingNames: observed.bindingNames,
    secretBindingNames: observed.secretNames,
    unavailableProviderBindings,
  };
}

export async function executePca11ManagedBindingProvisioning(
  rawBody: unknown,
  dependencies: Pca11ExecutionDependencies,
): Promise<Pca11ProvisionResult> {
  const input = parsePca11ManagedBindingRequest(rawBody);
  // The stage-specific provisioner is required before the first provider request.
  const provisioner = requireEnvironment(
    dependencies.readEnvironment,
    PCA11_PROVISIONER_ENVIRONMENT_NAME,
  );
  await assertBootstrapProviderState(provisioner, dependencies.fetcher);

  const canaryTag = `pca11-canary-${input.ceremony_id}`;
  const finalTag = `pca11-final-${input.ceremony_id}`;
  const existingFinal = await findTaggedVersion(finalTag, provisioner, dependencies.fetcher);
  if (input.phase === "canary" && existingFinal) {
    return fail(
      "pca11_final_already_exists",
      "Final version already exists for this ceremony",
      409,
    );
  }

  const source = await readWorkerSource(
    input.expected_bootstrap_version_id,
    provisioner,
    dependencies.fetcher,
    dependencies.sha256,
  );
  if (source.fingerprint !== input.expected_source_fingerprint) {
    return fail(
      "pca11_source_fingerprint_mismatch",
      "Provider source differs from the authorized artifact",
      409,
    );
  }

  if (input.phase === "canary") {
    const canary = materializeBindings(CANARY_BINDINGS, dependencies.readEnvironment);
    const expectedNames = canary.bindings.map(({ name }) => name).sort();
    const existingCanary = await findTaggedVersion(canaryTag, provisioner, dependencies.fetcher);
    if (existingCanary) {
      const detail = await assertVersionInactive(
        existingCanary.id,
        input.expected_bootstrap_version_id,
        provisioner,
        dependencies.fetcher,
      );
      const observed = assertBindingSet(detail, expectedNames);
      if (observed.secretNames.length !== 0)
        return fail("pca11_canary_secret_detected", "Canary contains a secret binding", 409);
      return makeResult(
        input,
        existingCanary.id,
        source.fingerprint,
        true,
        observed,
        canary.unavailableOptionalBindings,
      );
    }

    let versionId: string;
    try {
      versionId = await uploadInactiveVersion(
        source,
        canaryTag,
        provisioner,
        canary.bindings,
        dependencies.fetcher,
      );
    } catch (error) {
      const reconciled = await findTaggedVersion(
        canaryTag,
        provisioner,
        dependencies.fetcher,
      ).catch(() => null);
      if (!reconciled) throw error;
      versionId = reconciled.id;
    }
    const detail = await assertVersionInactive(
      versionId,
      input.expected_bootstrap_version_id,
      provisioner,
      dependencies.fetcher,
    );
    const observed = assertBindingSet(detail, expectedNames);
    if (observed.secretNames.length !== 0)
      return fail("pca11_canary_secret_detected", "Canary contains a secret binding", 409);
    return makeResult(
      input,
      versionId,
      source.fingerprint,
      false,
      observed,
      canary.unavailableOptionalBindings,
    );
  }

  const existingCanary = await findTaggedVersion(canaryTag, provisioner, dependencies.fetcher);
  if (!existingCanary)
    return fail("pca11_canary_required", "An inactive non-secret canary is required first", 409);
  const canary = materializeBindings(CANARY_BINDINGS, dependencies.readEnvironment);
  const canaryDetail = await assertVersionInactive(
    existingCanary.id,
    input.expected_bootstrap_version_id,
    provisioner,
    dependencies.fetcher,
  );
  const observedCanary = assertBindingSet(
    canaryDetail,
    canary.bindings.map(({ name }) => name).sort(),
  );
  if (observedCanary.secretNames.length !== 0)
    return fail("pca11_canary_secret_detected", "Canary contains a secret binding", 409);

  const finalBindings = materializeBindings(FINAL_BINDINGS, dependencies.readEnvironment);
  const expectedNames = finalBindings.bindings.map(({ name }) => name).sort();
  if (existingFinal) {
    const detail = await assertVersionInactive(
      existingFinal.id,
      input.expected_bootstrap_version_id,
      provisioner,
      dependencies.fetcher,
    );
    return makeResult(
      input,
      existingFinal.id,
      source.fingerprint,
      true,
      assertBindingSet(detail, expectedNames),
      finalBindings.unavailableOptionalBindings,
    );
  }

  let versionId: string;
  try {
    versionId = await uploadInactiveVersion(
      source,
      finalTag,
      provisioner,
      finalBindings.bindings,
      dependencies.fetcher,
    );
  } catch (error) {
    const reconciled = await findTaggedVersion(finalTag, provisioner, dependencies.fetcher).catch(
      () => null,
    );
    if (!reconciled) throw error;
    versionId = reconciled.id;
  }
  const detail = await assertVersionInactive(
    versionId,
    input.expected_bootstrap_version_id,
    provisioner,
    dependencies.fetcher,
  );
  return makeResult(
    input,
    versionId,
    source.fingerprint,
    false,
    assertBindingSet(detail, expectedNames),
    finalBindings.unavailableOptionalBindings,
  );
}
