import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  DEFAULT_MARKETING_FIELD_MAPPING,
  MARKETING_CHANNEL_KEYS,
  MARKETING_CHANNEL_REGISTRY,
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
const throws = (fn: () => unknown, token: string): void => { assert.throws(fn, (error: unknown) => error instanceof Error && error.message.includes(token)); assertions += 1; };
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
  packageJson: readFileSync("package.json", "utf8"),
  release: readFileSync("scripts/verify-release.mjs", "utf8"),
};

// Registry and adapter state.
equal(MARKETING_CHANNEL_KEYS.length, 4, "channel cardinality");
equal(MARKETING_CHANNEL_REGISTRY.length, 4, "registry cardinality");
equal(MARKETING_MAPPING_TARGETS.length, 22, "mapping targets");
for (const key of MARKETING_CHANNEL_KEYS) {
  const item = getMarketingChannelDefinition(key);
  equal(item.channelKey, key, `${key}:key`);
  equal(item.operationMode, "HYBRID", `${key}:mode`);
  equal(item.schemaVersion, 1, `${key}:schema`);
  equal(item.externalExecutionState, "not_executed", `${key}:external`);
  equal(item.campaignIdContract, "data_only_never_authority", `${key}:campaign`);
  equal(item.deduplicationContract, "exact_normalized_email_or_phone_review_required", `${key}:dedup`);
}
for (const key of ["META_ADS", "GOOGLE_ADS"] as const) {
  const definition = getMarketingChannelDefinition(key);
  equal(definition.adapterImplementationState, "implemented", `${key}:implemented`);
  equal(definition.externalVerificationState, "not_live_verified", `${key}:verification`);
  equal(definition.availabilityState, "credential_required", `${key}:availability`);
  equal(definition.providerContractVersion, 1, `${key}:contract`);
}
equal(getMarketingChannelDefinition("META_ADS").providerVerificationContract, "meta_x_hub_signature_256", "Meta contract");
equal(getMarketingChannelDefinition("GOOGLE_ADS").providerVerificationContract, "google_webhook_key", "Google contract");
throws(() => getMarketingChannelDefinition("UNKNOWN"), "marketing_channel_not_cataloged");

// Strict config, mapping and secret rejection.
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
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, tenantId: "x" }).success, false, "tenant denied");
equal(MarketingConnectorConfigSchema.safeParse({ ...manualConfig, actorUserId: "x" }).success, false, "actor denied");
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

// Deterministic primitives.
equal(stableMarketingJson({ b: 2, a: 1 }), stableMarketingJson({ a: 1, b: 2 }), "stable JSON");
equal(hashMarketingPayload({ b: 2, a: 1 }), hashMarketingPayload({ a: 1, b: 2 }), "stable hash");
ok(deterministicMarketingPayloadId({ a: 1 }).startsWith("sha256:"), "payload ID");
const sanitized = sanitizeMarketingPayload({ access_token: "abc", nested: { password: "x", safe: "ok" } }) as Record<string, any>;
equal(sanitized.access_token, "[redacted]", "token redacted");
equal(sanitized.nested.password, "[redacted]", "password redacted");
equal(sanitized.nested.safe, "ok", "safe retained");
const body = JSON.stringify({ lead: "fixture" });
const timestamp = 1_800_000_000;
const genericSecret = "fixture-secret-with-minimum-length";
const genericSignature = createHmac("sha256", genericSecret).update(`${timestamp}.${body}`).digest("hex");
equal(verifyMarketingHmacSha256({ rawBody: body, signatureHex: genericSignature, timestampSeconds: timestamp, nowSeconds: timestamp, maxSkewSeconds: 300, secret: genericSecret }), true, "generic HMAC");

// Provider-specific fixtures.
const metaFixture = JSON.stringify({ object: "page", entry: [{ id: "page-1", changes: [{ field: "leadgen", value: {
  leadgen_id: "meta-lead-1", form_id: "meta-form-1", campaign_id: "cmp-1", adgroup_id: "set-1", ad_id: "ad-1",
  field_data: [{ name: "name", values: ["Maria"] }, { name: "email", values: ["maria@example.com"] }, { name: "phone", values: ["5531999999999"] }],
} }] }] });
const metaSecret = "meta-fixture-secret-with-minimum-length";
const metaSignature = `sha256=${createHmac("sha256", metaSecret).update(metaFixture).digest("hex")}`;
equal(verifyMetaXHubSignature256({ rawBody: metaFixture, signatureHeader: metaSignature, appSecret: metaSecret }), true, "Meta signature");
equal(verifyMetaXHubSignature256({ rawBody: metaFixture, signatureHeader: `sha256=${"0".repeat(64)}`, appSecret: metaSecret }), false, "Meta invalid");
const meta = normalizeMetaLeadWebhook(metaFixture);
equal(meta.providerPayloadId, "meta-lead-1", "Meta ID");
equal(meta.row.campaign_id, "cmp-1", "Meta campaign");

const googleFixture = JSON.stringify({
  lead_id: "google-lead-1", campaign_id: "cmp-g", adgroup_id: "set-g", creative_id: "ad-g", gcl_id: "gclid-1", form_id: "google-form-1",
  user_column_data: [{ column_name: "name", string_value: "João" }, { column_name: "email", string_value: "joao@example.com" }, { column_name: "phone", string_value: "5531888888888" }],
});
const googleKey = "google-fixture-key-with-minimum-length";
equal(verifyGoogleLeadWebhookKey({ expectedWebhookKey: googleKey, receivedWebhookKey: googleKey }), true, "Google key");
equal(verifyGoogleLeadWebhookKey({ expectedWebhookKey: googleKey, receivedWebhookKey: `${googleKey}x` }), false, "Google invalid");
const google = normalizeGoogleLeadWebhook(googleFixture);
equal(google.providerPayloadId, "google-lead-1", "Google ID");
equal(google.row.gclid, "gclid-1", "Google gclid");

// Mapping and parser.
equal(normalizeMarketingEmail(" Test@Example.COM "), "test@example.com", "email normalized");
equal(normalizeMarketingPhone("+55 (31) 99999-9999"), "5531999999999", "phone normalized");
const mapped = mapMarketingLead({
  row: { name: "Maria", email: "MARIA@example.com", phone: "+55 31 99999-9999", campaign_id: "cmp-1", provider_payload_id: "payload-1" },
  mapping: DEFAULT_MARKETING_FIELD_MAPPING, channelKey: "META_ADS", connectorId: "11111111-1111-4111-8111-111111111111", mappingVersion: 1, receivedAt: "2026-07-29T12:00:00.000Z",
});
equal(mapped.normalizedEmail, "maria@example.com", "mapped email");
equal(mapped.attribution.campaignId, "cmp-1", "mapped campaign");
equal(mapped.attribution.providerPayloadId, "payload-1", "mapped payload ID");
const csv = "name,email,phone\nMaria,maria@example.com,31999999999";
equal(parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from(csv).toString("base64") }).length, 1, "CSV");
throws(() => parseMarketingManualImport({ format: "CSV", contentBase64: Buffer.from("name,email\n=CMD(),x@example.com").toString("base64") }), "marketing_spreadsheet_formula_prohibited");
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ name: "Maria", email: "maria@example.com" }]), "Leads");
equal(parseMarketingManualImport({ format: "XLSX", contentBase64: XLSX.write(workbook, { type: "base64", bookType: "xlsx" }) }).length, 1, "XLSX");

// Authority and provider envelope.
for (const token of ["requireTenantScopedAuthority", "resolveEffectiveTenantPermission", '"crm"', 'decision.scope !== "global"', "super_admin_impersonation"]) has(files.authority, token);
for (const token of ['.rpc("has_role"', '.from("user_roles")', "ORDER BY", "LIMIT 1"]) lacks(files.authority, token);
for (const token of ["receiveMarketingProviderPayload", "verifyMetaXHubSignature256", "verifyGoogleLeadWebhookKey", "reserve_marketing_ingestion_payload", "complete_marketing_ingestion_payload", "ingest_verified_provider_marketing_lead", "externalDeliveryProved: false"]) has(files.provider, token);
const envelopeStart = files.provider.indexOf("export type TrustedMarketingProviderEnvelope");
const envelopeEnd = files.provider.indexOf("export type MarketingProviderIngestionResult", envelopeStart);
const envelope = files.provider.slice(envelopeStart, envelopeEnd);
lacks(envelope, "tenantId");
lacks(envelope, "actorUserId");
lacks(files.provider, "fetch(");
lacks(files.provider, "META_GRAPH_URL");
lacks(files.provider, "GOOGLE_ADS_URL");

// SQL adapter, CRM and ACL contracts.
for (const token of [
  "adapter_version", "provider_contract_version", "not_live_verified", "ingestion_actor_user_id", "ingestion_actor_origin",
  "record_tenant_marketing_adapter_verification", "reserve_marketing_ingestion_payload", "ingest_verified_provider_marketing_lead",
  "pg_advisory_xact_lock", "marketing_adapter_not_ready", "create_tenant_crm_lead", "original_attribution", "latest_attribution",
  "source_corrected", "INSERT INTO public.audit_log", "FROM PUBLIC, anon, authenticated", "TO service_role",
]) has(files.migration, token);
for (const token of ["net.http", "http_post", "automatic_merge", "fuzzy"]) lacks(files.migration, token);

// UI and release integration.
for (const token of ["Marketing & Lead Ingestion Center", "credential_required", "not_live_verified", "Preview server-side", "Persistir importação", "Ingestion ledger", "retry_available", "externalDeliveryProved=false"]) has(files.route, token);
lacks(files.route, "adapter_not_implemented</strong>");
has(files.contexts, '{ label: "Marketing", to: "/admin/marketing" }');
has(files.packageJson, '"test:pr-m2:marketing-channels-lead-ingestion-functional-completion"');
has(files.release, "PR-M2 — Marketing channels and lead ingestion functional completion specifications");

ok(assertions >= 115, `expected >= 115 assertions, got ${assertions}`);
console.log(`PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPECS=PASS");
