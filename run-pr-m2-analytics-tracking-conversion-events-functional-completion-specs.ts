import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TRACKING_AVAILABILITY_STATES, TRACKING_CONSENT_CATEGORIES, TRACKING_EVENT_KEYS,
  TRACKING_EVENT_REGISTRY, TRACKING_PROVIDER_KEYS, TRACKING_PROVIDER_REGISTRY,
  TrackingConnectorDraftSchema, TrackingConsentConfigurationSchema, TrackingEventBindingsSchema,
  assertNoArbitraryTrackingCode, getTrackingEventDefinition, getTrackingProviderDefinition,
  parseTrackingEventPayload, validateTrackingIdentifier,
} from "./src/lib/tracking/tracking-registry";
import { trackingConsentAllows } from "./src/lib/tracking/tracking-consent";

let assertions = 0;
const ok = (value: unknown, message: string): void => { assert.ok(value, message); assertions += 1; };
const equal = (actual: unknown, expected: unknown, message: string): void => { assert.equal(actual, expected, message); assertions += 1; };
const throws = (fn: () => unknown, token: string): void => { assert.throws(fn, (error: unknown) => error instanceof Error && error.message.includes(token)); assertions += 1; };
const has = (source: string, token: string): void => ok(source.includes(token), `missing ${token}`);
const lacks = (source: string, token: string): void => ok(!source.includes(token), `prohibited ${token}`);
const read = (path: string) => readFileSync(path, "utf8");
const files = {
  registry: read("src/lib/tracking/tracking-registry.ts"), consent: read("src/lib/tracking/tracking-consent.ts"),
  contracts: read("src/lib/tracking/tracking-contracts.ts"), runtime: read("src/lib/tracking/public-tracking-runtime.ts"),
  component: read("src/components/site/PublicTrackingRuntime.tsx"), authority: read("src/lib/api/tenant-tracking-authority.server.ts"),
  functions: read("src/lib/api/tenant-tracking.functions.ts"), route: read("src/routes/_authenticated.admin.tracking.tsx"),
  root: read("src/routes/__root.tsx"), server: read("src/server.ts"), meta: read("src/lib/api/meta.functions.ts"),
  contexts: read("src/components/workspace/contexts.ts"), configuration: read("src/lib/api/configuration-registry.ts"),
  migration: read("supabase/migrations/20260730010000_pr_m2_analytics_tracking_conversion_events.sql"),
  predecessor: read("supabase/migrations/20260729233000_pr_m2_marketing_channels_lead_ingestion.sql"),
  packageJson: read("package.json"), release: read("scripts/verify-release.mjs"),
};

// Closed registries.
equal(TRACKING_PROVIDER_KEYS.length, 3, "providers");
equal(TRACKING_PROVIDER_REGISTRY.length, 3, "provider registry");
equal(TRACKING_CONSENT_CATEGORIES.length, 2, "consent categories");
equal(TRACKING_EVENT_KEYS.length, 12, "events");
equal(TRACKING_EVENT_REGISTRY.length, 12, "event registry");
for (const state of ["unconfigured", "configured", "consent_required", "inactive", "preview_ready", "active", "adapter_not_implemented", "csp_blocked", "temporarily_unavailable", "failed"] as const) ok(TRACKING_AVAILABILITY_STATES.some((item) => item === state), `${state}:state`);
for (const key of TRACKING_PROVIDER_KEYS) {
  const item = getTrackingProviderDefinition(key);
  equal(item.providerKey, key, `${key}:key`); equal(item.schemaVersion, 1, `${key}:schema`);
  equal(item.payloadSchemaContract, "closed_event_registry_v1", `${key}:payload`);
  equal(item.piiContract, "no_direct_pii_no_tenant_or_actor_identifiers", `${key}:PII`);
  equal(item.ssrSupport, "server_snapshot_only", `${key}:SSR`); equal(item.spaNavigationSupport, true, `${key}:SPA`);
  equal(item.cspContract, "external_origin_allowlist_no_inline_provider_script", `${key}:CSP`);
  equal(item.diagnosticsContract, "sanitized_local_state_only", `${key}:diagnostics`);
  equal(item.supportedEventKeys.length, 12, `${key}:events`);
  ok(item.scriptOrigins.every((origin) => origin.startsWith("https://") && !origin.includes("*")), `${key}:script origins`);
  ok(item.connectOrigins.every((origin) => origin.startsWith("https://") && !origin.includes("*")), `${key}:connect origins`);
}
equal(getTrackingProviderDefinition("META_PIXEL").capabilityClass, "required", "Meta required");
equal(getTrackingProviderDefinition("GOOGLE_ANALYTICS").capabilityClass, "extensible", "GA extensible");
equal(getTrackingProviderDefinition("GOOGLE_TAG_MANAGER").capabilityClass, "extensible", "GTM extensible");
throws(() => getTrackingProviderDefinition("UNKNOWN"), "tracking_provider_not_cataloged");

// Identifier and client input boundaries.
equal(validateTrackingIdentifier("META_PIXEL", "123456789"), "123456789", "Meta ID");
equal(validateTrackingIdentifier("GOOGLE_ANALYTICS", "g-abcd1234"), "G-ABCD1234", "GA ID");
equal(validateTrackingIdentifier("GOOGLE_TAG_MANAGER", "gtm-abcd1234"), "GTM-ABCD1234", "GTM ID");
for (const [key, value] of [["META_PIXEL", "pixel"], ["GOOGLE_ANALYTICS", "UA-1"], ["GOOGLE_TAG_MANAGER", "G-1"]] as const) throws(() => validateTrackingIdentifier(key, value), "tracking_provider_identifier_invalid");
const draft = { providerKey: "META_PIXEL" as const, providerIdentifier: "123456789", schemaVersion: 1 as const, enabled: false, consentCategory: "MARKETING" as const };
equal(TrackingConnectorDraftSchema.safeParse(draft).success, true, "valid draft");
for (const field of [{ tenantId: "x" }, { tenant_id: "x" }, { actorUserId: "x" }, { role: "admin" }, { scope: "global" }, { script: "x" }, { html: "x" }, { endpoint: "x" }, { consentCategory: "ANALYTICS" }]) equal(TrackingConnectorDraftSchema.safeParse({ ...draft, ...field }).success, false, "strict client schema");
for (const value of [{ script: "alert(1)" }, { html: "<script>x</script>" }, { javascript: "document.write('x')" }, { modulePath: "./x" }, { endpoint: "https://evil.invalid" }, { safe: "javascript:x" }, { safe: "new Function('x')" }, { safe: "eval('x')" }]) throws(() => assertNoArbitraryTrackingCode(value), "tracking_arbitrary_code_prohibited");
assertNoArbitraryTrackingCode({ providerKey: "META_PIXEL", providerIdentifier: "123456789" }); assertions += 1;

// Event schemas and PII minimization.
for (const key of TRACKING_EVENT_KEYS) {
  const item = getTrackingEventDefinition(key);
  equal(item.eventKey, key, `${key}:key`); equal(item.schemaVersion, 1, `${key}:schema`); equal(item.piiAllowed, false, `${key}:PII`);
  equal(item.tenantSource, "server_snapshot_only", `${key}:tenant`); equal(item.actorSource, "not_exported", `${key}:actor`);
  equal(item.deduplicationContract, "caller_event_reference_or_navigation_identity", `${key}:dedup`);
  for (const provider of TRACKING_PROVIDER_KEYS) ok(Boolean(item.providerMappings[provider]), `${key}:${provider}:mapping`);
}
throws(() => getTrackingEventDefinition("unknown"), "tracking_event_not_cataloged");
equal(parseTrackingEventPayload("page_view", { path: "/imoveis", title: "Imóveis", referrerHost: "google.com" }).path, "/imoveis", "page payload");
throws(() => parseTrackingEventPayload("page_view", { path: "/imoveis?email=x" }), "tracking_page_path_must_exclude_query");
for (const field of ["email", "phone", "message", "tenantId", "tenant_id", "actorId", "userId", "leadId", "name", "address", "cpf"]) throws(() => parseTrackingEventPayload("page_view", { path: "/", [field]: "secret" }), "tracking_payload_unknown_field");
throws(() => parseTrackingEventPayload("view_property", {}), "tracking_payload_required_field");
throws(() => parseTrackingEventPayload("conversion_confirmed", { conversionType: "lead", eventReference: "bad" }), "tracking_event_reference_invalid");
equal(parseTrackingEventPayload("conversion_confirmed", { conversionType: "lead", eventReference: "evt_12345678", currency: "BRL", value: 100 }).currency, "BRL", "conversion");

const bindings = TRACKING_EVENT_KEYS.map((eventKey) => ({ eventKey, enabled: eventKey === "page_view" }));
equal(TrackingEventBindingsSchema.safeParse(bindings).success, true, "bindings");
equal(TrackingEventBindingsSchema.safeParse([...bindings, bindings[0]]).success, false, "duplicate binding");
equal(TrackingConsentConfigurationSchema.safeParse({ schemaVersion: 1, noticeEnabled: true, analyticsMode: "opt_in", marketingMode: "opt_in", policyRevision: 1 }).success, true, "consent");
equal(TrackingConsentConfigurationSchema.safeParse({ schemaVersion: 1, noticeEnabled: true, analyticsMode: "opt_out", marketingMode: "opt_in", policyRevision: 1 }).success, false, "opt-out denied");
const unknown = { status: "unknown", choice: null } as const;
equal(trackingConsentAllows(unknown, "ANALYTICS"), false, "unknown analytics"); equal(trackingConsentAllows(unknown, "MARKETING"), false, "unknown marketing");
const selected = { status: "granted_or_restricted", choice: { schemaVersion: 1, policyRevision: 1, analytics: true, marketing: false, decidedAt: "2026-07-29T00:00:00.000Z", source: "user_choice" } } as const;
equal(trackingConsentAllows(selected, "ANALYTICS"), true, "analytics granted"); equal(trackingConsentAllows(selected, "MARKETING"), false, "marketing denied");

// Runtime and public cutover.
for (const token of ["appendExternalScript", "tracking_script_origin_not_allowed", "__rmPrimeTrackingLoaded", "tracking_duplicate_provider_configuration", "dispatchCataloguedTrackingEvent", "trackingConsentAllows", "externalDeliveryProved: false", "removeAllTrackingProviderRuntimes", "https://connect.facebook.net/en_US/fbevents.js", "https://www.googletagmanager.com/gtag/js"]) has(files.runtime, token);
for (const token of ["eval(", "new Function", "document.write", "dangerouslySetInnerHTML", "fetch(", "tenantId", "actorUserId", "email", "phone"]) lacks(files.runtime, token);
for (const token of ["TRACKING_CONSENT_STORAGE_KEY", "policyRevision", "analytics", "marketing", "user_choice", "TRACKING_CONSENT_EVENT"]) has(files.consent, token);
for (const token of ["email", "phone", "name", "tenantId", "actorUserId", "leadId"]) lacks(files.consent, token);
for (const token of ["getPublicTrackingSnapshot", "PublicTrackingRuntime", "loaderData.tracking", "captureAttribution"]) has(files.root, token);
for (const token of ["G-BYVFRCL0VV", "obterMetaPixelId", "connect.facebook.net/en_US/fbevents.js", "fbq(", "gtag(", "metaPixelId", "pixelId ?"]) lacks(files.root, token);
equal((files.root.match(/<PublicTrackingRuntime/g) ?? []).length, 1, "single runtime");
for (const token of ["Somente essenciais", "Aceitar analytics e marketing", "removeAllTrackingProviderRuntimes", "TRACKING_CONSENT_EVENT"]) has(files.component + files.consent, token);

// Authority, snapshot and CSP.
for (const token of ["requireTenantScopedAuthority", "resolveEffectiveTenantPermission", "cms.configuracoes", "decision.scope !== \"global\"", "super_admin_impersonation", "tenant_owner"]) has(files.authority, token);
for (const token of [".rpc(\"has_role\"", ".from(\"user_roles\")", "ORDER BY", "LIMIT 1"]) lacks(files.authority, token);
for (const token of ["middleware([requireTenant])", "authorizeTenantTrackingOperation", "listTenantTrackingProviders", "saveTenantTrackingConnectorDraft", "publishTenantTrackingConnector", "disableTenantTrackingConnector", "saveTenantTrackingEventBindings", "previewTenantTrackingRuntime", "saveTenantTrackingConsentConfiguration", "listTenantTrackingDiagnostics", "getTenantTrackingHealth", "getPublicTrackingSnapshot", "requirePublicTenantFromRequest", ".eq(\"tenant_id\", tenant.id)", "public_tracking_provider_configuration_ambiguous", "fakeProviderDelivery: false"]) has(files.functions, token);
for (const token of ["tenantId: z.string", "tenant_id: z.string", "actorUserId: z.string", "actor_user_id: z.string", "fetch(", "event_delivered", "conversion_received", "provider_verified"]) lacks(files.functions, token);
for (const token of ["content-security-policy", "script-src 'self' 'unsafe-inline'", "https://connect.facebook.net", "https://www.googletagmanager.com", "https://www.google-analytics.com", "strict-origin-when-cross-origin", "x-content-type-options", "frame-ancestors 'none'"]) has(files.server, token);
for (const token of ["unsafe-eval", "https://*", "http://*", "script-src *", "connect-src *", "img-src *"]) lacks(files.server, token);

// Legacy path and functional UI.
for (const token of ["Legacy compatibility read", "tenant_tracking_connectors", "legacy_configuration_writable: false", "adapter-not-implemented", "externalProviderCalled: false", "externalDeliveryProved: false"]) has(files.meta, token);
for (const token of ["fetch(", ".upsert(", "graph.facebook.com", "return { ok: true", "conversions_api_token: data."]) lacks(files.meta, token);
for (const token of ["Tracking governance", "connector.displayName", "providerKey", "csp_blocked", "Event bindings fechados", "Política explícita de consentimento", "Diagnósticos sanitizados", "saveTenantTrackingConnectorDraft", "publishTenantTrackingConnector", "saveTenantTrackingEventBindings"]) has(files.route, token);
equal((files.contexts.match(/id: "(inicio|pipeline|catalogo|conteudo|distribuicao|administracao|operacao)"/g) ?? []).length, 7, "workspace count");
for (const token of ["/admin/tracking", "{ label: \"Tracking\", to: \"/admin/tracking\" }"]) has(files.contexts, token);
for (const token of ["ga4_measurement_id", "google_tag_manager_container_id", "meta_pixel_id"]) has(files.configuration, token);

// Database, cutover, RLS and ACL.
for (const token of ["tenant_tracking_connectors", "tenant_tracking_connector_versions", "tenant_tracking_event_bindings", "tenant_tracking_diagnostics", "tenant_tracking_consent_configuration", "UNIQUE (tenant_id, provider_key)", "FOREIGN KEY (connector_id, tenant_id)", "prevent_tracking_diagnostic_mutation", "site_settings_versions", "legacy_meta", "tracking_legacy_identifier_invalid", "raw_value_persisted',false", "assert_tenant_tracking_authority", "resolve_tenant_permission", "save_tenant_tracking_connector", "save_tenant_tracking_event_bindings", "save_tenant_tracking_consent_configuration", "tracking_revision_conflict", "tracking_binding_revision_conflict", "tracking_consent_revision_conflict", "ENABLE ROW LEVEL SECURITY", "REVOKE ALL ON TABLE", "FROM PUBLIC, anon, authenticated", "TO service_role", "GRANT EXECUTE ON FUNCTION"]) has(files.migration, token);
for (const token of ["http_post", "net.http", "extensions.http", "fetch(", "ORDER BY", "LIMIT 1", "auth.uid()", "is_super_admin("]) lacks(files.migration, token);
equal((files.migration.match(/CREATE TABLE IF NOT EXISTS public\.tenant_tracking_/g) ?? []).length, 5, "tables");
equal((files.migration.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length, 5, "RLS");
equal((files.migration.match(/CREATE OR REPLACE FUNCTION public\.save_tenant_tracking_/g) ?? []).length, 3, "RPCs");
for (const token of ["tenant_marketing_connectors", "public.create_tenant_crm_lead", "extensions.digest", "service_role"]) has(files.predecessor, token);

// Gate registration.
for (const token of ["test:pr-m2:analytics-tracking-conversion-events-functional-completion", "run-pr-m2-analytics-tracking-conversion-events-functional-completion-specs.ts"]) has(files.packageJson, token);
for (const token of ["PR-M2 — Analytics, tracking and conversion events functional completion specifications", "test:pr-m2:analytics-tracking-conversion-events-functional-completion", "prM2AnalyticsTrackingConversionEventsFunctionalCompletionSpecsPassed"]) has(files.release, token);

ok(assertions >= 230, `expected broad deterministic coverage, got ${assertions}`);
console.log(`PR_M2_ANALYTICS_TRACKING_CONVERSION_EVENTS_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_ANALYTICS_TRACKING_CONVERSION_EVENTS_SPECS=PASS");
