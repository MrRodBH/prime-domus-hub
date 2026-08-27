import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE_MAIN = "2762376666044e4a7fa200ea5c7dd1b57c9a8e91";
const SOURCE_TREE = "0ae2179c94b1ead197c15a27939f85d3576f65c4";
const RPO_CEILING_SECONDS = 900;
const RTO_CEILING_SECONDS = 14400;

const paths = {
  impact: "docs/architecture/impact-analysis/DCA-02-BL2-isolated-non-production-pitr-restore-execution-envelope.md",
  evidence: "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl2-isolated-non-production-pitr-restore-envelope.md",
  terminal: "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl2-terminal-evidence.md",
  runbook: "docs/operations/DCA-02-BL2-provider-identity-disaster-recovery-runbook.md",
  package: "package.json",
  workflow: ".github/workflows/release-gate.yml",
};
const read = (path) => readFileSync(path, "utf8");
const mustContain = (value, tokens, label) => {
  for (const token of tokens) assert.ok(value.includes(token), label + " must contain: " + token);
};

const impact = read(paths.impact);
const evidence = read(paths.evidence);
const terminal = read(paths.terminal);
const runbook = read(paths.runbook);
const packageJson = JSON.parse(read(paths.package));
const workflow = read(paths.workflow);

mustContain(impact, [
  "GATE = DCA-02-BL2_ISOLATED_NON_PRODUCTION_PITR_RESTORE_EXECUTION_ENVELOPE",
  "SOURCE_MAIN = " + SOURCE_MAIN,
  "SOURCE_TREE = " + SOURCE_TREE,
  "SOURCE_SAME_BACKEND_PROJECT_REF = stmcnvzuzlyqammyycxj",
  "STATUS = DOCUMENTATION_AND_TEST_CONTRACT_ONLY",
  "LIVE_RESTORE_AUTHORIZED = false",
  "PROJECT_CREATION = false",
  "SUPABASE_PROVIDER_WRITES = 0",
  "DATABASE_WRITES = 0",
  "SAME_BACKEND_MUTATION = false",
  "CLOUDFLARE_PROVIDER_WRITES = 0",
  "DEPLOY = false",
  "PR_105_MUTATION = false",
  "LOVABLE_AGENT_CALLS = false",
  "https://supabase.com/docs/guides/platform/backups",
  "https://supabase.com/docs/guides/platform/clone-project",
  "Dashboard Restore to a New Project",
  "In-place PITR restore is prohibited",
  "Storage object bytes",
  "pre-activation containment",
  "A plan to create the clone and then disable",
  "exact cost and recurrence",
  "RPO_CEILING_SECONDS = 900",
  "RTO_CEILING_SECONDS = 14400",
  "lookup-only by persisted custom_hostname_id",
  "FAIL_CLOSED_RESTORE_TO_NEW_UNAVAILABLE",
  "FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED",
  "FAIL_CLOSED_PHYSICAL_BACKUP_REQUIRED",
  "FAIL_CLOSED_PITR_WINDOW_INVALID",
  "FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED",
  "FAIL_CLOSED_COST_UNCONFIRMED",
  "FAIL_CLOSED_SOURCE_TARGET_IDENTITY_COLLISION",
  "FAIL_CLOSED_RPO_CEILING_EXCEEDED",
  "FAIL_CLOSED_RTO_CEILING_EXCEEDED",
  "FAIL_CLOSED_MANIFEST_DIGEST_MISMATCH",
  "FAIL_CLOSED_STORAGE_OBJECT_SCOPE_UNPROVED",
  "FAIL_CLOSED_SECURITY_BOUNDARY_DRIFT",
  "FAIL_CLOSED_TEARDOWN_INCOMPLETE",
], "impact analysis");
mustContain(evidence, [
  "MODE = repository_execution_envelope_only",
  "LIVE_PITR_RESTORE_EXECUTED = false",
  "PROJECT_CREATION = false",
  "POST_MERGE_NEXT_GATE = DCA-02-BL2_READ_ONLY_PROVIDER_PREFLIGHT_AND_COST_DISCOVERY",
], "evidence");
mustContain(terminal, [
  "ENVELOPE_SOURCE_MAIN = " + SOURCE_MAIN,
  "ENVELOPE_STATUS = candidate_until_exact_head_checks_pass",
  "LIVE_RESTORE_AUTHORIZED = false",
], "terminal evidence");
mustContain(runbook, [
  "Restore to a New Project is the only admissible future mechanism",
  "Creating a target and",
  "then disabling external effects is fail-open and prohibited",
  "Project creation requires another explicit Owner authorization",
], "runbook");

assert.equal(packageJson.scripts["test:dca-02-bl2:envelope"],
  "node ./run-dca-02-bl2-isolated-pitr-restore-envelope-specs.mjs");
assert.ok(packageJson.scripts["verify:release"].includes(
  "bun run test:dca-02-bl2:envelope && bun run test:dca-02-bl2"));

mustContain(workflow, [
  'DCA02_BL2_LIVE_RESTORE_ALLOWED: "false"',
  "dca_02_bl2_envelope=false",
  "run-dca-02-bl2-isolated-pitr-restore-envelope-specs.mjs",
  "dca_02_bl2_envelope=$dca_02_bl2_envelope",
  "Verify DCA-02-BL2 isolated non-production PITR restore execution envelope",
  "DCA02_BL2_ENVELOPE_BASE_SHA:",
  "run: bun run test:dca-02-bl2:envelope",
], "release workflow");

function qualifyPreflight(input) {
  if (!input.restoreToNewAvailable) return "FAIL_CLOSED_RESTORE_TO_NEW_UNAVAILABLE";
  if (!input.backupScopeVerified) return "FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED";
  if (!input.paidPlan || !input.physicalBackups) return "FAIL_CLOSED_PHYSICAL_BACKUP_REQUIRED";
  if (input.pitrRequired && !input.pitrEnabled) return "FAIL_CLOSED_PITR_WINDOW_INVALID";
  if (!Number.isInteger(input.earliestRecoveryUnix) ||
      !Number.isInteger(input.latestRecoveryUnix) ||
      !Number.isInteger(input.selectedRecoveryUnix) ||
      input.selectedRecoveryUnix < input.earliestRecoveryUnix ||
      input.selectedRecoveryUnix > input.latestRecoveryUnix) {
    return "FAIL_CLOSED_PITR_WINDOW_INVALID";
  }
  if (input.observedAtUnix - input.latestRecoveryUnix > RPO_CEILING_SECONDS)
    return "FAIL_CLOSED_RPO_CEILING_EXCEEDED";
  if ((input.externalEffectCount > 0 || input.copiedSecretAuthorityCount > 0) &&
      !input.preActivationContainment)
    return "FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED";
  if (!input.costConfirmed) return "FAIL_CLOSED_COST_UNCONFIRMED";
  if (input.sourceRef === input.targetRef) return "FAIL_CLOSED_SOURCE_TARGET_IDENTITY_COLLISION";
  if (input.sourceRegion !== input.targetRegion) return "FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED";
  return "QUALIFIED_FOR_SEPARATE_OWNER_CREATION_GATE";
}

const passing = {
  restoreToNewAvailable: true, backupScopeVerified: true, paidPlan: true,
  physicalBackups: true, pitrRequired: true, pitrEnabled: true,
  earliestRecoveryUnix: 1000, latestRecoveryUnix: 2000, selectedRecoveryUnix: 1900,
  observedAtUnix: 2100, externalEffectCount: 0, copiedSecretAuthorityCount: 0,
  preActivationContainment: false, costConfirmed: true,
  sourceRef: "source-ref", targetRef: "target-ref",
  sourceRegion: "same-region", targetRegion: "same-region",
};
assert.equal(qualifyPreflight(passing), "QUALIFIED_FOR_SEPARATE_OWNER_CREATION_GATE");
assert.equal(qualifyPreflight({ ...passing, restoreToNewAvailable: false }),
  "FAIL_CLOSED_RESTORE_TO_NEW_UNAVAILABLE");
assert.equal(qualifyPreflight({ ...passing, observedAtUnix: 2901 }),
  "FAIL_CLOSED_RPO_CEILING_EXCEEDED");
assert.equal(qualifyPreflight({ ...passing, externalEffectCount: 1 }),
  "FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED");
assert.equal(qualifyPreflight({ ...passing, copiedSecretAuthorityCount: 1 }),
  "FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED");
assert.equal(qualifyPreflight({ ...passing, costConfirmed: false }),
  "FAIL_CLOSED_COST_UNCONFIRMED");
assert.equal(qualifyPreflight({ ...passing, targetRef: "source-ref" }),
  "FAIL_CLOSED_SOURCE_TARGET_IDENTITY_COLLISION");

const classifyRto = (seconds) =>
  Number.isInteger(seconds) && seconds <= RTO_CEILING_SECONDS
    ? "RTO_QUALIFIED" : "FAIL_CLOSED_RTO_CEILING_EXCEEDED";
assert.equal(classifyRto(14400), "RTO_QUALIFIED");
assert.equal(classifyRto(14401), "FAIL_CLOSED_RTO_CEILING_EXCEEDED");

const allowedDiff = [
  ".github/workflows/release-gate.yml", paths.impact, paths.evidence,
  paths.terminal, paths.runbook, "package.json",
  "run-dca-02-bl2-isolated-pitr-restore-envelope-specs.mjs",
].sort();
const baseSha = process.env.DCA02_BL2_ENVELOPE_BASE_SHA;
if (baseSha) {
  assert.match(baseSha, /^[0-9a-f]{40}$/);
  const changed = execFileSync("git", ["diff", "--name-only", baseSha + "..HEAD"],
    { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
  assert.deepEqual(changed, allowedDiff, "exact diff allowlist changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
}
assert.equal(process.env.DCA02_BL2_LIVE_RESTORE_ALLOWED ?? "false", "false");
console.log(JSON.stringify({
  gate: "DCA-02-BL2_ISOLATED_NON_PRODUCTION_PITR_RESTORE_EXECUTION_ENVELOPE",
  sourceMain: SOURCE_MAIN, sourceTree: SOURCE_TREE,
  rpoCeilingSeconds: RPO_CEILING_SECONDS, rtoCeilingSeconds: RTO_CEILING_SECONDS,
  projectCreation: false, providerWrites: 0, databaseWrites: 0, result: "PASS",
}));
