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
import {
  normalizeGoogleLeadWebhook,
  normalizeMetaLeadWebhook,
  verifyGoogleLeadWebhookKey,
  verifyMetaXHubSignature256,
} from "./src/lib/marketing/marketing-provider-ingestion.server";

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
  migration: [
    readFileSync("supabase/migrations/20260729233000_pr_m2_marketing_channels_lead_ingestion.sql", "utf8"),
    readFileSync("supabase/migrations/20260730051500_pr_m2_marketing_adapter_activation.sql", "utf8"),
    readFileSync("supabase/migrations/20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql", "utf8"),
  ].join("\n"),
  publicWriter: readFileSync("src/lib/public-writers/public-writer-authority.server.ts", "utf8"),
  crmMigration: readFileSync("supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql", "utf8"),
  packageJson: readFileSync("package.json", "utf8"),
  release: readFileSync("scripts/verify-release.mjs", "utf8"),
};

// Closed registries and factual provider adapter state.
equal(MARKETING_CHANNEL_KEYS.length, 4, "channel cardinality");
equal(MARKETING_CHANNEL_REGISTRY.length, 4, "registry cardinality");
equal(MARKETING_MANUAL_METHODS.length, 3, "manual methods");
equal(MARKETING_MAPPING_TARGETS.length, 22, "mapping targets");
equal(MARKETING_INGESTION_STATES.length, 11, "ingestion states");
equal(MARKETING_IMPORT_STATES.length, 6, "import states");
equal(MARKETING_IMPORT_ROW_STATES.length, 6, "row states");
for (const state of ["manual_ready", "automated_ready", "adapter_not_implemented", "credential_required", "verification_pending", "mapping_required", "failed"]) {
  ok(MARKETING_AVAILABILITY_STATES.some((item) => item === state), `${state}:catalogued`);
}
for (const key of MARKETING_CHANNEL_KEYS) {
  const item = getMarketingChannelDefinition(key);
  equal(item.channelKey, key, `${key}:key`);
  equal(item.operationMode, "HYBRID", `${key}:mode`);
  equal(item.schemaVersion, 1, `${key}:schema`);
  equal(item.externalExecutionState, "not_executed", `${key}:external`);
  equal(item.campaignIdContract, "data_only_never_authority", `${key}:campaign`);
  equal(item.adsetIdContract, "data_only_never_authority", `${key}:adset`);
  equal(item.adIdContract, "data_only_never_authority", `${key}:ad`);
  equal(item.utmContract, "data_only_never_authority", `${key}:utm`);
  equal(item.deduplicationContract, "exact_normalized_email_or_phone_review_required", `${key}:dedup`);
  equal(item.pipelineContract, "unique_explicit_default_pipeline_and_status_stage", `${key}:pipeline`);
}
for (const key of ["META_ADS", "GOOGLE_ADS"] as const) {
  const definition = getMarketingChannelDefinition(key);
  equal(definition.adapterImplementationState, "implemented", `${key}:adapter implemented`);
  equal(definition.externalVerificationState, "not_live_verified", `${key}:not live verified`);
  equal(definition.availabilityState, "credential_required", `${key}:credential required`);
  equal(definition.providerContractVersion, 1, `${key}:provider contract`);
}
equal(getMarketingChannelDefinition("META_ADS").providerVerificationContract, "meta_x_hub_signature_256", "Meta verification contract");
equal(getMarketingChannelDefinition("GOOGLE_ADS").providerVerificationContract, "google_webhook_key", "Google verification contract");
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

// Deterministic identity, sanitization and generic signature primitive.
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
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: signature, timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret }), true, "valid generic signature");
equal(verifyMarketingHmacSha256({ rawBody, signatureHex: "0".repeat(64), timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret }), false, "invalid generic signature");

// Provider-specific deterministic fixtures — no network.
const metaFixture = JSON.stringify({
  object: "page",
  entry: [{ id: "page-1", time: 1_800_000_000, changes: [{ field: "leadgen", value: {
    leadgen_id: "meta-lead-1", form_id: "meta-form-1", campaign_id: "cmp-1", adgroup_id: "set-1", ad_id: "ad-1",
    field_data: [
      { name: "name", values: ["Maria Silva"] },
      { name: "email", values: ["maria@example.com"] },
      { name: "phone", values: ["5531999999999"] },
    ],
  } }] }],
});
const metaSecret = "meta-fixture-secret-with-minimum-length";
const metaSignature = `sha256=${createHmac("sha256", metaSecret).update(metaFixture).digest("hex")}`;
equal(verifyMetaXHubSignature256({ rawBody: metaFixture, signatureHeader: metaSignature, appSecret: metaSecret }), true, "Meta X-Hub valid");
equal(verifyMetaXHubSignature256({ rawBody: metaFixture, signatureHeader: `sha256=${"0".repeat(64)}`, appSecret: metaSecret }), false, "Meta X-Hub invalid");
const metaNormalized = normalizeMetaLeadWebhook(metaFixture);
equal(metaNormalized.providerPayloadId, "meta-lead-1", "Meta payload ID");
equal(metaNormalized.providerFormReference, "meta-form-1", "Meta form reference");
equal(metaNormalized.row.campaign_id, "cmp-1", "Meta campaign");

const googleFixture = JSON.stringify({
  lead_id: "google-lead-1", campaign_id: "cmp-g", adgroup_id: "set-g", creative_id: "ad-g", gcl_id: "gclid-1", form_id: "google-form-1",
  user_column_data: [
    { column_name: "name", string_value: "João Silva" },
    { column_name: "email", string_value: "joao@example.com" },
    { column_name: "phone", string_value: "5531888888888" },
  ],
});
const googleKey = "google-fixture-key-with-minimum-length";
equal(verifyGoogleLeadWebhookKey({ expectedWebhookKey: googleKey, receivedWebhookKey: googleKey }), true, "Google key valid");
equal(verifyGoogleLeadWebhookKey({ expectedWebhookKey: googleKey, receivedWebhookKey: `${googleKey}x` }), false, "Google key invalid");
const googleNormalized = normalizeGoogleLeadWebhook(googleFixture);
equal(googleNormalized.providerPayloadId, "google-lead-1", "Google payload ID");
equal(googleNormalized.row.gclid, "gclid-1", "Google gclid");

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
equal(parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from(csv).toString("base64") }).length, 2, "CSV rows");
throws(() => parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from("name,email\n=CMD(),x@example.com").toString("base64") }), "marketing_spreadsheet_formula_prohibited");
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ name: "Maria", email: "maria@example.com" }]), "Leads");
equal(parseMarketingManualImport({ format: "XLSX", contentBase64: XLSX.write(workbook, { type: "base64", bookType: "xlsx" }) }).length, 1, "XLSX rows");

// Server authority and isolated provider boundary.
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
for (const token of [
  "receiveMarketingProviderPayload", "verifyMetaXHubSignature256", "verifyGoogleLeadWebhookKey",
  "normalizeMetaLeadWebhook", "normalizeGoogleLeadWebhook", "reserve_marketing_ingestion_payload",
  "complete_marketing_ingestion_payload", "ingest_verified_provider_marketing_lead",
  "marketing_adapter_not_ready", "externalDeliveryProved: false", "connectorId",
]) has(files.provider, token);
for (const token of ["META_GRAPH_URL", "GOOGLE_ADS_URL", "fetch(", "tenantId: string", "actorUserId: string"]) lacks(files.provider, token);

// Schema, idempotency, canonical CRM linkage and ACL.
for (const token of [
  "tenant_marketing_connectors", "tenant_marketing_connector_versions", "tenant_marketing_field_mappings",
  "tenant_marketing_ingestion_events", "tenant_marketing_ingestion_attempts", "tenant_marketing_manual_imports",
  "tenant_marketing_manual_import_rows", "adapter_version", "provider_contract_version", "not_live_verified",
  "ingestion_actor_user_id", "ingestion_actor_origin", "provider_payload_id", "payload_hash",
  "reserve_marketing_ingestion_payload", "complete_marketing_ingestion_payload", "ingest_verified_provider_marketing_lead",
  "pg_advisory_xact_lock", "marketing_payload_idempotency_conflict", "marketing_adapter_not_ready",
  "create_tenant_crm_lead", "original_attribution", "latest_attribution", "source_corrected",
  "INSERT INTO public.audit_log", "ENABLE ROW LEVEL SECURITY", "FROM PUBLIC, anon, authenticated", "TO service_role",
]) has(files.migration, token);
for (const token of ["net.http", "http_post", "ORDER BY created_at LIMIT 1", "ORDER BY id LIMIT 1", "automatic_merge", "fuzzy"]) lacks(files.migration, token);

// Functional UI, contexts and preserved PTW/CRM boundaries.
for (const token of ["Marketing & Lead Ingestion Center", "credential_required", "not_live_verified", "Preview server-side", "Persistir importação", "Ingestion ledger", "retry_available"]) has(files.route, token);
for (const token of ['.from("tenant_marketing_', '.from("leads")', "access_token", "adapter_not_implemented</strong>"]) lacks(files.route, token);
has(files.contexts, 'matches: ["/admin/portais", "/admin/marketing"]');
has(files.contexts, '{ label: "Marketing", to: "/admin/marketing" }');
equal((files.contexts.match(/\n    id: "/g) ?? []).length, 7, "seven contexts");
for (const token of ["requirePublicTenantFromRequest", "requirePublicWriterTenantFromRequest", "public_tenant_unresolved"]) has(files.publicWriter, token);
for (const token of ["crm_bind_lead_pipeline_trigger", "crm_ambiguous_state:default_pipeline", "crm_ambiguous_state:new_stage"]) has(files.crmMigration, token);

has(files.packageJson, '"test:pr-m2:marketing-channels-lead-ingestion-functional-completion"');
has(files.release, "PR-M2 — Marketing channels and lead ingestion functional completion specifications");
has(files.release, "prM2MarketingChannelsLeadIngestionFunctionalCompletionSpecsPassed");

ok(assertions >= 200, `expected >= 200 assertions, got ${assertions}`);
console.log(`PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPECS=PASS");
