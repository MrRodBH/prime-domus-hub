import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read(
  "supabase/migrations/20260826002000_pr_m3_sec_04a_consolidated_security_corrective.sql",
);
const packageJson = JSON.parse(read("package.json")) as {
  scripts: Record<string, string>;
};

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

assert.ok(migration.startsWith("-- PR-M3-SEC-04A"));
assert.ok(migration.includes("\nBEGIN;\n"));
assert.ok(migration.endsWith("COMMIT;\n"));
assert.equal(
  (migration.match(/REVOKE ALL PRIVILEGES ON TABLE public\./g) ?? []).length,
  targetTables.length,
);
assert.equal(
  (migration.match(/REVOKE EXECUTE ON FUNCTION\n/g) ?? []).length,
  targetFunctions.length,
);
assert.equal(
  (migration.match(/GRANT EXECUTE ON FUNCTION\n/g) ?? []).length,
  targetFunctions.length,
);

for (const table of targetTables) assert.ok(migration.includes(`public.${table}`));
for (const signature of targetFunctions) assert.ok(migration.includes(signature));
for (const required of [
  "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public",
  "REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated",
  "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated",
  "intentional anon resolver/helper grant regressed",
  "intentional authenticated RPC/helper grant regressed",
])
  assert.ok(migration.includes(required), `security invariant missing: ${required}`);

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
])
  assert.ok(!migration.includes(forbidden), `security migration contains ${forbidden}`);

assert.ok(read("src/lib/observability.server.ts").includes('supabaseAdmin.rpc("log_system_event"'));
const rateLimit = read("src/lib/rate-limit.server.ts");
assert.ok(
  rateLimit.includes("supabaseAdmin") &&
    rateLimit.includes('.rpc("rate_limit_hit"') &&
    rateLimit.includes('.rpc("portal_dlq_enqueue"'),
);
const portalRetry = read("src/routes/api/public/hooks/portal-dlq-retry.ts");
assert.ok(
  portalRetry.includes('rpc("portal_dlq_mark_retry"') &&
    portalRetry.includes('rpc("portal_dlq_mark_resolved"'),
);

assert.equal(
  packageJson.scripts["test:pr-m3-sec-04a"],
  "tsx --tsconfig tsconfig.json ./run-pr-m3-sec-04a-consolidated-security-corrective-specs.ts",
);
assert.equal(
  packageJson.scripts["test:pr-m3-sec-04a:regression"],
  "tsx --tsconfig tsconfig.json ./run-pr-m3-sec-04a-security-regression-specs.ts",
);
assert.ok(
  packageJson.scripts["verify:release"]
    .split(" && ")
    .includes("bun run test:pr-m3-sec-04a:regression"),
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      stage: "PR-M3-SEC-04A-REGRESSION",
      targetTables: targetTables.length,
      targetFunctions: targetFunctions.length,
      frozenExactScopeGatePreserved: true,
      databaseApplied: false,
    },
    null,
    2,
  ),
);
