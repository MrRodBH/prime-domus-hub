import {
  buildApplication as buildW6Application,
  CANONICAL_W2,
  CANONICAL_W3,
  CANONICAL_W4,
  FUNCTIONS,
  HISTORICAL_W2,
  HISTORICAL_W3,
  HISTORICAL_W4,
  MIGRATION,
  TRIGGER,
} from "./build-pca-07-w6-exact-manifest-baseline-transport-safe.mjs";

export const GATE =
  "PCA-07_W6R_PRIOR_LEDGER_CANONICAL_NAME_AUTHORITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-07-w6r-ledger-name-authority-corrective";
export const SOURCE_MAIN = "6b5aae433460bcc91672c80d6a2c9b782099b984";
export const SOURCE_TREE = "09251fe82f72404af75ce1f4fec3fe7f53575646";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07-W6R-prior-ledger-name-authority-manifest.json";
export const TENANT_ID = "9664d189-4a12-4caa-8243-dc73383447e6";
export const OWNER_AUTHORIZATION = "PCA-07_W6_CONTROLLED_APPLICATION";

export function buildApplication({ tenantId, ownerAuthorization }) {
  return buildW6Application({
    tenantId,
    ownerAuthorization,
    priorLedgerCanonicalNames: true,
  });
}

export function buildContract() {
  const corrected = buildApplication({
    tenantId: TENANT_ID,
    ownerAuthorization: OWNER_AUTHORIZATION,
  });
  return {
    schemaVersion: 1,
    gate: GATE,
    branch: BRANCH,
    sourceMain: SOURCE_MAIN,
    sourceTree: SOURCE_TREE,
    authority: {
      repository: "PROTECTED_GITHUB_MAIN_ONLY",
      canonicalBackend: "LOVABLE_MANAGED_BACKEND_ONLY",
      ownerSupabaseAccess: "LOVABLE_ONLY",
    },
    failure: {
      envelopeBytes: 27413,
      envelopeSha256: "1232986bcdc08dce2ce637af112c0b0f13e2fc61da136c08553a2053cbcb8f9d",
      lovableResult: "P0001_PCA_07_W6_W2_LEDGER_MISMATCH",
      databaseDisposition: "TOTAL_TRANSACTION_ROLLBACK",
      w6LedgerRowsAfterFailure: 0,
      w6FunctionsAfterFailure: 0,
      w6TriggerAfterFailure: 0,
      rootCause: "NON_CANONICAL_PRIOR_LEDGER_NAME_ASSERTIONS",
    },
    corrective: {
      scope: "PRIOR_LEDGER_NAME_ASSERTIONS_ONLY",
      historicalAssertions: { w2: HISTORICAL_W2, w3: HISTORICAL_W3, w4: HISTORICAL_W4 },
      canonicalAssertions: { w2: CANONICAL_W2, w3: CANONICAL_W3, w4: CANONICAL_W4 },
      correctedEnvelope: {
        capability: corrected.envelope.capability,
        versions: corrected.envelope.versions,
        bytes: corrected.envelope.bytes,
        sha256: corrected.envelope.sha256,
      },
      originalW6ArtifactPreserved: true,
      canonicalMigrationMutation: false,
      blindReplayAllowed: false,
    },
    liveReadOnlyBaseline: {
      w1LedgerRows: 3,
      w2LedgerRows: 3,
      w3LedgerRows: 3,
      w4LedgerRows: 2,
      w5LedgerRows: 8,
      w6LedgerRows: 0,
      w6FunctionsPresent: 0,
      w6TriggerPresent: 0,
      exactTargetCount: 1,
      portalConnectorCount: 444,
      retainedSensitiveFields: 888,
      storageObjectCount: 22,
      storageBytes: 15826788,
    },
    security: {
      functions: FUNCTIONS,
      trigger: TRIGGER,
      targetMigration: MIGRATION.path,
      targetMigrationSha256: MIGRATION.sha256,
      clientRolesDenied: ["PUBLIC", "anon", "authenticated"],
      serviceRoleOrchestratorOnly: true,
    },
    controls: {
      repositoryImplementationOnly: true,
      sameBackendReads: 0,
      sameBackendWrites: 0,
      directSupabaseCalls: 0,
      providerMutation: false,
      deploy: false,
      roadmapUpdate: false,
      pr105Mutation: false,
      canonicalMigrationMutation: false,
    },
  };
}
