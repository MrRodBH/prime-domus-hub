import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  DEFAULT_MARKETING_FIELD_MAPPING,
  MARKETING_AVAILABILITY_STATES,
  MARKETING_CHANNEL_KEYS,
  MARKETING_CHANNEL_REGISTRY,
  MARKETING_IMPORT_ROW_STATES,
  MARKETING_IMPORT_STATES,
  MARKETING_INGESTION_STATES,
  MARKETING_MANUAL_METHODS,
  MARKETING_MAPPING_TARGETS,
  MarketingConnectorConfigSchema,
  MarketingFieldMappingSchema,
  assertNoMarketingInlineSecrets,
  getMarketingChannelDefinition,
} from "./src/lib/marketing/marketing-channel-registry";
import {
  deterministicMarketingPayloadId,
  hashMarketingPayload,
  mapMarketingLead,
  normalizeMarketingEmail,
  normalizeMarketingPhone,
  parseMarketingManualImport,
  sanitizeMarketingPayload,
  stableMarketingJson,
  verifyMarketingHmacSha256,
} from "./src/lib/marketing/marketing-ingestion.server";

let assertions = 0;
const ok = (value: unknown, message: string): void => { assert.ok(value, message); assertions += 1; };
const equal = (actual: unknown, expected: unknown, message: string): void => { assert.equal(actual, expected, message); assertions += 1; };
const throws = (fn: () => unknown, token: string): void => {
  assert.throws(fn, (error: unknown) => error instanceof Error && error.message.includes(token));
  assertions += 1;
};
const has = (source: string, token: string): void => ok(source.includes(token), `missing ${token}`);
const lacks = (source: string, token: string): void => ok(!source.includes(token), `prohibited ${token}`);

const files = {
  authority: readFileSync("src/lib/api/tenant-marketing-authority.server.ts", "utf8"),
  functions: readFileSync("src/lib/api/tenant-marketing.functions.ts", "utf8"),
  provider: readFileSync("src/lib/marketing/marketing-provider-ingestion.server.ts", "utf8"),
  route: readFileSync("src/routes/_authenticated.admin.marketing.tsx", "utf8"),
  contexts: readFileSync("src/components/workspace/contexts.ts", "utf8"),
  migration: readFileSync("supabase/migrations/20260729233000_pr_m2_marketing_channels_lead_ingestion.sql", "utf8"),
  publicWriter: readFileSync("src/lib/public-writers/public-writer-authority.server.ts", "utf8"),
  crmMigration: readFileSync("supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql", "utf8"),
  packageJson: readFileSync("package.json", "utf8"),
  release: readFileSync("scripts/verify-release.mjs", "utf8"),
};

// Closed registries and factual provider availability.
equal(MARKETING_CHANNEL_KEYS.length, 4, "channel cardinality");
equal(MARKETING_CHANNEL_REGISTRY.length, 4, "registry cardinality");
equal(MARKETING_MANUAL_METHODS.length, 3, "manual methods");
equal(MARKETING_MAPPING_TARGETS.length, 22, "mapping targets");
equal(MARKETING_INGESTION_STATES.length, 11, "ingestion states");
equal(MARKETING_IMPORT_STATES.length, 6, "import states");
equal(MARKETING_IMPORT_ROW_STATES.length, 6, "row states");
for (const state of ["manual_ready", "automated_ready", "adapter_not_implemented", "mapping_required", "failed"]) {
  ok(MARKETING_AVAILABILITY_STATES.some((item) => item === state), `${state}:catalogued`);
}
for (const key of MARKETING_CHANNEL_KEYS) {
  const item = getMarketingChannelDefinition(key);
  equal(item.channelKey, key, `${key}:key`);
  equal(item.operationMode, "HYBRID", `${key}:mode`);
  equal(item.schemaVersion, 1, `${key}:schema`);
  equal(item.campaignIdContract, "data_only_never_authority", `${key}:campaign`);
  equal(item.adsetIdContract, "data_only_never_authority", `${key}:adset`);
  equal(item.adIdContract, "data_only_never_authority", `${key}:ad`);
  equal(item.utmContract, "data_only_never_authority", `${key}:utm`);
  equal(item.deduplicationContract, "exact_normalized_email_or_phone_review_required", `${key}:dedup`);
  equal(item.pipelineContract, "unique_explicit_default_pipeline_and_status_stage", `${key}:pipeline`);
}
equal(getMarketingChannelDefinition("META_ADS").availabilityState, "adapter_not_implemented", "Meta factual state");
equal(getMarketingChannelDefinition("GOOGLE_ADS").availabilityState, "adapter_not_implemented", "Google factual state");
equal(getMarketingChannelDefinition("MANUAL_IMPORT").availabilityState, "manual_ready", "manual ready");
equal(getMarketingChannelDefinition("WEBSITE_FORM").leadWriterContract, "ptw01_existing_public_writer", "PTW authority");
throws(() => getMarketingChannelDefinition("UNKNOWN"), "marketing_channel_not_cataloged");

// Strict config, closed mapping and no inline secrets.
const manualConfig = {
  channelKey: "MANUAL_IMPORT" as const,
  operationMode: "HYBRID" as const,
  configurationVersion: 1 as const,
  providerAccountReference: null,
  providerFormReference: null,
  credentialReference: null,
  mappingVersion: 1,
};
equal(MarketingConnectorConfigSchema.safeParse(manualConfig).success, true, "manual config");
for (const injected of [
  { tenantId: "x" }, { actorUserId: "x" }, { operationMode: "AUTOMATED" },
  { configurationVersion: 2 }, { credentialReference: "credential://forbidden" },
]) equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, ...injected }).success, false, "strict config");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, channelKey: "META_ADS" }).success, false, "Meta account required");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, channelKey: "META_ADS", providerAccountReference: "act_123" }).success, true, "Meta draft");
for (const key of ["access_token", "client_secret", "app_secret", "refresh_token", "authorization", "password", "api_key"]) {
  throws(() => assertNoMarketingInlineSecrets({ [key]: "secret" }), "marketing_inline_secret_prohibited");
}
assertNoMarketingInlineSecrets({ credentialReference: "credential://marketing/meta" }); assertions += 1;
equal(MarketingFieldMappingSchema.safeParse(DEFAULT_MARKETING_FIELD_MAPPING).success, true, "default mapping");
for (const target of MARKETING_MAPPING_TARGETS) ok(target in DEFAULT_MARKETING_FIELD_MAPPING, `${target}:default`);
for (const key of ["tenant_id", "tenantId", "actor_user_id", "actorUserId", "assigned_to", "pipeline_id", "stage_id"]) {
  equal(MarketingFieldMappingSchema.safeParse({ ...DEFAULT_MARKETING_FIELD_MAPPING, [key]: key }).success, false, `${key}:denied`);
}

// Deterministic identity, sanitized payload and generic signature primitive.
equal(stableMarketingJson({ b: 2, a: 1 }), stableMarketingJson({ a: 1, b: 2 }), "stable JSON");
equal(hashMarketingPayload({ b: 2, a: 1 }), hashMarketingPayload({ a: 1, b: 2 }), "stable hash");
ok(/^[0-9a-f]{64}$/.test(hashMarketingPayload({ a: 1 })), "SHA-256");
ok(deterministicMarketingPayloadId({ a: 1 }).startsWith("sha256:"), "payload ID");
const sanitized = sanitizeMarketingPayload({ access_token: "abc", nested: { password: "x", safe: "ok" } }) as Record<string, any>;
equal(sanitized.access_token, "[redacted]", "token redacted");
equal(sanitized.nested.password, "[redacted]", "password redacted");
equal(sanitized.nested.safe, "ok", "safe preserved");
const rawBody = JSON.stringify({ lead: "fixture" });
const timestamp = 1_800_000_000;
const secret = "fixture-secret-with-minimum-length";
const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: signature, timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret }), true, "valid signature");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: "0".repeat(64), timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret }), false, "invalid signature");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: signature, timestampSeconds: timestamp, nowSeconds: timestamp + 301, maxSkewSeconds: 300, secret }), false, "expired signature");

// Lead normalization and attribution.
equal(normalizeMarketingEmail(" Test@Example.COM "), "test@example.com", "email normalized");
throws(() => normalizeMarketingEmail("invalid"), "marketing_email_invalid");
equal(normalizeMarketingPhone("+55 (31) 99999-9999"), "5531999999999", "phone normalized");
throws(() => normalizeMarketingPhone("123"), "marketing_phone_invalid");
const mapped = mapMarketingLead({
  row: {
    name: "Maria Silva", email: "MARIA@example.com", phone: "+55 31 99999-9999",
    message: "Quero saber mais", property_reference: "ABC-123", source: "meta",
    campaign_id: "cmp-1", campaign_name: "Campanha 1", adset_id: "set-1", adset_name: "Público 1",
    ad_id: "ad-1", ad_name: "Criativo 1", utm_source: "facebook", utm_medium: "paid_social",
    utm_campaign: "campanha-1", utm_content: "criativo-1", utm_term: "imoveis",
    gclid: "gclid-data", fbclid: "fbclid-data", landing_url: "https://example.com/imovel",
    referrer: "https://facebook.com", provider_payload_id: "payload-1",
  },
  mapping: DEFAULT_MARKETING_FIELD_MAPPING,
  channelKey: "META_ADS",
  connectorId: "11111111-1111-4111-8111-111111111111",
  mappingVersion: 1,
  receivedAt: "2026-07-29T12:00:00.000Z",
});
for (const [actual, expected] of [
  [mapped.normalizedEmail, "maria@example.com"], [mapped.normalizedPhone, "5531999999999"],
  [mapped.attribution.provider, "meta"], [mapped.attribution.campaignId, "cmp-1"],
  [mapped.attribution.adsetId, "set-1"], [mapped.attribution.adId, "ad-1"],
  [mapped.attribution.utmSource, "facebook"], [mapped.attribution.utmMedium, "paid_social"],
  [mapped.attribution.utmCampaign, "campanha-1"], [mapped.attribution.gclid, "gclid-data"],
  [mapped.attribution.fbclid, "fbclid-data"], [mapped.attribution.providerPayloadId, "payload-1"],
]) equal(actual, expected, "mapped attribution");
throws(() => mapMarketingLead({ row: { name: "Maria" }, mapping: DEFAULT_MARKETING_FIELD_MAPPING, channelKey: "MANUAL_IMPORT", connectorId: "11111111-1111-4111-8111-111111111111", mappingVersion: 1, receivedAt: "2026-07-29T12:00:00.000Z" }), "marketing_contact_required");

// Manual CSV/XLSX preview and formula rejection.
const csv = "name,email,phone\nMaria,maria@example.com,31999999999\nJoao,joao@example.com,31888888888";
const csvRows = parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from(csv).toString("base64") });
equal(csvRows.length, 2, "CSV rows");
throws(() => parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from("name,email\n=CMD(),x@example.com").toString("base64") }), "marketing_spreadsheet_formula_prohibited");
throws(() => parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from("name,name\nA,B").toString("base64") }), "marketing_import_header_duplicate_or_blank");
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ name: "Maria", email: "maria@example.com" }]), "Leads");
equal(parseMarketingManualImport({ format: "XLSX", contentBase64: XLSX.write(workbook, { type: "base64", bookType: "xlsx" }) }).length, 1, "XLSX rows");
const formulaWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(formulaWorkbook, XLSX.utils.aoa_to_sheet([["name", "email"], ["Maria", { f: 'HYPERLINK("https://evil.invalid")', v: "click" }]]), "Leads");
throws(() => parseMarketingManualImport({ format: "XLSX", contentBase64: XLSX.write(formulaWorkbook, { type: "base64", bookType: "xlsx" }) }), "marketing_spreadsheet_formula_prohibited");

// Server authority, wrappers and isolated provider boundary.
for (const token of ["requireTenantScopedAuthority", "resolveEffectiveTenantPermission", '"crm"', 'decision.scope !== "global"', "super_admin_impersonation", "tenant_owner"]) has(files.authority, token);
for (const token of ['.rpc("has_role"', '.from("user_roles")', "ORDER BY", "LIMIT 1"]) lacks(files.authority, token);
for (const token of [
  "middleware([requireTenant])", "authorizeTenantMarketingOperation", "listTenantMarketingChannels",
  "listTenantMarketingConnectors", "saveTenantMarketingConnectorDraft", "setTenantMarketingCredentialReference",
  "saveTenantMarketingMapping", "previewTenantMarketingManualImport", "createTenantMarketingManualImport",
  "executeTenantMarketingManualImport", "listTenantMarketingIngestionEvents", "retryTenantMarketingIngestion",
  "getTenantMarketingDiagnostics", 'await import("@/lib/marketing/marketing-ingestion.server")',
]) has(files.functions, token);
for (const token of ["node:crypto", "xlsx", "_tenant_id: data.", "_actor_user_id: data.", '.from("leads").insert', '.from("leads").update', "fetch("]) lacks(files.functions, token);
for (const token of ["receiveMarketingProviderPayload", "verifyMarketingProviderPayload", "ingestVerifiedMarketingLead", "marketing_adapter_not_implemented", "serverResolvedSecret", "connectorId"]) has(files.provider, token);
for (const token of ["META_GRAPH_URL", "GOOGLE_ADS_URL", "fetch(", "tenantId", "actorUserId"]) lacks(files.provider, token);

// Schema, idempotency, CRM linkage, ACL and no network transaction.
for (const token of [
  "tenant_marketing_connectors", "tenant_marketing_connector_versions", "tenant_marketing_field_mappings",
  "tenant_marketing_ingestion_events", "tenant_marketing_ingestion_attempts", "tenant_marketing_manual_imports",
  "tenant_marketing_manual_import_rows", "provider_payload_id", "payload_hash", "campaign_id", "adset_id", "ad_id",
  "duplicate_candidate_ids", "credential_reference", "assert_tenant_marketing_authority",
  "reserve_marketing_ingestion_payload", "complete_marketing_ingestion_payload",
  "create_tenant_marketing_manual_import", "execute_tenant_marketing_manual_import",
  "pg_advisory_xact_lock", "marketing_payload_idempotency_conflict", "marketing_adapter_not_implemented",
  "marketing_parallel_public_writer_prohibited", "merge_state='active'", "normalized_email", "normalized_phone",
  "create_tenant_crm_lead", "original_attribution", "latest_attribution", "utm_source", "gclid", "fbclid",
  "INSERT INTO public.audit_log", "ENABLE ROW LEVEL SECURITY", "FROM PUBLIC, anon, authenticated", "TO service_role",
]) has(files.migration, token);
for (const token of ["net.http", "http_post", "ORDER BY created_at LIMIT 1", "ORDER BY id LIMIT 1", "automatic_merge", "fuzzy"]) lacks(files.migration, token);

// Functional UI, seven contexts and preserved PTW/CRM boundaries.
for (const token of ["Marketing & Lead Ingestion Center", "adapter_not_implemented", "Preview server-side", "Persistir importação", "Ingestion ledger", "retry_available"]) has(files.route, token);
for (const token of ['.from("tenant_marketing_', '.from("leads")', "access_token"]) lacks(files.route, token);
has(files.contexts, 'matches: ["/admin/portais", "/admin/marketing"]');
has(files.contexts, '{ label: "Marketing", to: "/admin/marketing" }');
equal((files.contexts.match(/\n    id: "/g) ?? []).length, 7, "seven contexts");
for (const token of ["requirePublicTenantFromRequest", "requirePublicWriterTenantFromRequest", "public_tenant_unresolved"]) has(files.publicWriter, token);
for (const token of ["crm_bind_lead_pipeline_trigger", "crm_ambiguous_state:default_pipeline", "crm_ambiguous_state:new_stage"]) has(files.crmMigration, token);

// Release integration.
has(files.packageJson, '"test:pr-m2:marketing-channels-lead-ingestion-functional-completion"');
has(files.release, "PR-M2 — Marketing channels and lead ingestion functional completion specifications");
has(files.release, "prM2MarketingChannelsLeadIngestionFunctionalCompletionSpecsPassed");

ok(assertions >= 170, `expected >= 170 assertions, got ${assertions}`);
console.log(`PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPECS=PASS");
