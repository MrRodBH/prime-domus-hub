import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE_MAIN = "64510f51b73557dab3cc8c514d3eafd957308ee2";
const SOURCE_TREE = "45b26fcfa58c2556de08feb5d49dae319e5803e5";
const RPO_CEILING_SECONDS = 900;
const RTO_CEILING_SECONDS = 14400;

const paths = {
  impact:
    "docs/architecture/impact-analysis/DCA-02-BL2-r2-post-homologation-recoverability-rebaseline.md",
  historicalImpact:
    "docs/architecture/impact-analysis/DCA-02-BL2-provider-identity-disaster-recovery-impact-analysis.md",
  historicalEnvelope:
    "docs/architecture/impact-analysis/DCA-02-BL2-isolated-non-production-pitr-restore-execution-envelope.md",
  backlog:
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/backlog/dca-02-provider-identity-non-blocking-backlog.md",
  evidence:
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl2-r2-deferred-recoverability-rebaseline.md",
  terminal:
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl2-terminal-evidence.md",
  runbook:
    "docs/operations/DCA-02-BL2-provider-identity-disaster-recovery-runbook.md",
  workflow: ".github/workflows/release-gate.yml",
  package: "package.json",
  wrangler: "wrangler.jsonc",
};

const read = (path) => readFileSync(path, "utf8");
const mustContain = (value, tokens, label) => {
  for (const token of tokens) {
    assert.ok(value.includes(token), `${label} must contain: ${token}`);
  }
};

const impact = read(paths.impact);
const evidence = read(paths.evidence);
const backlog = read(paths.backlog);
const terminal = read(paths.terminal);
const runbook = read(paths.runbook);
const historicalImpact = read(paths.historicalImpact);
const historicalEnvelope = read(paths.historicalEnvelope);
const workflow = read(paths.workflow);
const packageJson = JSON.parse(read(paths.package));
const wrangler = read(paths.wrangler);

mustContain(impact, [
  "GATE = DCA-02-BL2_R2_POST_HOMOLOGATION_PRE_PRODUCTION_DEFERRED_RECOVERABILITY_REBASELINE_REPOSITORY_IMPLEMENTATION",
  `SOURCE_MAIN = ${SOURCE_MAIN}`,
  `SOURCE_TREE = ${SOURCE_TREE}`,
  "CANONICAL_BACKEND_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY",
  "OWNER_SUPABASE_ACCESS = LOVABLE_ONLY",
  "R2_SUBSCRIPTION_ENABLED = false",
  "R2_LIST_BUCKETS_RESULT = 10042_PLEASE_ENABLE_R2_THROUGH_DASHBOARD",
  "CLOUDFLARE_PAID_OR_ENTERPRISE_UPGRADE_BEFORE_HOMOLOGATION = not_planned",
  "PRM3_OR_FRONTEND_BLOCKED = false",
  "CONTROLLED_TESTING_BLOCKED = false",
  "FORMAL_HOMOLOGATION_BLOCKED = false",
  "PRODUCTION_READINESS_BLOCKED_UNTIL_RECOVERY_PROOF = true",
  "AUTHORIZED_EXECUTION_WINDOW = after_formal_homologation_and_before_production",
  "SELECTED_STRATEGY = encrypted_external_generation_bound_ledger_snapshots",
  "SNAPSHOT_RUNTIME_AUTHORITY = false",
  "RPO_CEILING_SECONDS = 900",
  "RTO_CEILING_SECONDS = 14400",
  "Object Read & Write",
  "Object Read only",
  "native R2 Bucket Lock",
  "PROJECTED_LEDGER_COST_WITHIN_STANDARD_FREE_TIER_USD = 0",
  "EXACT_ACCOUNT_SUBSCRIPTION_COST_CONFIRMED = false",
  "FAIL_CLOSED_R2_BUCKET_NOT_PRIVATE",
  "FAIL_CLOSED_R2_BUCKET_LOCK_UNPROVED",
  "FAIL_CLOSED_R2_TOKEN_OVERPRIVILEGED",
  "FAIL_CLOSED_SNAPSHOT_RPO_EXCEEDED",
  "FAIL_CLOSED_RECOVERY_RTO_EXCEEDED",
], "impact analysis");

mustContain(evidence, [
  "R2_LIST_BUCKETS_RESULT_CODE = 10042",
  "ACCOUNT_SUBSCRIPTIONS_READ_RESULT_CODE = 10000",
  "TOKEN_PERMISSION_GROUPS_READ_RESULT_CODE = 9109",
  "PREFLIGHT_STATUS = TERMINAL_BLOCKED_EXTERNAL_R2_NOT_ENABLED",
  "PROVIDER_BINDING_COUNT = 1",
  "LIVE_ACTIVE_BINDINGS = 0",
  "MANIFEST_ROW_COUNT = 1",
  "MANIFEST_SHA256 = c57e34dcb35e79f90e6fce939111c9a34f834038ff3d8b9807f704c029a3f885",
  "DOCUMENTED_STANDARD_FREE_TIER_GB_MONTH = 10",
  "DOCUMENTED_STANDARD_FREE_TIER_CLASS_A = 1000000",
  "DOCUMENTED_STANDARD_FREE_TIER_CLASS_B = 10000000",
  "R2_SUBSCRIPTION_ACTIVATION = not_authorized",
  "R2_BUCKET_CREATION = not_authorized",
  "R2_TOKEN_CREATION = not_authorized",
], "implementation evidence");

mustContain(backlog, [
  "BACKLOG_CLASS = Non-Blocking",
  "BACKLOG_ITEMS_BLOCK_DCA02_TERMINAL_ACCEPTANCE = false",
  "BACKLOG_ITEMS_BLOCK_PRM3_OR_FRONTEND = false",
  "BACKLOG_ITEMS_BLOCK_CONTROLLED_TESTING = false",
  "BACKLOG_ITEMS_BLOCK_FORMAL_HOMOLOGATION = false",
  "BL2_BLOCKS_PRODUCTION_READINESS_UNTIL_RECOVERY_PROOF = true",
  "BL2_EXECUTION_WINDOW = post_homologation_pre_production",
  "FULL_DATABASE_PITR_AS_DCA02_BL2_STRATEGY = superseded",
  "R2_PROVIDER_IMPLEMENTATION = deferred_until_post_homologation",
  "NEXT_EXECUTION = DCA-02-BL1 diagnostic/dry-run only",
], "backlog scheduling");

mustContain(terminal, [
  `REBASELINE_SOURCE_MAIN = ${SOURCE_MAIN}`,
  `REBASELINE_SOURCE_TREE = ${SOURCE_TREE}`,
  "R2_LIST_BUCKETS_RESULT_CODE = 10042",
  "PRODUCTION_CUTOVER_ALLOWED = false",
  "NEXT_GATE = DCA-02-BL2_R2_DEFERRED_RECOVERABILITY_REBASELINE_FINAL_AUDIT_AND_PROTECTED_MERGE",
], "terminal evidence");

mustContain(`${historicalImpact}\n${historicalEnvelope}\n${runbook}`, [
  "R2 post-homologation recoverability rebaseline",
  "historical general-DR",
  "full-database PITR procedure is retained",
  "R2 remains disabled",
], "supersession notices");

assert.equal(
  packageJson.scripts["test:dca-02-bl2:r2-rebaseline"],
  "node ./run-dca-02-bl2-r2-deferred-recoverability-rebaseline-specs.mjs",
);
assert.ok(
  packageJson.scripts["verify:release"].includes(
    "bun run test:dca-02-bl2:r2-rebaseline",
  ),
  "release verification must include the R2 rebaseline",
);
mustContain(workflow, [
  "dca_02_bl2_r2_rebaseline=false",
  "run-dca-02-bl2-r2-deferred-recoverability-rebaseline-specs.mjs",
  "dca_02_bl2_r2_rebaseline=$dca_02_bl2_r2_rebaseline",
  "Verify DCA-02-BL2 R2 deferred recoverability rebaseline",
  "DCA02_BL2_R2_REBASELINE_BASE_SHA:",
  "run: bun run test:dca-02-bl2:r2-rebaseline",
], "release workflow");

assert.equal(/\"r2_buckets\"\s*:/.test(wrangler), false,
  "repository rebaseline must not materialize an R2 binding");

const classifyReadiness = ({ phase, r2Enabled, bucketPrivate, bucketLocked,
  leastPrivilege, encrypted, snapshotAgeSeconds, recoverySeconds }) => {
  if (["development", "controlled_testing", "formal_homologation"].includes(phase)) {
    return "DEFERRED_NON_BLOCKING";
  }
  if (phase !== "pre_production") return "FAIL_CLOSED_UNKNOWN_PHASE";
  if (!r2Enabled) return "FAIL_CLOSED_R2_SUBSCRIPTION_UNCONFIRMED";
  if (!bucketPrivate) return "FAIL_CLOSED_R2_BUCKET_NOT_PRIVATE";
  if (!bucketLocked) return "FAIL_CLOSED_R2_BUCKET_LOCK_UNPROVED";
  if (!leastPrivilege) return "FAIL_CLOSED_R2_TOKEN_OVERPRIVILEGED";
  if (!encrypted) return "FAIL_CLOSED_SNAPSHOT_ENCRYPTION_UNPROVED";
  if (!Number.isInteger(snapshotAgeSeconds) || snapshotAgeSeconds > RPO_CEILING_SECONDS)
    return "FAIL_CLOSED_SNAPSHOT_RPO_EXCEEDED";
  if (!Number.isInteger(recoverySeconds) || recoverySeconds > RTO_CEILING_SECONDS)
    return "FAIL_CLOSED_RECOVERY_RTO_EXCEEDED";
  return "QUALIFIED_FOR_SEPARATE_PRODUCTION_CUTOVER_GATE";
};

const passing = {
  phase: "pre_production", r2Enabled: true, bucketPrivate: true,
  bucketLocked: true, leastPrivilege: true, encrypted: true,
  snapshotAgeSeconds: 900, recoverySeconds: 14400,
};
assert.equal(classifyReadiness({ ...passing, phase: "formal_homologation",
  r2Enabled: false }), "DEFERRED_NON_BLOCKING");
assert.equal(classifyReadiness({ ...passing, r2Enabled: false }),
  "FAIL_CLOSED_R2_SUBSCRIPTION_UNCONFIRMED");
assert.equal(classifyReadiness({ ...passing, bucketPrivate: false }),
  "FAIL_CLOSED_R2_BUCKET_NOT_PRIVATE");
assert.equal(classifyReadiness({ ...passing, bucketLocked: false }),
  "FAIL_CLOSED_R2_BUCKET_LOCK_UNPROVED");
assert.equal(classifyReadiness({ ...passing, leastPrivilege: false }),
  "FAIL_CLOSED_R2_TOKEN_OVERPRIVILEGED");
assert.equal(classifyReadiness({ ...passing, encrypted: false }),
  "FAIL_CLOSED_SNAPSHOT_ENCRYPTION_UNPROVED");
assert.equal(classifyReadiness({ ...passing, snapshotAgeSeconds: 901 }),
  "FAIL_CLOSED_SNAPSHOT_RPO_EXCEEDED");
assert.equal(classifyReadiness({ ...passing, recoverySeconds: 14401 }),
  "FAIL_CLOSED_RECOVERY_RTO_EXCEEDED");
assert.equal(classifyReadiness(passing),
  "QUALIFIED_FOR_SEPARATE_PRODUCTION_CUTOVER_GATE");

const monthlySnapshots = (30 * 24 * 60 * 60) / RPO_CEILING_SECONDS;
assert.equal(monthlySnapshots, 2880);
assert.ok(monthlySnapshots < 1_000_000,
  "scheduled writes must remain below the documented Class A free tier");

const allowedDiff = [
  ".github/workflows/release-gate.yml",
  paths.impact,
  paths.historicalImpact,
  paths.historicalEnvelope,
  paths.backlog,
  paths.evidence,
  paths.terminal,
  paths.runbook,
  paths.package,
  "run-dca-02-bl2-r2-deferred-recoverability-rebaseline-specs.mjs",
].sort();
const baseSha = process.env.DCA02_BL2_R2_REBASELINE_BASE_SHA;
if (baseSha) {
  assert.match(baseSha, /^[0-9a-f]{40}$/);
  const changed = execFileSync(
    "git", ["diff", "--name-only", `${baseSha}..HEAD`], { encoding: "utf8" },
  ).trim().split("\n").filter(Boolean).sort();
  assert.deepEqual(changed, allowedDiff, "exact R2 rebaseline diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/")), false);
}

console.log(JSON.stringify({
  gate: "DCA-02-BL2_R2_POST_HOMOLOGATION_PRE_PRODUCTION_DEFERRED_RECOVERABILITY_REBASELINE_REPOSITORY_IMPLEMENTATION",
  sourceMain: SOURCE_MAIN,
  sourceTree: SOURCE_TREE,
  r2SubscriptionEnabled: false,
  preHomologationUpgradePlanned: false,
  currentState: "DEFERRED_NON_BLOCKING",
  preProductionState: "BLOCKED_UNTIL_RECOVERY_PROOF",
  providerWrites: 0,
  databaseWrites: 0,
  result: "PASS",
}));
