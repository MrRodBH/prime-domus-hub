import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireCmsTenantAuthority } from "./src/lib/api/cms-tenant-authority";

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
  assert.throws(
    () => requireCmsTenantAuthority(undefined),
    /CMS tenant authority unresolved/,
  );
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

const pagesSource = readFileSync("src/lib/api/pages.functions.ts", "utf8");
const formsSource = readFileSync("src/lib/api/forms.functions.ts", "utf8");
const campaignsSource = readFileSync("src/lib/api/campaigns.functions.ts", "utf8");
const versionsSource = readFileSync("src/lib/api/site-versions.functions.ts", "utf8");
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

console.log(`PR-M2 CMS tenant authority specs: ${passed} passed`);