import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireCmsTenantAuthority } from "./src/lib/api/cms-tenant-authority";
import { parsePortalHybridConfig, sanitizePortalConnector } from "./src/lib/portals/portal-connector-registry";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}
const source = (path: string) => readFileSync(path, "utf8");
const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0;

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const tenantC = "33333333-3333-4333-8333-333333333333";

check("tenant authority accepts selection, membership and explicit impersonation", () => {
  assert.equal(requireCmsTenantAuthority({ tenantId: tenantA, isSuperAdmin: false, impersonation: false, origin: "selection" }), tenantA);
  assert.equal(requireCmsTenantAuthority({ tenantId: tenantB, isSuperAdmin: false, impersonation: false, origin: "single-membership" }), tenantB);
  assert.equal(requireCmsTenantAuthority({ tenantId: tenantC, isSuperAdmin: true, impersonation: true, origin: "impersonation" }), tenantC);
  assert.throws(
    () => requireCmsTenantAuthority({ tenantId: tenantC, isSuperAdmin: true, impersonation: false, origin: "selection" }),
    /requires explicit impersonation/,
  );
  assert.throws(() => requireCmsTenantAuthority(undefined), /authority unresolved/);
  assert.throws(
    () => requireCmsTenantAuthority({ tenantId: tenantA, isSuperAdmin: false, impersonation: true, origin: "impersonation" }),
    /origin is inconsistent/,
  );
});

const validHybridConfig = {
  operation_mode: "HYBRID" as const,
  automated_method: "JSON_API" as const,
  manual_method: "CSV" as const,
  configuration_schema_version: 1 as const,
  credential_reference: "credential://tenant/portal/credentials",
  mapping_profile: "default-v1",
  mapping_version: 1,
  publication_rules: { only_published: true as const },
  retry_policy: { max_attempts: 5, initial_delay_seconds: 30, max_delay_seconds: 3600 },
};

check("portal hybrid configuration and DTO remain closed", () => {
  assert.deepEqual(parsePortalHybridConfig(validHybridConfig), validHybridConfig);
  assert.throws(() => parsePortalHybridConfig({ ...validHybridConfig, operation_mode: "AUTOMATED" }));
  assert.throws(() => parsePortalHybridConfig({ ...validHybridConfig, api_token: "raw-secret" }), /portal_inline_secret_prohibited/);
  const safe = sanitizePortalConnector({
    id: "11111111-1111-4111-8111-111111111119",
    tenant_id: tenantA,
    portal_nome: "Portal Teste",
    portal_slug: "portal-teste",
    ativo: false,
    status: "inativo",
    feed_url: "https://example.test/feed",
    webhook_url: null,
    config: validHybridConfig,
    ultimo_sync_at: null,
    ultimo_erro: null,
    created_at: "2026-07-28T00:00:00.000Z",
    updated_at: "2026-07-28T00:00:00.000Z",
    credential_version: 1,
    credential_state: "credential_provisioning_required",
    last_rotated_at: null,
    rotation_required: false,
    row_version: 2,
  });
  assert.equal("feed_token" in safe, false);
  assert.equal("webhook_secret" in safe, false);
  assert.equal(safe.operationMode, "HYBRID");
  assert.equal(safe.configurationState, "adapter_not_implemented");
  assert.equal(safe.credentialState, "credential_provisioning_required");
  assert.equal(safe.rowVersion, 2);
});

const files = {
  pages: source("src/lib/api/pages.functions.ts"),
  forms: source("src/lib/api/forms.functions.ts"),
  campaigns: source("src/lib/api/campaigns.functions.ts"),
  cmsFunctions: source("src/lib/api/tenant-cms.functions.ts"),
  cmsAuthority: source("src/lib/api/tenant-cms-authority.server.ts"),
  cmsMigration: source("supabase/migrations/20260729183000_pr_m2_cms_workflow_functional_completion.sql"),
  versions: source("src/lib/api/site-versions.functions.ts"),
  configurationFunctions: source("src/lib/api/tenant-configuration.functions.ts"),
  configurationAuthority: source("src/lib/api/tenant-configuration-authority.server.ts"),
  configurationMigration: source("supabase/migrations/20260728233000_pr_m2_configuration_center.sql"),
  media: source("src/lib/api/media.functions.ts"),
  portalBarrel: source("src/lib/api/portals.functions.ts"),
  portalFunctions: source("src/lib/api/tenant-portal.functions.ts"),
  portalAuthority: source("src/lib/api/tenant-portal-authority.server.ts"),
  portalMigration: source("supabase/migrations/20260729103000_pr_m2_portal_functional_completion.sql"),
  portalRegistry: source("src/lib/portals/portal-connector-registry.ts"),
  cms: source("src/lib/api/_cms.ts"),
};

check("administrative CMS boundaries require trusted tenant context", () => {
  const compatibilityExpected = { pages: 2, forms: 4, campaigns: 3, versions: 8, media: 7 } as const;
  for (const [key, total] of Object.entries(compatibilityExpected)) {
    const text = files[key as keyof typeof compatibilityExpected];
    assert.equal(count(text, /\.middleware\(\[requireTenant\]\)/g), total, key);
    assert.equal(text.includes("requireSupabaseAuth"), false, key);
  }
  assert.ok(count(files.cmsFunctions, /\.middleware\(\[requireTenant\]\)/g) >= 25);
  assert.ok(count(files.configurationFunctions, /\.middleware\(\[requireTenant\]\)/g) >= 10);
  assert.ok(count(files.portalFunctions, /\.middleware\(\[requireTenant\]\)/g) >= 15);
  assert.equal(files.cmsFunctions.includes("requireSupabaseAuth"), false);
  assert.equal(files.portalFunctions.includes("requireSupabaseAuth"), false);
});

check("canonical CMS filters tenant through shared helpers and effective authority", () => {
  assert.ok(count(files.cmsFunctions, /\.eq\("tenant_id", auth\.tenantId\)/g) >= 5);
  assert.ok(count(files.cmsFunctions, /\.eq\("tenant_id", tenantId\)/g) >= 4);
  assert.ok(files.cmsFunctions.includes("assertExactTenantReferenceSet"));
  assert.ok(files.pages.includes('.eq("tenant_id", tenant.id)'));
  assert.ok(files.forms.includes('.eq("tenant_id", input.tenant.id)'));
  assert.ok(files.campaigns.includes('.eq("tenant_id", tenant.id)'));
  assert.ok(count(files.media, /tenant_id: tenantId/g) >= 2);
  assert.ok(count(files.configurationAuthority, /\.eq\("tenant_id", tenantId\)/g) >= 2);
  assert.ok(count(files.configurationFunctions, /\.eq\("tenant_id", tenantId\)/g) >= 2);
  assert.ok(count(files.portalAuthority, /\.eq\("tenant_id", tenantId\)/g) >= 2);
  assert.ok(count(files.portalFunctions, /\.eq\("tenant_id", auth\.tenantId\)/g) >= 8);
  assert.ok(files.versions.includes("legacy_per_key_configuration_mutation_retired"));
});

check("tenant transport comes from server-derived authority", () => {
  assert.ok(count(files.cmsFunctions, /_tenant_id: auth\.tenantId/g) >= 10);
  assert.ok(files.forms.includes("tenant_id: tenant.id"));
  assert.ok(count(files.configurationFunctions, /_tenant_id: auth\.tenantId/g) >= 4);
  assert.ok(count(files.portalFunctions, /_tenant_id: auth\.tenantId/g) >= 8);
  assert.ok(files.cmsAuthority.includes("requireTenantScopedAuthority(context.tenant"));
  assert.ok(files.configurationAuthority.includes("requireTenantScopedAuthority(context.tenant"));
  assert.ok(files.portalAuthority.includes("requireTenantScopedAuthority(context.tenant"));
});

check("canonical CMS mutations use specialized service-role RPCs", () => {
  for (const rpc of [
    "save_tenant_page_draft",
    "publish_tenant_page",
    "unpublish_tenant_page",
    "rollback_tenant_page",
    "save_tenant_template_version",
    "instantiate_tenant_template",
    "save_tenant_form_definition",
    "publish_tenant_form",
    "save_tenant_campaign_definition",
    "publish_tenant_campaign",
  ]) {
    assert.ok(files.cmsFunctions.includes(`"${rpc}"`), rpc);
    assert.ok(files.cmsMigration.includes(`CREATE OR REPLACE FUNCTION public.${rpc}`), rpc);
    assert.ok(files.cmsMigration.includes(`REVOKE ALL ON FUNCTION public.${rpc}`), rpc);
    assert.ok(files.cmsMigration.includes(`GRANT EXECUTE ON FUNCTION public.${rpc}`), rpc);
  }
  assert.equal(/\.from\("cms_pages"\)[\s\S]{0,500}\.(insert|update|upsert|delete)/.test(files.cmsFunctions), false);
  assert.equal(/\.from\("cms_forms"\)[\s\S]{0,500}\.(insert|update|upsert|delete)/.test(files.cmsFunctions), false);
  assert.equal(/\.from\("cms_campaigns"\)[\s\S]{0,500}\.(insert|update|upsert|delete)/.test(files.cmsFunctions), false);
});

check("configuration and portal mutations remain specialized RPCs", () => {
  for (const rpc of [
    "save_tenant_configuration_draft",
    "discard_tenant_configuration_draft",
    "publish_tenant_configuration",
    "rollback_tenant_configuration",
  ]) {
    assert.ok(files.configurationFunctions.includes(`"${rpc}"`), rpc);
    assert.ok(files.configurationMigration.includes(`CREATE OR REPLACE FUNCTION public.${rpc}`), rpc);
    assert.ok(files.configurationMigration.includes(`REVOKE ALL ON FUNCTION public.${rpc}`), rpc);
    assert.ok(files.configurationMigration.includes(`GRANT EXECUTE ON FUNCTION public.${rpc}`), rpc);
  }
  for (const rpc of [
    "save_tenant_portal_connector",
    "set_tenant_portal_connector_state",
    "rotate_tenant_portal_credential_reference",
    "save_tenant_portal_mapping",
    "enqueue_tenant_portal_publication",
    "schedule_tenant_portal_retry",
    "cancel_tenant_portal_job",
    "reconcile_tenant_portal_state",
    "record_tenant_portal_export",
  ]) {
    assert.ok(files.portalFunctions.includes(`"${rpc}"`), rpc);
    assert.ok(files.portalMigration.includes(`CREATE OR REPLACE FUNCTION public.${rpc}`), rpc);
  }
  assert.equal(files.configurationFunctions.includes('.from("site_settings").upsert'), false);
  assert.equal(/\.from\("portal_connectors"\)[\s\S]{0,500}\.(insert|update|upsert|delete)/.test(files.portalFunctions), false);
});

check("form fields publish atomically after tenant-owned parent lock", () => {
  const start = files.cmsMigration.indexOf("CREATE OR REPLACE FUNCTION public.publish_tenant_form");
  const parent = files.cmsMigration.indexOf("FROM public.cms_forms", start);
  const tenant = files.cmsMigration.indexOf("tenant_id = _tenant_id", parent);
  const lock = files.cmsMigration.indexOf("FOR UPDATE", tenant);
  const deletion = files.cmsMigration.indexOf("DELETE FROM public.cms_form_fields", lock);
  const insertion = files.cmsMigration.indexOf("INSERT INTO public.cms_form_fields", deletion);
  assert.ok(start >= 0 && parent > start && tenant > parent && lock > tenant && deletion > lock && insertion > deletion);
  assert.ok(files.forms.includes("legacy_cms_form_fields_mutation_retired"));
});

check("campaign metrics prove campaign ownership before event reads", () => {
  const start = files.campaigns.indexOf("export const metricasCampanha");
  const parent = files.campaigns.indexOf('.from("cms_campaigns")', start);
  const events = files.campaigns.indexOf('.from("cms_campaign_events")', parent);
  assert.ok(start >= 0 && parent > start && events > parent);
});

check("configuration rollback, media deletion and media usage preserve ownership", () => {
  const rollback = files.configurationMigration.indexOf("CREATE OR REPLACE FUNCTION public.rollback_tenant_configuration");
  const tenantLock = files.configurationMigration.indexOf("FROM public.tenants WHERE id = _tenant_id FOR UPDATE", rollback);
  const sourceLookup = files.configurationMigration.indexOf("WHERE id = _source_version_id", tenantLock);
  const sourceTenant = files.configurationMigration.indexOf("AND tenant_id = _tenant_id", sourceLookup);
  const insert = files.configurationMigration.indexOf("INSERT INTO public.site_settings_versions", sourceTenant);
  assert.ok(rollback >= 0 && tenantLock > rollback && sourceLookup > tenantLock && sourceTenant > sourceLookup && insert > sourceTenant);

  const removeStart = files.media.indexOf("export const excluirMidia");
  const mediaRow = files.media.indexOf('.from("media_library")', removeStart);
  const paths = files.media.indexOf("const paths = [row.arquivo", mediaRow);
  const validate = files.media.indexOf("validateTenantSignRequest", paths);
  const remove = files.media.indexOf(".remove(paths)", validate);
  assert.ok(removeStart >= 0 && mediaRow > removeStart && paths > mediaRow && validate > paths && remove > validate);

  const register = files.media.indexOf("export const registrarUsoMidia");
  const registerParent = files.media.indexOf('.from("media_library")', register);
  const upsert = files.media.indexOf('.from("media_usage").upsert', registerParent);
  assert.ok(registerParent > register && upsert > registerParent);
});

check("portal and CMS authorities use Tenant Access Control without role fallback", () => {
  for (const authority of [files.portalAuthority, files.cmsAuthority]) {
    assert.ok(authority.includes("resolveEffectiveTenantPermission"));
    assert.ok(authority.includes('decision.scope !== "global"'));
    assert.ok(authority.includes("requireTenantScopedAuthority"));
    assert.equal(authority.includes("has_role"), false);
    assert.equal(authority.includes("user_roles"), false);
  }
  assert.ok(files.cmsAuthority.includes("trustedTenantAccessContext"));
  assert.ok(files.cmsAuthority.includes("super_admin_impersonation"));
});

check("portal registry remains hybrid and fail closed", () => {
  for (const token of [
    "JSON_API", "XML_FEED", "WEBHOOK", "CUSTOM_ADAPTER", "XLSX", "CSV", "MANUAL_EXPORT",
    "operation_mode", "credential_reference", "mapping_profile", "mapping_version", "publication_rules",
    "retry_policy", "configuration_required", "credential_provisioning_required", "adapter_not_implemented", "failed_terminal",
  ]) assert.ok(files.portalRegistry.includes(token), token);
  assert.ok(files.portalBarrel.includes("Read-only compatibility aliases"));
  assert.equal(files.portalBarrel.includes("randomBytes"), false);
  assert.equal(files.portalBarrel.includes("has_role"), false);
  assert.equal(files.portalBarrel.includes(".update("), false);
});

check("CMS compatibility helper delegates and retires role fallback", () => {
  const strict = files.cms.indexOf("export async function assertCmsTenantPermission");
  const authority = files.cms.indexOf("authorizeTenantCmsOperation", strict);
  assert.ok(strict >= 0 && authority > strict);
  assert.ok(files.cms.includes("legacy_cms_permission_boundary_retired"));
  assert.equal(files.cms.includes('.rpc("has_role"'), false);
  assert.equal(files.cms.includes('.rpc("is_super_admin"'), false);
});

check("public boundaries are Host-derived, tenant-filtered and published-pointer-bound", () => {
  assert.ok(files.pages.includes("requirePublicTenantFromRequest"));
  assert.ok(files.pages.includes('.eq("tenant_id", tenant.id)'));
  assert.ok(files.pages.includes("published_version_id"));
  assert.ok(files.forms.includes("requirePublicWriterTenantFromRequest"));
  assert.ok(files.forms.includes('.eq("tenant_id", input.tenant.id)'));
  assert.ok(files.forms.includes("published_version_id"));
  assert.ok(files.campaigns.includes("requirePublicTenantFromRequest"));
  assert.ok(files.campaigns.includes("requirePublicWriterTenantFromRequest"));
  assert.ok(files.campaigns.includes('.eq("tenant_id", tenant.id)'));
  assert.ok(files.campaigns.includes("published_version_id"));
  assert.ok(files.configurationFunctions.includes("loadPublishedConfigurationForTenant(tenant.id)"));
});

console.log(`PR-M2 tenant authority, Configuration Center, CMS workflow and portal registry specs: ${passed} passed`);
