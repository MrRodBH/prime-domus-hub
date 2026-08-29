import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  ALL_TABLES,
  buildApplication as buildW5Application,
  GROUPS,
  MEDIA_AUTHORITY_INDEX,
  NEW_FUNCTIONS,
  projectMigrationWithMediaAuthority,
  W5,
} from "./build-pca-07-w5-transport-safe-corrective.mjs";

const ROOT = new URL("../", import.meta.url);

export const GATE =
  "PCA-07_W5R_MEDIA_LIBRARY_COMPOSITE_AUTHORITY_ASSERTION_CORRECTIVE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-07-w5r-media-library-composite-authority-corrective";
export const SOURCE_MAIN = "68a52813f0c482f4b6fad51bb0a6a534a8d11a0e";
export const SOURCE_TREE = "acc28526a0aada765067afb92228b4c477ef3bbf";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07-W5R-media-library-composite-authority-manifest.json";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function buildApplication({ tenantId, ownerAuthorization }) {
  return buildW5Application({ tenantId, ownerAuthorization, mediaAuthorityCorrective: true });
}

function correctedMigrations() {
  return W5.map((entry) => {
    const source = readFileSync(new URL(entry.path, ROOT), "utf8");
    assert.equal(Buffer.byteLength(source), entry.bytes, `${entry.path} byte drift`);
    assert.equal(sha256(source), entry.sha256, `${entry.path} hash drift`);
    const projected = projectMigrationWithMediaAuthority(source, entry);
    return {
      version: entry.version,
      name: entry.name,
      path: entry.path,
      capability: entry.capability,
      canonicalBytes: entry.bytes,
      canonicalSha256: entry.sha256,
      projectedBodyBytes: Buffer.byteLength(projected),
      projectedBodySha256: sha256(projected),
    };
  });
}

export function buildContract() {
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
      envelope: "CMS_MARKETING_HARDENING",
      lovableResult: "INVALID_ARGUMENT",
      databaseDisposition: "TOTAL_TRANSACTION_ROLLBACK",
      ledgerRowsAfterFailure: 0,
      tablesAfterFailure: 0,
      functionsAfterFailure: 0,
      columnsAfterFailure: 0,
      rootCause: "MISSING_MEDIA_LIBRARY_TENANT_ID_ID_UNIQUE_AUTHORITY",
    },
    corrective: {
      executionMode: "SIX_ORDERED_ATOMIC_ENVELOPES",
      projection: "MEDIA_LIBRARY_COMPOSITE_AUTHORITY_ASSERTION",
      targetMigration: "20260730050000",
      index: MEDIA_AUTHORITY_INDEX,
      indexColumns: ["tenant_id", "id"],
      observedDuplicateCount: 0,
      cmsIntermediateDefectContainedAtomically: true,
      ledgerStatementMode: "EXACT_TRANSPORT_QUERY_VIA_CURRENT_QUERY",
      blindReplayAllowed: false,
    },
    groups: GROUPS.map((group) => ({
      capability: group.capability,
      versions: group.indexes.map((index) => W5[index].version),
    })),
    projectedMigrations: correctedMigrations(),
    projections: [
      "MEDIA_LIBRARY_COMPOSITE_AUTHORITY_ASSERTION",
      "TRANSPORT_SAFE_SQL_COMPACTION",
    ],
    liveReadOnlyBaseline: {
      postgresVersion: "17.6",
      tenantCount: 74,
      exactTargetCount: 1,
      w5LedgerRows: 1,
      coreTablesPresent: 10,
      coreFunctionsPresent: 2,
      failedEnvelopeLedgerRows: 0,
      failedEnvelopeTablesPresent: 0,
      failedEnvelopeFunctionsPresent: 0,
      mediaAuthorityIndexPresent: false,
      mediaAuthorityDuplicateCount: 0,
      portalConnectorCount: 444,
      retainedSensitiveFields: 888,
      storageObjectCount: 22,
      storageBytes: 15826788,
    },
    security: {
      tableCount: ALL_TABLES.length,
      newFunctionCount: NEW_FUNCTIONS.length,
      clientRolesDenied: ["PUBLIC", "anon", "authenticated"],
      serviceRoleRequired: true,
      dataApiExposureImplicitlyTrusted: false,
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
