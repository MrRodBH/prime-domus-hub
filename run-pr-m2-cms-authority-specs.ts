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

function source(path: string) {
  return readFileSync(path, "utf8");
}

function count(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const tenantC = "33333333-3333-4333-8333-333333333333";

check("tenant authority accepts selection and single membership", () => {
  assert.equal(
    requireCmsTenantAuthority({
      tenantId: tenantA,
      isSuperAdmin: false,
      impersonation: false,
      origin: "selection",
    }),
    tenantA,
  );
  assert.equal(
    requireCmsTenantAuthority({
      tenantId: tenantB,
      isSuperAdmin: false,
      impersonation: false,
      origin: "single-membership",
    }),
    tenantB,
  );
});

check("tenant authority accepts Super Admin only with explicit impersonation", () => {
  assert.equal(
    requireCmsTenantAuthority({
      tenantId: tenantC,
      isSuperAdmin: true,
      impersonation: true,
      origin: "impersonation",
    }),
    tenantC,
  );
  assert.throws(
    () => requireCmsTenantAuthority({
      tenantId: tenantC,
      isSuperAdmin: true,
      impersonation: false,
      origin: "selection",
    }),
    /requires explicit impersonation/,
  );
});

check("tenant authority fails closed on missing or inconsistent context", () => {
  assert.throws(() => requireCmsTenantAuthority(undefined), /authority unresolved/);
  assert.throws(
    () => requireCmsTenantAuthority({
      tenantId: tenantA,
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

check("portal hybrid configuration is deterministic and closed", () => {
  assert.deepEqual(parsePortalHybridConfig(validHybridConfig), validHybridConfig);
  assert.throws(
    () => parsePortalHybridConfig({ ...validHybridConfig, operation_mode: "AUTOMATED" }),
  );
  assert.throws(
    () => parsePortalHybridConfig({ ...validHybridConfig, api_token: "raw-secret" }),
    /inline secret is prohibited/,
  );
});

check("portal connector DTO removes persisted secrets", () => {
  const safe = sanitizePortalConnector({
    id: "11111111-1111-4111-8111-111111111119",
    tenant_id: tenantA,
    portal_nome: "Portal Teste",
    portal_slug: "portal-teste",
    ativo: true,
    status: "ativo",
    feed_url: "https://example.test/feed",
    webhook_url: null,
    config: validHybridConfig,
    ultimo_sync_at: null,
    ultimo_erro: null,
    created_at: "2026-07-28T00:00:00.000Z",
    updated_at: "2026-07-28T00:00:00.000Z",
    feed_token: "feed-secret",
    webhook_secret: "webhook-secret",
  });
  assert.equal("feed_token" in safe, false);
  assert.equal("webhook_secret" in safe, false);
  assert.equal(safe.operation_mode, "HYBRID");
  assert.equal(safe.configuration_state, "ready");
});

const files = {
  pages: source("src/lib/api/pages.functions.ts"),
  forms: source("src/lib/api/forms.functions.ts"),
  campaigns: source("src/lib/api/campaigns.functions.ts"),
  versions: source("src/lib/api/site-versions.functions.ts"),
  media: source("src/lib/api/media.functions.ts"),
  portals: source("src/lib/api/portals.functions.ts"),
  portalRegistry: source("src/lib/portals/portal-connector-registry.ts"),
  cms: source("src/lib/api/_cms.ts"),
};

check("all migrated administrative surfaces use requireTenant", () => {
  const expected = {
    pages: 4,
    forms: 6,
    campaigns: 5,
    versions: 8,
    media: 7,
    portals: 6,
  } as const;
  for (const [key, total] of Object.entries(expected)) {
    const text = files[key as keyof typeof expected];
    assert.equal(count(text, /\.middleware\(\[requireTenant\]\)/g), total, key);
    assert.equal(text.includes("requireSupabaseAuth"), false, key);
  }
});

check("migrated database operations contain explicit tenant filters", () => {
  const minimum = {
    pages: 6,
    forms: 12,
    campaigns: 8,
    versions: 12,
    media: 11,
    portals: 13,
  } as const;
  for (const [key, total] of Object.entries(minimum)) {
    const text = files[key as keyof typeof minimum];
    assert.ok(count(text, /\.eq\("tenant_id", tenantId\)/g) >= total, key);
  }
});

check("tenant ids are persisted from server authority", () => {
  assert.ok(files.pages.includes("tenant_id: tenantId"));
  assert.ok(files.forms.includes("tenant_id: tenantId"));
  assert.ok(files.campaigns.includes("tenant_id: tenantId"));
  assert.ok(count(files.versions, /tenant_id: tenantId/g) >= 6);
  assert.ok(count(files.media, /tenant_id: tenantId/g) >= 2);
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

check("site version restore proves version ownership", () => {
  const start = files.versions.indexOf("export const restaurarVersao");
  const lookup = files.versions.indexOf('.from("site_settings_versions")', start);
  const tenant = files.versions.indexOf('.eq("tenant_id", tenantId)', lookup);
  const id = files.versions.indexOf('.eq("id", data.id)', tenant);
  assert.ok(start >= 0 && lookup > start && tenant > lookup && id > tenant);
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

check("portal activation validates hybrid configuration before mutation", () => {
  const start = files.portals.indexOf("export const atualizarPortal");
  const current = files.portals.indexOf('.from("portal_connectors")', start);
  const parse = files.portals.indexOf("parsePortalHybridConfig", current);
  const active = files.portals.indexOf("if (nextActive)", parse);
  const transport = files.portals.indexOf("assertPortalTransport", active);
  const update = files.portals.indexOf('.update(patch as never)', transport);
  assert.ok(start >= 0 && current > start && parse > current);
  assert.ok(active > parse && transport > active && update > transport);
});

check("portal list never selects persisted tokens or secrets", () => {
  const start = files.portals.indexOf("export const listarPortais");
  const end = files.portals.indexOf("export const atualizarPortal");
  const block = files.portals.slice(start, end);
  assert.equal(block.includes("feed_token"), false);
  assert.equal(block.includes("webhook_secret"), false);
  assert.ok(block.includes("sanitizePortalConnector"));
});

check("portal registry enumerates all hybrid methods and UI states", () => {
  for (const method of [
    "JSON_API",
    "XML_FEED",
    "WEBHOOK",
    "CUSTOM_ADAPTER",
    "XLSX",
    "CSV",
    "MANUAL_EXPORT",
  ]) {
    assert.ok(files.portalRegistry.includes(`\"${method}\"`), method);
  }
  for (const field of [
    "operation_mode",
    "credential_reference",
    "mapping_profile",
    "publication_rules",
    "retry_policy",
    "configuration_required",
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
});

console.log(`PR-M2 tenant authority and hybrid registry specs: ${passed} passed`);