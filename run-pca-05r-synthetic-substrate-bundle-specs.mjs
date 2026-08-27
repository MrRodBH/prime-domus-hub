import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { build, splitSql } from "./scripts/build-pca-05r-synthetic-substrate-bundle.mjs";

const { manifest: actual, sql } = build();
assert.equal(createHash("sha256").update(sql).digest("hex"), actual.bundleSha256);
assert.equal(
  actual.bundleSha256,
  "aa75692138bf30381538a81794c6c6a51925414400c86ecfa665ae996b642bc6",
);
assert.deepEqual(actual.counts, {
  totalSourceStatements: 1267,
  passthrough: 1201,
  exclude: 65,
  replace: 1,
  projectedStatements: 1202,
});
assert.equal(actual.entries.filter((e) => e.reason === "DUPLICATE_SOURCE_BYTES").length, 55);
assert.equal(
  actual.entries.filter((e) => e.reason === "UNNEEDED_EXTERNAL_CAPABILITY_EXTENSION").length,
  3,
);
const executable = splitSql(sql).join("\n").replace(/--.*$/gm, "");
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
console.log("PCA-05R synthetic substrate bundle: PASS");
