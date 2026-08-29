import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  BRANCH,
  buildApplication,
  buildContract,
  compactSql,
  GATE,
  MANIFEST_PATH,
  MARKETING_CREATED_FUNCTIONS,
  MARKETING_FUNCTIONS,
  MARKETING_TABLES,
  projectMigration,
  SOURCE_MAIN,
  SOURCE_TREE,
  TRACKING_CREATED_FUNCTIONS,
  TRACKING_FUNCTIONS,
  TRACKING_TABLES,
  W4,
} from "./scripts/build-pca-07-w4-transport-safe-corrective.mjs";

const IMPACT =
  "docs/architecture/impact-analysis/PCA-07-W4-marketing-tracking-transport-safe-atomic-ledger-aware-corrective.md";
const EVIDENCE =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07-w4-marketing-tracking-transport-safe-atomic-ledger-aware-corrective.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-07-w4-transport-safe-corrective.mjs";
const TEST = "run-pca-07-w4-transport-safe-corrective-specs.mjs";

const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const occurrences = (value, needle) => value.split(needle).length - 1;
const mustContain = (value, needles, label) => {
  for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`);
};

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "W4 contract manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.corrective.executionMode, "TWO_ORDERED_MIGRATION_LOCAL_ATOMIC_ENVELOPES");
assert.equal(manifest.corrective.semanticProjection, "BYTE_IDENTICAL_SEMANTICS");
assert.equal(manifest.corrective.marketingMustCommitBeforeTracking, true);
assert.equal(manifest.corrective.blindReplayAllowed, false);
assert.deepEqual(manifest.projections, [
  "BYTE_IDENTICAL_SEMANTICS",
  "TRANSPORT_SAFE_SQL_COMPACTION",
]);
assert.equal(manifest.security.marketingTableCount, MARKETING_TABLES.length);
assert.equal(manifest.security.marketingFunctionCount, MARKETING_FUNCTIONS.length);
assert.equal(manifest.security.trackingTableCount, TRACKING_TABLES.length);
assert.equal(manifest.security.trackingFunctionCount, TRACKING_FUNCTIONS.length);
assert.equal(MARKETING_CREATED_FUNCTIONS.length, 12);
assert.equal(TRACKING_CREATED_FUNCTIONS.length, 5);
assert.equal(manifest.security.dataApiExposureImplicitlyTrusted, false);
assert.equal(manifest.controls.repositoryImplementationOnly, true);
assert.equal(manifest.controls.sameBackendReads, 0);
assert.equal(manifest.controls.sameBackendWrites, 0);
assert.equal(manifest.controls.directSupabaseCalls, 0);
assert.equal(manifest.controls.canonicalMigrationMutation, false);

for (const [index, entry] of W4.entries()) {
  const source = read(entry.path);
  const projected = projectMigration(source, entry.capability);
  assert.equal(Buffer.byteLength(source), entry.bytes);
  assert.equal(sha256(source), entry.sha256);
  assert.equal(Buffer.byteLength(projected), manifest.projectedMigrations[index].projectedBodyBytes);
  assert.equal(sha256(projected), manifest.projectedMigrations[index].projectedBodySha256);
  assert.equal(occurrences(projected, "BYTE_IDENTICAL_SEMANTICS"), 1);
}

const compacted = compactSql(
  "SELECT 'two  spaces -- literal'; -- removed\nDO $x$ BEGIN RAISE NOTICE 'inner  literal'; -- inner removed\nEND;$x$;\n",
);
assert.ok(compacted.includes("'two  spaces -- literal'"));
assert.ok(compacted.includes("'inner  literal'"));
assert.ok(!compacted.includes("removed"));

const tenantId = "9664d189-4a12-4caa-8243-dc73383447e6";
const authorization = "PCA-07_W4_CONTROLLED_APPLICATION";
const first = buildApplication({ tenantId, ownerAuthorization: authorization });
const second = buildApplication({ tenantId, ownerAuthorization: authorization });
assert.deepEqual(first, second, "W4 application generation must be deterministic");
const { marketingSql, trackingSql, runtime } = first;
assert.equal(runtime.exactTenantCount, 1);
assert.equal(runtime.tenantManifestSha256, sha256(tenantId));
assert.equal(runtime.marketingSqlBytes, 72456);
assert.equal(runtime.marketingSqlSha256, "014ac6a7695e2afdfb4ed509c718de568176379dc54735e03e8d6aa7039a1aa1");
assert.equal(runtime.trackingSqlBytes, 36812);
assert.equal(runtime.trackingSqlSha256, "4d0c76b9617908e6f92933d9e26cb4d0b6a976ceb38fa78d20dd8b1172b38031");
assert.ok(runtime.marketingSqlBytes < 77000);
assert.ok(runtime.trackingSqlBytes < 77000);

for (const [label, sql] of [
  ["MARKETING", marketingSql],
  ["TRACKING", trackingSql],
]) {
  assert.equal(occurrences(sql, "BEGIN;"), 1, `${label} must own one transaction`);
  assert.equal(occurrences(sql, "COMMIT;"), 1, `${label} must own one commit`);
  assert.equal(occurrences(sql, "SELECT set_config('app.pr_m2_authorized_tenant_ids'"), 1);
  assert.equal(occurrences(sql, authorization), 1);
  assert.ok(sql.includes("current_query()"));
  assert.ok(sql.includes("protected baseline drift"));
  assert.ok(sql.includes("W1 ledger mismatch"));
  assert.ok(sql.includes("W2 ledger mismatch"));
  assert.ok(sql.includes("W3 ledger mismatch"));
  assert.ok(!sql.includes("supabase migration repair"));
  assert.ok(!sql.includes("DELETE FROM supabase_migrations"));
  assert.ok(!sql.includes("UPDATE supabase_migrations"));
}

mustContain(
  marketingSql,
  [
    "CREATE TABLE IF NOT EXISTS public.tenant_marketing_connectors",
    "PCA-07 W4 marketing target boundary mismatch",
    "PCA-07 W4 marketing data state mismatch",
    "PCA-07 W4 marketing client ACL exposure",
    `('${W4[0].version}',ARRAY[v_query],'${W4[0].name}'`,
  ],
  "marketing envelope",
);
assert.ok(!marketingSql.includes("CREATE TABLE IF NOT EXISTS public.tenant_tracking_connectors"));
assert.equal(occurrences(marketingSql, "INSERT INTO supabase_migrations.schema_migrations"), 1);

mustContain(
  trackingSql,
  [
    "CREATE TABLE IF NOT EXISTS public.tenant_tracking_connectors",
    "PCA-07 W4 tracking source cardinality mismatch",
    "PCA-07 W4 tracking data state mismatch",
    "PCA-07 W4 tracking function ACL mismatch",
    `('${W4[1].version}',ARRAY[v_query],'${W4[1].name}'`,
  ],
  "tracking envelope",
);
assert.equal(occurrences(trackingSql, "INSERT INTO supabase_migrations.schema_migrations"), 1);

assert.throws(
  () => buildApplication({ tenantId: "rm-prime", ownerAuthorization: authorization }),
  /exact tenant UUID required/,
);
assert.throws(
  () => buildApplication({ tenantId, ownerAuthorization: "INVALID" }),
  /bounded PCA authorization required/,
);

const packageJson = JSON.parse(read("package.json"));
assert.equal(
  packageJson.scripts["test:pca-07-w4"],
  "node ./run-pca-07-w4-transport-safe-corrective-specs.mjs",
);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07-w4"));

const workflow = read(".github/workflows/release-gate.yml");
mustContain(
  workflow,
  [
    "pca_07_w4=false",
    TEST,
    "pca_07_w4=true",
    'echo "pca_07_w4=$pca_07_w4" >> "$GITHUB_OUTPUT"',
    "Verify PCA-07 W4 Marketing/Tracking transport-safe corrective",
    "PCA_07_W4_BASE_SHA:",
    "run: bun run test:pca-07-w4",
  ],
  "release workflow",
);

const impact = read(IMPACT);
const evidence = read(EVIDENCE);
const continuity = read(CONTINUITY);
mustContain(
  impact,
  [
    `SOURCE_MAIN = ${SOURCE_MAIN}`,
    `SOURCE_TREE = ${SOURCE_TREE}`,
    "two ordered migration-local atomic envelopes",
    "byte-identical semantics",
    "Blind replay is forbidden",
    "CANONICAL_MIGRATION_MUTATION = false",
    "PR_105_MUTATION = false",
  ],
  "impact",
);
mustContain(
  evidence,
  [
    `SOURCE_MAIN=${SOURCE_MAIN}`,
    `SOURCE_TREE=${SOURCE_TREE}`,
    "EXECUTION_ENVELOPES=2",
    "W4_LIVE_LEDGER_BEFORE_IMPLEMENTATION=0/2",
    "SEMANTIC_PROJECTIONS=0",
    "SAME_BACKEND_WRITES=0",
  ],
  "evidence",
);
mustContain(
  continuity,
  [
    "## 29. PCA-07 W4",
    `PCA07_W4_SOURCE_MAIN=${SOURCE_MAIN}`,
    "PCA07_W4_SEMANTIC_PROJECTIONS=0",
    "PCA07_W4_SAME_BACKEND_WRITES=0",
  ],
  "continuity",
);

const base = process.env.PCA_07_W4_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(base, SOURCE_MAIN, "PCA-07 W4 must be based on accepted main");
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const allowed = [
    ".github/workflows/release-gate.yml",
    "package.json",
    BUILDER,
    TEST,
    MANIFEST_PATH,
    IMPACT,
    EVIDENCE,
    CONTINUITY,
  ].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07 W4 diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
}

console.log("PCA-07 W4 Marketing/Tracking transport-safe corrective: PASS");
