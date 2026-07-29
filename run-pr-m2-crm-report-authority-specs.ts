import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const compatibility = readFileSync("src/lib/api/leads-crm.functions.ts", "utf8");
const functions = readFileSync("src/lib/api/tenant-crm.functions.ts", "utf8");
const authority = readFileSync("src/lib/api/tenant-crm-authority.server.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql", "utf8");

check("canonical transition callers delegate to the Tenant CRM boundary", () => {
  assert.equal(compatibility.match(/transitionTenantLeadForContext\(/g)?.length ?? 0, 4);
  assert.equal(compatibility.includes('.from("leads").update'), false);
  assert.equal(compatibility.includes("supabaseAdmin"), false);
});

check("all CRM compatibility surfaces use requireTenant", () => {
  assert.ok((compatibility.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0) >= 7);
  assert.equal(compatibility.includes("requireSupabaseAuth"), false);
});

check("Tenant CRM authority uses effective permissions and explicit scopes", () => {
  for (const token of [
    "resolveEffectiveTenantPermission",
    "trustedTenantAccessContext",
    "requireTenantScopedAuthority",
    '"proprio"',
    '"equipe"',
    '"global"',
    "super_admin_impersonation",
  ]) assert.ok(authority.includes(token), token);
  assert.equal(authority.includes("has_role"), false);
  assert.equal(authority.includes("user_roles"), false);
});

check("discarded leads use the canonical scoped list", () => {
  const start = compatibility.indexOf("export const listarLeadsDescartados");
  const scoped = compatibility.indexOf('listTenantLeadsForContext(context, { status: "descartado"', start);
  assert.ok(start >= 0 && scoped > start);
  assert.equal(compatibility.indexOf('.from("leads")', start), -1);
});

check("commercial performance is recomputed from scoped server data", () => {
  const start = compatibility.indexOf("export const performanceComercial");
  const scoped = compatibility.indexOf("listTenantLeadsForContext(context", start);
  const computed = compatibility.indexOf("performance(", scoped);
  assert.ok(start >= 0 && scoped > start && computed > scoped);
});

check("insight surface re-authorizes and does not call an external provider", () => {
  const start = compatibility.indexOf("export const gerarInsightsPerformance");
  const scoped = compatibility.indexOf("listTenantLeadsForContext(context", start);
  assert.ok(start >= 0 && scoped > start);
  assert.equal(compatibility.includes("LOVABLE_API_KEY"), false);
  assert.equal(compatibility.includes("ai.gateway.lovable.dev"), false);
  assert.equal(compatibility.includes("fetch("), false);
});

check("server functions expose closed serializable DTOs", () => {
  for (const token of ["CrmLeadDto", "CrmLeadAggregateDto", "CrmTaskDto", "ManualLeadResult"]) {
    assert.ok(functions.includes(token), token);
  }
  assert.equal(functions.includes("@ts-nocheck"), false);
  assert.equal(functions.includes("@ts-ignore"), false);
});

check("CRM reports and mutations use service-role-only primitives", () => {
  for (const token of [
    "list_tenant_crm_leads",
    "get_tenant_crm_lead_aggregate",
    "transition_tenant_crm_lead",
    "REVOKE ALL ON FUNCTION public.list_tenant_crm_leads",
    "GRANT EXECUTE ON FUNCTION public.list_tenant_crm_leads",
    "TO service_role",
  ]) assert.ok(migration.includes(token), token);
  assert.equal(migration.includes("GRANT EXECUTE ON FUNCTION public.list_tenant_crm_leads(uuid,uuid,text,text,integer,integer) TO authenticated"), false);
});

check("PTW-01 remains separate from administrative CRM operations", () => {
  assert.equal(migration.includes("public_create_tenant_crm_lead"), false);
  assert.equal(migration.includes("GRANT EXECUTE ON FUNCTION public.create_tenant_crm_lead(uuid,uuid,text,text,text,text,uuid,text,uuid,text) TO authenticated"), false);
});

check("no role, tenant or ordering heuristic is reintroduced", () => {
  const combined = `${authority}\n${functions}\n${compatibility}`;
  for (const token of ["has_role", "user_roles", "ORDER BY/LIMIT 1", "tenant default", "fallback tenant"]) {
    assert.equal(combined.includes(token), false, token);
  }
});

console.log(`PR-M2 CRM report authority specs: ${passed} passed`);
