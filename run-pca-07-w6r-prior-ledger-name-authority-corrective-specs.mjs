import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  buildApplication as buildHistoricalW6Application,
  CANONICAL_W2,
  CANONICAL_W3,
  CANONICAL_W4,
} from "./scripts/build-pca-07-w6-exact-manifest-baseline-transport-safe.mjs";
import {
  BRANCH,
  buildApplication,
  buildContract,
  GATE,
  MANIFEST_PATH,
  OWNER_AUTHORIZATION,
  SOURCE_MAIN,
  SOURCE_TREE,
  TENANT_ID,
} from "./scripts/build-pca-07-w6r-prior-ledger-name-authority-corrective.mjs";

const IMPACT = "docs/architecture/impact-analysis/PCA-07-W6R-prior-ledger-name-authority-corrective.md";
const EVIDENCE = "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07-w6r-prior-ledger-name-authority-corrective.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const SHARED_BUILDER = "scripts/build-pca-07-w6-exact-manifest-baseline-transport-safe.mjs";
const BUILDER = "scripts/build-pca-07-w6r-prior-ledger-name-authority-corrective.mjs";
const TEST = "run-pca-07-w6r-prior-ledger-name-authority-corrective-specs.mjs";
const read = (path) => readFileSync(path, "utf8");
const mustContain = (value, needles, label) => { for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`); };

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "W6R contract manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.failure.databaseDisposition, "TOTAL_TRANSACTION_ROLLBACK");
assert.equal(manifest.failure.rootCause, "NON_CANONICAL_PRIOR_LEDGER_NAME_ASSERTIONS");
assert.deepEqual(manifest.corrective.canonicalAssertions, { w2: CANONICAL_W2, w3: CANONICAL_W3, w4: CANONICAL_W4 });
assert.equal(manifest.corrective.originalW6ArtifactPreserved, true);
assert.equal(manifest.corrective.canonicalMigrationMutation, false);
assert.equal(manifest.corrective.blindReplayAllowed, false);

const historical = buildHistoricalW6Application({ tenantId: TENANT_ID, ownerAuthorization: OWNER_AUTHORIZATION });
assert.deepEqual(
  { bytes: historical.envelope.bytes, sha256: historical.envelope.sha256 },
  { bytes: 27413, sha256: "1232986bcdc08dce2ce637af112c0b0f13e2fc61da136c08553a2053cbcb8f9d" },
  "historical W6 envelope identity changed",
);
const first = buildApplication({ tenantId: TENANT_ID, ownerAuthorization: OWNER_AUTHORIZATION });
const second = buildApplication({ tenantId: TENANT_ID, ownerAuthorization: OWNER_AUTHORIZATION });
assert.deepEqual(first, second, "W6R generation must be deterministic");
assert.deepEqual(
  { bytes: first.envelope.bytes, sha256: first.envelope.sha256 },
  { bytes: 27449, sha256: "58fc41803bee53b66612ee9677fc5a9f14f317f9d0e0ada78ad3297c248c079e" },
);
for (const [, name] of [...CANONICAL_W2, ...CANONICAL_W3, ...CANONICAL_W4]) assert.ok(first.envelope.sql.includes(name));
for (const obsolete of ["pr_m2_portal_connectors", "pr_m2_cms_content_management", "pr_m2_crm_operational_workflows", "pr_m2_marketing_connectors", "pr_m2_tracking_consent_and_event_bindings"]) assert.equal(first.envelope.sql.includes(obsolete), false);
assert.equal(first.envelope.sql.split("BEGIN;").length - 1, 1);
assert.equal(first.envelope.sql.split("COMMIT;").length - 1, 1);
assert.equal(first.envelope.sql.split("INSERT INTO supabase_migrations.schema_migrations").length - 1, 1);
assert.ok(first.envelope.bytes < 77000);
assert.ok(!first.envelope.sql.includes("DELETE FROM supabase_migrations"));
assert.ok(!first.envelope.sql.includes("UPDATE supabase_migrations"));

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["test:pca-07-w6r"], `node ./${TEST}`);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07-w6r"));
mustContain(read(".github/workflows/release-gate.yml"), ["pca_07_w6r=false", TEST, "pca_07_w6r=true", "Verify PCA-07 W6R prior-ledger canonical name authority corrective", "PCA_07_W6R_BASE_SHA:", "run: bun run test:pca-07-w6r"], "workflow");
mustContain(read(IMPACT), [`SOURCE_MAIN = ${SOURCE_MAIN}`, "TOTAL_TRANSACTION_ROLLBACK", "prior-ledger name assertions only", "canonical migration remains byte-identical"], "impact");
mustContain(read(EVIDENCE), [`SOURCE_MAIN=${SOURCE_MAIN}`, "W6_LEDGER_AFTER_FAILED_APPLICATION=0/1", "CORRECTED_ENVELOPE_BYTES=27449", "SAME_BACKEND_WRITES=0"], "evidence");
mustContain(read(CONTINUITY), ["## 33. PCA-07 W6R", `PCA07_W6R_SOURCE_MAIN=${SOURCE_MAIN}`, "PCA07_W6R_FAILURE_DISPOSITION=TOTAL_TRANSACTION_ROLLBACK", "PCA07_W6R_SAME_BACKEND_WRITES=0"], "continuity");

const base = process.env.PCA_07_W6R_BASE_SHA?.trim();
if (base) {
  assert.equal(base, SOURCE_MAIN);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).sort();
  const allowed = [".github/workflows/release-gate.yml", "package.json", SHARED_BUILDER, BUILDER, TEST, MANIFEST_PATH, IMPACT, EVIDENCE, CONTINUITY].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07 W6R diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
}
console.log("PCA-07 W6R prior-ledger canonical name authority corrective: PASS");
