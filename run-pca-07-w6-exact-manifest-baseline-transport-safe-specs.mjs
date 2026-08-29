import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  BRANCH,
  buildApplication,
  buildContract,
  FUNCTIONS,
  GATE,
  MANIFEST_PATH,
  MIGRATION,
  SOURCE_MAIN,
  SOURCE_TREE,
  TRIGGER,
} from "./scripts/build-pca-07-w6-exact-manifest-baseline-transport-safe.mjs";

const IMPACT = "docs/architecture/impact-analysis/PCA-07-W6-exact-manifest-tenant-product-baseline-transport-safe.md";
const EVIDENCE = "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07-w6-exact-manifest-tenant-product-baseline-transport-safe.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-07-w6-exact-manifest-baseline-transport-safe.mjs";
const TEST = "run-pca-07-w6-exact-manifest-baseline-transport-safe-specs.mjs";
const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const occurrences = (value, needle) => value.split(needle).length - 1;
const mustContain = (value, needles, label) => { for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`); };

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "W6 contract manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.migration.version, MIGRATION.version);
assert.equal(manifest.corrective.executionMode, "ONE_EXACT_MANIFEST_ATOMIC_ENVELOPE");
assert.equal(manifest.corrective.exactTenantCount, 1);
assert.equal(manifest.corrective.existingTenantApplication, "IDEMPOTENT_EXACT_MANIFEST_ONLY");
assert.equal(manifest.corrective.blindReplayAllowed, false);
assert.equal(manifest.security.functions.length, 3);
assert.equal(manifest.security.trigger, TRIGGER);
assert.equal(manifest.controls.canonicalMigrationMutation, false);

const source = read(MIGRATION.path);
assert.equal(Buffer.byteLength(source), MIGRATION.bytes);
assert.equal(sha256(source), MIGRATION.sha256);

const tenantId = "9664d189-4a12-4caa-8243-dc73383447e6";
const authorization = "PCA-07_W6_CONTROLLED_APPLICATION";
const first = buildApplication({ tenantId, ownerAuthorization: authorization });
const second = buildApplication({ tenantId, ownerAuthorization: authorization });
assert.deepEqual(first, second, "W6 application generation must be deterministic");
assert.deepEqual(
  { capability: first.envelope.capability, versions: first.envelope.versions, bytes: first.envelope.bytes, sha256: first.envelope.sha256 },
  {
    capability: "EXACT_MANIFEST_TENANT_PRODUCT_BASELINE",
    versions: ["20260826185014"],
    bytes: 27413,
    sha256: "1232986bcdc08dce2ce637af112c0b0f13e2fc61da136c08553a2053cbcb8f9d",
  },
);
assert.equal(occurrences(first.envelope.sql, "BEGIN;"), 1);
assert.equal(occurrences(first.envelope.sql, "COMMIT;"), 1);
assert.equal(occurrences(first.envelope.sql, "INSERT INTO supabase_migrations.schema_migrations"), 1);
assert.equal(manifest.corrective.semanticProjection, "BYTE_IDENTICAL_SEMANTICS");
assert.equal(manifest.corrective.transportCompaction, "DETERMINISTIC_LITERAL_PRESERVING_SQL_COMPACTION");
assert.ok(first.envelope.sql.includes("current_query()"));
assert.ok(first.envelope.sql.includes("W5 ledger mismatch"));
assert.ok(first.envelope.sql.includes("exact tenant baseline mismatch"));
assert.ok(first.envelope.sql.includes("protected baseline drift"));
assert.ok(first.envelope.sql.includes(manifest.corrective.tenantManifestSha256));
assert.ok(first.envelope.sql.includes("ARRAY['9664d189-4a12-4caa-8243-dc73383447e6'::uuid]"));
for (const signature of FUNCTIONS) assert.ok(first.envelope.sql.includes(signature.split("(")[0]));
assert.ok(first.envelope.sql.includes(TRIGGER));
assert.ok(first.envelope.bytes < 77000);
assert.ok(!first.envelope.sql.includes("DELETE FROM supabase_migrations"));
assert.ok(!first.envelope.sql.includes("UPDATE supabase_migrations"));
assert.throws(() => buildApplication({ tenantId: "rm-prime", ownerAuthorization: authorization }), /exact tenant UUID required/);
assert.throws(() => buildApplication({ tenantId, ownerAuthorization: "INVALID" }), /bounded PCA authorization required/);

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["test:pca-07-w6"], `node ./${TEST}`);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07-w6"));
mustContain(read(".github/workflows/release-gate.yml"), ["pca_07_w6=false", TEST, "pca_07_w6=true", "Verify PCA-07 W6 exact-manifest tenant product baseline", "PCA_07_W6_BASE_SHA:", "run: bun run test:pca-07-w6"], "workflow");
mustContain(read(IMPACT), [`SOURCE_MAIN = ${SOURCE_MAIN}`, "One exact-manifest atomic envelope", "canonical migration remains byte-identical", "Blind replay is forbidden"], "impact");
mustContain(read(EVIDENCE), [`SOURCE_MAIN=${SOURCE_MAIN}`, "W5_LEDGER=8/8", "W6_LEDGER_BEFORE_IMPLEMENTATION=0/1", "SAME_BACKEND_WRITES=0"], "evidence");
mustContain(read(CONTINUITY), ["## 32. PCA-07 W6", `PCA07_W6_SOURCE_MAIN=${SOURCE_MAIN}`, "PCA07_W6_EXACT_TENANT_COUNT=1", "PCA07_W6_SAME_BACKEND_WRITES=0"], "continuity");

const base = process.env.PCA_07_W6_BASE_SHA?.trim();
if (base) {
  assert.equal(base, SOURCE_MAIN);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).sort();
  const allowed = [".github/workflows/release-gate.yml", "package.json", BUILDER, TEST, MANIFEST_PATH, IMPACT, EVIDENCE, CONTINUITY].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07 W6 diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
}
console.log("PCA-07 W6 exact-manifest tenant product baseline: PASS");
