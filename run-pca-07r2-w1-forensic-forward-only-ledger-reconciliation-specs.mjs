import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  BRANCH,
  build,
  CORRECTIVE_PATH,
  CORRECTIVE_VERSION,
  GATE,
  MANIFEST_PATH,
  PRIOR_CORRECTIVE_BYTES,
  PRIOR_CORRECTIVE_SHA256,
  SOURCE_MAIN,
  SOURCE_TREE,
  W1,
} from "./scripts/build-pca-07r2-w1-ledger-reconciliation.mjs";

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
const embeddedSource = (value, variable, delimiter) => {
  const opening = `${variable} text := ${delimiter}`;
  const start = value.indexOf(opening);
  assert.notEqual(start, -1, `missing ${variable}`);
  const bodyStart = start + opening.length;
  const bodyEnd = value.indexOf(`${delimiter};`, bodyStart);
  assert.notEqual(bodyEnd, -1, `unterminated ${variable}`);
  return value.slice(bodyStart, bodyEnd);
};

const { sql: generated, manifest: generatedManifest } = build();
const corrective = read(CORRECTIVE_PATH);
const manifest = JSON.parse(read(MANIFEST_PATH));

assert.equal(corrective, generated, "generated corrective drift");
assert.deepEqual(manifest, generatedManifest, "generated manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
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
assert.equal(manifest.incident.exactTransportRootCauseProven, true);
assert.equal(manifest.incident.priorCorrectiveSha256, PRIOR_CORRECTIVE_SHA256);
assert.equal(manifest.incident.priorCorrectiveBytes, PRIOR_CORRECTIVE_BYTES);
assert.equal(manifest.incident.lifecycleLiteralObservedBytes, W1[0].bytes + 1);
assert.equal(manifest.incident.accessLiteralObservedBytes, W1[1].bytes + 1);
assert.equal(manifest.incident.unexpectedPrefixByte, 10);
assert.equal(manifest.incident.targetLedgerRowsAfterFailure, 0);
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

const embeddedContracts = [
  ["v_lifecycle_source", "$pca07r2_lifecycle$"],
  ["v_access_source", "$pca07r2_access$"],
];
for (const [index, entry] of W1.entries()) {
  const source = read(entry.path);
  const [variable, delimiter] = embeddedContracts[index];
  const embedded = embeddedSource(corrective, variable, delimiter);
  assert.equal(sha256(source), entry.sha256);
  assert.equal(Buffer.byteLength(source), entry.bytes);
  assert.equal(embedded, source, `${variable} must be byte-identical to W1 source`);
  assert.equal(Buffer.byteLength(embedded), entry.bytes);
  assert.equal(sha256(embedded), entry.sha256);
  assert.notEqual(embedded.charCodeAt(0), 10, `${variable} must not add prefix LF`);
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
  "pca_05r_closure=false",
  TEST,
  "Verify PCA-07R2 W1 forensic forward-only ledger reconciliation",
  "PCA_07R2_BASE_SHA:",
  "run: bun run test:pca-07r2",
  'echo "pca_05r_closure=$pca_05r_closure" >> "$GITHUB_OUTPUT"',
  "if: steps.scope.outputs.pca_05r == 'true' || steps.scope.outputs.pca_05r_closure == 'true'",
]) {
  assert.ok(workflow.includes(marker), `release workflow missing ${marker}`);
}
const closureClassifier = workflow.match(
  /if \[\[ " \$\{changed_files\[\*\]\} " == \*" run-pca-05r-prerequisite-closure-manifest-specs\.mjs "\* \]\]; then\s+([^\n]+)\s+fi/,
);
assert.ok(closureClassifier, "PCA-05R closure classifier missing");
assert.equal(closureClassifier[1].trim(), "pca_05r_closure=true");
assert.equal(closureClassifier[1].includes("pca_05r=true"), false);

const impact = read(IMPACT);
const evidence = read(EVIDENCE);
const continuity = read(CONTINUITY);
for (const marker of [
  `SOURCE_MAIN = ${SOURCE_MAIN}`,
  `SOURCE_TREE = ${SOURCE_TREE}`,
  "LOVABLE_MANAGED_APPLICATION_FAIL_CLOSED_EMBEDDED_SOURCE_PREFIX_LF",
  "one top-level PostgreSQL `DO` statement",
  "W1_REPLAY = false",
  "MIGRATION_LEDGER_WRITES = 0",
  "PR_105_MUTATION = false",
  "PCA-07R2R release-gate scope corrective",
  "PCA-07R2R2 embedded-source byte-identity corrective",
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
  "PCA07R2R_RELEASE_GATE_886=FAIL_CLOSED_SCOPE_COUPLING",
  "PCA07R2R2_PREFIX_BYTE=10",
  "PCA07R2R2_TARGET_LEDGER_ROWS_AFTER_FAILURE=0",
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
    CONTINUITY,
    IMPACT,
    MANIFEST_PATH,
    EVIDENCE,
    PCA05R_CLOSURE_MANIFEST,
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
