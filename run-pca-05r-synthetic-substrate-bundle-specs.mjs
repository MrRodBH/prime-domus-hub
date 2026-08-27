import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  build,
  extractTenantizationTargets,
  splitSql,
} from "./scripts/build-pca-05r-synthetic-substrate-bundle.mjs";

const { manifest: actual, sql } = build();
assert.equal(createHash("sha256").update(sql).digest("hex"), actual.bundleSha256);
assert.equal(
  actual.bundleSha256,
  "b8b3436440dadc357675ddc299ca8adb41449378e0e2747c2ab1adf81ddcef4e",
);
assert.deepEqual(actual.counts, {
  totalSourceStatements: 1267,
  passthrough: 1199,
  exclude: 65,
  replace: 3,
  projectedStatements: 1202,
});
assert.equal(actual.entries.filter((e) => e.reason === "DUPLICATE_SOURCE_BYTES").length, 55);
assert.equal(
  actual.entries.filter((e) => e.reason === "UNNEEDED_EXTERNAL_CAPABILITY_EXTENSION").length,
  3,
);
assert.equal(
  actual.entries.filter((e) => e.reason === "OPTIONAL_PROVIDER_FUNCTION_HARDENING").length,
  2,
);
const executable = splitSql(sql).join("\n").replace(/--.*$/gm, "");
assert.match(executable, /to_regprocedure\('public\.email_queue_wake\(\)'\)/i);
assert.match(executable, /to_regprocedure\('public\.email_queue_dispatch\(\)'\)/i);
for (const forbidden of [
  /DELETE\s+FROM\s+auth\./i,
  /UPDATE\s+storage\.objects/i,
  /INSERT\s+INTO\s+public\.tenants/i,
  /CREATE\s+EXTENSION[^;]*(?:pg_net|pg_cron|supabase_vault)/i,
  /INSERT\s+INTO\s+supabase_migrations/i,
])
  assert.doesNotMatch(executable, forbidden);
assert.doesNotMatch(executable, /ALTER\s+COLUMN\s+tenant_id\s+SET\s+NOT\s+NULL/i);
assert.doesNotMatch(executable, /9664d189-4a12-4caa-8243-dc73383447e6/i);
assert.equal(actual.controls.lovableExecutionAuthorized, false);
assert.equal(actual.controls.sameBackendAllowed, false);
const tenantizationSource = readFileSync(
  "supabase/migrations/20260701205318_c4b9c8b3-1fe3-4663-8c35-7f2a74b2aafe.sql",
  "utf8",
);
const sourceTargets = extractTenantizationTargets(tenantizationSource);
assert.equal(sourceTargets.length, 24);
const projectedTenantization = sql.match(
  /-- source: supabase\/migrations\/20260701205318_[^\n]+\nBEGIN;\n([\s\S]*?)\nCOMMIT;/,
);
assert.ok(projectedTenantization, "projected tenantization block not found");
assert.deepEqual(extractTenantizationTargets(projectedTenantization[1]), sourceTargets);
for (const invented of [
  "profiles",
  "proprietarios",
  "clientes",
  "contratos",
  "visitas",
  "propostas",
  "chaves",
  "campaigns",
])
  assert.ok(!sourceTargets.includes(invented), `invented target retained: ${invented}`);
for (const contract of ["PCA-05R-preflight.sql", "PCA-05R-postflight.sql"]) {
  const content = readFileSync(`rehearsal/pca-05r/substrate/${contract}`, "utf8");
  assert.match(content, /extname IN \('pg_net','pg_cron'\)/);
  assert.match(content, /nspname IN \('net','cron'\)/);
  assert.match(content, /SELECT EXISTS \(SELECT 1 FROM vault\.secrets\)/);
  assert.match(content, /IF vault_has_secrets THEN RAISE EXCEPTION 'Vault is not empty'/);
  assert.doesNotMatch(content, /extname IN \('pg_net','pg_cron','supabase_vault'\)/);
}
console.log("PCA-05R synthetic substrate bundle: PASS");
