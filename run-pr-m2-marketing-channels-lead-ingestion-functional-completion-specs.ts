import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  DEFAULT_MARKETING_FIELD_MAPPING,
  MARKETING_AUTOMATED_METHODS,
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
function ok(value: unknown, message: string): void {
  assert.ok(value, message);
  assertions += 1;
}
function equal(actual: unknown, expected: unknown, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function throws(fn: () => unknown, token: string, message = token): void {
  assert.throws(fn, (error: unknown) => error instanceof Error && error.message.includes(token), message);
  assertions += 1;
}
function has(source: string, token: string, message = token): void {
  ok(source.includes(token), `missing ${message}`);
}
function lacks(source: string, token: string, message = token): void {
  ok(!source.includes(token), `prohibited ${message}`);
}

const files = {
  registry: readFileSync("src/lib/marketing/marketing-channel-registry.ts", "utf8"),
  ingestion: readFileSync("src/lib/marketing/marketing-ingestion.server.ts", "utf8"),
  authority: readFileSync("src/lib/api/tenant-marketing-authority.server.ts", "utf8"),
  functions: readFileSync("src/lib/api/tenant-marketing.functions.ts", "utf8"),
  route: readFileSync("src/routes/_authenticated.admin.marketing.tsx", "utf8"),
  contexts: readFileSync("src/components/workspace/contexts.ts", "utf8"),
  migration: readFileSync("supabase/migrations/20260729233000_pr_m2_marketing_channels_lead_ingestion.sql", "utf8"),
  publicWriter: readFileSync("src/lib/public-writers/public-writer-authority.server.ts", "utf8"),
  crmMigration: readFileSync("supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql", "utf8"),
  packageJson: readFileSync("package.json", "utf8"),
  release: readFileSync("scripts/verify-release.mjs", "utf8"),
};

// Closed registries and factual provider availability.
equal(MARKETING_CHANNEL_KEYS.length, 4, "closed channel count");
equal(MARKETING_CHANNEL_REGISTRY.length, 4, "registry cardinality");
equal(MARKETING_MANUAL_METHODS.length, 3, "manual methods");
equal(MARKETING_AUTOMATED_METHODS.length, 2, "automated method catalog");
equal(MARKETING_MAPPING_TARGETS.length, 22, "closed mapping targets");
equal(MARKETING_INGESTION_STATES.length, 11, "ingestion states");
equal(MARKETING_IMPORT_STATES.length, 6, "import states");
equal(MARKETING_IMPORT_ROW_STATES.length, 6, "import row states");
ok(MARKETING_AVAILABILITY_STATES.includes("adapter_not_implemented"), "adapter state cataloged");
ok(MARKETING_AVAILABILITY_STATES.includes("manual_ready"), "manual state cataloged");
ok(MARKETING_AVAILABILITY_STATES.includes("automated_ready"), "automated state cataloged");

for (const channelKey of MARKETING_CHANNEL_KEYS) {
  const definition = getMarketingChannelDefinition(channelKey);
  equal(definition.channelKey, channelKey, `${channelKey}:stable key`);
  equal(definition.operationMode, "HYBRID", `${channelKey}:HYBRID`);
  equal(definition.schemaVersion, 1, `${channelKey}:schema version`);
  equal(definition.payloadIdContract, "provider_payload_id_or_deterministic_hash", `${channelKey}:payload ID`);
  equal(definition.campaignIdContract, "data_only_never_authority", `${channelKey}:campaign data only`);
  equal(definition.adsetIdContract, "data_only_never_authority", `${channelKey}:adset data only`);
  equal(definition.adIdContract, "data_only_never_authority", `${channelKey}:ad data only`);
  equal(definition.utmContract, "data_only_never_authority", `${channelKey}:UTM data only`);
  equal(definition.fieldMappingContract, "versioned_closed_target_map", `${channelKey}:mapping`);
  equal(definition.deduplicationContract, "exact_normalized_email_or_phone_review_required", `${channelKey}:dedup`);
  equal(definition.initialHistoryContract, "canonical_lead_created_plus_ingestion_ledger", `${channelKey}:history`);
  equal(definition.pipelineContract, "unique_explicit_default_pipeline_and_status_stage", `${channelKey}:pipeline`);
  equal(definition.diagnosticsContract, "sanitized_no_secret_no_raw_sensitive_payload", `${channelKey}:diagnostics`);
  equal(definition.rollbackContract, "disable_connector_preserve_ledger", `${channelKey}:rollback`);
}

equal(getMarketingChannelDefinition("META_ADS").availabilityState, "adapter_not_implemented", "Meta adapter absent");
equal(getMarketingChannelDefinition("GOOGLE_ADS").availabilityState, "adapter_not_implemented", "Google adapter absent");
equal(getMarketingChannelDefinition("MANUAL_IMPORT").availabilityState, "manual_ready", "manual ready");
equal(getMarketingChannelDefinition("WEBSITE_FORM").availabilityState, "automated_ready", "PTW existing writer");
equal(getMarketingChannelDefinition("WEBSITE_FORM").leadWriterContract, "ptw01_existing_public_writer", "single public writer");
throws(() => getMarketingChannelDefinition("UNKNOWN"), "marketing_channel_not_cataloged", "unknown channel denied");

// Strict connector config and inline-secret rejection.
const manualConfig = {
  channelKey: "MANUAL_IMPORT" as const,
  operationMode: "HYBRID" as const,
  configurationVersion: 1 as const,
  providerAccountReference: null,
  providerFormReference: null,
  credentialReference: null,
  mappingVersion: 1,
};
equal(MarketingConnectorConfigSchema.safeParse(manualConfig).success, true, "manual config valid");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, tenantId: "x" }).success, false, "tenant config input denied");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, actorUserId: "x" }).success, false, "actor config input denied");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, operationMode: "AUTOMATED" }).success, false, "non-HYBRID denied");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, configurationVersion: 2 }).success, false, "unknown config version denied");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, credentialReference: "credential://forbidden" }).success, false, "manual credential denied");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, channelKey: "META_ADS" }).success, false, "Meta account required");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, channelKey: "META_ADS", providerAccountReference: "act_123" }).success, true, "Meta draft valid");

for (const key of ["access_token", "client_secret", "app_secret", "refresh_token", "authorization", "password", "api_key", "apikey"]) {
  throws(() => assertNoMarketingInlineSecrets({ [key]: "secret-value" }), "marketing_inline_secret_prohibited", `${key}:inline secret denied`);
}
assertNoMarketingInlineSecrets({ credentialReference: "credential://marketing/meta" }); assertions += 1;
assertNoMarketingInlineSecrets({ nested: [{ safe: "value" }] }); assertions += 1;

// Closed mapping and authority-field rejection by strict schema.
equal(MarketingFieldMappingSchema.safeParse(DEFAULT_MARKETING_FIELD_MAPPING).success, true, "default mapping valid");
for (const target of MARKETING_MAPPING_TARGETS) {
  ok(Object.prototype.hasOwnProperty.call(DEFAULT_MARKETING_FIELD_MAPPING, target), `${target}:default mapping exists`);
}
equal(MarketingFieldMappingSchema.safeParse({ ...DEFAULT_MARKETING_FIELD_MAPPING, tenant_id: "tenant" }).success, false, "tenant target denied");
equal(MarketingFieldMappingSchema.safeParse({ ...DEFAULT_MARKETING_FIELD_MAPPING, assigned_to: "assigned" }).success, false, "assignment target denied");
equal(MarketingFieldMappingSchema.safeParse({ ...DEFAULT_MARKETING_FIELD_MAPPING, pipeline_id: "pipeline" }).success, false, "pipeline target denied");
equal(MarketingFieldMappingSchema.safeParse({ ...DEFAULT_MARKETING_FIELD_MAPPING, stage_id: "stage" }).success, false, "stage target denied");
equal(MarketingFieldMappingSchema.safeParse({ ...DEFAULT_MARKETING_FIELD_MAPPING, name: "" }).success, false, "blank name path denied");
equal(MarketingFieldMappingSchema.safeParse({ ...DEFAULT_MARKETING_FIELD_MAPPING, email: "bad path!" }).success, false, "invalid path denied");

// Stable hashing, sanitization and deterministic payload IDs.
equal(stableMarketingJson({ b: 2, a: 1 }), stableMarketingJson({ a: 1, b: 2 }), "stable object ordering");
equal(hashMarketingPayload({ b: 2, a: 1 }), hashMarketingPayload({ a: 1, b: 2 }), "stable hash");
ok(/^[0-9a-f]{64}$/.test(hashMarketingPayload({ a: 1 })), "sha256 hash");
ok(deterministicMarketingPayloadId({ a: 1 }).startsWith("sha256:"), "deterministic payload prefix");
equal((sanitizeMarketingPayload({ access_token: "abc", nested: { password: "x", safe: "ok" } }) as any).access_token, "[redacted]", "token redacted");
equal((sanitizeMarketingPayload({ access_token: "abc", nested: { password: "x", safe: "ok" } }) as any).nested.password, "[redacted]", "password redacted");
equal((sanitizeMarketingPayload({ access_token: "abc", nested: { password: "x", safe: "ok" } }) as any).nested.safe, "ok", "safe value preserved");

// Generic HMAC primitive is deterministic; no provider adapter is claimed.
const rawBody = JSON.stringify({ lead: "fixture" });
const timestamp = 1_800_000_000;
const secret = "fixture-secret-with-minimum-length";
const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: signature, timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret }), true, "valid HMAC");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: "0".repeat(64), timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret }), false, "invalid HMAC");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: signature, timestampSeconds: timestamp, nowSeconds: timestamp + 301, maxSkewSeconds: 300, secret }), false, "expired HMAC");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: "bad", timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret }), false, "malformed HMAC");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: signature, timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret: "short" }), false, "short secret denied");

// Normalization, attribution, campaign/ad/UTM mapping and exact duplicate keys.
equal(normalizeMarketingEmail(" Test@Example.COM "), "test@example.com", "email normalized");
equal(normalizeMarketingEmail(null), null, "email nullable");
throws(() => normalizeMarketingEmail("invalid"), "marketing_email_invalid", "invalid email");
equal(normalizeMarketingPhone("+55 (31) 99999-9999"), "5531999999999", "phone normalized");
equal(normalizeMarketingPhone(null), null, "phone nullable");
throws(() => normalizeMarketingPhone("123"), "marketing_phone_invalid", "short phone denied");

const mapped = mapMarketingLead({
  row: {
    name: "Maria Silva",
    email: "MARIA@example.com",
    phone: "+55 31 99999-9999",
    message: "Quero saber mais",
    property_reference: "ABC-123",
    source: "meta",
    campaign_id: "cmp-1",
    campaign_name: "Campanha 1",
    adset_id: "set-1",
    adset_name: "Público 1",
    ad_id: "ad-1",
    ad_name: "Criativo 1",
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_campaign: "campanha-1",
    utm_content: "criativo-1",
    utm_term: "imoveis",
    gclid: "gclid-data",
    fbclid: "fbclid-data",
    landing_url: "https://example.com/imovel",
    referrer: "https://facebook.com",
    provider_payload_id: "payload-1",
  },
  mapping: DEFAULT_MARKETING_FIELD_MAPPING,
  channelKey: "META_ADS",
  connectorId: "11111111-1111-4111-8111-111111111111",
  mappingVersion: 1,
  receivedAt: "2026-07-29T12:00:00.000Z",
});
equal(mapped.name, "Maria Silva", "mapped name");
equal(mapped.normalizedEmail, "maria@example.com", "mapped normalized email");
equal(mapped.normalizedPhone, "5531999999999", "mapped normalized phone");
equal(mapped.propertyReference, "ABC-123", "mapped property reference");
equal(mapped.attribution.channel, "META_ADS", "mapped channel");
equal(mapped.attribution.provider, "meta", "mapped provider");
equal(mapped.attribution.campaignId, "cmp-1", "campaign ID");
equal(mapped.attribution.campaignName, "Campanha 1", "campaign name");
equal(mapped.attribution.adsetId, "set-1", "adset ID");
equal(mapped.attribution.adsetName, "Público 1", "adset name");
equal(mapped.attribution.adId, "ad-1", "ad ID");
equal(mapped.attribution.adName, "Criativo 1", "ad name");
equal(mapped.attribution.utmSource, "facebook", "UTM source");
equal(mapped.attribution.utmMedium, "paid_social", "UTM medium");
equal(mapped.attribution.utmCampaign, "campanha-1", "UTM campaign");
equal(mapped.attribution.utmContent, "criativo-1", "UTM content");
equal(mapped.attribution.utmTerm, "imoveis", "UTM term");
equal(mapped.attribution.gclid, "gclid-data", "gclid data");
equal(mapped.attribution.fbclid, "fbclid-data", "fbclid data");
equal(mapped.attribution.providerPayloadId, "payload-1", "provider payload ID");
throws(() => mapMarketingLead({ row: { name: "M" }, mapping: DEFAULT_MARKETING_FIELD_MAPPING, channelKey: "MANUAL_IMPORT", connectorId: "11111111-1111-4111-8111-111111111111", mappingVersion: 1, receivedAt: "2026-07-29T12:00:00.000Z" }), "marketing_name_invalid", "short name denied");
throws(() => mapMarketingLead({ row: { name: "Maria" }, mapping: DEFAULT_MARKETING_FIELD_MAPPING, channelKey: "MANUAL_IMPORT", connectorId: "11111111-1111-4111-8111-111111111111", mappingVersion: 1, receivedAt: "2026-07-29T12:00:00.000Z" }), "marketing_contact_required", "contact required");

// Manual CSV and XLSX parsing, formula safety and bounds.
const csv = "name,email,phone\nMaria,maria@example.com,31999999999\nJoao,joao@example.com,31888888888";
const csvRows = parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from(csv).toString("base64") });
equal(csvRows.length, 2, "CSV row count");
equal(csvRows[0].name, "Maria", "CSV first name");
equal(csvRows[1].email, "joao@example.com", "CSV second email");
throws(() => parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from("name,email\n=CMD(),x@example.com").toString("base64") }), "marketing_spreadsheet_formula_prohibited", "CSV formula denied");
throws(() => parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from("name,name\nA,B").toString("base64") }), "marketing_import_header_duplicate_or_blank", "duplicate header denied");
throws(() => parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from("name,email\nA").toString("base64") }), "marketing_import_column_mismatch", "column mismatch denied");
throws(() => parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from("name,email").toString("base64") }), "marketing_import_csv_rows_required", "rows required");

const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.json_to_sheet([{ name: "Maria", email: "maria@example.com", phone: "31999999999" }]);
XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
const xlsxRows = parseMarketingManualImport({ format: "XLSX", contentBase64: XLSX.write(workbook, { type: "base64", bookType: "xlsx" }) });
equal(xlsxRows.length, 1, "XLSX row count");
equal(xlsxRows[0].name, "Maria", "XLSX mapped name");
const formulaWorkbook = XLSX.utils.book_new();
const formulaSheet = XLSX.utils.aoa_to_sheet([["name", "email"], ["Maria", { f: 'HYPERLINK("https://evil.invalid")', v: "click" }]]);
XLSX.utils.book_append_sheet(formulaWorkbook, formulaSheet, "Leads");
throws(() => parseMarketingManualImport({ format: "XLSX", contentBase64: XLSX.write(formulaWorkbook, { type: "base64", bookType: "xlsx" }) }), "marketing_spreadsheet_formula_prohibited", "XLSX formula denied");

// Server authority and strict wrappers.
for (const token of [
  "requireTenantScopedAuthority", "resolveEffectiveTenantPermission", '"crm"', 'decision.scope !== "global"',
  "super_admin_impersonation", "tenant_owner", "listTenantMarketingConnectorRows",
  "loadTenantMarketingConnector", "executeTenantMarketingRpc", "safeTenantMarketingError",
]) has(files.authority, token);
lacks(files.authority, '.rpc("has_role"', "legacy role RPC");
lacks(files.authority, '.from("user_roles")', "global role authority");
lacks(files.authority, "ORDER BY", "ordering authority in TS");
lacks(files.authority, "LIMIT 1", "limit-one authority in TS");
lacks(files.authority, "access_token:", "secret DTO");

for (const token of [
  "middleware([requireTenant])", "authorizeTenantMarketingOperation", "listTenantMarketingChannels",
  "listTenantMarketingConnectors", "getTenantMarketingConnector", "saveTenantMarketingConnectorDraft",
  "publishTenantMarketingConnectorConfiguration", "setTenantMarketingCredentialReference",
  "listTenantMarketingMappings", "saveTenantMarketingMapping", "validateTenantMarketingMapping",
  "previewTenantMarketingManualImport", "createTenantMarketingManualImport",
  "executeTenantMarketingManualImport", "listTenantMarketingManualImports",
  "getTenantMarketingManualImport", "listTenantMarketingIngestionEvents",
  "getTenantMarketingIngestionEvent", "retryTenantMarketingIngestion",
  "getTenantMarketingDiagnostics", "receiveMarketingProviderPayload",
  "verifyMarketingProviderPayload", "ingestVerifiedMarketingLead",
]) has(files.functions, token);
for (const token of ["tenantId:", "actorUserId:", "assignedTo:", "pipelineId:", "stageId:"]) lacks(files.functions, token, `client authority field ${token}`);
lacks(files.functions, '.from("leads").insert', "direct Lead insert");
lacks(files.functions, '.from("leads").update', "direct Lead update");
lacks(files.functions, '.rpc("has_role"', "role RPC");
lacks(files.functions, '.from("user_roles")', "global role table");
lacks(files.functions, "META_GRAPH_URL", "Meta external call");
lacks(files.functions, "GOOGLE_ADS_URL", "Google external call");
lacks(files.functions, "fetch(", "external HTTP");
lacks(files.functions, "@ts-ignore", "ts-ignore");
lacks(files.functions, "@ts-nocheck", "ts-nocheck");

// Migration schema, authority, provenance, idempotency, CRM insertion and ACL.
for (const token of [
  "tenant_marketing_connectors", "tenant_marketing_connector_versions", "tenant_marketing_field_mappings",
  "tenant_marketing_ingestion_events", "tenant_marketing_ingestion_attempts",
  "tenant_marketing_manual_imports", "tenant_marketing_manual_import_rows",
  "provider_payload_id", "payload_hash", "payload_sanitized", "campaign_id", "campaign_name",
  "adset_id", "adset_name", "ad_id", "ad_name", "mapping_version", "duplicate_candidate_ids",
  "retry_state", "credential_reference", "credential_version", "verification_state",
]) has(files.migration, token);
for (const token of [
  "assert_tenant_marketing_authority", "save_tenant_marketing_connector",
  "publish_tenant_marketing_connector", "set_tenant_marketing_credential_reference",
  "save_tenant_marketing_mapping", "reserve_marketing_ingestion_payload",
  "complete_marketing_ingestion_payload", "create_tenant_marketing_manual_import",
  "execute_tenant_marketing_manual_import", "retry_tenant_marketing_ingestion",
]) has(files.migration, token);
for (const token of [
  "resolve_tenant_permission", "'crm'", "scope' <> 'global'", "FOR UPDATE", "FOR SHARE",
  "pg_advisory_xact_lock", "marketing_payload_idempotency_conflict", "marketing_revision_conflict",
  "marketing_adapter_not_implemented", "marketing_parallel_public_writer_prohibited",
  "merge_state='active'", "normalized_email", "normalized_phone", "duplicate_detected",
  "create_tenant_crm_lead", "original_attribution", "latest_attribution", "utm_source",
  "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid",
  "landing_url", "referrer", "INSERT INTO public.audit_log",
]) has(files.migration, token);
for (const token of [
  "ENABLE ROW LEVEL SECURITY", "FROM PUBLIC, anon, authenticated", "TO service_role",
  "REVOKE ALL ON FUNCTION public.reserve_marketing_ingestion_payload",
  "GRANT EXECUTE ON FUNCTION public.reserve_marketing_ingestion_payload",
  "REVOKE ALL ON FUNCTION public.execute_tenant_marketing_manual_import",
  "GRANT EXECUTE ON FUNCTION public.execute_tenant_marketing_manual_import",
]) has(files.migration, token);
lacks(files.migration, "net.http", "network extension");
lacks(files.migration, "http_post", "HTTP in transaction");
lacks(files.migration, "GRANT EXECUTE ON FUNCTION public.reserve_marketing_ingestion_payload(uuid,text,text,jsonb,integer) TO authenticated", "authenticated automatic RPC");
lacks(files.migration, "GRANT EXECUTE ON FUNCTION public.execute_tenant_marketing_manual_import(uuid,uuid,text,uuid,bigint) TO authenticated", "authenticated import RPC");
lacks(files.migration, "ORDER BY created_at LIMIT 1", "first record authority");
lacks(files.migration, "ORDER BY id LIMIT 1", "first connector authority");
lacks(files.migration, "automatic_merge", "automatic merge primitive");
lacks(files.migration, "fuzzy", "fuzzy authority");
lacks(files.migration, "tenant_id from payload", "payload tenant authority");

// UI states, route and navigation without eighth workspace context.
for (const token of [
  "Marketing & Lead Ingestion Center", "adapter_not_implemented", "Connectors", "Mapping",
  "Importação", "Ingestion ledger", "Diagnostics", "preview_ready", "duplicate_detected",
  "retry_available", "credential://", "Preview server-side", "Persistir importação",
]) has(files.route, token);
for (const token of [
  "listTenantMarketingChannels", "listTenantMarketingConnectors", "previewTenantMarketingManualImport",
  "createTenantMarketingManualImport", "executeTenantMarketingManualImport",
  "retryTenantMarketingIngestion", "getTenantMarketingDiagnostics",
]) has(files.route, token);
lacks(files.route, '.from("tenant_marketing_', "client direct table access");
lacks(files.route, '.from("leads")', "client Lead access");
lacks(files.route, "access_token", "secret field");
has(files.contexts, 'matches: ["/admin/portais", "/admin/marketing"]', "marketing distribution match");
has(files.contexts, '{ label: "Marketing", to: "/admin/marketing" }', "marketing distribution tab");
equal((files.contexts.match(/id: "/g) ?? []).length, 7, "seven workspace contexts preserved");

// PTW-01 remains the only public writer and CRM initial pipeline binding remains canonical.
for (const token of ["requirePublicTenantFromRequest", "requirePublicWriterTenantFromRequest", "public_tenant_unresolved"]) has(files.publicWriter, token);
for (const token of ["crm_bind_lead_pipeline_trigger", "crm_ambiguous_state:default_pipeline", "crm_ambiguous_state:new_stage"]) has(files.crmMigration, token);
lacks(files.migration, "CREATE ROUTE", "second public route");
lacks(files.migration, "public_marketing_lead_writer", "second public writer");
lacks(files.migration, "GRANT EXECUTE ON FUNCTION public.create_tenant_crm_lead", "CRM authority grant changed");

// Gate registration.
has(files.packageJson, '"test:pr-m2:marketing-channels-lead-ingestion-functional-completion"', "package test command");
has(files.release, "PR-M2 — Marketing channels and lead ingestion functional completion specifications", "release gate step");
has(files.release, "prM2MarketingChannelsLeadIngestionFunctionalCompletionSpecsPassed", "release summary flag");

ok(assertions >= 300, `expected >= 300 assertions, got ${assertions}`);
console.log(`PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPECS=PASS");
