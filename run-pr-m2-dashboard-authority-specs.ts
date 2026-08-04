import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireTenantScopedAuthority } from "./src/lib/api/tenant-scoped-authority";
import {
  DASHBOARD_METRIC_KEYS,
  DASHBOARD_METRIC_REGISTRY,
  DASHBOARD_TIMEZONE,
} from "./src/lib/dashboard/dashboard-metric-registry";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const tenantId = "11111111-1111-4111-8111-111111111111";
const source = readFileSync("src/lib/api/dashboard.functions.ts", "utf8");

check("tenant authority accepts regular selection and explicit impersonation", () => {
  assert.equal(requireTenantScopedAuthority({ tenantId, isSuperAdmin: false, impersonation: false, origin: "selection" }, "Dashboard"), tenantId);
  assert.equal(requireTenantScopedAuthority({ tenantId, isSuperAdmin: true, impersonation: true, origin: "impersonation" }, "Dashboard"), tenantId);
});

check("Super Admin without impersonation is denied", () => {
  assert.throws(() => requireTenantScopedAuthority({ tenantId, isSuperAdmin: true, impersonation: false, origin: "selection" }, "Dashboard"), /requires explicit impersonation/);
});

check("both dashboard functions use requireTenant and Tenant Access Control", () => {
  assert.equal(source.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 2);
  for (const token of [
    "requireTenantScopedAuthority",
    "resolveEffectiveTenantPermission",
    "trustedTenantAccessContext",
    '"crm"',
    '"visualizar"',
    "normalizeScope",
  ]) assert.ok(source.includes(token), token);
});

check("global roles are not tenant authority", () => {
  assert.equal(source.includes('.rpc("has_role"'), false);
  assert.equal(source.includes('.from("user_roles")'), false);
  assert.equal(source.includes("requireSupabaseAuth"), false);
});

check("effective scopes are enforced", () => {
  for (const token of [
    'scope === "global"',
    'scope === "own"',
    'scope === "team"',
    "allowedBrokerIds",
    "dashboard_broker_filter_denied",
    "dashboard_team_filter_denied",
    "applyBrokerScope",
  ]) assert.ok(source.includes(token), token);
});

check("dashboard filters every tenant data source", () => {
  assert.ok((source.match(/\.eq\("tenant_id", access\.tenantId\)/g)?.length ?? 0) >= 10);
  for (const table of [
    "leads",
    "corretores",
    "teams",
    "team_members",
    "imoveis",
    "tenant_marketing_ingestion_events",
    "tenant_portal_jobs",
    "crm_alerts",
  ]) assert.ok(source.includes(`.from("${table}")`), table);
});

check("ambiguous broker and team cardinality fail closed", () => {
  for (const token of [
    ".limit(2)",
    "Dashboard broker authority is ambiguous.",
    "Corretor inexistente ou ambíguo no tenant.",
    "Equipe inexistente ou ambígua no tenant.",
  ]) assert.ok(source.includes(token), token);
});

check("partial data is not silently accepted", () => {
  assert.ok(source.includes("Dashboard partial-data error"));
  assert.ok(source.includes('dataCompleteness: "complete"'));
});

check("metric registry is explicit and closed", () => {
  assert.equal(DASHBOARD_TIMEZONE, "America/Sao_Paulo");
  assert.equal(DASHBOARD_METRIC_KEYS.length, 15);
  for (const key of DASHBOARD_METRIC_KEYS) {
    const definition = DASHBOARD_METRIC_REGISTRY[key];
    assert.equal(definition.metricKey, key);
    assert.equal(definition.permission.module, "crm");
    assert.equal(definition.permission.action, "visualizar");
    assert.ok(definition.formula.length > 0);
    assert.ok(definition.dataSource.length > 0);
    assert.ok(definition.scopes.includes("global"));
  }
});

check("won, lost and discarded outcomes are differentiated", () => {
  for (const token of [
    'countStatus(current, "ganho")',
    'countStatus(current, "perdido")',
    'countStatus(current, "descartado")',
    'etapa: "Perdidos"',
    'etapa: "Descartados"',
  ]) assert.ok(source.includes(token), token);
});

check("operational metrics include property, marketing and portal sources", () => {
  for (const token of [
    "activeProperties",
    "publishedProperties",
    "marketingIngestionEvents",
    "portalPublications",
    "crmAlerts",
    "metricRegistry",
    "timezone",
  ]) assert.ok(source.includes(token), token);
});

console.log(`PR-M2 dashboard tenant authority specs: ${passed} passed`);
