import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  build,
  CORRECTIVE_PATH,
  CORRECTIVE_VERSION,
  MANIFEST_PATH,
  W1,
} from "./scripts/build-pca-07r2-w1-ledger-reconciliation.mjs";

const SOURCE_MAIN = "a28f257c640a128327e9f0ce97974e48679fa05c";
const SOURCE_TREE = "036a95e952e23f4a659aafd93330961ccdb1a952";
const IMPACT =
  "docs/architecture/impact-analysis/PCA-07R2-w1-forensic-forward-only-ledger-reconciliation.md";
const EVIDENCE =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07r2-w1-forensic-forward-only-ledger-reconciliation.md";
const CONTINUITY =
  "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const TEST = "run-pca-07r2-w1-forensic-forward-only-ledger-reconciliation-specs.mjs";
const BUILDER = "scripts/build-pca-07r2-w1-ledger-reconciliation.mjs";
const PCA05R_CLOSURE_TEST =
  "run-pca-05r-prerequisite-closure-manifest-specs.mjs";
const PCA05R_CLOSURE_MANIFEST =
  "docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json";
const PCA05R_CLOSURE_IMPACT =
  "docs/architecture/impact-analysis/PCA-05R-github-native-prerequisite-closure-manifest.md";
const PCA05R_CLOSURE_EVIDENCE =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-prerequisite-closure-manifest.md";

const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const occurrences = (value, needle) => value.split(needle).length - 1;

const { sql: generated, manifest: generatedManifest } = build();
const corrective = read(CORRECTIVE_PATH);
const manifest = JSON.parse(read(MANIFEST_PATH));

assert.equal(corrective, generated, "generated corrective drift");
assert.deepEqual(manifest, generatedManifest, "generated manifest drift");
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.corrective.version, CORRECTIVE_VERSION);
assert.equal(manifest.corrective.path, CORRECTIVE_PATH);
assert.equal(manifest.corrective.sha256, sha256(corrective));
assert.equal(manifest.corrective.bytes, Buffer.byteLength(corrective));
assert.equal(manifest.corrective.topLevelStatements, 1);
assert.equal(manifest.corrective.sourceCopiesPerW1Migration, 1);
assert.equal(manifest.corrective.replaysW1DdlOrDml, false);
assert.equal(manifest.corrective.reconstructsExactW1LedgerRows, true);
assert.equal(manifest.corrective.historicalRowsWrittenInsideStatement, 2);
assert.equal(manifest.corrective.correctiveRowWrittenInsideStatement, true);
assert.deepEqual(manifest.corrective.ledgerColumns, [
  "version",
  "statements",
  "name",
  "created_by",
  "idempotency_key",
  "rollback",
]);
assert.equal(
  manifest.corrective.retryMode,
  "ZERO_TO_EXACT_THREE_OR_EXACT_THREE_NOOP",
);
assert.equal(manifest.incident.exactTransportRootCauseProven, false);
assert.equal(manifest.incident.priorW1SourceBytes, 50566);
assert.equal(manifest.incident.priorDuplicatedSourceLowerBoundBytes, 101132);
assert.equal(manifest.liveReadOnlySnapshot.productTablesMissing, 45);
assert.equal(manifest.liveReadOnlySnapshot.productColumnsMissing, 55);
assert.equal(manifest.controls.sameBackendWrites, 0);
assert.equal(manifest.controls.lovableCalls, 0);
assert.equal(manifest.controls.directSupabaseCalls, 0);
assert.equal(manifest.controls.blindMigrationRepairAllowed, false);
assert.equal(manifest.controls.w1ReplayAllowed, false);
assert.equal(manifest.controls.w2ThroughW6Allowed, false);

assert.equal(occurrences(corrective, "DO $pca07r2$"), 1);
assert.equal(occurrences(corrective, "$pca07r2$;"), 1);
assert.equal(
  occurrences(corrective, "INSERT INTO supabase_migrations.schema_migrations"),
  1,
);
assert.equal(occurrences(corrective, "v_lifecycle_source text :="), 1);
assert.equal(occurrences(corrective, "v_access_source text :="), 1);
assert.equal(occurrences(corrective, "-- PR-M2 — Tenant Lifecycle"), 1);
assert.equal(occurrences(corrective, "-- PR-M2 — Tenant-scoped RBAC"), 1);
assert.ok(!corrective.includes("EXECUTE v_lifecycle_source"));
assert.ok(!corrective.includes("EXECUTE v_access_source"));
assert.ok(!corrective.includes("supabase migration repair"));
assert.ok(corrective.includes("created_by, idempotency_key, rollback"));
assert.ok(corrective.includes("v_current_query text := current_query()"));
assert.ok(corrective.includes("v_target_ledger_count NOT IN (0, 3)"));
assert.ok(corrective.includes("existing target ledger identity mismatch"));
assert.ok(corrective.includes("Lovable-managed ledger schema mismatch"));
assert.ok(corrective.includes("unexpected W2-W6 product ledger rows"));
assert.ok(corrective.includes("W2-W6 product table unexpectedly present"));
assert.ok(corrective.includes("atomic ledger postcondition mismatch"));
assert.equal(manifest.expectedFunctions.length, 11);
assert.equal(manifest.expectedProductTables.length, 45);
assert.equal(manifest.expectedRemainingProductColumns.length, 55);
assert.equal(manifest.w1RlsTables.length, 7);

for (const entry of W1) {
  const source = read(entry.path);
  assert.equal(sha256(source), entry.sha256);
  assert.equal(Buffer.byteLength(source), entry.bytes);
  assert.ok(corrective.includes(source), `corrective missing exact source ${entry.path}`);
  assert.ok(
    corrective.includes(`'pca-07r2:${entry.version}:${entry.sha256}'`),
    `missing deterministic idempotency key ${entry.version}`,
  );
}

const packageJson = JSON.parse(read("package.json"));
assert.equal(
  packageJson.scripts["test:pca-07r2"],
  "node ./run-pca-07r2-w1-forensic-forward-only-ledger-reconciliation-specs.mjs",
);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07r2"));

const workflow = read(".github/workflows/release-gate.yml");
for (const marker of [
  "pca_07r2=false",
  TEST,
  "Verify PCA-07R2 W1 forensic forward-only ledger reconciliation",
  "PCA_07R2_BASE_SHA:",
  "run: bun run test:pca-07r2",
]) {
  assert.ok(workflow.includes(marker), `release workflow missing ${marker}`);
}

const impact = read(IMPACT);
const evidence = read(EVIDENCE);
const continuity = read(CONTINUITY);
for (const marker of [
  `SOURCE_MAIN = ${SOURCE_MAIN}`,
  `SOURCE_TREE = ${SOURCE_TREE}`,
  "W1_COMMITTED_WITHOUT_LEDGER_TRANSPORT_DIVERGENCE",
  "one top-level PostgreSQL `DO` statement",
  "W1_REPLAY = false",
  "MIGRATION_LEDGER_WRITES = 0",
  "PR_105_MUTATION = false",
]) {
  assert.ok(impact.includes(marker), `impact missing ${marker}`);
}
for (const marker of [
  `CORRECTIVE_VERSION=${CORRECTIVE_VERSION}`,
  "CORRECTIVE_TOP_LEVEL_STATEMENTS=1",
  "W1_SOURCE_BYTES=50566",
  "W1_LEDGER_ROWS_OBSERVED=0",
  "W2_W6_EXECUTED=false",
  "BLIND_MIGRATION_REPAIR=false",
  "DIRECT_SUPABASE_CALLS=0",
]) {
  assert.ok(evidence.includes(marker), `evidence missing ${marker}`);
}
assert.ok(continuity.includes("## 25. PCA-07R2"));
assert.ok(continuity.includes("PCA07R2_W1_REPLAY=false"));
assert.ok(continuity.includes("PCA07R2_SAME_BACKEND_WRITES=0"));

const base = process.env.PCA_07R2_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(base, SOURCE_MAIN, "PCA-07R2 must be based on accepted PCA-07R main");
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const allowed = [
    ".github/workflows/release-gate.yml",
    CONTINUITY,
    IMPACT,
    MANIFEST_PATH,
    EVIDENCE,
    PCA05R_CLOSURE_TEST,
    PCA05R_CLOSURE_MANIFEST,
    PCA05R_CLOSURE_IMPACT,
    PCA05R_CLOSURE_EVIDENCE,
    "package.json",
    TEST,
    BUILDER,
    CORRECTIVE_PATH,
  ].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07R2 diff changed");
  assert.deepEqual(
    changed.filter((path) => path.startsWith("supabase/migrations/")),
    [CORRECTIVE_PATH],
  );
  assert.equal(changed.some((path) => path.startsWith("src/")), false);
  for (const entry of W1) {
    assert.equal(
      sha256(execFileSync("git", ["show", `${base}:${entry.path}`])),
      entry.sha256,
      `PCA-07R2 changed immutable W1 source ${entry.path}`,
    );
  }
}

console.log(
  JSON.stringify({
    gate: manifest.gate,
    sourceMain: SOURCE_MAIN,
    correctiveVersion: CORRECTIVE_VERSION,
    correctiveBytes: Buffer.byteLength(corrective),
    topLevelStatements: 1,
    w1Replay: false,
    sameBackendWrites: 0,
    result: "PASS",
  }),
);
