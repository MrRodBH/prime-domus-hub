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
} from "./scripts/build-pca-07-terminal-reconciliation-successor-selection.mjs";

const IMPACT = "docs/architecture/impact-analysis/PCA-07-terminal-post-application-reconciliation-and-successor-selection.md";
const EVIDENCE = "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07-terminal-post-application-reconciliation.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-07-terminal-reconciliation-successor-selection.mjs";
const TEST = "run-pca-07-terminal-reconciliation-successor-selection-specs.mjs";
const read = (path) => readFileSync(path, "utf8");
const mustContain = (value, needles, label) => { for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`); };

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "PCA-07 terminal manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.deepEqual(manifest.ledgerIntegrity, { w1: 3, w2: 3, w3: 3, w4: 2, w5: 8, w6: 1 });
assert.equal(manifest.application.transactionCommitted, true);
assert.equal(manifest.application.directSupabaseCalls, 0);
assert.equal(manifest.schemaPostconditions.w5TablesRls, 15);
assert.equal(manifest.schemaPostconditions.clientTableExposures, 0);
assert.equal(manifest.schemaPostconditions.clientFunctionExposures, 0);
assert.equal(manifest.terminalDecision.pca07State, "ACCEPTED_TERMINAL");
assert.equal(manifest.terminalDecision.nextGateSelected, NEXT_GATE);
assert.equal(manifest.terminalDecision.nextGateAuthorized, false);
assert.equal(manifest.terminalDecision.controlledHomologationAuthorized, false);
assert.equal(manifest.terminalDecision.productionAuthorized, false);
assert.equal(manifest.controls.canonicalMigrationMutation, false);
assert.equal(manifest.controls.productCodeMutation, false);

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["test:pca-07:terminal"], `node ./${TEST}`);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07:terminal"));
mustContain(read(".github/workflows/release-gate.yml"), ["pca_07_terminal=false", TEST, "pca_07_terminal=true", "Verify PCA-07 terminal reconciliation and successor selection", "PCA_07_TERMINAL_BASE_SHA:", "run: bun run test:pca-07:terminal"], "workflow");
mustContain(read(IMPACT), [`SOURCE_MAIN = ${SOURCE_MAIN}`, "ACCEPTED_TERMINAL", NEXT_GATE, "Controlled Homologation remains unauthorized"], "impact");
mustContain(read(EVIDENCE), [`SOURCE_MAIN=${SOURCE_MAIN}`, "PCA07_STATE=ACCEPTED_TERMINAL", "LEDGER_INTEGRITY=3/3/3/2/8/1", "DIRECT_SUPABASE_CALLS=0"], "evidence");
mustContain(read(CONTINUITY), ["## 34. PCA-07 — fechamento terminal", `PCA07_TERMINAL_SOURCE_MAIN=${SOURCE_MAIN}`, "PCA07_TERMINAL_LEDGER=3/3/3/2/8/1", `PCA07_NEXT_GATE_SELECTED=${NEXT_GATE}`], "continuity");

const base = process.env.PCA_07_TERMINAL_BASE_SHA?.trim();
if (base) {
  assert.equal(base, SOURCE_MAIN);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).sort();
  const allowed = [".github/workflows/release-gate.yml", "package.json", BUILDER, TEST, MANIFEST_PATH, IMPACT, EVIDENCE, CONTINUITY].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07 terminal diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/")), false);
}
console.log("PCA-07 terminal reconciliation and successor selection: PASS");
