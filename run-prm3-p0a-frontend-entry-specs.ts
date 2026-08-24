import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let assertions = 0;
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

const required = [
  "src/lib/api/commercial/read-models.ts",
  "src/lib/api/commercial/commercial.functions.ts",
  "src/lib/api/commercial/feature-catalog.ts",
  "src/lib/api/commercial/feature-gate.ts",
  "src/lib/api/commercial/seat-limit-runtime.ts",
  "docs/architecture/impact-analysis/PRM3-P0A-bcr-terminal-disposition-frontend-safe-decoupling-impact-analysis.md",
  "docs/architecture/governance/PRM3-P0A-bcr-terminal-disposition-frontend-entry-execution-envelope.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/prm3-p0a-terminal-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/backlog/bcr-runtime-deferred-upstream-backlog.md",
];

for (const path of required) {
  ok(existsSync(resolve(root, path)), `required PRM3-P0A authority must exist: ${path}`);
}

const readModels = read("src/lib/api/commercial/read-models.ts");
const functions = read("src/lib/api/commercial/commercial.functions.ts");
const catalog = read("src/lib/api/commercial/feature-catalog.ts");
const featureGate = read("src/lib/api/commercial/feature-gate.ts");
const impact = read(required[5]);
const envelope = read(required[6]);
const evidence = read(required[7]);
const backlog = read(required[8]);
const roadmap = read("docs/architecture/ROADMAP_ARCHITECTURAL.md");
const finiteMap = read("docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md");
const pkg = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

for (const token of [
  "TenantCommercialSummary",
  "TenantEntitlementSnapshot",
  "TenantBillingHealth",
  "deriveCommercialSummary",
  "deriveEntitlementSnapshot",
  "deriveBillingHealth",
]) {
  ok(readModels.includes(token), `sanitized commercial read contract must retain ${token}`);
}

for (const fn of [
  "getTenantCommercialSummary",
  "getTenantEntitlementSnapshot",
  "getTenantBillingHealth",
  "getCommercialFeatureDecision",
  "getCommercialSeatLimitDecision",
]) {
  const start = functions.indexOf(`export const ${fn}`);
  ok(start >= 0, `commercial server function must exist: ${fn}`);
  const boundary = functions.slice(start, start + 300);
  ok(boundary.includes(".middleware([requireTenant])"), `${fn} must remain behind requireTenant`);
}

for (const token of [
  "FORBIDDEN_NAMESPACES",
  '"stripe"',
  '"webhook"',
  '"checkout"',
  "evaluateFeatureCatalogGate",
]) {
  ok(catalog.includes(token), `feature catalog boundary must retain ${token}`);
}
ok(featureGate.includes('| "not_evaluated"'), "feature gate must retain the closed unevaluated reason");
ok(featureGate.includes('reason: "not_entitled"') && featureGate.includes("allowed: false"), "feature gate must fail closed when no entitlement authorizes access");
ok(featureGate.includes('source: "none"'), "feature gate must expose no invented authority source");

ok(!pkg.dependencies?.stripe, "Stripe must remain absent from main dependencies");
ok(!pkg.devDependencies?.stripe, "Stripe must remain absent from main devDependencies");
ok(pkg.scripts?.["test:prm3-p0a"]?.includes("run-prm3-p0a-frontend-entry-specs.ts"), "PRM3-P0A script must be pinned");

for (const path of [
  "src/lib/billing",
  "src/routes/_authenticated.admin.billing.tsx",
  "src/routes/api/public/hooks/billing-stripe-webhook.ts",
  "src/routes/api/internal/billing-checkout.ts",
]) {
  ok(!existsSync(resolve(root, path)), `deferred BCR runtime must remain absent from main: ${path}`);
}

for (const token of [
  "BCR_RUNTIME_DEFERRED_UPSTREAM",
  "PR_105_MERGE=false",
  "PRM3_ENTRY=AUTHORIZED_AFTER_THIS_GATE",
  "LOVABLE_ROADMAP_UPDATE=false",
]) {
  ok(impact.includes(token) || envelope.includes(token) || evidence.includes(token), `terminal authority must retain ${token}`);
}

for (const state of ["loading", "empty", "denied", "unavailable", "error"]) {
  ok(impact.includes(`\`${state}\``), `frontend contract must define ${state}`);
}

ok(backlog.includes("PRIORITY_FOR_COMMERCIAL_ACTIVATION=P0_BEFORE_COMMERCIAL_CUTOVER"), "commercial runtime backlog must be P0 before commercial cutover");
ok(backlog.includes("does not block frontend construction"), "commercial runtime backlog must remain non-blocking for PR-M3");
ok(roadmap.includes("PRM3_P0A_CURRENT_AUTHORITY = Accepted with Non-Blocking Backlog"), "architectural roadmap must carry current PRM3-P0A authority");
ok(finiteMap.includes("PR-M3 | Authorized — Ready"), "finite roadmap must release PR-M3 entry");

console.log(`PRM3-P0A frontend entry gate passed (${assertions} assertions).`);
