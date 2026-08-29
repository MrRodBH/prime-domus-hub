import assert from "node:assert/strict";
import { buildContract as buildW6rContract } from "./build-pca-07-w6r-prior-ledger-name-authority-corrective.mjs";

export const GATE =
  "PCA-07_TERMINAL_POST_APPLICATION_RECONCILIATION_AND_PROVIDER_AGNOSTIC_HOMOLOGATION_SUCCESSOR_SELECTION_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-07-terminal-reconciliation-successor-selection";
export const SOURCE_MAIN = "6567ffcd68b6cea12d598ec92dbd673e9bf04818";
export const SOURCE_TREE = "1291ab35a601d2a0b81b0e623d59ea3dc2db73ae";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07-terminal-reconciliation-successor-selection-manifest.json";
export const NEXT_GATE =
  "PCA-08_PROVIDER_AGNOSTIC_PRODUCT_HOMOLOGATION_ENTRY_READ_ONLY_IMPACT_REQUALIFICATION";

export function buildContract() {
  const w6r = buildW6rContract();
  assert.equal(w6r.corrective.correctedEnvelope.bytes, 27449);
  assert.equal(
    w6r.corrective.correctedEnvelope.sha256,
    "58fc41803bee53b66612ee9677fc5a9f14f317f9d0e0ada78ad3297c248c079e",
  );
  return {
    schemaVersion: 1,
    gate: GATE,
    branch: BRANCH,
    sourceMain: SOURCE_MAIN,
    sourceTree: SOURCE_TREE,
    observedAtUtc: "2026-08-29T19:52:34Z",
    authority: {
      repository: "PROTECTED_GITHUB_MAIN_ONLY",
      canonicalBackend: "LOVABLE_MANAGED_BACKEND_ONLY",
      ownerSupabaseAccess: "LOVABLE_ONLY",
      projectId: "982b91d8-946d-4103-8eb3-40ddbaeedbf4",
    },
    protectedMerge: {
      pullRequest: 175,
      head: "f21f9de47df727734ba8d721cca91ecb50a60dfb",
      mergeSha: SOURCE_MAIN,
      mergeTree: SOURCE_TREE,
      method: "squash",
      requiredChecks: [
        "Consolidated corrective exact-head Release Gate",
        "Typecheck, build and deterministic route generation",
      ],
      requiredChecksPassed: 2,
      bypassUsed: false,
      mainIdenticalToMerge: true,
    },
    application: {
      authorization: "PCA-07_W6_CONTROLLED_APPLICATION",
      exactTenantId: "9664d189-4a12-4caa-8243-dc73383447e6",
      envelopeBytes: 27449,
      envelopeSha256: "58fc41803bee53b66612ee9677fc5a9f14f317f9d0e0ada78ad3297c248c079e",
      storedStatementBytes: 27554,
      storedStatementSha256: "c8233abd0ccebc4e564eeef1783a065e9005fa6b7eab6f3a4e6b5e7eca120f4e",
      lovableTransportPrefixBytes: 105,
      transactionCommitted: true,
      applicationCalls: 1,
      directSupabaseCalls: 0,
    },
    ledgerIntegrity: { w1: 3, w2: 3, w3: 3, w4: 2, w5: 8, w6: 1 },
    schemaPostconditions: {
      w5TablesPresent: 15,
      w5TablesRls: 15,
      w5FunctionsPresent: 17,
      w6FunctionsPresent: 3,
      w6TriggerPresent: 1,
      clientTableExposures: 0,
      clientFunctionExposures: 0,
      serviceTablesFull: 15,
      serviceFunctionsReady: 17,
    },
    w6Acl: {
      directProvisionerServiceRoleExecute: false,
      authorizedOrchestratorServiceRoleExecute: true,
      anonExecute: false,
      authenticatedExecute: false,
    },
    exactTenantBaseline: {
      tenantRows: 1,
      configurationRows: 1,
      salesDefaultPipelines: 1,
      salesStages: 7,
      marketingConnectors: 4,
      marketingVersions: 4,
      marketingCurrentMappings: 4,
      trackingConnectors: 3,
      trackingVersions: 3,
      trackingBindings: 36,
      trackingConsentRows: 1,
      productInventoryRows: 0,
    },
    protectedBaseline: {
      tenants: 74,
      portalConnectors: 444,
      targetPortalConnectors: 6,
      retainedSensitiveFields: 888,
      storageObjects: 22,
      storageBytes: 15826788,
    },
    terminalDecision: {
      pca07State: "ACCEPTED_TERMINAL",
      nextGateSelected: NEXT_GATE,
      nextGateAuthorized: false,
      controlledHomologationAuthorized: false,
      productionAuthorized: false,
      providerMutationAuthorized: false,
      deployAuthorized: false,
      dca02Bl2R2Disposition: "DEFERRED_UNTIL_POST_HOMOLOGATION_PRE_PRODUCTION",
    },
    controls: {
      repositoryClosureOnly: true,
      closureSameBackendReads: 0,
      closureSameBackendWrites: 0,
      canonicalMigrationMutation: false,
      productCodeMutation: false,
      providerMutation: false,
      deploy: false,
      pr105Mutation: false,
      existingRoadmapAuthorityMutation: false,
    },
  };
}
