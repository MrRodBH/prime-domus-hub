import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  ALL_TABLES,
  BRANCH,
  buildApplication,
  buildContract,
  compactSql,
  GATE,
  GROUPS,
  MANIFEST_PATH,
  NEW_FUNCTIONS,
  projectMigration,
  SOURCE_MAIN,
  SOURCE_TREE,
  W5,
} from "./scripts/build-pca-07-w5-transport-safe-corrective.mjs";

const IMPACT =
  "docs/architecture/impact-analysis/PCA-07-W5-final-corrective-inventory-transport-safe-atomic-ledger-aware-corrective.md";
const EVIDENCE =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07-w5-final-corrective-inventory-transport-safe-atomic-ledger-aware-corrective.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-07-w5-transport-safe-corrective.mjs";
const TEST = "run-pca-07-w5-transport-safe-corrective-specs.mjs";

const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const occurrences = (value, needle) => value.split(needle).length - 1;
const mustContain = (value, needles, label) => {
  for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`);
};

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "W5 contract manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.corrective.executionMode, "SIX_ORDERED_ATOMIC_ENVELOPES");
assert.equal(manifest.corrective.semanticProjection, "BYTE_IDENTICAL_SEMANTICS");
assert.equal(manifest.corrective.cmsIntermediateDefectContainedAtomically, true);
assert.equal(manifest.corrective.blindReplayAllowed, false);
assert.equal(manifest.security.tableCount, ALL_TABLES.length);
assert.equal(manifest.security.newFunctionCount, NEW_FUNCTIONS.length);
assert.equal(ALL_TABLES.length, 15);
assert.equal(NEW_FUNCTIONS.length, 17);
assert.equal(manifest.security.dataApiExposureImplicitlyTrusted, false);
assert.equal(manifest.controls.repositoryImplementationOnly, true);
assert.equal(manifest.controls.sameBackendReads, 0);
assert.equal(manifest.controls.sameBackendWrites, 0);
assert.equal(manifest.controls.directSupabaseCalls, 0);
assert.equal(manifest.controls.canonicalMigrationMutation, false);

for (const [index, entry] of W5.entries()) {
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
const authorization = "PCA-07_W5_CONTROLLED_APPLICATION";
const first = buildApplication({ tenantId, ownerAuthorization: authorization });
const second = buildApplication({ tenantId, ownerAuthorization: authorization });
assert.deepEqual(first, second, "W5 application generation must be deterministic");
assert.equal(first.envelopes.length, 6);
assert.equal(first.runtime.exactTenantCount, 1);
assert.equal(first.runtime.tenantManifestSha256, sha256(tenantId));
assert.deepEqual(
  first.envelopes.map(({ capability, versions, bytes, sha256: hash }) => ({ capability, versions, bytes, sha256: hash })),
  [
    { capability: "CORE_CRM_UPLOAD", versions: ["20260730043000"], bytes: 34737, sha256: "3b18c9ca93facb8bf060635f1c6e7a33a9a7be385158843baaeaf93ca310149a" },
    { capability: "CMS_MARKETING_HARDENING", versions: ["20260730050000", "20260730051500", "20260730053000"], bytes: 56220, sha256: "152abf00de8d6d041fcc34cea1590bb8d81a7afe17dac5ca2634ed81a9722c19" },
    { capability: "SUPER_CONTROL_PLANE", versions: ["20260730060000"], bytes: 30037, sha256: "1fe1789cc92a7a07320128647fd16e525725e4f0686334b251517e1ed0fd0366" },
    { capability: "CONTENT_UPLOAD_CONSUMERS", versions: ["20260730100000"], bytes: 32704, sha256: "8f6b15f145a5fb22a7398f5275014ff8a046dc964c25483fc1e3e52a814fe52b" },
    { capability: "LAUNCH_TRANSACTIONAL_SAVE", versions: ["20260730101000"], bytes: 28902, sha256: "f833e7da4ec2f62180bc8445da41fe35a006ce02db40458a078a69b58219b86f" },
    { capability: "STORAGE_PROVENANCE_CRM_ATTACHMENT", versions: ["20260803183000"], bytes: 33897, sha256: "a52c47e040f35af1327d4b442b21cd879638ae05b9fd79c3772e2770f7e7a68d" },
  ],
);

for (const envelope of first.envelopes) {
  assert.equal(occurrences(envelope.sql, "BEGIN;"), 1, `${envelope.capability} transaction count`);
  assert.equal(occurrences(envelope.sql, "COMMIT;"), 1, `${envelope.capability} commit count`);
  assert.equal(occurrences(envelope.sql, "SELECT set_config('app.pr_m2_authorized_tenant_ids'"), 1);
  assert.equal(occurrences(envelope.sql, authorization), 1);
  assert.ok(envelope.sql.includes("current_query()"));
  assert.ok(envelope.sql.includes("protected baseline drift"));
  assert.ok(envelope.sql.includes("W4 ledger mismatch"));
  assert.ok(envelope.bytes < 77000, `${envelope.capability} transport bound`);
  assert.ok(!envelope.sql.includes("DELETE FROM supabase_migrations"));
  assert.ok(!envelope.sql.includes("UPDATE supabase_migrations"));
}

const cms = first.envelopes[1].sql;
assert.ok(cms.includes("current_version_id = _version_id"));
assert.ok(cms.includes("page.draft_version_id = _version_id"));
assert.ok(cms.indexOf("current_version_id = _version_id") < cms.indexOf("page.draft_version_id = _version_id"));
assert.ok(cms.includes("CMS final signature body mismatch"));
assert.equal(occurrences(cms, "INSERT INTO supabase_migrations.schema_migrations"), 1);
assert.equal(occurrences(cms, "ARRAY[v_query]"), 3);

assert.throws(() => buildApplication({ tenantId: "rm-prime", ownerAuthorization: authorization }), /exact tenant UUID required/);
assert.throws(() => buildApplication({ tenantId, ownerAuthorization: "INVALID" }), /bounded PCA authorization required/);

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["test:pca-07-w5"], "node ./run-pca-07-w5-transport-safe-corrective-specs.mjs");
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07-w5"));

const workflow = read(".github/workflows/release-gate.yml");
mustContain(workflow, [
  "pca_07_w5=false", TEST, "pca_07_w5=true",
  'echo "pca_07_w5=$pca_07_w5" >> "$GITHUB_OUTPUT"',
  "Verify PCA-07 W5 final corrective inventory transport-safe corrective",
  "PCA_07_W5_BASE_SHA:", "run: bun run test:pca-07-w5",
], "release workflow");

const impact = read(IMPACT);
const evidence = read(EVIDENCE);
const continuity = read(CONTINUITY);
mustContain(impact, [
  `SOURCE_MAIN = ${SOURCE_MAIN}`, `SOURCE_TREE = ${SOURCE_TREE}`,
  "six ordered atomic envelopes", "byte-identical semantics",
  "Blind replay is forbidden", "CANONICAL_MIGRATION_MUTATION = false", "PR_105_MUTATION = false",
], "impact");
mustContain(evidence, [
  `SOURCE_MAIN=${SOURCE_MAIN}`, `SOURCE_TREE=${SOURCE_TREE}`,
  "EXECUTION_ENVELOPES=6", "W5_LIVE_LEDGER_BEFORE_IMPLEMENTATION=0/8",
  "SEMANTIC_PROJECTIONS=0", "SAME_BACKEND_WRITES=0",
], "evidence");
mustContain(continuity, [
  "## 30. PCA-07 W5", `PCA07_W5_SOURCE_MAIN=${SOURCE_MAIN}`,
  "PCA07_W5_SEMANTIC_PROJECTIONS=0", "PCA07_W5_SAME_BACKEND_WRITES=0",
], "continuity");

assert.deepEqual(GROUPS.map((group) => group.indexes.length), [1, 3, 1, 1, 1, 1]);

const base = process.env.PCA_07_W5_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(base, SOURCE_MAIN, "PCA-07 W5 must be based on accepted main");
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).sort();
  const allowed = [
    ".github/workflows/release-gate.yml", "package.json", BUILDER, TEST, MANIFEST_PATH,
    IMPACT, EVIDENCE, CONTINUITY,
  ].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07 W5 diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
}

console.log("PCA-07 W5 final corrective inventory transport-safe corrective: PASS");
