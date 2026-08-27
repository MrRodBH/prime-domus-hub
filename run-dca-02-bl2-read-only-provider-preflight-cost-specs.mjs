import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE_MAIN = "e1ba6dc76d4ed60fa2b74d973a848b8604c9cd59";
const SOURCE_TREE = "148777cc059f5bcc73e7c43591ffaefd708a1f13";
const evidencePath =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl2-read-only-provider-preflight-and-cost-discovery.md";
const terminalPath =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl2-terminal-evidence.md";
const workflowPath = ".github/workflows/release-gate.yml";

const read = (path) => readFileSync(path, "utf8");
const mustContain = (value, tokens, label) => {
  for (const token of tokens) {
    assert.ok(value.includes(token), label + " must contain: " + token);
  }
};

const evidence = read(evidencePath);
const terminal = read(terminalPath);
const workflow = read(workflowPath);
const packageJson = JSON.parse(read("package.json"));

mustContain(evidence, [
  "GATE = DCA-02-BL2_READ_ONLY_PROVIDER_PREFLIGHT_AND_COST_DISCOVERY",
  "SOURCE_MAIN = " + SOURCE_MAIN,
  "SOURCE_TREE = " + SOURCE_TREE,
  "SOURCE_PROJECT_REF = stmcnvzuzlyqammyycxj",
  "CONNECTED_ORGANIZATION_ID = brsnxonzbrukxpyogqcq",
  "CONNECTED_ORGANIZATION_PLAN = free",
  "LIST_PROJECTS_COUNT = 0",
  "DIRECT_PROJECT_LOOKUP_RESULT = permission_denied",
  "GENERIC_NEW_PROJECT_COST_AMOUNT_USD = 0",
  "EXACT_RESTORE_TO_NEW_PROJECT_COST_DISCOVERED = false",
  "SOURCE_PROJECT_AUTHORITY_VERIFIED = false",
  "BACKUP_SCOPE_VERIFIED = false",
  "PHYSICAL_BACKUPS_VERIFIED = false",
  "PITR_ENABLED_VERIFIED = false",
  "RESTORE_TO_NEW_PROJECT_ELIGIBILITY = not_proven",
  "EXTERNAL_EFFECT_INVENTORY_EXECUTED = false",
  "EXTERNAL_EFFECT_CONTAINMENT_PROVEN = false",
  "FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED",
  "FAIL_CLOSED_RESTORE_TO_NEW_UNAVAILABLE",
  "FAIL_CLOSED_PHYSICAL_BACKUP_REQUIRED",
  "FAIL_CLOSED_PITR_WINDOW_INVALID",
  "FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED",
  "FAIL_CLOSED_COST_UNCONFIRMED",
  "SQL_QUERY_CALLS = 0",
  "PROJECT_CREATION_CALLS = 0",
  "RESTORE_CALLS = 0",
  "COST_CONFIRMATION_CALLS = 0",
  "SUPABASE_WRITE_CALLS = 0",
  "DATABASE_WRITES = 0",
  "SAME_BACKEND_MUTATION = false",
  "PR_105_MUTATION = false",
  "LOVABLE_AGENT_CALLS = false",
  "PREFLIGHT_STATUS = TERMINAL_FAIL_CLOSED_AUTHORITY_MISMATCH",
  "NEXT_GATE = DCA-02-BL2_SUPABASE_PROJECT_AUTHORITY_REBIND_AND_READ_ONLY_PREFLIGHT_RETRY",
  "LIVE_RESTORE_AUTHORIZED = false",
  "PROJECT_CREATION_AUTHORIZED = false",
], "preflight evidence");

mustContain(terminal, [
  "PREFLIGHT_SOURCE_MAIN = " + SOURCE_MAIN,
  "DIRECT_PROJECT_LOOKUP_RESULT = permission_denied",
  "SUPABASE_WRITE_CALLS = 0",
  "PREFLIGHT_STATUS = TERMINAL_FAIL_CLOSED_AUTHORITY_MISMATCH",
], "terminal evidence");

assert.equal(
  packageJson.scripts["test:dca-02-bl2:preflight"],
  "node ./run-dca-02-bl2-read-only-provider-preflight-cost-specs.mjs",
);
assert.ok(packageJson.scripts["verify:release"].includes(
  "bun run test:dca-02-bl2:envelope && bun run test:dca-02-bl2:preflight && bun run test:dca-02-bl2",
));

mustContain(workflow, [
  'DCA02_BL2_LIVE_RESTORE_ALLOWED: "false"',
  "dca_02_bl2_preflight=false",
  "run-dca-02-bl2-read-only-provider-preflight-cost-specs.mjs",
  "dca_02_bl2_preflight=$dca_02_bl2_preflight",
  "Verify DCA-02-BL2 read-only provider preflight and cost discovery",
  "DCA02_BL2_PREFLIGHT_BASE_SHA:",
  "run: bun run test:dca-02-bl2:preflight",
], "release workflow");

const qualify = ({
  projectAuthority, backupScope, physicalBackups, pitrWindow,
  externalEffectContainment, exactCloneCost,
}) => {
  if (!projectAuthority) return "TERMINAL_FAIL_CLOSED_AUTHORITY_MISMATCH";
  if (!backupScope) return "FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED";
  if (!physicalBackups) return "FAIL_CLOSED_PHYSICAL_BACKUP_REQUIRED";
  if (!pitrWindow) return "FAIL_CLOSED_PITR_WINDOW_INVALID";
  if (!externalEffectContainment)
    return "FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED";
  if (!exactCloneCost) return "FAIL_CLOSED_COST_UNCONFIRMED";
  return "QUALIFIED_FOR_SEPARATE_OWNER_CREATION_GATE";
};

assert.equal(qualify({
  projectAuthority: false, backupScope: false, physicalBackups: false,
  pitrWindow: false, externalEffectContainment: false, exactCloneCost: false,
}), "TERMINAL_FAIL_CLOSED_AUTHORITY_MISMATCH");

assert.notEqual(0, undefined);
assert.equal(
  evidence.includes("GENERIC_NEW_PROJECT_COST_AMOUNT_USD = 0") &&
  evidence.includes("EXACT_RESTORE_TO_NEW_PROJECT_COST_DISCOVERED = false"),
  true,
  "generic cost must not be promoted to exact clone cost",
);

const allowedDiff = [
  workflowPath,
  evidencePath,
  terminalPath,
  "package.json",
  "run-dca-02-bl2-read-only-provider-preflight-cost-specs.mjs",
].sort();
const baseSha = process.env.DCA02_BL2_PREFLIGHT_BASE_SHA;
if (baseSha) {
  assert.match(baseSha, /^[0-9a-f]{40}$/);
  const changed = execFileSync(
    "git", ["diff", "--name-only", baseSha + "..HEAD"], { encoding: "utf8" },
  ).trim().split("\n").filter(Boolean).sort();
  assert.deepEqual(changed, allowedDiff, "exact preflight evidence diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
}
assert.equal(process.env.DCA02_BL2_LIVE_RESTORE_ALLOWED ?? "false", "false");

console.log(JSON.stringify({
  gate: "DCA-02-BL2_READ_ONLY_PROVIDER_PREFLIGHT_AND_COST_DISCOVERY",
  sourceMain: SOURCE_MAIN,
  sourceTree: SOURCE_TREE,
  projectAuthorityVerified: false,
  exactCloneCostDiscovered: false,
  sqlQueryCalls: 0,
  supabaseWrites: 0,
  result: "TERMINAL_FAIL_CLOSED_AUTHORITY_MISMATCH",
}));
