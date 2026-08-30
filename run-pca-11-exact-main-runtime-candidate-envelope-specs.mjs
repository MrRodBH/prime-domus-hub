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
} from "./scripts/build-pca-11-exact-main-runtime-candidate-envelope.mjs";

const IMPACT =
  "docs/architecture/impact-analysis/PCA-11-exact-main-non-production-runtime-candidate-materialization-envelope.md";
const ENVELOPE =
  "docs/architecture/governance/PCA-11-exact-main-non-production-runtime-candidate-materialization-envelope.md";
const EVIDENCE =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-11-exact-main-runtime-candidate-envelope.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-11-exact-main-runtime-candidate-envelope.mjs";
const TEST = "run-pca-11-exact-main-runtime-candidate-envelope-specs.mjs";
const read = (path) => readFileSync(path, "utf8");
const mustContain = (value, needles, label) => {
  for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`);
};

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "PCA-11 manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.pca10ReadOnlyPreflight.result, "ACCEPTED_READ_ONLY");
assert.equal(manifest.pca10ReadOnlyPreflight.directSupabaseCalls, 0);
assert.equal(manifest.pca10ReadOnlyPreflight.compiledRuntime.gzipKiB, 1745.22);
assert.equal(manifest.selectedCandidate.workerName, "rm-prime-pca11-hml");
assert.equal(manifest.selectedCandidate.reuseHistoricalWorker, false);
assert.equal(manifest.selectedCandidate.activeDeploymentAllowed, false);
assert.equal(manifest.materializationEnvelope.ownerMayHandleSupabaseServiceRole, false);
assert.equal(manifest.materializationEnvelope.managedSecretCustodian, "LOVABLE_ONLY");
assert.equal(manifest.compatibilityFindings.exactPreviewHostAuthoritySupported, false);
assert.equal(manifest.compatibilityFindings.dedicatedManagedBindingBridgeSupported, false);
assert.equal(manifest.decision.materializationReady, false);
assert.equal(
  manifest.decision.entryState,
  "BLOCKED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY",
);
assert.equal(manifest.decision.nextGateSelected, NEXT_GATE);
assert.equal(manifest.decision.nextGateAuthorized, false);
assert.equal(manifest.controls.productCodeMutation, false);
assert.equal(manifest.controls.canonicalMigrationMutation, false);
assert.equal(manifest.controls.providerWrites, 0);
assert.equal(manifest.controls.deploy, false);

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["test:pca-11"], `node ./${TEST}`);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-11"));
mustContain(
  read(".github/workflows/release-gate.yml"),
  [
    "pca_11=false",
    TEST,
    "pca_11=true",
    "Verify PCA-11 exact-main runtime candidate materialization envelope",
    "PCA_11_BASE_SHA:",
    "run: bun run test:pca-11",
  ],
  "workflow",
);
mustContain(
  read(IMPACT),
  [
    `SOURCE_MAIN = ${SOURCE_MAIN}`,
    "BLOCKED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY",
    "rm-prime-pca11-hml",
    NEXT_GATE,
  ],
  "impact",
);
mustContain(
  read(ENVELOPE),
  [
    "INACTIVE_VERSIONED_PREVIEW_ONLY",
    "broad `.workers.dev` trust is prohibited",
    "SUPABASE_SERVICE_ROLE_KEY",
    "Lovable must never perform GitHub operations",
  ],
  "envelope",
);
mustContain(
  read(EVIDENCE),
  [
    `SOURCE_MAIN=${SOURCE_MAIN}`,
    "PCA10_RESULT=ACCEPTED_READ_ONLY",
    "BUNDLE_GZIP_KIB=1745.22",
    "DIRECT_SUPABASE_CALLS=0",
  ],
  "evidence",
);
mustContain(
  read(CONTINUITY),
  [
    "## 36. PCA-11 — envelope do candidato runtime exact-main",
    `PCA11_SOURCE_MAIN=${SOURCE_MAIN}`,
    "PCA11_ENTRY_STATE=BLOCKED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY",
    `PCA11_NEXT_GATE_SELECTED=${NEXT_GATE}`,
  ],
  "continuity",
);

for (const path of [IMPACT, ENVELOPE, EVIDENCE, CONTINUITY]) {
  assert.equal(
    read(path).includes("CONTROLLED_HOMOLOGATION_AUTHORIZED=true"),
    false,
    `${path} authorizes homologation`,
  );
  assert.equal(
    read(path).includes("PRODUCTION_AUTHORIZED=true"),
    false,
    `${path} authorizes production`,
  );
  assert.equal(
    read(path).includes("OWNER_MAY_HANDLE_SUPABASE_SERVICE_ROLE_KEY=true"),
    false,
    `${path} transfers secret custody`,
  );
}

const base = process.env.PCA_11_BASE_SHA?.trim();
if (base) {
  assert.equal(base, SOURCE_MAIN);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const allowed = [
    ".github/workflows/release-gate.yml",
    "package.json",
    BUILDER,
    TEST,
    MANIFEST_PATH,
    IMPACT,
    ENVELOPE,
    EVIDENCE,
    CONTINUITY,
  ].sort();
  assert.deepEqual(changed, allowed, "exact PCA-11 diff changed");
  assert.equal(
    changed.some((path) => path.startsWith("src/")),
    false,
  );
  assert.equal(
    changed.some((path) => path.startsWith("supabase/")),
    false,
  );
  assert.equal(
    changed.some((path) => path === "wrangler.jsonc"),
    false,
  );
}

console.log("PCA-11 exact-main runtime candidate materialization envelope: PASS");
