import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE_MAIN = "9e308ba596956f518a65f14e2df46d449dc9aeca";
const SOURCE_TREE = "aa030014d5532324e21f84f8a02427bd455b70ba";
const MIGRATION =
  "supabase/migrations/20260728180000_pr_m2_tenant_access_control.sql";
const BEFORE_SHA256 =
  "fc3a67eca7c46a965d4b1ade51aa87e22c81d2c1d6b0b329bfc2879c9628dab9";
const AFTER_SHA256 =
  "3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e";

const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const count = (value, pattern) => (value.match(pattern) ?? []).length;

const migration = read(MIGRATION);
assert.equal(sha256(migration), AFTER_SHA256);
assert.equal(
  count(migration, /array_agg\(a\.attname::text ORDER BY x\.ord\)/g),
  4,
);
assert.equal(
  count(migration, /array_agg\(a\.attname ORDER BY x\.ord\)/g),
  0,
);
assert.equal(count(migration, /ARRAY\[[^\]]+\]::text\[\]/g), 4);

for (const manifestPath of [
  "docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json",
  "docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json",
]) {
  const manifest = JSON.parse(read(manifestPath));
  const entries = manifest.repositoryMigrations ?? manifest.rehearsal;
  const entry = entries.find(({ version }) => version === "20260728180000");
  assert.ok(entry, `missing corrected migration in ${manifestPath}`);
  assert.equal(entry.path, MIGRATION);
  assert.equal(entry.sha256, AFTER_SHA256);
}

const builder = read("scripts/build-pca-05r-structural-wave-bundle.mjs");
assert.ok(builder.includes('projection = "SOURCE_EXACT_PG17_NAME_ARRAY_TO_TEXT_ARRAY"'));
assert.ok(builder.includes('const needle = "array_agg(a.attname::text ORDER BY x.ord)"'));
assert.ok(!builder.includes('sql.replaceAll(needle, "array_agg(a.attname::text'));

const packageJson = JSON.parse(read("package.json"));
assert.equal(
  packageJson.scripts["test:pca-07r"],
  "node ./run-pca-07r-w1-postgres-name-array-type-corrective-specs.mjs",
);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07r"));

const workflow = read(".github/workflows/release-gate.yml");
for (const marker of [
  "pca_07r=false",
  "run-pca-07r-w1-postgres-name-array-type-corrective-specs.mjs",
  "Verify PCA-07R W1 PostgreSQL name-array corrective",
  "PCA_07R_BASE_SHA:",
  "run: bun run test:pca-07r",
]) {
  assert.ok(workflow.includes(marker), `release workflow missing ${marker}`);
}

const impact = read(
  "docs/architecture/impact-analysis/PCA-07R-w1-postgres-name-array-type-corrective.md",
);
const evidence = read(
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07r-w1-postgres-name-array-type-corrective.md",
);
const continuity = read(
  "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md",
);
for (const marker of [
  `SOURCE_MAIN = ${SOURCE_MAIN}`,
  `SOURCE_TREE = ${SOURCE_TREE}`,
  "operator does not exist: name[] = text[]",
  "SAME_BACKEND_WRITES = 0",
  "LOVABLE_CALLS = 0",
  "PR_105_MUTATION = false",
]) {
  assert.ok(impact.includes(marker), `impact missing ${marker}`);
}
for (const marker of [
  "TRANSACTION_ROLLED_BACK=true",
  "W1_LEDGER_ROWS_AFTER_ROLLBACK=0",
  "W2_W6_EXECUTED=false",
  `MIGRATION_SHA256_AFTER=${AFTER_SHA256}`,
  "DIRECT_SUPABASE_CALLS=0",
]) {
  assert.ok(evidence.includes(marker), `evidence missing ${marker}`);
}
assert.ok(continuity.includes("## 24. PCA-07/PCA-07R"));
assert.ok(continuity.includes("PCA07_ROLLBACK_VERIFIED=true"));

const base = process.env.PCA_07R_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(base, SOURCE_MAIN, "PCA-07R must be based on the accepted PCA-06 main");
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const allowed = [
    ".github/workflows/release-gate.yml",
    "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md",
    "docs/architecture/impact-analysis/PCA-05R-github-native-structural-wave-bundle.md",
    "docs/architecture/impact-analysis/PCA-07R-w1-postgres-name-array-type-corrective.md",
    "docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json",
    "docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-structural-wave-bundle.md",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07r-w1-postgres-name-array-type-corrective.md",
    "package.json",
    "run-pca-04-product-schema-rebaseline-corrective-specs.ts",
    "run-pca-05r-prerequisite-closure-manifest-specs.mjs",
    "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
    "run-pca-05r-structural-wave-bundle-specs.mjs",
    "run-pca-07r-w1-postgres-name-array-type-corrective-specs.mjs",
    "scripts/build-pca-05r-structural-wave-bundle.mjs",
    MIGRATION,
  ].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07R diff changed");
  assert.deepEqual(
    changed.filter((path) => path.startsWith("supabase/migrations/")),
    [MIGRATION],
  );
  assert.equal(changed.some((path) => path.startsWith("src/")), false);
  assert.equal(changed.some((path) => path.startsWith("rehearsal/")), false);

  const before = execFileSync("git", ["show", `${base}:${MIGRATION}`], {
    encoding: "utf8",
  });
  assert.equal(sha256(before), BEFORE_SHA256);
  assert.equal(
    count(before, /array_agg\(a\.attname ORDER BY x\.ord\)/g),
    4,
  );
  assert.equal(
    count(before, /array_agg\(a\.attname::text ORDER BY x\.ord\)/g),
    0,
  );
  const numstat = execFileSync(
    "git",
    ["diff", "--numstat", `${base}..HEAD`, "--", MIGRATION],
    { encoding: "utf8" },
  ).trim();
  assert.equal(numstat, `4\t4\t${MIGRATION}`);
}

console.log(
  JSON.stringify({
    gate: "PCA-07R_W1_POSTGRES_NAME_ARRAY_TYPE_CORRECTIVE_REPOSITORY_IMPLEMENTATION",
    sourceMain: SOURCE_MAIN,
    correctedMigration: MIGRATION,
    catalogTextCasts: 4,
    sameBackendWrites: 0,
    result: "PASS",
  }),
);
