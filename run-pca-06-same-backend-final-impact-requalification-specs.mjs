import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE_MAIN = "0221bd1f8dd1f0a3d00a52057af9b621a2764edd";
const SOURCE_TREE = "d7112cd8407d3583b7af60745b367709f29a7d4f";

const paths = {
  impact:
    "docs/architecture/impact-analysis/PCA-06-same-backend-schema-rebaseline-final-impact-requalification.md",
  evidence:
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-06-same-backend-schema-rebaseline-final-impact-requalification.md",
  manifest:
    "docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json",
  continuity:
    "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md",
  workflow: ".github/workflows/release-gate.yml",
  package: "package.json",
};

const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha256 = (path) => sha256(readFileSync(path));
const normalizedSha256 = (path) => sha256(read(path).replace(/\s+/g, ""));
const mustContain = (value, tokens, label) => {
  for (const token of tokens) {
    assert.ok(value.includes(token), `${label} must contain: ${token}`);
  }
};

const impact = read(paths.impact);
const evidence = read(paths.evidence);
const continuity = read(paths.continuity);
const workflow = read(paths.workflow);
const packageJson = JSON.parse(read(paths.package));
const manifest = JSON.parse(read(paths.manifest));

assert.equal(manifest.schemaVersion, 2);
assert.equal(manifest.requalification.sourceMain, SOURCE_MAIN);
assert.equal(manifest.requalification.sourceTree, SOURCE_TREE);
assert.equal(manifest.requalification.sameBackendExecutionAuthorized, false);
assert.equal(manifest.requalification.sameBackendMutation, false);
assert.equal(manifest.requalification.repositoryMutationByLovable, false);
assert.equal(manifest.requalification.providerMutation, false);
assert.equal(manifest.requalification.deploy, false);
assert.equal(manifest.requalification.pr105Mutation, false);
assert.equal(manifest.liveSnapshotAuthority.readMode, "SELECT_ONLY");
assert.equal(manifest.liveSnapshotAuthority.refreshStatus, "COMPLETE");

assert.equal(manifest.repositoryMigrations.length, 17);
for (const migration of manifest.repositoryMigrations) {
  assert.equal(
    fileSha256(migration.path),
    migration.sha256,
    `PCA-04 migration hash drift: ${migration.path}`,
  );
  assert.equal(migration.classification, "REPO_ONLY");
}

const historicalSql = manifest.repositoryMigrations
  .filter(({ version }) => version !== "20260826185014")
  .map(({ path }) => read(path));

const expectedTables = new Set();
for (const sql of historicalSql) {
  for (const match of sql.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi,
  )) {
    expectedTables.add(match[1].toLowerCase());
  }
}
const orderedTables = [...expectedTables].sort();
assert.equal(orderedTables.length, 45);
assert.equal(
  sha256(orderedTables.join(",")),
  manifest.livePhysicalBaseline.missingProductTableSetSha256,
);

const expectedColumns = new Set();
for (const sql of historicalSql) {
  for (const statement of sql.matchAll(
    /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s+([\s\S]*?);/gi,
  )) {
    for (const column of statement[2].matchAll(
      /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    )) {
      expectedColumns.add(`${statement[1].toLowerCase()}.${column[1].toLowerCase()}`);
    }
  }
}
const orderedColumns = [...expectedColumns].sort();
assert.equal(orderedColumns.length, 57);
assert.equal(
  sha256(orderedColumns.join(",")),
  manifest.livePhysicalBaseline.missingProductColumnSetSha256,
);

assert.equal(manifest.liveRepositoryParity.length, 8);
assert.equal(
  manifest.liveRepositoryParity.filter(({ classification }) => classification === "EXACT")
    .length,
  4,
);
assert.equal(
  manifest.liveRepositoryParity.filter(({ classification }) =>
    classification.startsWith("SEMANTIC_ALIAS"),
  ).length,
  4,
);
for (const parity of manifest.liveRepositoryParity) {
  assert.equal(fileSha256(parity.repositoryPath), parity.repositorySha256);
  assert.equal(parity.hasIdempotencyKey, true);
  assert.equal(parity.rollbackCount, 0);
  if (parity.classification === "EXACT") {
    assert.equal(parity.liveVersion, parity.repositoryVersion);
    assert.equal(parity.liveStatementSha256, parity.repositorySha256);
  } else if (parity.classification === "SEMANTIC_ALIAS") {
    assert.equal(normalizedSha256(parity.repositoryPath), parity.whitespaceNormalizedSha256);
  } else {
    assert.equal(parity.classification, "SEMANTIC_ALIAS_WITH_EXECUTION_PRELUDE");
    assert.equal(
      normalizedSha256(parity.repositoryPath),
      parity.semanticBodyWhitespaceNormalizedSha256,
    );
    assert.equal(parity.executionPrelude, "SESSION_LOCAL_EXACT_LEGACY_IMPORT_MANIFEST");
  }
}

const expectedLiveOnly = new Map([
  ["20260812192006", "f05b1c8de7f67c53ae4f5870495976d3d404b5e2667d1a0f9e13815912163a10"],
  ["20260813174908", "c6ed87936e467162d87c2a49504a2d7dde961ebfdbcf0142ed9bba0d7c7ace0d"],
  ["20260813175027", "63ab84c161d8d59512cc57c3c0f705188e4b57b3d5af935f1634d285d21d814a"],
  ["20260814001323", "e1026c11dcc57cdc47dee1eeaab7fff46c00b14942cb3911629f95651724e86c"],
]);
assert.equal(manifest.liveOnlyQuarantined.length, expectedLiveOnly.size);
for (const migration of manifest.liveOnlyQuarantined) {
  assert.equal(migration.statementSha256, expectedLiveOnly.get(migration.version));
  assert.equal(migration.classification, "LIVE_ONLY_QUARANTINED");
  assert.equal(migration.authority, "NON_AUTHORITATIVE");
  assert.equal(migration.action, "KEEP_QUARANTINED");
  assert.equal(migration.statementCount, 1);
  assert.equal(migration.hasIdempotencyKey, true);
  assert.equal(migration.rollbackCount, 0);
}

assert.deepEqual(manifest.resolvedLiveClassifications, {
  exact: 4,
  semanticAlias: 4,
  executionPrelude: 1,
  liveOnlyQuarantined: 4,
  repositoryOnlyProductRebaseline: 17,
  entriesAfterAcceptedSecurityCorrective: 0,
  status: "RESOLVED_READ_ONLY",
  reason:
    "PCA-06 refreshed exact live statement hashes and physical-state postconditions through the Lovable-managed canonical backend.",
});

assert.deepEqual(
  {
    tenants: manifest.livePhysicalBaseline.tenantCount,
    residues: manifest.livePhysicalBaseline.protectedResidueTenantCount,
    residueMd5: manifest.livePhysicalBaseline.protectedResidueOrderedIdMd5,
    connectors: manifest.livePhysicalBaseline.portalConnectorCount,
    protectedConnectors:
      manifest.livePhysicalBaseline.protectedResiduePortalConnectorCount,
    sensitiveFields: manifest.livePhysicalBaseline.retainedPortalSensitiveFieldCount,
    subscriptions: manifest.livePhysicalBaseline.tenantSubscriptionCount,
  },
  {
    tenants: 74,
    residues: 73,
    residueMd5: "3ece053ddbdfce5161380ec38824ea91",
    connectors: 444,
    protectedConnectors: 438,
    sensitiveFields: 888,
    subscriptions: 0,
  },
);
assert.equal(manifest.livePhysicalBaseline.missingProductTables, 45);
assert.equal(manifest.livePhysicalBaseline.missingProductColumns, 57);
assert.equal(manifest.livePhysicalBaseline.leadDiscardReasonOrphanRows, 1386);
assert.equal(manifest.livePhysicalBaseline.dealLostReasonOrphanRows, 1386);

assert.deepEqual(
  {
    present: manifest.securityBaseline.commercialRelationsPresent,
    rls: manifest.securityBaseline.commercialRelationsWithRls,
    policies: manifest.securityBaseline.commercialPolicyCount,
    anon: manifest.securityBaseline.anonTableExposures,
    authenticated: manifest.securityBaseline.authenticatedTableExposures,
    serviceCrud: manifest.securityBaseline.serviceRoleTableCrud,
    functions: manifest.securityBaseline.restrictedFunctionsPresent,
    denied:
      manifest.securityBaseline.restrictedFunctionsDeniedToPublicAnonAuthenticated,
    serviceExecute: manifest.securityBaseline.restrictedFunctionsServiceRoleExecute,
    defaultClientGrants: manifest.securityBaseline.futureDefaultClientGrants,
  },
  {
    present: 9,
    rls: 9,
    policies: 0,
    anon: 0,
    authenticated: 0,
    serviceCrud: 9,
    functions: 5,
    denied: 5,
    serviceExecute: 5,
    defaultClientGrants: 0,
  },
);

assert.equal(
  manifest.sameBackendExecutionEnvelope.status,
  "READY_FOR_PROTECTED_REPOSITORY_MERGE_NOT_AUTHORIZED_FOR_DATABASE_EXECUTION",
);
assert.deepEqual(manifest.sameBackendExecutionEnvelope.requiredOrder, [
  "W1",
  "W2",
  "W3",
  "W4",
  "W5",
  "W6",
]);
assert.equal(manifest.sameBackendExecutionEnvelope.exactTenantManifestRequired, true);
assert.equal(manifest.sameBackendExecutionEnvelope.protectedResidueSelectionAllowed, false);
assert.equal(manifest.sameBackendExecutionEnvelope.portalSecretErasureAllowed, false);
assert.equal(manifest.sameBackendExecutionEnvelope.migrationRepairAllowed, false);
assert.equal(manifest.sameBackendExecutionEnvelope.liveOnlyAdoptionAllowed, false);

mustContain(impact, [
  `SOURCE_MAIN = ${SOURCE_MAIN}`,
  `SOURCE_TREE = ${SOURCE_TREE}`,
  "CANONICAL_BACKEND_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY",
  "OWNER_SUPABASE_ACCESS = LOVABLE_ONLY",
  "SAME_BACKEND_READ_MODE = SELECT_ONLY",
  "PCA06_RESULT = ACCEPTED_READ_ONLY_REQUALIFICATION",
  "SAME_BACKEND_EXECUTION_AUTHORIZED = false",
  "EXPECTED_PRODUCT_TABLES = 45",
  "MISSING_PRODUCT_COLUMNS = 57",
  "RESTRICTED_FUNCTIONS_DENIED_TO_PUBLIC_ANON_AUTHENTICATED = 5/5",
  "PCA-07_LOVABLE_MANAGED_SAME_BACKEND_SCHEMA_REBASELINE_CONTROLLED_WAVE_APPLICATION",
  "https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically",
], "impact analysis");

mustContain(evidence, [
  "DATABASE_DML = 0",
  "MIGRATION_LEDGER_WRITES = 0",
  "SECRET_VALUES_READ = 0",
  "DIRECT_SUPABASE_CALLS = 0",
  "MISSING_TABLE_SET_SHA256 = a7ea2c4cb892fb3334706430ea6e649fe2f2434a29b3c604e5c84eaf5e84e1a6",
  "MISSING_COLUMN_SET_SHA256 = c3fcd21f00af783569612197d1d351fcfa0226076e82246866daff561b8a8297",
  "PCA06_RESULT = ACCEPTED_READ_ONLY_REQUALIFICATION",
  "SAME_BACKEND_EXECUTION = not_authorized",
], "evidence");

mustContain(continuity, [
  "## 23. PCA-05R/PCA-06",
  "PCA05R_STATUS=ACCEPTED",
  "PCA06_RESULT=ACCEPTED_READ_ONLY_REQUALIFICATION",
  "CANONICAL_BACKEND_AUTHORITY=LOVABLE_MANAGED_BACKEND_ONLY",
  "DCA-02-BL2/R2 permanece `DEFERRED_NON_BLOCKING`",
], "continuity");

assert.equal(
  packageJson.scripts["test:pca-06"],
  "node ./run-pca-06-same-backend-final-impact-requalification-specs.mjs",
);
assert.ok(
  packageJson.scripts["verify:release"].includes("bun run test:pca-06"),
  "release verification must include PCA-06",
);
mustContain(workflow, [
  "pca_06=false",
  "run-pca-06-same-backend-final-impact-requalification-specs.mjs",
  "pca_06=$pca_06",
  "Verify PCA-06 Same-Backend final impact requalification",
  "PCA_06_BASE_SHA:",
  "run: bun run test:pca-06",
], "release workflow");

const allowedDiff = [
  ".github/workflows/release-gate.yml",
  paths.impact,
  paths.evidence,
  paths.manifest,
  paths.continuity,
  paths.package,
  "run-pca-06-same-backend-final-impact-requalification-specs.mjs",
].sort();
const baseSha = process.env.PCA_06_BASE_SHA;
if (baseSha) {
  assert.match(baseSha, /^[0-9a-f]{40}$/);
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", `${baseSha}..HEAD`],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  assert.deepEqual(changed, allowedDiff, "exact PCA-06 diff changed");
  assert.equal(changed.some((path) => path.startsWith("supabase/migrations/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/")), false);
  assert.equal(changed.some((path) => path.startsWith("rehearsal/")), false);
}

console.log(JSON.stringify({
  gate:
    "PCA-06_SAME_BACKEND_SCHEMA_REBASELINE_FINAL_IMPACT_REQUALIFICATION_REPOSITORY_IMPLEMENTATION",
  sourceMain: SOURCE_MAIN,
  sourceTree: SOURCE_TREE,
  productMigrationsAbsent: 17,
  missingTables: 45,
  missingColumns: 57,
  exactLedgerMatches: 4,
  semanticAliases: 4,
  liveOnlyQuarantined: 4,
  sameBackendWrites: 0,
  result: "PASS",
}));
