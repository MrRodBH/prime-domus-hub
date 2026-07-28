import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const source = readFileSync("src/lib/api/leads-crm.functions.ts", "utf8");

check("canonical transition callers remain on the accepted boundary", () => {
  assert.equal(source.match(/await transitionLead\(/g)?.length ?? 0, 4);
  assert.equal(source.includes('.from("leads").update'), false);
  assert.equal(source.includes("supabaseAdmin"), false);
});

check("transition callers preserve authenticated RPC boundary", () => {
  const transitionSection = source.slice(0, source.indexOf("export type LeadDescartadoRow"));
  assert.equal(
    transitionSection.match(/\.middleware\(\[requireSupabaseAuth\]\)/g)?.length ?? 0,
    4,
  );
});

check("all three CRM report and insight surfaces use requireTenant", () => {
  const reportSection = source.slice(source.indexOf("export type LeadDescartadoRow"));
  assert.equal(
    reportSection.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0,
    3,
  );
});

check("CRM admin authorization validates tenant authority before role", () => {
  const helper = source.indexOf("async function assertCrmAdmin");
  const authority = source.indexOf(
    'requireTenantScopedAuthority(context.tenant, "CRM")',
    helper,
  );
  const role = source.indexOf('context.supabase.rpc("has_role"', authority);
  assert.ok(helper >= 0 && authority > helper && role > authority);
});

check("discarded leads are tenant filtered before status", () => {
  const start = source.indexOf("export const listarLeadsDescartados");
  const leads = source.indexOf('.from("leads")', start);
  const tenant = source.indexOf('.eq("tenant_id", tenantId)', leads);
  const status = source.indexOf('.eq("status", "descartado")', tenant);
  assert.ok(start >= 0 && leads > start && tenant > leads && status > tenant);
});

check("discarded relations expose and validate tenant identity", () => {
  assert.ok(source.includes("imovel:imoveis(tenant_id, titulo, slug)"));
  assert.ok(
    source.includes(
      "motivo:lead_discard_reasons!leads_discard_reason_id_fkey(tenant_id, nome)",
    ),
  );
  assert.ok(source.includes("CRM property relation crossed the tenant boundary."));
  assert.ok(source.includes("CRM discard reason crossed the tenant boundary."));
});

check("commercial performance reads leads and reason catalogs by tenant", () => {
  const helper = source.indexOf("async function loadCommercialPerformance");
  const leads = source.indexOf('.from("leads")', helper);
  const leadsTenant = source.indexOf('.eq("tenant_id", tenantId)', leads);
  const discard = source.indexOf('.from("lead_discard_reasons")', leadsTenant);
  const discardTenant = source.indexOf('.eq("tenant_id", tenantId)', discard);
  const lost = source.indexOf('.from("deal_lost_reasons")', discardTenant);
  const lostTenant = source.indexOf('.eq("tenant_id", tenantId)', lost);
  assert.ok(helper >= 0 && leads > helper && leadsTenant > leads);
  assert.ok(discard > leadsTenant && discardTenant > discard);
  assert.ok(lost > discardTenant && lostTenant > lost);
});

check("commercial performance checks all query errors", () => {
  for (const marker of [
    "if (error) throw new Error(error.message)",
    "if (discardNames.error) throw new Error(discardNames.error.message)",
    "if (lostNames.error) throw new Error(lostNames.error.message)",
  ]) {
    assert.ok(source.includes(marker), marker);
  }
});

check("AI insight recalculates server metrics before external request", () => {
  const start = source.indexOf("export const gerarInsightsPerformance");
  const authority = source.indexOf("await assertCrmAdmin(context)", start);
  const metrics = source.indexOf("await loadCommercialPerformance(", authority);
  const apiKey = source.indexOf("process.env.LOVABLE_API_KEY", metrics);
  const fetchCall = source.indexOf('fetch(\n      "https://ai.gateway.lovable.dev', apiKey);
  assert.ok(start >= 0 && authority > start && metrics > authority);
  assert.ok(apiKey > metrics && fetchCall > apiKey);
});

check("AI prompt uses server-derived metrics rather than client payload", () => {
  const start = source.indexOf("export const gerarInsightsPerformance");
  const handler = source.indexOf(".handler(async", start);
  const block = source.slice(handler);
  for (const field of [
    "metrics.totais",
    "metrics.taxas",
    "metrics.vgv",
    "metrics.motivosDescarte",
    "metrics.motivosPerda",
  ]) {
    assert.ok(block.includes(field), field);
  }
  assert.equal(block.includes("data.totais."), false);
  assert.equal(block.includes("data.taxas."), false);
  assert.equal(block.includes("data.vgv."), false);
});

console.log(`PR-M2 CRM report authority specs: ${passed} passed`);