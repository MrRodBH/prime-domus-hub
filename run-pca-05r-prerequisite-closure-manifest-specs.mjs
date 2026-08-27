import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const SOURCE_MAIN = "930233f12eb7750fe5dd644033df83ae340f72a7";
const SOURCE_TREE = "98dc5b9c3fb7fbc8eab49226082e8eef45257e22";
const MIGRATION_DIR = "supabase/migrations";
const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json";
const IMPACT_PATH =
  "docs/architecture/impact-analysis/PCA-05R-github-native-prerequisite-closure-manifest.md";
const EVIDENCE_PATH =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-05r-prerequisite-closure-manifest.md";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stripComments = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
const migrationFiles = () =>
  readdirSync(MIGRATION_DIR).filter((file) => file.endsWith(".sql")).sort();

const excludedAfterPrelude = {
  "20260804180000_dca_01_domain_cloudflare_activation.sql": "DCA_PROVIDER_DOMAIN_OUTSIDE_SCHEMA_REHEARSAL",
  "20260810220152_1ee179b2-60f0-4ce1-b259-06762002733b.sql": "POST_PRELUDE_NON_PCA04",
  "20260810220939_b80a4010-1d42-48a9-bbcd-7d2d9e0ea84b.sql": "POST_PRELUDE_NON_PCA04",
  "20260811234800_dca_01_provider_registration_corrective.sql": "DCA_PROVIDER_DOMAIN_OUTSIDE_SCHEMA_REHEARSAL",
  "20260812133000_dca_02_provider_object_identity_binding.sql": "DCA_PROVIDER_DOMAIN_OUTSIDE_SCHEMA_REHEARSAL",
  "20260812143000_dca_02_provider_binding_privilege_hardening.sql": "DCA_PROVIDER_DOMAIN_OUTSIDE_SCHEMA_REHEARSAL",
  "20260825213000_pr_m3_sec_02_public_surface_security_hardening.sql": "POST_REHEARSAL_SECURITY_GATE",
  "20260826002000_pr_m3_sec_04a_consolidated_security_corrective.sql": "POST_REHEARSAL_SECURITY_GATE",
};

function buildManifest() {
  const pca04 = JSON.parse(
    readFileSync(
      "docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json",
      "utf8",
    ),
  );
  const targetNames = new Set(
    pca04.repositoryMigrations.map(({ path }) => path.split("/").at(-1)),
  );
  const files = migrationFiles();
  const prerequisiteFiles = files.filter(
    (file) => file.slice(0, 14) < "20260728165000",
  );
  const seenHashes = new Map();
  const prerequisites = prerequisiteFiles.map((file, order) => {
    const sql = readFileSync(`${MIGRATION_DIR}/${file}`, "utf8");
    const executableSql = stripComments(sql);
    const hash = sha256(sql);
    const duplicateOf = seenHashes.get(hash) ?? null;
    seenHashes.set(hash, seenHashes.get(hash) ?? file);
    const hazards = [];
    if (/insert\s+into\s+(?:public\.)?tenants\b/i.test(executableSql)) {
      hazards.push("REAL_TENANT_SEED");
    }
    if (/delete\s+from\s+auth\.users\b/i.test(executableSql)) {
      hazards.push("REAL_AUTH_IDENTITY_DELETE");
    }
    if (/update\s+storage\.objects\b/i.test(executableSql)) {
      hazards.push("BROAD_STORAGE_OBJECT_REWRITE");
    }
    if (/(?:net\.http_|http_(?:get|post|put|delete)|cron\.schedule)\s*\(/i.test(executableSql)) {
      hazards.push("EXTERNAL_EFFECT_CALLER");
    }
    if (duplicateOf) hazards.push("DUPLICATE_BYTES");
    const explicitTransaction =
      /^\s*begin\s*;/im.test(executableSql) && /^\s*commit\s*;/im.test(executableSql);
    return {
      order: order + 1,
      version: file.slice(0, 14),
      path: `${MIGRATION_DIR}/${file}`,
      sha256: hash,
      bytes: Buffer.byteLength(sql),
      explicitTransaction,
      containsDml: /\b(?:insert|update|delete)\s+(?:into\s+|from\s+)?/i.test(executableSql),
      duplicateOf,
      hazards,
      disposition: hazards.some((hazard) =>
        ["REAL_TENANT_SEED", "REAL_AUTH_IDENTITY_DELETE", "BROAD_STORAGE_OBJECT_REWRITE", "EXTERNAL_EFFECT_CALLER"].includes(hazard),
      )
        ? "EXCLUDE_FROM_WHOLE_FILE_REPLAY"
        : "REQUIRES_DEPENDENCY_PROVED_STRUCTURAL_PROJECTION",
    };
  });
  const rehearsal = pca04.repositoryMigrations.map((entry, order) => ({
    order: order + 1,
    version: entry.version,
    path: entry.path,
    sha256: entry.sha256,
    wave: entry.wave,
    disposition: "APPROVED_AFTER_PREREQUISITE_CLOSURE",
  }));
  const excluded = Object.entries(excludedAfterPrelude).map(([file, reason]) => {
    const sql = readFileSync(`${MIGRATION_DIR}/${file}`, "utf8");
    return {
      path: `${MIGRATION_DIR}/${file}`,
      sha256: sha256(sql),
      reason,
      disposition: "EXCLUDED_FROM_PCA05R_CELL",
    };
  });
  const classifiedNames = new Set([
    ...prerequisiteFiles,
    ...targetNames,
    ...Object.keys(excludedAfterPrelude),
  ]);
  assert.deepEqual([...classifiedNames].sort(), files);
  return {
    schemaVersion: 1,
    gate: "PCA-05R_GITHUB_NATIVE_PREREQUISITE_CLOSURE_MANIFEST_IMPLEMENTATION",
    sourceMain: SOURCE_MAIN,
    sourceTree: SOURCE_TREE,
    status: "FAIL_CLOSED_SYNTHETIC_SUBSTRATE_BUNDLE_REQUIRED",
    authority: "PROTECTED_GITHUB_MAIN_ONLY",
    counts: {
      repositoryMigrationFiles: files.length,
      prerequisiteCandidates: prerequisites.length,
      approvedRehearsalMigrations: rehearsal.length,
      excludedAfterPrelude: excluded.length,
      wholeFileReplayBlockers: prerequisites.filter(
        (entry) => entry.disposition === "EXCLUDE_FROM_WHOLE_FILE_REPLAY",
      ).length,
      prerequisiteFilesWithoutExplicitTransactions: prerequisites.filter(
        (entry) => !entry.explicitTransaction,
      ).length,
    },
    decision: {
      wholeRepositoryReplayAllowed: false,
      wholePrerequisiteReplayAllowed: false,
      timestampAliasAsEquivalenceAllowed: false,
      sameBackendAsRecipeAllowed: false,
      statementProjectionExecutionAuthorized: false,
      syntheticSubstrateBundleRequired: true,
      migrationFilesMutated: false,
    },
    hardStops: [
      "REAL_TENANT_SEED",
      "REAL_AUTH_IDENTITY_DELETE",
      "BROAD_STORAGE_OBJECT_REWRITE",
      "EXTERNAL_EFFECT_CALLER",
      "UNPROVED_STATEMENT_DEPENDENCY",
      "HASH_MISMATCH",
    ],
    prerequisites,
    rehearsal,
    excluded,
  };
}

const expected = buildManifest();
if (process.argv.includes("--write")) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(expected, null, 2)}\n`);
}
const actual = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
assert.deepEqual(actual, expected);
assert.equal(actual.counts.repositoryMigrationFiles, 130);
assert.equal(actual.counts.prerequisiteCandidates, 105);
assert.equal(actual.counts.approvedRehearsalMigrations, 17);
assert.equal(actual.counts.excludedAfterPrelude, 8);
assert.equal(actual.counts.wholeFileReplayBlockers, 3);
assert.equal(actual.counts.prerequisiteFilesWithoutExplicitTransactions, 104);
assert.equal(actual.decision.wholePrerequisiteReplayAllowed, false);
assert.equal(actual.decision.syntheticSubstrateBundleRequired, true);
assert.equal(actual.prerequisites.filter((entry) => entry.hazards.includes("EXTERNAL_EFFECT_CALLER")).length, 0);
assert.equal(actual.prerequisites.filter((entry) => entry.hazards.includes("REAL_TENANT_SEED")).length, 1);
assert.equal(actual.prerequisites.filter((entry) => entry.hazards.includes("REAL_AUTH_IDENTITY_DELETE")).length, 1);
assert.equal(actual.prerequisites.filter((entry) => entry.hazards.includes("BROAD_STORAGE_OBJECT_REWRITE")).length, 1);
assert.equal(actual.prerequisites.filter((entry) => entry.hazards.includes("DUPLICATE_BYTES")).length, 1);
for (const entry of actual.rehearsal) {
  assert.equal(
    sha256(readFileSync(entry.path, "utf8")),
    entry.sha256,
    `PCA-04 hash mismatch: ${entry.path}`,
  );
}

const impact = readFileSync(IMPACT_PATH, "utf8");
const evidence = readFileSync(EVIDENCE_PATH, "utf8");
for (const token of [
  "FAIL_CLOSED_SYNTHETIC_SUBSTRATE_BUNDLE_REQUIRED",
  "WHOLE_PREREQUISITE_REPLAY_ALLOWED=false",
  "SAME_BACKEND_AS_RECIPE_ALLOWED=false",
  "MIGRATION_FILE_MUTATION=false",
]) {
  assert.match(impact, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(evidence, /PREREQUISITE_CANDIDATES=105/);
assert.match(evidence, /WHOLE_FILE_REPLAY_BLOCKERS=3/);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(
  pkg.scripts["test:pca-05r:closure"],
  "node ./run-pca-05r-prerequisite-closure-manifest-specs.mjs",
);
assert.match(
  readFileSync(".github/workflows/release-gate.yml", "utf8"),
  /Verify PCA-05R prerequisite closure manifest/,
);

const base = process.env.PCA_05R_CLOSURE_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  }).trim().split(/\r?\n/).filter(Boolean).sort();
  assert.equal(changed.filter((path) => path.startsWith(`${MIGRATION_DIR}/`)).length, 0);
}

console.log("PCA-05R prerequisite closure manifest: PASS");
