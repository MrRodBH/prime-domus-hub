import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireTenantScopedAuthority } from "./src/lib/api/tenant-scoped-authority";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const tenantId = "11111111-1111-4111-8111-111111111111";

check("generic tenant authority accepts regular selection", () => {
  assert.equal(
    requireTenantScopedAuthority(
      {
        tenantId,
        isSuperAdmin: false,
        impersonation: false,
        origin: "selection",
      },
      "Dashboard",
    ),
    tenantId,
  );
});

check("generic tenant authority accepts explicit Super Admin impersonation", () => {
  assert.equal(
    requireTenantScopedAuthority(
      {
        tenantId,
        isSuperAdmin: true,
        impersonation: true,
        origin: "impersonation",
      },
      "Dashboard",
    ),
    tenantId,
  );
});

check("generic tenant authority rejects Super Admin without impersonation", () => {
  assert.throws(
    () =>
      requireTenantScopedAuthority(
        {
          tenantId,
          isSuperAdmin: true,
          impersonation: false,
          origin: "selection",
        },
        "Dashboard",
      ),
    /requires explicit impersonation/,
  );
});

const dashboardSource = readFileSync("src/lib/api/dashboard.functions.ts", "utf8");

check("both dashboard server functions use requireTenant", () => {
  assert.equal(
    dashboardSource.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0,
    2,
  );
  assert.equal(dashboardSource.includes("requireSupabaseAuth"), false);
  assert.ok(dashboardSource.includes("requireTenantScopedAuthority"));
});

check("dashboard validates roles only after tenant authority", () => {
  const resolver = dashboardSource.indexOf("async function resolveDashboardAccess");
  const authority = dashboardSource.indexOf(
    'requireTenantScopedAuthority(context.tenant, "Dashboard")',
    resolver,
  );
  const firstRole = dashboardSource.indexOf('context.supabase.rpc("has_role"', authority);
  assert.ok(resolver >= 0);
  assert.ok(authority > resolver);
  assert.ok(firstRole > authority);
});

check("non-privileged dashboard access requires exactly one tenant broker", () => {
  const resolver = dashboardSource.indexOf("async function resolveDashboardAccess");
  const brokers = dashboardSource.indexOf('.from("corretores")', resolver);
  const tenantFilter = dashboardSource.indexOf('.eq("tenant_id", tenantId)', brokers);
  const userFilter = dashboardSource.indexOf('.eq("user_id", context.userId)', tenantFilter);
  const cardinality = dashboardSource.indexOf('.limit(2)', userFilter);
  const exactOne = dashboardSource.indexOf('(brokers ?? []).length !== 1', cardinality);
  assert.ok(brokers > resolver);
  assert.ok(tenantFilter > brokers);
  assert.ok(userFilter > tenantFilter);
  assert.ok(cardinality > userFilter);
  assert.ok(exactOne > cardinality);
});

check("dashboard validates selected broker inside the tenant", () => {
  const helper = dashboardSource.indexOf("async function requireTenantBroker");
  const brokers = dashboardSource.indexOf('.from("corretores")', helper);
  const tenantFilter = dashboardSource.indexOf('.eq("tenant_id", tenantId)', brokers);
  const idFilter = dashboardSource.indexOf('.eq("id", brokerId)', tenantFilter);
  const cardinality = dashboardSource.indexOf('.limit(2)', idFilter);
  assert.ok(helper >= 0);
  assert.ok(brokers > helper);
  assert.ok(tenantFilter > brokers);
  assert.ok(idFilter > tenantFilter);
  assert.ok(cardinality > idFilter);
});

check("dashboard proves team ownership before reading members", () => {
  const helper = dashboardSource.indexOf("async function resolveTeamBrokerIds");
  const teams = dashboardSource.indexOf('.from("teams")', helper);
  const teamTenant = dashboardSource.indexOf('.eq("tenant_id", tenantId)', teams);
  const teamId = dashboardSource.indexOf('.eq("id", teamId)', teamTenant);
  const members = dashboardSource.indexOf('.from("team_members")', teamId);
  const memberTenant = dashboardSource.indexOf('.eq("tenant_id", tenantId)', members);
  const brokers = dashboardSource.indexOf('.from("corretores")', memberTenant);
  const brokerTenant = dashboardSource.indexOf('.eq("tenant_id", tenantId)', brokers);
  assert.ok(helper >= 0);
  assert.ok(teams > helper && teamTenant > teams && teamId > teamTenant);
  assert.ok(members > teamId && memberTenant > members);
  assert.ok(brokers > memberTenant && brokerTenant > brokers);
});

check("all dashboard data sources are tenant filtered", () => {
  assert.ok(
    (dashboardSource.match(/\.eq\("tenant_id", tenantId\)/g)?.length ?? 0) >= 9,
  );
  for (const table of [
    "leads",
    "corretores",
    "teams",
    "team_members",
  ]) {
    assert.ok(dashboardSource.includes(`.from(\"${table}\")`), table);
  }
});

check("dashboard rejects unauthorized team and broker filters", () => {
  assert.ok(dashboardSource.includes('throw new Error("Filtro de equipe não autorizado.")'));
  assert.ok(dashboardSource.includes('throw new Error("Filtro de corretor não autorizado.")'));
});

check("dashboard main and drill-down queries begin tenant scoped", () => {
  const stats = dashboardSource.indexOf("export const dashboardStats");
  const statsLeads = dashboardSource.indexOf('.from("leads")', stats);
  const statsTenant = dashboardSource.indexOf('.eq("tenant_id", tenantId)', statsLeads);
  const drill = dashboardSource.indexOf("export const dashboardLeadsFiltrados");
  const drillLeads = dashboardSource.indexOf('.from("leads")', drill);
  const drillTenant = dashboardSource.indexOf('.eq("tenant_id", tenantId)', drillLeads);
  assert.ok(stats >= 0 && statsLeads > stats && statsTenant > statsLeads);
  assert.ok(drill > stats && drillLeads > drill && drillTenant > drillLeads);
});

check("dashboard checks query errors instead of silently accepting partial data", () => {
  for (const marker of [
    "Falha ao validar autorização do dashboard.",
    "if (error) throw new Error(error.message)",
    "if (activeError) throw new Error(activeError.message)",
    "if (brokerError) throw new Error(brokerError.message)",
  ]) {
    assert.ok(dashboardSource.includes(marker), marker);
  }
});

console.log(`PR-M2 dashboard tenant authority specs: ${passed} passed`);