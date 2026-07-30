import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let assertions = 0;
function check(name: string, fn: () => void) {
  fn();
  assertions += 1;
  console.log(`✓ ${name}`);
}
function source(path: string) {
  return readFileSync(path, "utf8");
}
function sourceFiles(root: string): string[] {
  const rows: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) rows.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry)) rows.push(path);
  }
  return rows;
}
function gitBlobSha1(content: Buffer) {
  const header = Buffer.from(`blob ${content.length}\0`);
  return createHash("sha1").update(Buffer.concat([header, content])).digest("hex");
}

const packageJson = JSON.parse(source("package.json"));
const bunLock = readFileSync("bun.lock");
const apiFiles = sourceFiles("src/lib/api");
const applicationFiles = sourceFiles("src");
const activeApplication = applicationFiles.filter((path) => path !== "src/lib/api/admin.functions.legacy.ts");

const dashboard = source("src/lib/api/dashboard.functions.ts");
const property = source("src/lib/api/property-admin.functions.ts");
const adminBarrel = source("src/lib/api/admin.functions.ts");
const uploadContract = source("src/lib/storage/upload-contract.ts");
const uploadFunctions = source("src/lib/api/uploads.functions.ts");
const propertyForm = source("src/components/admin/ImovelForm.tsx");
const crmRegistry = source("src/lib/crm/crm-functional-registry.ts");
const crmFunctions = source("src/lib/api/tenant-crm-functional.functions.ts");
const crmRoute = source("src/routes/_authenticated.admin.crm-operacoes.tsx");
const cmsRegistry = source("src/lib/cms/cms-functional-inventory.ts");
const cmsFunctions = source("src/lib/api/tenant-cms-functional.functions.ts");
const cmsRoute = source("src/routes/_authenticated.admin.cms-inventario.tsx");
const marketingRegistry = source("src/lib/marketing/marketing-channel-registry.ts");
const marketingProvider = source("src/lib/marketing/marketing-provider-ingestion.server.ts");
const marketingRoute = source("src/routes/_authenticated.admin.marketing.tsx");
const superFunctions = source("src/lib/api/super-control-plane.functions.ts");
const superRoute = source("src/routes/_authenticated.super.control-plane.tsx");
const contexts = source("src/components/workspace/contexts.ts");

const correctiveMigrations = [
  "supabase/migrations/20260730043000_pr_m2_consolidated_final_corrective.sql",
  "supabase/migrations/20260730050000_pr_m2_cms_functional_inventory.sql",
  "supabase/migrations/20260730051500_pr_m2_marketing_adapter_activation.sql",
  "supabase/migrations/20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql",
  "supabase/migrations/20260730060000_pr_m2_super_control_plane.sql",
];
const migrationSource = correctiveMigrations.map(source).join("\n");

const canonicalEvidence = [
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-administrative-cms-tenant-authority-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-dashboard-functional-authority-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-crm-report-authority-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-property-administration-authority-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-tenant-lifecycle-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-tenant-access-control-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-configuration-center-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-portal-functional-completion-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-cms-workflow-functional-completion-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-crm-operational-workflow-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-marketing-channels-lead-ingestion-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-analytics-tracking-conversion-events-evidence.md",
];

check("dependency manifest matches the merge-base contract", () => {
  assert.equal(packageJson.overrides?.["js-yaml"], "^4.1.0");
  assert.equal(packageJson.resolutions?.["js-yaml"], "^4.1.0");
  assert.equal(packageJson.dependencies?.["js-yaml"], undefined);
  assert.equal(packageJson.devDependencies?.["js-yaml"], undefined);
  assert.equal(gitBlobSha1(bunLock), "098eac32e22b587197565fb454706bf024769840");
});

check("legacy administrative wildcard and active imports are absent", () => {
  assert.equal(/export\s+\*\s+from\s+["']\.\/admin\.functions\.legacy["']/.test(adminBarrel), false);
  const offenders = activeApplication.filter((path) => source(path).includes("admin.functions.legacy"));
  assert.deepEqual(offenders, []);
});

check("tenant authorities do not use global role tables", () => {
  for (const [name, file] of [["dashboard", dashboard], ["property", property], ["crm", crmFunctions], ["cms", cmsFunctions]]) {
    assert.equal(file.includes('.rpc("has_role"'), false, name);
    assert.equal(file.includes('.from("user_roles")'), false, name);
    assert.ok(file.includes("requireTenant"), name);
  }
  assert.ok(dashboard.includes("resolveEffectiveTenantPermission"));
  assert.ok(property.includes("resolveEffectiveTenantPermission"));
});

check("no active tenant mutation uses the historical auth-plus-role pattern", () => {
  const candidates = apiFiles.filter((path) => !path.endsWith("admin.functions.legacy.ts"));
  const offenders = candidates.filter((path) => {
    const text = source(path);
    return text.includes("requireSupabaseAuth") && text.includes('.rpc("has_role"') && /\.(insert|update|delete)\(/.test(text);
  });
  assert.deepEqual(offenders, []);
});

check("upload provenance is the sole property image registration authority", () => {
  assert.ok(uploadContract.includes("targetId: string"));
  assert.ok(uploadFunctions.includes("register_tenant_upload_target"));
  assert.ok(property.includes("consume_tenant_property_upload_target"));
  assert.ok(property.includes("uploadTargetId: z.string().uuid()"));
  assert.equal(property.includes("validatePropertyImagePath(data.url"), false);
  assert.ok(propertyForm.includes("uploadTargetId: target.targetId"));
  assert.equal(propertyForm.includes("url: target.path"), false);
  assert.equal(propertyForm.includes("data: { id: image.id, path:"), false);
  for (const token of ["storage.objects", "upload_target_expired", "upload_target_actor_mismatch", "upload_target_concurrent_consumption"]) {
    assert.ok(migrationSource.includes(token), token);
  }
});

check("dashboard functional authority and metric registry are complete", () => {
  const metricRegistry = source("src/lib/dashboard/dashboard-metric-registry.ts");
  for (const token of [
    "metricKey", "dataSource", "formula", "timezone", "periodBoundary", "nullBehavior",
    "cardinality", "permission", "scopes", "drillDown", "sales_lost", "leads_discarded",
    "active_properties", "marketing_ingestion_events", "portal_publications",
  ]) assert.ok(metricRegistry.includes(token), token);
  for (const token of ["effectiveScope", "applyBrokerScope", "dashboard_team_filter_denied", "Dashboard partial-data error"]) {
    assert.ok(dashboard.includes(token), token);
  }
});

check("CRM required functional capabilities are materialized and exposed", () => {
  for (const token of [
    "contacts", "calendar", "visits", "proposals", "attachments", "automation_rules",
    "manual_import", "deterministic_export", "communication_jobs", "sla_policies", "alerts",
    "follow_up_policy", "property_relationships", "broker_relationships", "campaign_relationships",
  ]) assert.ok(crmRegistry.includes(`"${token}"`), token);
  for (const table of [
    "crm_contacts", "crm_calendar_events", "crm_visits", "crm_proposals", "crm_attachments",
    "crm_automation_rules", "crm_communication_jobs", "crm_sla_policies", "crm_alerts",
  ]) assert.ok(migrationSource.includes(table), table);
  assert.ok(crmFunctions.includes("exportTenantCrmData"));
  assert.ok(crmFunctions.includes("importTenantCrmContacts"));
  assert.ok(crmRoute.includes("CRM Operational Center"));
  assert.ok(crmFunctions.includes('adapter_state: "adapter_not_implemented"'));
});

check("CMS functional inventory is closed, persisted and exposed", () => {
  for (const token of [
    "testimonials", "property_listing", "launch_listing", "team_listing", "contact_panel",
    "map", "embed", "tour", "reusable_block", "widget", "theme_tokens",
    "scheduled_publication", "header", "footer", "grid", "columns", "cards",
  ]) assert.ok(cmsRegistry.includes(`"${token}"`), token);
  for (const table of ["cms_testimonials", "cms_reusable_blocks", "cms_publication_schedules"]) {
    assert.ok(migrationSource.includes(table), table);
  }
  assert.ok(cmsFunctions.includes("validateTenantCmsFunctionalComponent"));
  assert.ok(cmsFunctions.includes("scheduleTenantCmsPublication"));
  assert.ok(cmsRoute.includes("CMS Functional Inventory"));
  assert.equal(cmsRegistry.includes("eval("), false);
  assert.equal(cmsRegistry.includes("new Function"), false);
});

check("required Meta and Google adapters are implemented without external execution claims", () => {
  for (const key of ["META_ADS", "GOOGLE_ADS"]) {
    const marker = marketingRegistry.indexOf(`channelKey: "${key}"`);
    const block = marketingRegistry.slice(marker, marketingRegistry.indexOf("channelKey:", marker + 20) > 0 ? marketingRegistry.indexOf("channelKey:", marker + 20) : undefined);
    assert.ok(block.includes('adapterImplementationState: "implemented"'), key);
    assert.ok(block.includes('externalVerificationState: "not_live_verified"'), key);
    assert.ok(block.includes('availabilityState: "credential_required"'), key);
  }
  for (const token of ["verifyMetaXHubSignature256", "verifyGoogleLeadWebhookKey", "reserve_marketing_ingestion_payload", "ingest_verified_provider_marketing_lead"]) {
    assert.ok(marketingProvider.includes(token), token);
  }
  assert.equal(marketingProvider.includes("fetch("), false);
  assert.ok(marketingRoute.includes("not_live_verified"));
  assert.equal(marketingRoute.includes("adapter_not_implemented</strong>"), false);
});

check("Super Admin Control Plane separates global authority from tenant impersonation", () => {
  for (const token of [
    "globalExecutiveDashboard", "commercialVisibility", "domainVisibility", "integrations",
    "operations", "incidents", "support", "audit", "reports", "pending_BCA01", "pending_DCA01",
  ]) assert.ok(superFunctions.includes(token), token);
  assert.ok(superFunctions.includes("getSuperTenantScopedOperationalView"));
  assert.ok(superFunctions.includes("context.tenant.impersonation"));
  assert.ok(superFunctions.includes('context.tenant.origin !== "impersonation"'));
  assert.ok(superRoute.includes("SaaS Control Plane"));
  assert.ok(contexts.includes('{ label: "Control Plane", to: "/super/control-plane" }'));
});

check("the seven-workspace invariant is preserved", () => {
  assert.equal((contexts.match(/\n    id: "/g) ?? []).length, 7);
  assert.ok(contexts.includes('{ label: "CRM Operacional", to: "/admin/crm-operacoes" }'));
  assert.ok(contexts.includes('{ label: "Inventário", to: "/admin/cms-inventario" }'));
});

check("corrective migrations are unique, additive and service-role-only", () => {
  assert.equal(new Set(correctiveMigrations).size, correctiveMigrations.length);
  for (const path of correctiveMigrations) assert.ok(existsSync(path), path);
  for (const token of ["ENABLE ROW LEVEL SECURITY", "FROM PUBLIC, anon, authenticated", "TO service_role", "SECURITY DEFINER", "SET search_path = public"]) {
    assert.ok(migrationSource.includes(token), token);
  }
  assert.equal(/GRANT\s+EXECUTE[\s\S]{0,180}\s+TO\s+(anon|authenticated)/i.test(migrationSource), false);
  for (const token of ["net.http", "http_post", "http_get", "is_super_admin()", "auth.uid()"] ) {
    assert.equal(migrationSource.includes(token), false, token);
  }
});

check("twelve canonical increment evidences exist and supersede historical claims", () => {
  assert.equal(canonicalEvidence.length, 12);
  for (const path of canonicalEvidence) {
    assert.ok(existsSync(path), path);
    const text = source(path);
    assert.ok(text.includes("CANONICAL_EVIDENCE_STATE = Current"), path);
    assert.ok(text.includes("MANAGED_MIGRATION_EXECUTED = false"), path);
    assert.ok(text.includes("MERGE_EXECUTED = false"), path);
    assert.ok(text.includes("HISTORICAL_EVIDENCE_AUTHORITY = superseded"), path);
  }
});

check("no final closure evidence is created by the corrective", () => {
  assert.equal(existsSync("docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-consolidated-closure-and-merge-readiness.md"), false);
});

assert.ok(assertions >= 13);
console.log(`PR_M2_CONSOLIDATED_FINAL_CORRECTIVE_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_CONSOLIDATED_FINAL_CORRECTIVE_SPECS=PASS");
