import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const envelopePath =
  "docs/architecture/impact-analysis/PCA-05R-lovable-private-synthetic-schema-rehearsal-execution-envelope.md";
const evidencePath =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-private-synthetic-rehearsal-envelope.md";
const envelope = read(envelopePath);
const evidence = read(evidencePath);
const manifest = JSON.parse(
  read("docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json"),
);
const pkg = JSON.parse(read("package.json"));
const workflow = read(".github/workflows/release-gate.yml");

assert.equal(manifest.repositoryMigrations.length, 17);
assert.equal(manifest.structuralExpectation.explicitTransactions, 17);
assert.equal(manifest.structuralExpectation.defaultTenantDmlSelection, 0);
assert.equal(manifest.structuralExpectation.irreversiblePortalSecretErasures, 0);
assert.equal(manifest.liveOnlyQuarantined.length, 4);

for (const token of [
  "R1_BACKUP_PITR_RECOVERABILITY",
  "R2-R4_SCHEMA_REHEARSAL",
  "PROJECT_VISIBILITY=private",
  "REAL_TENANT_DATA=0",
  "SECRETS_PRESENT=0",
  "CRON_JOBS=0",
  "HTTP_OR_NET_CALLERS=0",
  "FAIL_CLOSED_INERT_RESIDUAL_CELL",
  "Owner-manual action",
]) {
  assert.match(envelope, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

assert.match(envelope, /DCA-02-BL2[\s\S]*backup\/PITR/i);
assert.match(envelope, /PCA-06[\s\S]*separately authorized/i);
assert.match(envelope, /No current project[\s\S]*may be\s+reused/i);
assert.match(envelope, /four live-only BCA\/BCR[\s\S]*must not be\s+materialized/i);
assert.match(evidence, /DOCUMENTATION_AND_TEST_CONTRACT_ONLY=true/);
assert.match(evidence, /SAME_BACKEND_MUTATION=false/);

assert.equal(
  pkg.scripts["test:pca-05r"],
  "node ./run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
);
assert.match(workflow, /Verify PCA-05R private synthetic rehearsal envelope/);

const base = process.env.PCA_05R_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const allowedDiffs = [
    [
      ".github/workflows/release-gate.yml",
      "docs/architecture/impact-analysis/PCA-05R-lovable-private-synthetic-schema-rehearsal-execution-envelope.md",
      "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-private-synthetic-rehearsal-envelope.md",
      "package.json",
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
    ],
    [
      ".github/workflows/release-gate.yml",
      "docs/architecture/impact-analysis/PCA-05R-github-native-prerequisite-closure-manifest.md",
      "docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json",
      "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-prerequisite-closure-manifest.md",
      "package.json",
      "run-pca-05r-prerequisite-closure-manifest-specs.mjs",
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
    ],
    [
      ".github/workflows/release-gate.yml",
      "docs/architecture/impact-analysis/PCA-05R-github-native-synthetic-substrate-bundle.md",
      "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-synthetic-substrate-bundle.md",
      "package.json",
      "rehearsal/pca-05r/substrate/PCA-05R-postflight.sql",
      "rehearsal/pca-05r/substrate/PCA-05R-preflight.sql",
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
      "run-pca-05r-synthetic-substrate-bundle-specs.mjs",
      "scripts/build-pca-05r-synthetic-substrate-bundle.mjs",
    ],
    [
      "rehearsal/pca-05r/substrate/PCA-05R-postflight.sql",
      "rehearsal/pca-05r/substrate/PCA-05R-preflight.sql",
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
      "run-pca-05r-synthetic-substrate-bundle-specs.mjs",
    ],
    [
      "docs/architecture/impact-analysis/PCA-05R-github-native-synthetic-substrate-bundle.md",
      "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-synthetic-substrate-bundle.md",
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
      "run-pca-05r-synthetic-substrate-bundle-specs.mjs",
      "scripts/build-pca-05r-synthetic-substrate-bundle.mjs",
    ],
    [
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
      "run-pca-05r-synthetic-substrate-bundle-specs.mjs",
      "scripts/build-pca-05r-synthetic-substrate-bundle.mjs",
    ],
    [
      "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-private-synthetic-substrate-execution.md",
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
    ],
    [
      ".github/workflows/release-gate.yml",
      "docs/architecture/impact-analysis/PCA-05R-github-native-structural-wave-bundle.md",
      "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-structural-wave-bundle.md",
      "package.json",
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
      "run-pca-05r-structural-wave-bundle-specs.mjs",
      "scripts/build-pca-05r-structural-wave-bundle.mjs",
    ],
    [
      "docs/architecture/impact-analysis/PCA-05R-github-native-structural-wave-bundle.md",
      "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-structural-wave-bundle.md",
      "run-pca-05r-private-synthetic-rehearsal-envelope-specs.mjs",
      "run-pca-05r-structural-wave-bundle-specs.mjs",
      "scripts/build-pca-05r-structural-wave-bundle.mjs",
    ],
  ];
  assert.equal(
    allowedDiffs.some((allowed) => JSON.stringify(allowed.sort()) === JSON.stringify(changed)),
    true,
    `unexpected PCA-05R diff: ${changed.join(", ")}`,
  );
  assert.equal(changed.filter((path) => path.startsWith("supabase/migrations/")).length, 0);
}

console.log("PCA-05R private synthetic rehearsal execution envelope: PASS");
