import assert from "node:assert/strict";
import { build } from "./scripts/build-pca-05r-structural-wave-bundle.mjs";

const { manifest, outputs } = build();
assert.equal(manifest.migrationCount, 17);
assert.deepEqual(Object.keys(outputs), ["W1", "W2", "W3", "W4", "W5", "W6"]);
assert.deepEqual(Object.values(manifest.waves).map((wave) => wave.sha256), [
  "a40d76bbb4830c44c8e4d6a54514e7506c94326cd602b976e86208ec64b2489e",
  "2d8b4f8a40191b9ee8635226ea3b76de9fe73da1ce24d0cce8a46025626232b6",
  "8025e3048ea505dd8c3f9f186c56d1f641669f6465a2e9f666660356713f7d17",
  "6274d4a7b822c1c02ffba905340f4c6a7bcd5d8e252f63f9dbf3f2c9ea31fc8a",
  "5636934f1948ddba401ea2b3ae1de459a91a9f2f0b9298d588cb6e748fcdee76",
  "eab6f9acba0080af458e44e37a634f037a9dbe24cc103efd6c65d79c71384f7f",
]);
assert.equal(manifest.entries.filter((entry) => entry.path.startsWith("supabase/migrations/")).length, 17);
assert.equal(manifest.entries.filter((entry) => entry.projection === "PG17_NAME_ARRAY_TO_TEXT_ARRAY").length, 1);
assert.equal((outputs.W1.sql.match(/array_agg\(a\.attname::text ORDER BY x\.ord\)/g) ?? []).length, 4);
assert.equal(manifest.controls.sameBackendAllowed, false);
assert.equal(manifest.controls.migrationFilesMutable, false);
assert.equal(manifest.controls.providerMutationAllowed, false);
for (const { sql } of Object.values(outputs)) {
  assert.doesNotMatch(sql, /INSERT\s+INTO\s+supabase_migrations/i);
  assert.doesNotMatch(sql, /\b(?:net|http)\.[a-z_]+\s*\(/i);
}
console.log("PCA-05R structural wave bundle: PASS");
