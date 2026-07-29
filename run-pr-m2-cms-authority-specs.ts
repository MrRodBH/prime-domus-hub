import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireCmsTenantAuthority } from "./src/lib/api/cms-tenant-authority";
import {
  parsePortalHybridConfig,
  sanitizePortalConnector,
} from "./src/lib/portals/portal-connector-registry";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}
function source(path: string) { return readFileSync(path, "utf8"); }
function count(text: string, pattern: RegExp) { return text.match(pattern)?.length ?? 0; }

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const tenantC = "33333333-3333-4333-8333-333333333333";

check("tenant authority accepts selection and single membership", () => {
  assert.equal(requireCmsTenantAuthority({ tenantId: tenantA, isSuperAdmin: false, impersonation: false, origin: "selection" }), tenantA);
  assert.equal(requireCmsTenantAuthority({ tenantId: tenantB, isSuperAdmin: false, impersonation: false, origin: "single-membership" }), tenantB);
});

check("tenant authority accepts Super Admin only with explicit impersonation", () => {
  assert.equal(requireCmsTenantAuthority({ tenantId: tenantC, isSuperAdmin: true, impersonation: true, origin: "impersonation" }), tenantC);
  assert.throws(
    () => requireCmsTenantAuthority({ tenantId: tenantC, isSuperAdmin: true, impersonation: false, origin: "selection" }),
    /requires explicit impersonation/,
  );
});

check("tenant authority fails closed on missing or inconsistent context", () => {
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

check("portal hybrid configuration is deterministic and closed", () => {
  assert.deepEqual(parsePortalHybridConfig(validHybridConfig), validHybridConfig);
  assert.throws(() => parsePortalHybridConfig({ ...validHybridConfig, operation_mode: "AUTOMATED" }));
  assert.throws(
    () => parsePortalHybridConfig({ ...validHybridConfig, api_token: "raw-secret" }),
    /portal_inline_secret_prohibited/,
  );
});

check("portal connector DTO removes persisted secrets and exposes explicit states", () => {
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

check("all migrated administrative surfaces use requireTenant", () => {
  const expected = { pages: 4, forms: 6, campaigns: 5, versions: 8, media: 7 } as const;
  for (const [key, total] of Object.entries(expected)) {
    const text = files[key as keyof typeof expected];
    assert.equal(count(text, /\.middleware\(\[requireTenant\]\)/g), total, key);
    assert.equal(text.includes("requireSupabaseAuth"), false, key);
  }
  assert.ok(count(files.configurationFunctions, /\.middleware\(\[requireTenant\]\)/g) >= 10, "configurationFunctions");
  assert.ok(count(files.portalFunctions, /\.middleware\(\[requireTenant\]\)/g) >= 15, "portalFunctions");
  assert.equal(files.portalFunctions.includes("requireSupabaseAuth"), false, "portalFunctions");
});

check("migrated table operations contain explicit tenant filters", () => {
  const minimum = { pages: 6, forms: 12, campaigns: 8, media: 11 } as const;
  for (const [key, total] of Object.entries(minimum)) {
    const text = files[key as keyof typeof minimum];
    assert.ok(count(text, /\.eq\("tenant_id", tenantId\)/g) >= total, key);
  }
  assert.ok(count(files.configurationAuthority, /\.eq\("tenant_id", tenantId\)/g) >= 2, "configuration authority");
  assert.ok(count(files.configurationFunctions, /\.eq\("tenant_id", tenantId\)/g) >= 2, "configuration functions");
  assert.ok(count(files.portalAuthority, /\.eq\("tenant_id", tenantId\)/g) >= 2, "portal authority");
  assert.ok(count(files.portalFunctions, /\.eq\("tenant_id", auth\.tenantId\)/g) >= 8, "portal functions");
  assert.ok(files.versions.includes("legacy_per_key_configuration_mutation_retired"), "legacy versions fail closed");
});

check("tenant ids are persisted or transported only from server authority", () => {
  assert.ok(files.pages.includes("tenant_id: tenantId"));
  assert.ok(files.forms.includes("tenant_id: tenantId"));
  assert.ok(files.campaigns.includes("tenant_id: tenantId"));
  assert.ok(count(files.media, /tenant_id: tenantId/g) >= 2);
  assert.ok(count(files.configurationFunctions, /_tenant_id: auth\.tenantId/g) >= 4);
  assert.ok(count(files.portalFunctions, /_tenant_id: auth\.tenantId/g) >= 8);
  assert.ok(files.configurationAuthority.includes("requireTenantScopedAuthority(context.tenant"));
  assert.ok(files.portalAuthority.includes("requireTenantScopedAuthority(context.tenant"));
});

check("canonical configuration mutations are specialized service-role RPCs", () => {
  for (const rpc of [
    "save_tenant_configuration_draft",
    "discard_tenant_configuration_draft",
    "publish_tenant_configuration",
    "rollback_tenant_configuration",
  ]) {
    assert.ok(files.configurationFunctions.includes(`\"${rpc}\"`), rpc);
    assert.ok(files.configurationMigration.includes(`CREATE OR REPLACE FUNCTION public.${rpc}`), rpc);
    assert.ok(files.configurationMigration.includes(`REVOKE ALL ON FUNCTION public.${rpc}`), rpc);
    assert.ok(files.configurationMigration.includes(`GRANT EXECUTE ON FUNCTION public.${rpc}`), rpc);
  }
  assert.equal(files.configurationFunctions.includes('.from("site_settings").upsert'), false);
  assert.equal(files.configurationFunctions.includes('.from("site_settings_versions").insert'), false);
});

check("canonical portal mutations are specialized service-role RPCs", () => {
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
    assert.ok(files.portalFunctions.includes(`\"${rpc}\"`), rpc);
    assert.ok(files.portalMigration.includes(`CREATE OR REPLACE FUNCTION public.${rpc}`), rpc);
  }
  assert.equal(/\.from\("portal_connectors"\)[\s\S]{0,500}\.(insert|update|upsert|delete)/.test(files.portalFunctions), false);
  assert.equal(/\.from\("tenant_portal_jobs"\)[\s\S]{0,500}\.(insert|update|upsert|delete)/.test(files.portalFunctions), false);
});

check("form fields prove parent form ownership before replacement", () => {
  const start = files.forms.indexOf("export const salvarCampos");
  const parent = files.forms.indexOf('.from("cms_forms")', start);
  const deletion = files.forms.indexOf('.from("cms_form_fields")', parent);
  assert.ok(start >= 0 && parent > start && deletion > parent);
});

check("campaign metrics prove campaign ownership before event reads", () => {
  const start = files.campaigns.indexOf("export const metricasCampanha");
  const parent = files.campaigns.indexOf('.from("cms_campaigns")', start);
  const events = files.campaigns.indexOf('.from("cms_campaign_events")', parent);
  assert.ok(start >= 0 && parent > start && events > parent);
});

check("configuration rollback proves tenant plus version ownership before draft creation", () => {
  const start = files.configurationMigration.indexOf("CREATE OR REPLACE FUNCTION public.rollback_tenant_configuration");
  const lock = files.configurationMigration.indexOf("FROM public.tenants WHERE id = _tenant_id FOR UPDATE", start);
  const sourceLookup = files.configurationMigration.indexOf("WHERE id = _source_version_id", lock);
  const tenant = files.configurationMigration.indexOf("AND tenant_id = _tenant_id", sourceLookup);
  const canonicalKey = files.configurationMigration.indexOf("AND key = 'configuration'", tenant);
  const insert = files.configurationMigration.indexOf("INSERT INTO public.site_settings_versions", canonicalKey);
  assert.ok(start >= 0 && lock > start && sourceLookup > lock && tenant > sourceLookup && canonicalKey > tenant && insert > canonicalKey);
});

check("media deletion derives paths from the tenant row before Storage removal", () => {
  const start = files.media.indexOf("export const excluirMidia");
  const row = files.media.indexOf('.from("media_library")', start);
  const paths = files.media.indexOf("const paths = [row.arquivo", row);
  const validate = files.media.indexOf("validateTenantSignRequest", paths);
  const remove = files.media.indexOf('.remove(paths)', validate);
  const metadataDelete = files.media.indexOf('.from("media_library")', remove);
  assert.ok(start >= 0 && row > start && paths > row && validate > paths);
  assert.ok(remove > validate && metadataDelete > remove);
});

check("media usage proves parent ownership before write and read", () => {
  const register = files.media.indexOf("export const registrarUsoMidia");
  const registerParent = files.media.indexOf('.from("media_library")', register);
  const upsert = files.media.indexOf('.from("media_usage").upsert', registerParent);
  const list = files.media.indexOf("export const listarUsosMidia");
  const listParent = files.media.indexOf('.from("media_library")', list);
  const usageRead = files.media.indexOf('.from("media_usage")', listParent);
  assert.ok(registerParent > register && upsert > registerParent);
  assert.ok(listParent > list && usageRead > listParent);
});

check("portal runtime has one canonical barrel and no legacy mutation implementation", () => {
  assert.ok(files.portalBarrel.includes("Read-only compatibility aliases"));
  assert.ok(files.portalBarrel.includes("saveTenantPortalConnector"));
  assert.equal(files.portalBarrel.includes("randomBytes"), false);
  assert.equal(files.portalBarrel.includes("has_role"), false);
  assert.equal(files.portalBarrel.includes("rotacionarToken"), false);
  assert.equal(files.portalBarrel.includes("atualizarPortal"), false);
  assert.equal(files.portalBarrel.includes('.update('), false);
});

check("portal authority uses effective Tenant Access Control and explicit impersonation boundary", () => {
  assert.ok(files.portalAuthority.includes("resolveEffectiveTenantPermission"));
  assert.ok(files.portalAuthority.includes('"portals"'));
  assert.ok(files.portalAuthority.includes('decision.scope !== "global"'));
  assert.ok(files.portalAuthority.includes("requireTenantScopedAuthority"));
  assert.equal(files.portalAuthority.includes("has_role"), false);
  assert.equal(files.portalAuthority.includes("user_roles"), false);
});

check("portal registry enumerates hybrid methods, states and fail-closed adapters", () => {
  for (const method of ["JSON_API", "XML_FEED", "WEBHOOK", "CUSTOM_ADAPTER", "XLSX", "CSV", "MANUAL_EXPORT"]) {
    assert.ok(files.portalRegistry.includes(`\"${method}\"`), method);
  }
  for (const field of [
    "operation_mode",
    "credential_reference",
    "mapping_profile",
    "mapping_version",
    "publication_rules",
    "retry_policy",
    "configuration_required",
    "credential_provisioning_required",
    "adapter_not_implemented",
    "failed_terminal",
  ]) {
    assert.ok(files.portalRegistry.includes(field), field);
  }
});

check("strict CMS permission validates tenant authority before permission", () => {
  const strict = files.cms.indexOf("export async function assertCmsTenantPermission");
  const authority = files.cms.indexOf("requireCmsTenantAuthority(ctx.tenant)", strict);
  const permission = files.cms.indexOf("await assertPermission(ctx, modulo, action)", strict);
  assert.ok(strict >= 0 && authority > strict && permission > authority);
});

check("public boundaries remain request-derived and tenant-filtered", () => {
  assert.ok(files.pages.includes("requirePublicTenantFromRequest"));
  assert.ok(files.pages.includes('.eq("tenant_id", tenant.id)'));
  assert.ok(files.forms.includes("requirePublicWriterTenantFromRequest"));
  assert.ok(files.forms.includes('.eq("tenant_id", input.tenant.id)'));
  assert.ok(files.campaigns.includes("requirePublicTenantFromRequest"));
  assert.ok(files.campaigns.includes("requirePublicWriterTenantFromRequest"));
  assert.ok(files.campaigns.includes('.eq("tenant_id", tenant.id)'));
  assert.ok(files.configurationFunctions.includes("requirePublicTenantFromRequest"));
  assert.ok(files.configurationFunctions.includes("loadPublishedConfigurationForTenant(tenant.id)"));
});

console.log(`PR-M2 tenant authority, Configuration Center and portal registry specs: ${passed} passed`);
