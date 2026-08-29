import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const GATE =
  "PCA-09_PROVIDER_AGNOSTIC_PRODUCT_HOMOLOGATION_ENTRY_EXACT_MAIN_EXECUTION_ENVELOPE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-09-provider-agnostic-homologation-entry-envelope";
export const SOURCE_MAIN = "6f1fa580863a3f4e3e936912bacfce74e1d4bb01";
export const SOURCE_TREE = "5db1410e26b093bb7a4ac345641f3a03126b3443";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-09-provider-agnostic-homologation-entry-envelope-manifest.json";
export const NEXT_GATE =
  "PCA-10_PROVIDER_AGNOSTIC_EXACT_MAIN_HOMOLOGATION_RUNTIME_READ_ONLY_CAPABILITY_PREFLIGHT";

const lockedSources = {
  hrr: {
    path: "docs/architecture/governance/HRR-01-roadmap-reconciliation.md",
    sha256: "da0014a98c80c7010d07c6eff9bb28c40ddffdbc056e6153686814ae5f019701",
  },
  historicalHvpRunbook: {
    path: "docs/runbooks/hvp-01-homologation-validation-preflight.md",
    sha256: "d574fa3ae71bc3f93aac59d55514e607dad2b3135ce73a68d2d58167a7a06a8c",
  },
  pca07TerminalManifest: {
    path: "docs/architecture/impact-analysis/manifests/PCA-07-terminal-reconciliation-successor-selection-manifest.json",
    sha256: "d4cc575819ca49572f1d40c0800db6fe791bf588f8fe21dac35bd77dd4d88412",
  },
  providerAgnosticFrontend: {
    path: "docs/architecture/impact-analysis/PRM3-P0A-bcr-terminal-disposition-frontend-safe-decoupling-impact-analysis.md",
    sha256: "42350a8f38316beeefd7e46d26466cf6ed03b71e61d5cef6200aaa7d1148f3c3",
  },
  recoverabilityRebaseline: {
    path: "docs/architecture/impact-analysis/PCA-06-same-backend-schema-rebaseline-final-impact-requalification.md",
    sha256: "99d3556b6635907a850e42a71ed71c9b224ea0bf5b1ddbb0cf4c3e52fea78b57",
  },
};

function assertLockedAuthority() {
  for (const [label, source] of Object.entries(lockedSources)) {
    assert.equal(sha256(read(source.path)), source.sha256, `${label} authority drift`);
  }
  assert.match(read(lockedSources.hrr.path), /NEXT_STAGE_AUTHORIZED = none/);
  assert.match(read(lockedSources.hrr.path), /CONTROLLED_HOMOLOGATION_AUTHORIZED = false/);
  assert.match(read(lockedSources.historicalHvpRunbook.path), /DO NOT EXECUTE/);
  assert.match(read(lockedSources.providerAgnosticFrontend.path), /BCR_RUNTIME_DEFERRED_UPSTREAM/);
  assert.match(read(lockedSources.recoverabilityRebaseline.path), /formal homologation may continue independently/);

  const pca07 = JSON.parse(read(lockedSources.pca07TerminalManifest.path));
  assert.equal(pca07.terminalDecision.pca07State, "ACCEPTED_TERMINAL");
  assert.equal(
    pca07.terminalDecision.nextGateSelected,
    "PCA-08_PROVIDER_AGNOSTIC_PRODUCT_HOMOLOGATION_ENTRY_READ_ONLY_IMPACT_REQUALIFICATION",
  );
  assert.deepEqual(pca07.ledgerIntegrity, { w1: 3, w2: 3, w3: 3, w4: 2, w5: 8, w6: 1 });
}

export function buildContract() {
  assertLockedAuthority();
  return {
    schemaVersion: 1,
    gate: GATE,
    branch: BRANCH,
    sourceMain: SOURCE_MAIN,
    sourceTree: SOURCE_TREE,
    observedAtUtc: "2026-08-29T20:21:34Z",
    authority: {
      repository: "PROTECTED_GITHUB_MAIN_ONLY",
      canonicalBackend: "LOVABLE_MANAGED_BACKEND_ONLY",
      ownerSupabaseAccess: "LOVABLE_ONLY",
      projectId: "982b91d8-946d-4103-8eb3-40ddbaeedbf4",
      historicalStagesReopened: false,
      lockedSources,
    },
    exactMainEvidence: {
      pullRequest: 176,
      pullRequestHead: "a40a86e59a6223300494e5757c22ff42a3722fe1",
      mergeSha: SOURCE_MAIN,
      mergeTree: SOURCE_TREE,
      mergeSignatureVerified: true,
      requiredChecksPassed: 2,
      requiredChecksExpected: 2,
      rulesetId: 20308240,
      rulesetBypassActors: 0,
      postMergeReleaseRunId: 33272399627,
      postMergeReleaseJobId: 99153144208,
      postMergeReleaseConclusion: "success",
    },
    sameBackendSnapshot: {
      transport: "LOVABLE_QUERY_DATABASE_SELECT_ONLY",
      databaseEnabled: true,
      stack: "supabase",
      ledgerIntegrity: { w1: 3, w2: 3, w3: 3, w4: 2, w5: 8, w6: 1 },
      w5TablesPresent: 15,
      w5TablesRls: 15,
      w5FunctionsPresent: 17,
      w6FunctionsPresent: 3,
      w6TriggerPresent: 1,
      clientTableExposures: 0,
      clientFunctionExposures: 0,
      serviceTablesFull: 15,
      serviceFunctionsReady: 17,
      exactTenantId: "9664d189-4a12-4caa-8243-dc73383447e6",
      exactTenantRows: 1,
      exactTenantMembers: 4,
      exactTenantBusinessRows: { leads: 0, properties: 0, formSubmissions: 0, subscriptions: 0 },
      productBaseline: "1/7-4/4/4-3/3/36/1",
      protectedBaseline: {
        tenants: 74,
        portalConnectors: 444,
        retainedSensitiveFields: 888,
        storageObjects: 22,
        storageBytes: 15826788,
      },
      authUsersObserved: 4,
      authSessionsObserved: 13,
      dataApiClientExposureRequired: false,
      protectedSchemaMutationRequired: false,
      directSupabaseCalls: 0,
      writes: 0,
    },
    runtimeRequalification: {
      githubWorkflowFiles: 4,
      githubDeployWorkflows: 0,
      exactMainDeploymentEvidence: false,
      lovableProjectPublished: true,
      lovablePublishVisibility: "public",
      lovableLatestCommit: "9d64c7ac6c1259652a70022db08583139cb368af",
      lovableCandidateMatchesExactMain: false,
      lovableCandidateEligible: false,
      lovableSourceDisposition: "HISTORICAL_NON_AUTHORITATIVE_PR_105_HEAD",
      pr105: {
        state: "closed",
        draft: true,
        merged: false,
        head: "9d64c7ac6c1259652a70022db08583139cb368af",
      },
      currentReleaseCandidateRuntime: "ABSENT",
    },
    executionEnvelope: {
      candidateSource: "EXACT_PROTECTED_GITHUB_MAIN_SHA_ONLY",
      candidateRuntimeRequired: true,
      providerAgnostic: true,
      lovableHistoricalPublicationProhibited: true,
      minimumSyntheticTenants: 2,
      distinctSyntheticAuthUsersRequired: true,
      preexistingObjectAdoptionProhibited: true,
      manifestBoundFixturesRequired: true,
      protectedRegistryDigestRequired: true,
      controlledWriteWindowRequired: true,
      deterministicTeardownRequired: true,
      zeroNewResidueRequired: true,
      realCustomerDataProhibited: true,
      ownerOperatorPacketRequired: true,
      liveExecutionSeparatelyAuthorized: true,
    },
    decision: {
      pca08Result: "ACCEPTED_READ_ONLY",
      pca09State: "REPOSITORY_ENVELOPE_IMPLEMENTED_NOT_EXECUTED",
      homologationEntryState: "BLOCKED_EXTERNAL_EXACT_MAIN_RUNTIME_AND_OPERATOR_PACKET",
      repositoryReady: true,
      sameBackendSchemaReady: true,
      exactMainRuntimeReady: false,
      operatorPacketReady: false,
      controlledHomologationAuthorized: false,
      productionAuthorized: false,
      nextGateSelected: NEXT_GATE,
      nextGateAuthorized: false,
      dca02Bl2R2Disposition: "DEFERRED_NON_BLOCKING_FOR_HOMOLOGATION_MANDATORY_PRE_PRODUCTION",
    },
    controls: {
      repositoryImplementationOnly: true,
      productCodeMutation: false,
      canonicalMigrationMutation: false,
      sameBackendReads: 0,
      sameBackendWrites: 0,
      lovableAgentCalls: 0,
      directSupabaseCalls: 0,
      providerReads: 0,
      providerWrites: 0,
      deploy: false,
      production: false,
      pr105Mutation: false,
      existingRoadmapAuthorityMutation: false,
    },
  };
}
