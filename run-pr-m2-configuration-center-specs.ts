import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CONFIGURATION_DOMAINS,
  CONFIGURATION_KEY_NAMES,
  CONFIGURATION_REGISTRY,
  getConfigurationDefaults,
  mergeConfigurationDomain,
  normalizeConfigurationSnapshot,
  publicConfigurationSnapshot,
  validateConfigurationSnapshot,
} from "./src/lib/api/configuration-registry";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const migrationPath = "supabase/migrations/20260728233000_pr_m2_configuration_center.sql";
const migration = read(migrationPath);
const registry = read("src/lib/api/configuration-registry.ts");
const authority = read("src/lib/api/tenant-configuration-authority.server.ts");
const functions = read("src/lib/api/tenant-configuration.functions.ts");
const site = read("src/lib/api/site.functions.ts");
const versions = read("src/lib/api/site-versions.functions.ts");
const menu = read("src/lib/api/menu.functions.ts");
const adapter = read("src/components/content/adapters/useSiteAdapter.ts");
const editor = read("src/components/content/editors/SettingsContentEditor.tsx");

let passed = 0;
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[PR-M2 configuration-center] ${message}`);
  passed += 1;
}
function includesAll(content: string, tokens: string[], label: string) {
  for (const token of tokens) assert(content.includes(token), `${label} missing ${token}`);
}
function rejects(label: string, action: () => unknown, token: string) {
  try {
    action();
    throw new Error(`${label} unexpectedly accepted`);
  } catch (error) {
    assert(error instanceof Error && error.message.includes(token), `${label} must reject with ${token}`);
  }
}

const requiredDomains = [
  "identity", "branding", "visual", "contact", "social", "seo", "legal",
  "catalog", "lead_capture", "header_footer", "analytics", "future_activation", "legacy_content",
];
assert(requiredDomains.every((domain) => CONFIGURATION_DOMAINS.includes(domain as never)), "all functional domains must be cataloged");

const requiredKeys = [
  "trade_name", "legal_name", "short_name", "tagline", "institutional_description",
  "creci_or_registration", "tax_document_display", "founded_year", "service_regions", "languages",
  "primary_logo", "secondary_logo", "light_logo", "dark_logo", "favicon", "application_icon",
  "default_social_image", "watermark", "primary_color", "secondary_color", "accent_color",
  "background_color", "surface_color", "text_color", "muted_text_color", "success_color",
  "warning_color", "error_color", "heading_font", "body_font", "font_scale", "border_radius_scale",
  "primary_email", "commercial_email", "support_email", "primary_phone", "whatsapp",
  "whatsapp_default_message", "address", "city", "state", "postal_code", "latitude", "longitude",
  "business_hours", "emergency_or_after_hours_message", "instagram", "facebook", "linkedin", "youtube",
  "tiktok", "x_twitter", "pinterest", "default_meta_title", "default_meta_description",
  "default_og_image", "robots_index", "robots_follow", "organization_schema_fields",
  "local_business_schema_fields", "sitemap_visibility", "privacy_policy_reference", "terms_reference",
  "cookie_notice_enabled", "cookie_preferences_enabled", "data_controller_identity", "legal_contact",
  "show_prices", "show_exact_address", "show_broker_contact", "show_whatsapp_cta",
  "show_financing_cta", "show_similar_properties", "show_featured_properties", "default_property_sort",
  "items_per_page", "lead_form_required_fields", "lead_consent_required", "lead_assignment_visibility",
  "header_variant", "footer_variant", "sticky_header", "show_search", "show_social_links",
  "show_contact_cta", "menu_locations", "menu_items", "footer_columns", "legal_links",
  "ga4_measurement_id", "google_tag_manager_container_id", "meta_pixel_id", "google_ads_conversion_id",
  "linkedin_partner_id", "tiktok_pixel_id", "domain_activation_state", "cloudflare_mode",
  "billing_activation_state", "final_visual_refinement",
];
assert(requiredKeys.every((key) => CONFIGURATION_KEY_NAMES.includes(key as never)), "all required white-label keys must be cataloged");
assert(new Set(CONFIGURATION_KEY_NAMES).size === CONFIGURATION_KEY_NAMES.length, "configuration keys must be unique");
assert(CONFIGURATION_REGISTRY.every((definition) => definition.validationMessage.length > 0), "every key must expose a validation message");
assert(CONFIGURATION_REGISTRY.every((definition) => definition.editAuthority === "system" || definition.editAuthority === "configuration_manager"), "edit authority must be closed");

const defaults = getConfigurationDefaults();
assert(defaults.domain_activation_state === "pending_DCA01", "domain activation must remain pending DCA-01");
assert(defaults.cloudflare_mode === "HYBRID_pending_DCA01", "Cloudflare model must remain HYBRID pending DCA-01");
assert(defaults.billing_activation_state === "pending_BCA01", "billing must remain pending BCA-01");
assert(defaults.final_visual_refinement === "pending_PRM3", "visual refinement must remain pending PR-M3");
assert(defaults.primary_color === "#0f3d44", "registry must materialize explicit defaults");

const valid = normalizeConfigurationSnapshot({
  trade_name: "Tenant Example",
  primary_color: "#123456",
  instagram: "https://instagram.com/example",
  ga4_measurement_id: "G-ABC12345",
  menu_items: [],
});
assert(valid.trade_name === "Tenant Example", "valid snapshot must retain cataloged values");
assert(valid.secondary_color === defaults.secondary_color, "missing values must receive explicit defaults");
assert(validateConfigurationSnapshot(valid).valid, "normalized snapshot must validate");

rejects("unknown key", () => normalizeConfigurationSnapshot({ invented_key: true }), "configuration_key_not_cataloged");
rejects("secret key", () => normalizeConfigurationSnapshot({ client_secret: "forbidden" }), "configuration_secret_key_prohibited");
rejects("unsafe content", () => normalizeConfigurationSnapshot({ tagline: "javascript:alert(1)" }), "configuration_unsafe_content");
rejects("invalid color", () => normalizeConfigurationSnapshot({ primary_color: "oklch(20% 0 0)" }), "configuration_invalid_color");
rejects("invalid social host", () => normalizeConfigurationSnapshot({ instagram: "https://example.com/profile" }), "configuration_invalid_social_host");
rejects("invalid analytics id", () => normalizeConfigurationSnapshot({ ga4_measurement_id: "secret-token" }), "configuration_invalid_analytics_id");
rejects("invalid media id", () => normalizeConfigurationSnapshot({ primary_logo: "site/path.png" }), "configuration_invalid_media_id");
rejects("system key mutation", () => mergeConfigurationDomain(valid, "future_activation", { domain_activation_state: "active" }), "configuration_system_key_immutable");
rejects("cross-domain patch", () => mergeConfigurationDomain(valid, "identity", { primary_color: "#ffffff" }), "configuration_domain_key_mismatch");

const publicProjection = publicConfigurationSnapshot({ ...valid, legacy_settings_archive: { retained: true } });
assert(!("legacy_settings_archive" in publicProjection), "legacy archive must not be publicly exposed");
assert(!("cloudflare_mode" in publicProjection), "future activation diagnostics must not be publicly exposed");

includesAll(migration, [
  "site_settings_versions_configuration_contract",
  "ux_site_settings_versions_configuration_draft",
  "ux_site_settings_versions_configuration_published",
  "ux_site_settings_versions_configuration_revision",
  "configuration_legacy_media_ambiguous_or_missing",
  "configuration_legacy_signed_url_without_media_authority",
  "legacy_settings_archive",
  "CREATE OR REPLACE FUNCTION public.validate_tenant_configuration_snapshot",
  "CREATE OR REPLACE FUNCTION public.assert_tenant_configuration_authority",
  "CREATE OR REPLACE FUNCTION public.save_tenant_configuration_draft",
  "CREATE OR REPLACE FUNCTION public.discard_tenant_configuration_draft",
  "CREATE OR REPLACE FUNCTION public.publish_tenant_configuration",
  "CREATE OR REPLACE FUNCTION public.rollback_tenant_configuration",
  "SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE",
  "configuration_revision_conflict",
  "configuration_draft_not_found",
  "configuration_version_not_found",
  "tenant_configuration.draft.save",
  "tenant_configuration.publish",
  "tenant_configuration.rollback.prepare",
  "REVOKE ALL ON TABLE public.site_settings FROM PUBLIC, anon, authenticated",
  "REVOKE ALL ON TABLE public.site_settings_versions FROM PUBLIC, anon, authenticated",
  "REVOKE ALL ON TABLE public.website_menu_items FROM PUBLIC, anon, authenticated",
  "GRANT EXECUTE ON FUNCTION public.publish_tenant_configuration",
], "configuration migration");
assert(!/ORDER BY[\s\S]{0,100}LIMIT\s+1/i.test(migration), "migration must not use ORDER BY/LIMIT 1 as authority");
assert(!migration.includes("tenant_default"), "migration must not introduce tenant defaults");
assert(!/GRANT\s+(SELECT|INSERT|UPDATE|DELETE|ALL)[\s\S]{0,100}\sTO\s+(anon|authenticated)/i.test(migration), "migration must not grant direct application-table access");

for (const functionName of [
  "validate_tenant_configuration_snapshot",
  "assert_tenant_configuration_authority",
  "save_tenant_configuration_draft",
  "discard_tenant_configuration_draft",
  "publish_tenant_configuration",
  "rollback_tenant_configuration",
]) {
  assert(migration.includes(`REVOKE ALL ON FUNCTION public.${functionName}`), `${functionName} must revoke PUBLIC/anon/authenticated`);
  assert(migration.includes(`GRANT EXECUTE ON FUNCTION public.${functionName}`), `${functionName} must grant service_role only`);
}

includesAll(authority, [
  "requireTenantScopedAuthority",
  "resolveEffectiveTenantPermission",
  "authorizeTenantConfigurationOperation",
  "loadTenantConfigurationState",
  "loadPublishedConfigurationForTenant",
  "assertConfigurationMediaReferences",
  '.eq("tenant_id", tenantId)',
  '.eq("key", "configuration")',
  '.maybeSingle()',
], "configuration authority");
assert(!authority.includes("has_role"), "configuration authority must not use has_role");
assert(!authority.includes("is_super_admin"), "configuration authority must not bypass impersonation boundary");

includesAll(functions, [
  "requireTenant",
  "requirePublicTenantFromRequest",
  "getConfigurationRegistry",
  "getPublishedTenantConfiguration",
  "getPublishedPublicConfiguration",
  "getTenantConfigurationDraft",
  "saveTenantConfigurationDraft",
  "discardTenantConfigurationDraft",
  "validateTenantConfigurationDraft",
  "previewTenantConfiguration",
  "publishTenantConfiguration",
  "listTenantConfigurationVersions",
  "getTenantConfigurationVersion",
  "rollbackTenantConfiguration",
  "getTenantConfigurationDiagnostics",
  '"save_tenant_configuration_draft"',
  '"discard_tenant_configuration_draft"',
  '"publish_tenant_configuration"',
  '"rollback_tenant_configuration"',
], "configuration server functions");
assert(!/\.from\("site_settings"\)\.(insert|upsert|update|delete)/.test(functions), "canonical functions must not mutate legacy site_settings");
assert(!/\.from\("website_menu_items"\)\.(insert|upsert|update|delete)/.test(functions), "canonical functions must not mutate legacy menu table");
assert(!functions.includes("fallback"), "canonical functions must not implement fallback");

includesAll(site, [
  "requirePublicTenantFromRequest",
  "loadPublishedConfigurationForTenant",
  "projectConfigurationToSiteSettings",
  "media_library",
  "validateTenantSignRequest",
  "legacy_site_settings_mutation_retired",
], "public site compatibility projection");
assert(!site.includes('.from("site_settings")'), "public site must not read legacy site_settings");
assert(!site.includes('.upsert('), "public site module must not retain direct configuration upsert");
assert(!site.includes("365 * 24 * 60 * 60"), "public media URLs must not use one-year signed URLs");

assert(versions.includes("legacy_per_key_configuration_mutation_retired"), "per-key mutation path must fail closed");
assert(!/\.from\("site_settings_versions"\)[\s\S]{0,300}\.(insert|upsert|update|delete)/.test(versions), "legacy versions module must not mutate the ledger");
assert(menu.includes("loadPublishedConfigurationForTenant"), "public menu must read the published configuration snapshot");
assert(menu.includes("legacy_menu_mutation_retired_use_configuration_center"), "legacy menu mutations must fail closed");
assert(!menu.includes('.from("website_menu_items")'), "menu runtime must not read the legacy menu table");

includesAll(adapter, [
  "getTenantConfigurationDraft",
  "saveTenantConfigurationDraft",
  "publishTenantConfiguration",
  "rollbackTenantConfiguration",
  "configurationDomainSnapshot",
  "mergeConfigurationDomain",
  'id: "future_activation"',
  'id: "legacy_content"',
], "site adapter");
assert(!adapter.includes("atualizarSiteSettings"), "site adapter must not call legacy publish path");
assert(!adapter.includes("salvarRascunho"), "site adapter must not call per-key draft path");

includesAll(editor, [
  "CONFIGURATION_REGISTRY",
  "getTenantConfigurationDiagnostics",
  "previewTenantConfiguration",
  "listarMidias",
  "Domain activation = pending DCA-01",
  "Cloudflare mode = HYBRID / pending DCA-01",
  "Billing activation = pending BCA-01",
  "Final visual refinement = pending PR-M3",
  "retry_available",
  "permission_denied",
], "Configuration Center UI");
assert(!editor.includes("CmsFase1Tabs"), "Configuration Center must not retain the legacy settings editor");
assert(!editor.includes("CmsMenuTab"), "Configuration Center must not retain a parallel menu editor");
assert(!editor.includes("RawSectionEditor"), "Configuration Center must not accept arbitrary raw sections");

console.log(JSON.stringify({
  status: "PASS",
  passed,
  registryKeyCount: CONFIGURATION_KEY_NAMES.length,
  domains: CONFIGURATION_DOMAINS,
  canonicalLedger: "site_settings_versions:key=configuration",
  directSiteSettingsMutation: false,
  directMenuMutation: false,
  hostDerivedPublicAuthority: true,
  secretsInlineAccepted: false,
  mediaTenantValidated: true,
  draftPreviewPublishRollback: true,
  futureGates: {
    domain: "pending_DCA01",
    cloudflare: "HYBRID_pending_DCA01",
    billing: "pending_BCA01",
    finalVisual: "pending_PRM3",
  },
}, null, 2));
