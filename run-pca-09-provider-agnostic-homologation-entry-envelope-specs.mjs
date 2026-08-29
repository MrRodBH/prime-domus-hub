import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  BRANCH,
  buildContract,
  GATE,
  MANIFEST_PATH,
  NEXT_GATE,
  SOURCE_MAIN,
  SOURCE_TREE,
} from "./scripts/build-pca-09-provider-agnostic-homologation-entry-envelope.mjs";

const IMPACT = "docs/architecture/impact-analysis/PCA-09-provider-agnostic-product-homologation-entry-exact-main-execution-envelope.md";
const ENVELOPE = "docs/architecture/governance/PCA-09-provider-agnostic-product-homologation-entry-execution-envelope.md";
const EVIDENCE = "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-09-provider-agnostic-homologation-entry-envelope.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-09-provider-agnostic-homologation-entry-envelope.mjs";
const TEST = "run-pca-09-provider-agnostic-homologation-entry-envelope-specs.mjs";
const read = (path) => readFileSync(path, "utf8");
const mustContain = (value, needles, label) => {
  for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`);
};

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "PCA-09 manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.deepEqual(manifest.sameBackendSnapshot.ledgerIntegrity, { w1: 3, w2: 3, w3: 3, w4: 2, w5: 8, w6: 1 });
assert.equal(manifest.sameBackendSnapshot.directSupabaseCalls, 0);
assert.equal(manifest.runtimeRequalification.lovableCandidateMatchesExactMain, false);
assert.equal(manifest.runtimeRequalification.lovableCandidateEligible, false);
assert.equal(manifest.runtimeRequalification.exactMainDeploymentEvidence, false);
assert.equal(manifest.executionEnvelope.minimumSyntheticTenants, 2);
assert.equal(manifest.executionEnvelope.liveExecutionSeparatelyAuthorized, true);
assert.equal(manifest.decision.homologationEntryState, "BLOCKED_EXTERNAL_EXACT_MAIN_RUNTIME_AND_OPERATOR_PACKET");
assert.equal(manifest.decision.controlledHomologationAuthorized, false);
assert.equal(manifest.decision.nextGateSelected, NEXT_GATE);
assert.equal(manifest.decision.nextGateAuthorized, false);
assert.equal(manifest.controls.productCodeMutation, false);
assert.equal(manifest.controls.canonicalMigrationMutation, false);
assert.equal(manifest.controls.deploy, false);

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["test:pca-09"], `node ./${TEST}`);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-09"));
mustContain(read(".github/workflows/release-gate.yml"), ["pca_09=false", TEST, "pca_09=true", "Verify PCA-09 provider-agnostic exact-main homologation entry envelope", "PCA_09_BASE_SHA:", "run: bun run test:pca-09"], "workflow");
mustContain(read(IMPACT), [`SOURCE_MAIN = ${SOURCE_MAIN}`, "BLOCKED_EXTERNAL_EXACT_MAIN_RUNTIME_AND_OPERATOR_PACKET", NEXT_GATE, "HVP-01/HRC-01 remain terminal"], "impact");
mustContain(read(ENVELOPE), ["EXACT_PROTECTED_GITHUB_MAIN_SHA_ONLY", "minimum two synthetic tenants", "Lovable publication is not an eligible candidate", "DCA-02-BL2 R2 remains deferred"], "envelope");
mustContain(read(EVIDENCE), [`SOURCE_MAIN=${SOURCE_MAIN}`, "LEDGER_INTEGRITY=3/3/3/2/8/1", "EXACT_MAIN_RUNTIME_READY=false", "DIRECT_SUPABASE_CALLS=0"], "evidence");
mustContain(read(CONTINUITY), ["## 35. PCA-09 — envelope provider-agnostic de entrada em homologação", `PCA09_SOURCE_MAIN=${SOURCE_MAIN}`, "PCA09_ENTRY_STATE=BLOCKED_EXTERNAL_EXACT_MAIN_RUNTIME_AND_OPERATOR_PACKET", `PCA09_NEXT_GATE_SELECTED=${NEXT_GATE}`], "continuity");

for (const path of [IMPACT, ENVELOPE, EVIDENCE, CONTINUITY]) {
  assert.equal(read(path).includes("CONTROLLED_HOMOLOGATION_AUTHORIZED=true"), false, `${path} authorizes homologation`);
  assert.equal(read(path).includes("PRODUCTION_AUTHORIZED=true"), false, `${path} authorizes production`);
}

const base = process.env.PCA_09_BASE_SHA?.trim();
if (base) {
  assert.equal(base, SOURCE_MAIN);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).sort();
  const allowed = [".github/workflows/release-gate.yml", "package.json", BUILDER, TEST, MANIFEST_PATH, IMPACT, ENVELOPE, EVIDENCE, CONTINUITY].sort();
  assert.deepEqual(changed, allowed, "exact PCA-09 diff changed");
  assert.equal(changed.some((path) => path.startsWith("src/")), false);
  assert.equal(changed.some((path) => path.startsWith("supabase/")), false);
  assert.equal(changed.some((path) => path === "wrangler.jsonc"), false);
}

console.log("PCA-09 provider-agnostic exact-main homologation entry envelope: PASS");
