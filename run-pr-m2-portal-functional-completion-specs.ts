import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_PORTAL_MAPPING,
  PORTAL_AUTOMATED_METHODS,
  PORTAL_CONFIGURATION_STATES,
  PORTAL_CONNECTOR_REGISTRY,
  PORTAL_JOB_STATES,
  assertNoPortalInlineSecrets,
  assertPortalJobTransition,
  getPortalConnectorDefinition,
  parsePortalHybridConfig,
} from "./src/lib/portals/portal-connector-registry";
import {
  buildPortalCsv,
  buildPortalPublicationPayload,
  buildPortalXlsx,
  getPortalAdapter,
  hashPortalPayload,
  validatePortalEndpoint,
} from "./src/lib/portals/portal-adapter.server";
import type { Json } from "./src/integrations/supabase/types";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const migrationPath = "supabase/migrations/20260729103000_pr_m2_portal_functional_completion.sql";
const migration = read(migrationPath);
const authority = read("src/lib/api/tenant-portal-authority.server.ts");
const functions = read("src/lib/api/tenant-portal.functions.ts");
const legacyBarrel = read("src/lib/api/portals.functions.ts");
const adapter = read("src/lib/portals/portal-adapter.server.ts");
const worker = read("src/lib/portals/tenant-portal-worker.server.ts");
const route = read("src/routes/_authenticated.admin.portais.tsx");

let passed = 0;
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[PR-M2 portals] ${message}`);
  passed += 1;
}
function includesAll(content: string, tokens: readonly string[], label: string) {
  for (const token of tokens) check(content.includes(token), `${label} missing ${token}`);
}
function rejects(label: string, action: () => unknown, token: string) {
  try {
    action();
    throw new Error(`${label} unexpectedly accepted`);
  } catch (error) {
    check(error instanceof Error && error.message.includes(token), `${label} must reject with ${token}`);
  }
}

check(PORTAL_CONNECTOR_REGISTRY.length === 4, "closed registry must contain four automated transport contracts");
check(new Set(PORTAL_CONNECTOR_REGISTRY.map((item) => item.connectorKey)).size === 4, "connector keys must be unique");
check(PORTAL_CONNECTOR_REGISTRY.every((item) => item.operationMode === "HYBRID"), "all connector definitions must be HYBRID");
check(PORTAL_CONNECTOR_REGISTRY.every((item) => item.availabilityState === "adapter_not_implemented"), "automated adapters must fail closed");
check(PORTAL_CONNECTOR_REGISTRY.every((item) => item.manualMethods.includes("CSV") && item.manualMethods.includes("XLSX") && item.manualMethods.includes("MANUAL_EXPORT")), "every connector must expose all manual methods");
check(PORTAL_AUTOMATED_METHODS.every((method) => getPortalConnectorDefinition(method).connectorKey === method), "every automated method must be cataloged");
check(PORTAL_CONFIGURATION_STATES.includes("credential_provisioning_required"), "credential provisioning state must exist");
check(PORTAL_CONFIGURATION_STATES.includes("adapter_not_implemented"), "adapter-not-implemented state must exist");
check(PORTAL_JOB_STATES.includes("failed_terminal"), "dead-letter terminal state must exist");
check(PORTAL_JOB_STATES.includes("reconciliation_required"), "reconciliation state must exist");
rejects("unknown connector", () => getPortalConnectorDefinition("INVENTED"), "portal_connector_not_cataloged");

const config = parsePortalHybridConfig({
  operation_mode: "HYBRID",
  automated_method: "JSON_API",
  manual_method: "CSV",
  configuration_schema_version: 1,
  credential_reference: "credential://tenant/portal/provider",
  mapping_profile: "default-v1",
  mapping_version: 1,
  publication_rules: { only_published: true, include_statuses: ["publicado"], batch_size: 100 },
  retry_policy: { max_attempts: 5, initial_delay_seconds: 30, max_delay_seconds: 3600 },
});
check(config.operation_mode === "HYBRID", "valid config must remain HYBRID");
check(config.mapping_version === 1, "mapping version must be explicit");
rejects("inline token", () => assertNoPortalInlineSecrets({ api_token: "raw" }), "portal_inline_secret_prohibited");
rejects("inline password", () => assertNoPortalInlineSecrets({ nested: { password: "raw" } }), "portal_inline_secret_prohibited");
rejects("wrong operation mode", () => parsePortalHybridConfig({ ...config, operation_mode: "AUTOMATED" }), "");
rejects("unknown config key", () => parsePortalHybridConfig({ ...config, arbitrary: true }), "");
rejects("bad credential reference", () => parsePortalHybridConfig({ ...config, credential_reference: "raw-secret" }), "");

for (const [from, to] of [
  ["not_selected", "queued"],
  ["queued", "processing"],
  ["processing", "failed_retryable"],
  ["failed_retryable", "retry_scheduled"],
  ["retry_scheduled", "queued"],
  ["processing", "failed_terminal"],
  ["failed_terminal", "reconciliation_required"],
  ["reconciliation_required", "published"],
  ["published", "unpublish_queued"],
  ["unpublish_queued", "unpublishing"],
  ["unpublishing", "unpublished"],
] as const) {
  assertPortalJobTransition(from, to);
  check(true, `${from} -> ${to} must be allowed`);
}
rejects("invalid job jump", () => assertPortalJobTransition("queued", "published"), "portal_job_transition_invalid");
rejects("terminal retry", () => assertPortalJobTransition("failed_terminal", "retry_scheduled"), "portal_job_transition_invalid");
rejects("cancelled mutation", () => assertPortalJobTransition("cancelled", "queued"), "portal_job_transition_invalid");

check(validatePortalEndpoint("https://portal.example.com/api")?.startsWith("https://") === true, "HTTPS endpoint must be accepted");
rejects("HTTP endpoint", () => validatePortalEndpoint("http://portal.example.com"), "portal_endpoint_https_required");
rejects("private endpoint", () => validatePortalEndpoint("https://192.168.1.4/api"), "portal_endpoint_private_network_prohibited");
rejects("embedded endpoint credentials", () => validatePortalEndpoint("https://user:pass@portal.example.com"), "portal_endpoint_credentials_prohibited");

const property = {
  id: "11111111-1111-4111-8111-111111111111",
  tenant_id: "22222222-2222-4222-8222-222222222222",
  titulo: "Imóvel teste",
  descricao: "Descrição",
  codigo: "ABC-1",
  tipo: "apartamento",
  finalidade: "venda",
  preco: 500000,
  preco_sob_consulta: false,
  cidade: "Belo Horizonte",
  estado: "MG",
  quartos: 3,
  banheiros: 2,
  vagas: 2,
  area_util: 100,
  status: "publicado",
  publicado_em: "2026-07-29T00:00:00.000Z",
  updated_at: "2026-07-29T00:00:00.000Z",
};
const media = [{
  id: "33333333-3333-4333-8333-333333333333",
  tenant_id: property.tenant_id,
  imovel_id: property.id,
  url: `${property.tenant_id}/${property.id}/image.webp`,
  ordem: 1,
}];
const payload = buildPortalPublicationPayload({ property, media, mapping: DEFAULT_PORTAL_MAPPING });
check(payload.property.id === property.id, "payload must derive property id from server row");
check(payload.media[0]?.persistedReference === media[0].url, "payload must use persisted media reference");
rejects("cross tenant media", () => buildPortalPublicationPayload({ property, media: [{ ...media[0], tenant_id: "44444444-4444-4444-8444-444444444444" }], mapping: DEFAULT_PORTAL_MAPPING }), "tenant_portal_cross_tenant_media");
rejects("draft property", () => buildPortalPublicationPayload({ property: { ...property, status: "rascunho", publicado_em: null }, media: [], mapping: DEFAULT_PORTAL_MAPPING }), "tenant_portal_property_ineligible");

const csvA = buildPortalCsv([payload]);
const csvB = buildPortalCsv([payload]);
check(csvA === csvB, "CSV generation must be deterministic");
check(csvA.includes("Imóvel teste"), "CSV must include mapped property");
check(buildPortalCsv([]).split("\n").length === 1, "empty CSV must be explicit header-only export");
const xlsxA = await buildPortalXlsx([payload]);
const xlsxB = await buildPortalXlsx([payload]);
check(xlsxA.byteLength > 100, "XLSX must be generated");
check(xlsxB.byteLength > 100, "repeated XLSX must be generated");
const payloadHashA = await hashPortalPayload(payload as unknown as Json);
const payloadHashB = await hashPortalPayload(payload as unknown as Json);
check(payloadHashA === payloadHashB && /^[0-9a-f]{64}$/.test(payloadHashA), "payload hash must be deterministic SHA-256");
const adapterResult = await getPortalAdapter("JSON_API").publish({ endpoint: null, credentialReference: null, payload, timeoutMs: 1000 });
check(!adapterResult.ok && adapterResult.errorCode === "adapter_not_implemented", "automated adapter must never fake success");

includesAll(authority, [
  "authorizeTenantPortalOperation",
  "authorizeTenantPortalCredentialOperation",
  "authorizeTenantPortalPublicationOperation",
  "requireTenantScopedAuthority",
  "resolveEffectiveTenantPermission",
  '"portals"',
  'decision.scope !== "global"',
  '.eq("tenant_id", tenantId)',
  '.eq("id", connectorId)',
  "safeTenantPortalError",
], "portal authority");
check(!authority.includes('has_role'), "portal authority must not use has_role");
check(!authority.includes('user_roles'), "portal authority must not use user_roles");

includesAll(functions, [
  "getPortalConnectorRegistry",
  "listTenantPortalConnectors",
  "getTenantPortalConnector",
  "saveTenantPortalConnector",
  "setTenantPortalConnectorState",
  "rotateTenantPortalCredentialReference",
  "listTenantPortalMappings",
  "saveTenantPortalMapping",
  "enqueueTenantPortalPublication",
  "enqueueTenantPortalUnpublication",
  "retryTenantPortalJob",
  "cancelTenantPortalJob",
  "reconcileTenantPortalPublication",
  "listTenantPortalJobs",
  "getTenantPortalJob",
  "listTenantPortalAttempts",
  "listTenantPortalLogs",
  "generateTenantPortalManualExport",
  "getTenantPortalDashboard",
  "getTenantPortalDiagnostics",
  "requireTenant",
  "portal-exports",
  "createSignedUrl",
], "portal server functions");
check(!/\.from\("portal_connectors"\)[\s\S]{0,500}\.(insert|update|upsert|delete)/.test(functions), "server functions must not mutate connector tables directly");
check(!/\.from\("tenant_portal_jobs"\)[\s\S]{0,500}\.(insert|update|upsert|delete)/.test(functions), "server functions must not mutate jobs directly");
check(!functions.includes("fallback"), "portal functions must not implement fallback");
check(!functions.includes("feed_token"), "portal DTOs must not expose feed_token");
check(!functions.includes("webhook_secret"), "portal DTOs must not expose webhook_secret");

includesAll(worker, [
  "executeTenantPortalJob",
  '"claim_tenant_portal_job"',
  '"record_tenant_portal_attempt"',
  '"complete_tenant_portal_job"',
  "adapter_not_implemented",
  '.eq("tenant_id", input.tenantId)',
  '.eq("id", input.jobId)',
], "portal worker");
check(!/order\([\s\S]{0,100}limit\(1\)/i.test(worker), "worker must not select authoritative job through ORDER BY/LIMIT 1");
check(!worker.includes("feed_token"), "worker must not read legacy feed token");
check(!worker.includes("webhook_secret"), "worker must not read legacy webhook secret");

includesAll(migration, [
  "portal_connector_credential_verifiers",
  "tenant_portal_mappings",
  "tenant_portal_jobs",
  "tenant_portal_job_attempts",
  "tenant_portal_exports",
  "portal_connectors_no_plaintext_credentials_check",
  "tenant_portal_legacy_projection_connector_ambiguous",
  "assert_tenant_portal_authority",
  "validate_tenant_portal_config",
  "assert_tenant_portal_transition",
  "save_tenant_portal_connector",
  "set_tenant_portal_connector_state",
  "rotate_tenant_portal_credential_reference",
  "save_tenant_portal_mapping",
  "enqueue_tenant_portal_publication",
  "claim_tenant_portal_job",
  "record_tenant_portal_attempt",
  "complete_tenant_portal_job",
  "schedule_tenant_portal_retry",
  "cancel_tenant_portal_job",
  "reconcile_tenant_portal_state",
  "record_tenant_portal_export",
  "FOR UPDATE SKIP LOCKED",
  "tenant_portal_idempotency_conflict",
  "adapter_not_implemented",
  "REVOKE ALL ON TABLE public.portal_connectors FROM PUBLIC, anon, authenticated",
  "GRANT ALL ON TABLE public.tenant_portal_jobs TO service_role",
  "REVOKE ALL ON FUNCTION",
  "GRANT EXECUTE ON FUNCTION",
], "portal migration");
check(!/ORDER BY[\s\S]{0,100}LIMIT\s+1/i.test(migration), "migration must not use ORDER BY/LIMIT 1 as authority");
check(!/GRANT\s+(SELECT|INSERT|UPDATE|DELETE|ALL)[\s\S]{0,100}\sTO\s+(anon|authenticated)/i.test(migration), "migration must not grant direct portal table access");
check(migration.includes("feed_token = NULL") && migration.includes("webhook_secret = NULL"), "legacy plaintext credentials must be removed");
check(migration.includes("encode(digest(feed_token, 'sha256'), 'hex')"), "legacy high-entropy token must become one-way verifier before removal");
check(
  migration.includes("current_state text NOT NULL CHECK") &&
    migration.includes("Active authority is tenant_portal_jobs.current_state=failed_terminal"),
  "dead-letter state must be explicit in the canonical schema",
);

check(legacyBarrel.includes("Read-only compatibility aliases"), "legacy module must be a single canonical barrel");
check(!legacyBarrel.includes("randomBytes"), "legacy barrel must not issue raw tokens");
check(!legacyBarrel.includes("has_role"), "legacy barrel must not authorize through roles");
check(!legacyBarrel.includes('.update('), "legacy barrel must not mutate directly");

includesAll(route, [
  "adapter_not_implemented",
  "credential_provisioning_required",
  "retry_available",
  "failed_retryable",
  "failed_terminal",
  "reconciliationRequired",
  "CSV",
  "XLSX",
  "MANUAL_EXPORT",
  "Plaintext credentials",
  "Direct client mutation",
  "real publication not executed",
], "portal UI");
check(!route.includes("issuedToken"), "UI must not expose one-time raw tokens");
check(!route.includes("rotacionarToken"), "UI must not call legacy token rotation");
check(!route.includes("JSON.stringify(connector"), "UI must not expose raw connector JSON");

console.log(JSON.stringify({
  status: "PASS",
  passed,
  connectorRegistryCount: PORTAL_CONNECTOR_REGISTRY.length,
  adapterImplementedCount: 0,
  adapterNotImplementedCount: PORTAL_CONNECTOR_REGISTRY.length,
  operationMode: "HYBRID",
  manualFormats: ["CSV", "XLSX", "MANUAL_EXPORT"],
  jobStates: PORTAL_JOB_STATES,
  plaintextCredentials: false,
  inlineSecrets: false,
  fakeExternalSuccess: false,
  serviceRoleMutationsOnly: true,
  managedLiveBackendMigrationExecuted: false,
  realExternalPortalExecutionPerformed: false,
}, null, 2));
