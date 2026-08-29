import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { MEDIA_AUTHORITY_INDEX, W5 } from "./scripts/build-pca-07-w5-transport-safe-corrective.mjs";
import {
  BRANCH, buildApplication, buildContract, GATE, MANIFEST_PATH, SOURCE_MAIN, SOURCE_TREE,
} from "./scripts/build-pca-07-w5r-media-authority-corrective.mjs";

const IMPACT = "docs/architecture/impact-analysis/PCA-07-W5R-media-library-composite-authority-corrective.md";
const EVIDENCE = "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07-w5r-media-library-composite-authority-corrective.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-07-w5r-media-authority-corrective.mjs";
const SHARED_BUILDER = "scripts/build-pca-07-w5-transport-safe-corrective.mjs";
const TEST = "run-pca-07-w5r-media-library-composite-authority-specs.mjs";
const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const occurrences = (value, needle) => value.split(needle).length - 1;
const mustContain = (value, needles, label) => { for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`); };

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "W5R contract manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.failure.databaseDisposition, "TOTAL_TRANSACTION_ROLLBACK");
assert.equal(manifest.failure.rootCause, "MISSING_MEDIA_LIBRARY_TENANT_ID_ID_UNIQUE_AUTHORITY");
assert.equal(manifest.corrective.index, MEDIA_AUTHORITY_INDEX);
assert.equal(manifest.corrective.observedDuplicateCount, 0);
assert.equal(manifest.corrective.blindReplayAllowed, false);
assert.equal(manifest.controls.canonicalMigrationMutation, false);
for (const entry of W5) {
  const source = read(entry.path);
  assert.equal(Buffer.byteLength(source), entry.bytes);
  assert.equal(sha256(source), entry.sha256);
}

const tenantId = "9664d189-4a12-4caa-8243-dc73383447e6";
const authorization = "PCA-07_W5_CONTROLLED_APPLICATION";
const first = buildApplication({ tenantId, ownerAuthorization: authorization });
const second = buildApplication({ tenantId, ownerAuthorization: authorization });
assert.deepEqual(first, second, "W5R generation must be deterministic");
assert.equal(first.envelopes.length, 6);
assert.deepEqual(
  first.envelopes.map(({ capability, bytes, sha256: hash }) => ({ capability, bytes, sha256: hash })),
  [
    { capability: "CORE_CRM_UPLOAD", bytes: 34737, sha256: "3b18c9ca93facb8bf060635f1c6e7a33a9a7be385158843baaeaf93ca310149a" },
    { capability: "CMS_MARKETING_HARDENING", bytes: 56812, sha256: "5c952490da65093c922de35baf52c69c2b339a19d64fb48405cf974fac80fb50" },
    { capability: "SUPER_CONTROL_PLANE", bytes: 30350, sha256: "4026701b7764535d808aef26681c20b3d11153d57f752a2eddc66ac855a84756" },
    { capability: "CONTENT_UPLOAD_CONSUMERS", bytes: 33017, sha256: "cf5708849816b66ba19ac925c27349e7c8a82bcb0e87f05747afebe7e6b1278b" },
    { capability: "LAUNCH_TRANSACTIONAL_SAVE", bytes: 29215, sha256: "cde47a566bb16173b2c245c74f3e95c00dabcc3b34e320988bb7d1482301caa4" },
    { capability: "STORAGE_PROVENANCE_CRM_ATTACHMENT", bytes: 34210, sha256: "03c0678a6eac71576711f84e077b072ccb0ef1efde8936eaf2937e0b164ae23a" },
  ],
);
assert.equal(first.envelopes[0].sql.includes(MEDIA_AUTHORITY_INDEX), false);
assert.equal(occurrences(first.envelopes[1].sql, `CREATE UNIQUE INDEX IF NOT EXISTS ${MEDIA_AUTHORITY_INDEX}`), 1);
assert.ok(first.envelopes[1].sql.includes("media authority index unexpectedly present"));
for (const envelope of first.envelopes.slice(1)) {
  assert.ok(envelope.sql.includes("media authority index mismatch"));
  assert.ok(envelope.sql.includes("current_query()"));
  assert.ok(envelope.bytes < 77000);
}

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["test:pca-07-w5r"], `node ./${TEST}`);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07-w5r"));
mustContain(read(".github/workflows/release-gate.yml"), ["pca_07_w5r=false", TEST, "pca_07_w5r=true", "Verify PCA-07 W5R media library composite authority corrective", "PCA_07_W5R_BASE_SHA:", "run: bun run test:pca-07-w5r"], "workflow");
mustContain(read(IMPACT), [`SOURCE_MAIN = ${SOURCE_MAIN}`, "TOTAL_TRANSACTION_ROLLBACK", MEDIA_AUTHORITY_INDEX, "canonical migrations remain byte-identical"], "impact");
mustContain(read(EVIDENCE), [`SOURCE_MAIN=${SOURCE_MAIN}`, "W5_LEDGER_AFTER_FAILED_ENVELOPE=1/8", "FAILED_ENVELOPE_LEDGER_ROWS=0", "SAME_BACKEND_WRITES=0"], "evidence");
mustContain(read(CONTINUITY), ["## 31. PCA-07 W5R", `PCA07_W5R_SOURCE_MAIN=${SOURCE_MAIN}`, "PCA07_W5R_FAILURE_DISPOSITION=TOTAL_TRANSACTION_ROLLBACK", "PCA07_W5R_SAME_BACKEND_WRITES=0"], "continuity");

const base = process.env.PCA_07_W5R_BASE_SHA?.trim();
if (base) {
  assert.equal(base, SOURCE_MAIN);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).sort();
  const allowed = [".github/workflows/release-gate.yml", "package.json", BUILDER, SHARED_BUILDER, TEST, MANIFEST_PATH, IMPACT, EVIDENCE, CONTINUITY].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07 W5R diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
}
console.log("PCA-07 W5R media library composite authority corrective: PASS");
