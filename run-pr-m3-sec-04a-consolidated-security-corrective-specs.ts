import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const baseSha =
  process.env.PR_M3_SEC_04A_BASE_SHA ??
  "252398bca1bd8c17f06414f05332bf1beb69addc";
let assertions = 0;

const migrationPath =
  "supabase/migrations/20260826002000_pr_m3_sec_04a_consolidated_security_corrective.sql";
const workflowPath = ".github/workflows/pr-m3-sec-04a-gate.yml";

const allowlist = new Set([
  migrationPath,
  "run-pr-m3-sec-04a-consolidated-security-corrective-specs.ts",
  workflowPath,
  "package.json",
  "docs/architecture/impact-analysis/PR-M3-SEC-04-security-linter-findings-requalification-impact-analysis.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-sec-04a-consolidated-security-corrective-evidence.md",
]);

const targetTables = [
  "billing_event_transitions",
  "billing_events",
  "billing_provider_definitions",
  "commercial_entitlement_definitions",
  "commercial_plan_entitlements",
  "commercial_plans",
  "tenant_billing_provider_mappings",
  "tenant_entitlements",
  "tenant_subscriptions",
] as const;

const targetFunctions = [
  "public.log_system_event(text,text,text,text,integer,integer,uuid,uuid,text,jsonb,text)",
  "public.portal_dlq_enqueue(uuid,text,text,jsonb,text)",
  "public.portal_dlq_mark_resolved(uuid)",
  "public.portal_dlq_mark_retry(uuid,text)",
  "public.rate_limit_hit(text,text,integer,integer)",
] as const;

const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

const localUntracked =
  process.env.GITHUB_ACTIONS === "true"
    ? ""
    : git("ls-files", "--others", "--exclude-standard");

const changed = new Set(
  [
    git("diff", "--name-only", `${baseSha}...HEAD`),
    git("diff", "--name-only"),
    git("diff", "--cached", "--name-only"),
    localUntracked,
  ]
    .flatMap((output) => output.split("\n"))
    .filter(Boolean),
);

equal(changed.size, allowlist.size, "SEC-04A must change exactly six frozen paths");
for (const path of changed) {
  ok(allowlist.has(path), `changed path must be allowlisted: ${path}`);
}
for (const path of allowlist) {
  ok(changed.has(path), `exact allowlist path must change: ${path}`);
}

const immutableDiff = spawnSync(
  "git",
  [
    "diff",
    "--quiet",
    `${baseSha}...HEAD`,
    "--",
    "bun.lock",
    ".github/workflows/release-gate.yml",
    "src",
  ],
  { cwd: root },
);
ok(
  immutableDiff.status === 0,
  "application source, canonical Release Gate and bun.lock must remain unchanged",
);

const packageJson = JSON.parse(read("package.json")) as Record<string, unknown>;
const basePackageJson = JSON.parse(
  git("show", `${baseSha}:package.json`),
) as Record<string, unknown>;
for (const key of [
  "dependencies",
  "devDependencies",
  "pnpm",
  "overrides",
  "resolutions",
]) {
  equal(packageJson[key], basePackageJson[key], `${key} must remain unchanged`);
}
const scripts = packageJson.scripts as Record<string, string>;
ok(
  scripts["test:pr-m3-sec-04a"] ===
    "tsx --tsconfig tsconfig.json ./run-pr-m3-sec-04a-consolidated-security-corrective-specs.ts",
  "focused SEC-04A package script missing",
);
ok(
  scripts["verify:release"]?.startsWith("bun run test:pr-m3-sec-04a &&"),
  "verify:release must start with the active SEC-04A focused gate",
);
ok(
  scripts["test:pr-m3-ux-01"] ===
    "tsx --tsconfig tsconfig.json ./run-pr-m3-ux-01-pipeline-search-compatibility-specs.ts",
  "accepted UX-01 focused script must remain available",
);

const migration = read(migrationPath);
const workflow = read(workflowPath);
const impactAnalysis = read(
  "docs/architecture/impact-analysis/PR-M3-SEC-04-security-linter-findings-requalification-impact-analysis.md",
);
const evidence = read(
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-sec-04a-consolidated-security-corrective-evidence.md",
);
const scp001 = read("docs/architecture/commercial/SCP-001-commercial-domain-model.md");
const scp002 = read(
  "docs/architecture/commercial/SCP-002-billing-provider-abstraction-materialization.md",
);
const observability = read("src/lib/observability.server.ts");
const rateLimit = read("src/lib/rate-limit.server.ts");
const portalRetry = read("src/routes/api/public/hooks/portal-dlq-retry.ts");

ok(migration.startsWith("-- PR-M3-SEC-04A"), "migration ownership header missing");
ok(migration.includes("\nBEGIN;\n"), "migration must open one transaction");
ok(migration.endsWith("COMMIT;\n"), "migration must end with COMMIT and LF");
ok(migration.includes("DO $preflight$"), "preflight block missing");
ok(migration.includes("DO $postcondition$"), "postcondition block missing");

equal(
  (migration.match(/REVOKE ALL PRIVILEGES ON TABLE public\./g) ?? []).length,
  targetTables.length,
  "exactly nine table revocations are required",
);
equal(
  (migration.match(/REVOKE EXECUTE ON FUNCTION\n/g) ?? []).length,
  targetFunctions.length,
  "exactly five function revocations are required",
);
equal(
  (migration.match(/GRANT EXECUTE ON FUNCTION\n/g) ?? []).length,
  targetFunctions.length,
  "exactly five service-role function grants are required",
);

for (const table of targetTables) {
  ok(
    migration.includes(`public.${table}`),
    `target deny-by-default table missing: ${table}`,
  );
}
for (const signature of targetFunctions) {
  ok(
    migration.includes(signature),
    `target server-only function missing: ${signature}`,
  );
}

for (const required of [
  "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public",
  "REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated",
  "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated",
  "postgres public default privileges still grant client access",
  "intentional anon resolver/helper grant regressed",
  "intentional authenticated RPC/helper grant regressed",
]) {
  ok(migration.includes(required), `migration contract missing: ${required}`);
}

for (const forbidden of [
  "CREATE POLICY",
  "DROP POLICY",
  "CREATE OR REPLACE FUNCTION",
  "ALTER FUNCTION",
  "ALTER TABLE",
  "INSERT INTO",
  "DELETE FROM",
  "UPDATE public.",
  "TRUNCATE TABLE",
  "supabase_admin",
  "sandbox_exec",
]) {
  ok(
    !migration.includes(forbidden),
    `repository-first migration must not contain: ${forbidden}`,
  );
}

for (const preserved of [
  "public.resolve_public_tenant_by_host(text)",
  "public.get_canonical_redirect_for_active_alias(text)",
  "public.get_current_tenant_id()",
  "public.is_super_admin()",
  "public.user_belongs_to_tenant(uuid)",
  "public.create_manual_lead(text,text,text,uuid,text,uuid)",
  "public.transition_lead_status(uuid,text,integer,uuid,jsonb)",
  "public.super_observabilidade(integer)",
  "public.has_role(uuid,app_role)",
  "public.has_permission(uuid,text,rbac_action)",
  "public.user_team_ids(uuid)",
]) {
  ok(migration.includes(preserved), `preservation assertion missing: ${preserved}`);
}

ok(
  scp001.includes("Grants concedidos: apenas `GRANT ALL ... TO service_role`") &&
    scp001.includes("sem policies"),
  "SCP-001 service-role-only deny-by-default authority must remain explicit",
);
ok(
  scp002.includes("Grants apenas para `service_role`") &&
    scp002.includes("sem policies permissivas"),
  "SCP-002 service-role-only deny-by-default authority must remain explicit",
);

ok(
  observability.includes('supabaseAdmin.rpc("log_system_event"'),
  "log_system_event canonical caller must use supabaseAdmin",
);
ok(
  rateLimit.includes("supabaseAdmin") &&
    rateLimit.includes('.rpc("rate_limit_hit"') &&
    rateLimit.includes('.rpc("portal_dlq_enqueue"'),
  "rate-limit and DLQ enqueue canonical callers must use supabaseAdmin",
);
ok(
  portalRetry.includes('rpc("portal_dlq_mark_retry"') &&
    portalRetry.includes('rpc("portal_dlq_mark_resolved"') &&
    portalRetry.includes('import("@/integrations/supabase/client.server")'),
  "DLQ state transitions must remain in the authenticated operational server route",
);

for (const required of [
  "PR_M3_SEC_04A_BASE_SHA",
  "Checkout exact event head",
  "bunx tsx --tsconfig tsconfig.json ./run-pr-m3-sec-04a-consolidated-security-corrective-specs.ts",
  "bun run test:prm3-p0a",
  "bun run typecheck",
  "bun run build:dev",
  "bun run build",
  "bun run verify:release",
]) {
  ok(workflow.includes(required), `focused workflow wiring missing: ${required}`);
}

for (const required of [
  "24 RLS-enabled relations without policies",
  "15 INTENTIONAL_FAIL_CLOSED_SERVER_ONLY",
  "9 REDUNDANT_GRANT_TO_REVOKE",
  "18 SECURITY DEFINER functions",
  "5 REDUNDANT_GRANT_TO_REVOKE",
  "13 intentional function findings",
  "DATABASE_APPLICATION=false",
  "PR-M3-SEC-04B_SAME_BACKEND_SECURITY_CORRECTIVE_APPLICATION",
]) {
  ok(
    impactAnalysis.includes(required) || evidence.includes(required),
    `auditable classification/evidence token missing: ${required}`,
  );
}

ok(
  evidence.includes("EXPECTED_CHANGED_PATHS=6") &&
    evidence.includes("ROW_DML=false") &&
    evidence.includes("POLICY_WRITE=false") &&
    evidence.includes("FUNCTION_BODY_WRITE=false"),
  "terminal evidence contract must freeze repository-first safety",
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      stage: "PR-M3-SEC-04A",
      baseSha,
      changedPaths: [...changed].sort(),
      exactAllowlistCount: changed.size,
      targetTables: targetTables.length,
      targetFunctions: targetFunctions.length,
      assertions,
      repositoryFirstOnly: true,
      databaseApplied: false,
      rowDml: false,
      policyWrite: false,
      functionBodyWrite: false,
      providerWrites: 0,
      deploy: false,
      productionPublish: false,
      roadmapUpdate: false,
    },
    null,
    2,
  ),
);
