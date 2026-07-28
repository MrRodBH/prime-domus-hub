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

check("regular explicit tenant selection is accepted", () => {
  assert.equal(
    requireCmsTenantAuthority({
      tenantId: "11111111-1111-4111-8111-111111111111",
      isSuperAdmin: false,
      impersonation: false,
      origin: "selection",
    }),
    "11111111-1111-4111-8111-111111111111",
  );
});

check("single active membership authority is accepted", () => {
  assert.equal(
    requireCmsTenantAuthority({
      tenantId: "22222222-2222-4222-8222-222222222222",
      isSuperAdmin: false,
      impersonation: false,
      origin: "single-membership",
    }),
    "22222222-2222-4222-8222-222222222222",
  );
});

check("Super Admin with explicit impersonation is accepted", () => {
  assert.equal(
    requireCmsTenantAuthority({
      tenantId: "33333333-3333-4333-8333-333333333333",
      isSuperAdmin: true,
      impersonation: true,
      origin: "impersonation",
    }),
    "33333333-3333-4333-8333-333333333333",
  );
});

check("missing tenant authority fails closed", () => {
  assert.throws(() => requireCmsTenantAuthority(undefined), /CMS tenant authority unresolved/);
});

check("Super Admin without impersonation fails closed", () => {
  assert.throws(
    () =>
      requireCmsTenantAuthority({
        tenantId: "44444444-4444-4444-8444-444444444444",
        isSuperAdmin: true,
        impersonation: false,
        origin: "selection",
      }),
    /requires explicit impersonation/,
  );
});

check("regular user cannot claim impersonation origin", () => {
  assert.throws(
    () =>
      requireCmsTenantAuthority({
        tenantId: "55555555-5555-4555-8555-555555555555",
        isSuperAdmin: false,
        impersonation: true,
        origin: "impersonation",
      }),
    /origin is inconsistent/,
  );
});

const validHybridConfig = {
  operation_mode: "HYBRID" as const,
  automated_method: "JSON_API" as const,
  manual_method: "CSV" as const,
  configuration_schema_version: 1,
  credential_reference: "vault://tenant/portal/credentials",
  mapping_profile: "default-v1",
  publication_rules: { only_published: true },
  retry_policy: {
    max_attempts: 5,
    initial_delay_seconds: 30,
    max_delay_seconds: 3600,
  },
};

check("hybrid portal configuration parses deterministically", () => {
  assert.deepEqual(parsePortalHybridConfig(validHybridConfig), validHybridConfig);
});

check("portal configuration rejects non-hybrid mode", () => {
  assert.throws(
    () => parsePortalHybridConfig({ ...validHybridConfig, operation_mode: "AUTOMATED" }),
  );
});

check("portal configuration rejects inline secrets", () => {
  assert.throws(
    () => parsePortalHybridConfig({ ...validHybridConfig, api_token: "raw-secret" }),
    /inline secret is prohibited/,
  );
});

check("portal connector responses remove persisted secrets", () => {
  const safe = sanitizePortalConnector({
    id: "connector-1",
    config: validHybridConfig,
    feed_token: "feed-secret",
    webhook_secret: "webhook-secret",
  });
  assert.equal("feed_token" in safe, false);
  assert.equal("webhook_secret" in safe, false);
  assert.equal(safe.operation_mode, "HYBRID");
  assert.equal(safe.configuration_state, "ready");
});

const pagesSource = readFileSync("src/lib/api/pages.functions.ts", "utf8");
const formsSource = readFileSync("src/lib/api/forms.functions.ts", "utf8");
const campaignsSource = readFileSync("src/lib/api/campaigns.functions.ts", "utf8");
const versionsSource = readFileSync("src/lib/api/site-versions.functions.ts", "utf8");
const mediaSource = readFileSync("src/lib/api/media.functions.ts", "utf8");
const portalsSource = readFileSync("src/lib/api/portals.functions.ts", "utf8");
const portalRegistrySource = readFileSync("src/lib/portals/portal-connector-registry.ts", "utf8");
const cmsSource = readFileSync("src/lib/api/_cms.ts", "utf8");

check("all four administrative page functions use requireTenant", () => {
  assert.equal(pagesSource.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 4);
  assert.equal(pagesSource.includes("requireSupabaseAuth"), false);
  assert.ok(pagesSource.includes("assertCmsTenantPermission"));
});

check("administrative page operations apply explicit tenant filters", () => {
  assert.ok((pagesSource.match(/\.eq\("tenant_id", tenantId\)/g)?.length ?? 0) >= 6);
  assert.ok(pagesSource.includes(".insert({ ...payload, tenant_id: tenantId, created_by: userId })"));
});

check("all six administrative form functions use requireTenant", () => {
  assert.equal(formsSource.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 6);
  assert.equal(formsSource.includes("requireSupabaseAuth"), false);
  assert.ok(formsSource.includes("assertCmsTenantPermission"));
});

check("administrative form operations apply explicit tenant filters", () => {
  assert.ok((formsSource.match(/\.eq\("tenant_id", tenantId\)/g)?.length ?? 0) >= 12);
  assert.ok(formsSource.includes("tenant_id: tenantId"));
  assert.ok(formsSource.includes('.from("form_submissions")') && formsSource.includes('.eq("tenant_id", tenantId)'));
});

check("form field mutation proves parent form ownership", () => {
  const saveFieldsIndex = formsSource.indexOf("export const salvarCampos");
  const formOwnershipIndex = formsSource.indexOf('.from("cms_forms")', saveFieldsIndex);
  const fieldsDeleteIndex = formsSource.indexOf('.from("cms_form_fields")', formOwnershipIndex);
  assert.ok(saveFieldsIndex >= 0);
  assert.ok(formOwnershipIndex > saveFieldsIndex);
  assert.ok(fieldsDeleteIndex > formOwnershipIndex);
});

check("all five administrative campaign functions use requireTenant", () => {
  assert.equal(campaignsSource.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 5);
  assert.equal(campaignsSource.includes("requireSupabaseAuth"), false);
  assert.ok(campaignsSource.includes("assertCmsTenantPermission"));
});

check("administrative campaign operations apply explicit tenant filters", () => {
  assert.ok((campaignsSource.match(/\.eq\("tenant_id", tenantId\)/g)?.length ?? 0) >= 8);
  assert.ok(campaignsSource.includes(".insert({ ...payload, tenant_id: tenantId, created_by: context.userId })"));
});

check("campaign metrics prove campaign ownership before reading events", () => {
  const metricsIndex = campaignsSource.indexOf("export const metricasCampanha");
  const campaignOwnershipIndex = campaignsSource.indexOf('.from("cms_campaigns")', metricsIndex);
  const eventsIndex = campaignsSource.indexOf('.from("cms_campaign_events")', campaignOwnershipIndex);
  assert.ok(metricsIndex >= 0);
  assert.ok(campaignOwnershipIndex > metricsIndex);
  assert.ok(eventsIndex > campaignOwnershipIndex);
  assert.ok(campaignsSource.indexOf('.eq("tenant_id", tenantId)', eventsIndex) > eventsIndex);
});

check("all eight site version functions use requireTenant", () => {
  assert.equal(versionsSource.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 8);
  assert.equal(versionsSource.includes("requireSupabaseAuth"), false);
  assert.ok(versionsSource.includes("assertCmsTenantPermission"));
});

check("site versioning scopes settings and versions by tenant", () => {
  assert.ok((versionsSource.match(/\.eq\("tenant_id", tenantId\)/g)?.length ?? 0) >= 12);
  assert.ok((versionsSource.match(/tenant_id: tenantId/g)?.length ?? 0) >= 6);
  assert.ok(versionsSource.includes('.from("site_settings")'));
  assert.ok(versionsSource.includes('.from("site_settings_versions")'));
});

check("site version restore proves version ownership", () => {
  const restoreIndex = versionsSource.indexOf("export const restaurarVersao");
  const versionLookupIndex = versionsSource.indexOf('.from("site_settings_versions")', restoreIndex);
  const tenantFilterIndex = versionsSource.indexOf('.eq("tenant_id", tenantId)', versionLookupIndex);
  const idFilterIndex = versionsSource.indexOf('.eq("id", data.id)', tenantFilterIndex);
  assert.ok(restoreIndex >= 0);
  assert.ok(versionLookupIndex > restoreIndex);
  assert.ok(tenantFilterIndex > versionLookupIndex);
  assert.ok(idFilterIndex > tenantFilterIndex);
});

check("all seven media functions use requireTenant", () => {
  assert.equal(mediaSource.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 7);
  assert.equal(mediaSource.includes("requireSupabaseAuth"), false);
  assert.ok(mediaSource.includes("assertCmsTenantPermission"));
});

check("media database operations are explicitly tenant-scoped", () => {
  assert.ok((mediaSource.match(/\.eq\("tenant_id", tenantId\)/g)?.length ?? 0) >= 11);
  assert.ok((mediaSource.match(/tenant_id: tenantId/g)?.length ?? 0) >= 2);
  assert.ok(mediaSource.includes('.from("media_library")'));
  assert.ok(mediaSource.includes('.from("media_usage")'));
});

check("media deletion derives and validates storage paths server-side", () => {
  const deleteIndex = mediaSource.indexOf("export const excluirMidia");
  const rowLookupIndex = mediaSource.indexOf('.from("media_library")', deleteIndex);
  const pathExtractionIndex = mediaSource.indexOf("const paths = [row.arquivo", rowLookupIndex);
  const validationIndex = mediaSource.indexOf("validateTenantSignRequest", pathExtractionIndex);
  const storageRemoveIndex = mediaSource.indexOf('.remove(paths)', validationIndex);
  const metadataDeleteIndex = mediaSource.indexOf('.from("media_library")', storageRemoveIndex);
  assert.ok(deleteIndex >= 0);
  assert.ok(rowLookupIndex > deleteIndex);
  assert.ok(pathExtractionIndex > rowLookupIndex);
  assert.ok(validationIndex > pathExtractionIndex);
  assert.ok(storageRemoveIndex > validationIndex);
  assert.ok(metadataDeleteIndex > storageRemoveIndex);
});

check("media usage proves parent ownership before writes and reads", () => {
  const registerIndex = mediaSource.indexOf("export const registrarUsoMidia");
  const registerParentIndex = mediaSource.indexOf('.from("media_library")', registerIndex);
  const usageUpsertIndex = mediaSource.indexOf('.from("media_usage").upsert', registerParentIndex);
  const listIndex = mediaSource.indexOf("export const listarUsosMidia");
  const listParentIndex = mediaSource.indexOf('.from("media_library")', listIndex);
  const usageReadIndex = mediaSource.indexOf('.from("media_usage")', listParentIndex);
  assert.ok(registerParentIndex > registerIndex);
  assert.ok(usageUpsertIndex > registerParentIndex);
  assert.ok(listParentIndex > listIndex);
  assert.ok(usageReadIndex > listParentIndex);
});

check("all six portal surfaces use requireTenant", () => {
  assert.equal(portalsSource.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 6);
  assert.equal(portalsSource.includes("requireSupabaseAuth"), false);
  assert.ok(portalsSource.includes("requireTenantScopedAuthority"));
});

check("portal reads and mutations are explicitly tenant-scoped", () => {
  assert.ok((portalsSource.match(/\.eq\("tenant_id", tenantId\)/g)?.length ?? 0) >= 13);
  assert.ok(portalsSource.includes('.from("portal_connectors")'));
  assert.ok(portalsSource.includes('.from("imovel_portais")'));
  assert.ok(portalsSource.includes('.from("portal_sync_logs")'));
  assert.ok(portalsSource.includes('.from("leads")'));
});

check("portal activation requires a complete hybrid configuration", () => {
  const updateIndex = portalsSource.indexOf("export const atualizarPortal");
  const currentIndex = portalsSource.indexOf('.from("portal_connectors")', updateIndex);
  const parseIndex = portalsSource.indexOf("parsePortalHybridConfig", currentIndex);
  const activeCheckIndex = portalsSource.indexOf("if (nextActive)", parseIndex);
  const transportIndex = portalsSource.indexOf("assertPortalTransport", activeCheckIndex);
  const updateWriteIndex = portalsSource.indexOf('.update(patch as never)', transportIndex);
  assert.ok(updateIndex >= 0);
  assert.ok(currentIndex > updateIndex);
  assert.ok(parseIndex > currentIndex);
  assert.ok(activeCheckIndex > parseIndex);
  assert.ok(transportIndex > activeCheckIndex);
  assert.ok(updateWriteIndex > transportIndex);
});

check("portal list response excludes persisted token and webhook secret", () => {
  const listIndex = portalsSource.indexOf("export const listarPortais");
  const updateIndex = portalsSource.indexOf("export const atualizarPortal");
  const listBlock = portalsSource.slice(listIndex, updateIndex);
  assert.equal(listBlock.includes("feed_token"), false);
  assert.equal(listBlock.includes("webhook_secret"), false);
  assert.ok(listBlock.includes("sanitizePortalConnector"));
});

check("portal registry exposes every supported hybrid method", () => {
  for (const method of [
    "JSON_API",
    "XML_FEED",
    "WEBHOOK",
    "CUSTOM_ADAPTER",
    "XLSX",
    "CSV",
    "MANUAL_EXPORT",
  ]) {
    assert.ok(portalRegistrySource.includes(`\"${method}\"`));
  }
  assert.ok(portalRegistrySource.includes('z.literal("HYBRID")'));
  assert.ok(portalRegistrySource.includes("credential_reference"));
  assert.ok(portalRegistrySource.includes("retry_policy"));
});

check("portal registry prohibits inline secrets", () => {
  assert.ok(portalRegistrySource.includes("INLINE_SECRET_KEYS"));
  assert.ok(portalRegistrySource.includes("Portal connector inline secret is prohibited"));
  assert.ok(portalRegistrySource.includes("sanitizePortalConnector"));
});

check("strict CMS permission helper validates tenant authority before permission", () => {
  const strictIndex = cmsSource.indexOf("export async function assertCmsTenantPermission");
  const authorityIndex = cmsSource.indexOf("requireCmsTenantAuthority(ctx.tenant)", strictIndex);
  const permissionIndex = cmsSource.indexOf("await assertPermission(ctx, modulo, action)", strictIndex);
  assert.ok(strictIndex >= 0);
  assert.ok(authorityIndex > strictIndex);
  assert.ok(permissionIndex > authorityIndex);
});

check("public page resolution remains Host-derived and tenant-filtered", () => {
  assert.ok(pagesSource.includes("requirePublicTenantFromRequest"));
  assert.ok(pagesSource.includes('.eq("tenant_id", tenant.id)'));
  assert.ok(pagesSource.includes('.limit(2)'));
});

check("public form writer authority remains request-derived and tenant-filtered", () => {
  assert.ok(formsSource.includes("requirePublicWriterTenantFromRequest"));
  assert.ok(formsSource.includes('.eq("tenant_id", input.tenant.id)'));
  assert.ok(formsSource.includes("selectExactlyOneTenantScopedRow"));
  assert.ok(formsSource.includes("assertTenantScopedCollection"));
});

check("public campaign authority remains Host-derived and tenant-filtered", () => {
  assert.ok(campaignsSource.includes("requirePublicTenantFromRequest"));
  assert.ok(campaignsSource.includes("requirePublicWriterTenantFromRequest"));
  assert.ok(campaignsSource.includes('.eq("tenant_id", tenant.id)'));
  assert.ok(campaignsSource.includes("recordPublicCampaignEvent"));
});

console.log(`PR-M2 tenant authority and hybrid registry specs: ${passed} passed`);