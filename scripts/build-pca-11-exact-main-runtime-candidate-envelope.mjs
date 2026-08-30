import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const GATE =
  "PCA-11_EXACT_MAIN_NON_PRODUCTION_RUNTIME_CANDIDATE_MATERIALIZATION_ENVELOPE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-11-exact-main-runtime-candidate-envelope";
export const SOURCE_MAIN = "43eb3ff63123e3b0a02b779121e398fec107938f";
export const SOURCE_TREE = "21a0d13bd0c4620dcdb46c00fe69a23ef779d738";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-11-exact-main-runtime-candidate-envelope-manifest.json";
export const NEXT_GATE =
  "PCA-11R_CLOUDFLARE_DEDICATED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION";

const lockedSources = {
  pca09Manifest: {
    path: "docs/architecture/impact-analysis/manifests/PCA-09-provider-agnostic-homologation-entry-envelope-manifest.json",
    sha256: "2684a94b6db79435340991c385ade75b464eead42043b0c18fcc66c1fc36559e",
  },
  pca09Envelope: {
    path: "docs/architecture/governance/PCA-09-provider-agnostic-product-homologation-entry-execution-envelope.md",
    sha256: "d5789e0ebbc90e485833cf78de6f8bb66acd58b8909ae087e17bb7987d36b29e",
  },
  wranglerTemplate: {
    path: "wrangler.jsonc",
    sha256: "0e22b8e92306361c2789f9da057dd28a38e172b6adbdb70442ab0adcae93ab3c",
  },
  wranglerMaterializer: {
    path: "scripts/materialize-wrangler-config.mjs",
    sha256: "5880b883cc4fee55ad9192933cfd3405e7ed35de3fda305eb82b564f4f2d0605",
  },
  environmentTemplate: {
    path: ".env.example",
    sha256: "9ca0c5244f12ef74c879ea5ab9ced43a92c62c07b7acb4a64e539bccbe80f78e",
  },
  tenantHostAuthority: {
    path: "src/lib/tenant.server.ts",
    sha256: "3f94ae3362ade45781248dc537a3c3dad0834f8a2c6c04fe22e329650544f09d",
  },
  managedSecretBridge: {
    path: "src/lib/spr-03/managed-secret-provisioning.server.ts",
    sha256: "c315eec7164babfde9d929fdde41d45bebf65b8b0da43949ba66fa7da4a6310d",
  },
};

function assertLockedAuthority() {
  for (const [label, source] of Object.entries(lockedSources)) {
    assert.equal(sha256(read(source.path)), source.sha256, `${label} authority drift`);
  }

  const pca09 = JSON.parse(read(lockedSources.pca09Manifest.path));
  assert.equal(pca09.sourceMain, "6f1fa580863a3f4e3e936912bacfce74e1d4bb01");
  assert.equal(
    pca09.decision.homologationEntryState,
    "BLOCKED_EXTERNAL_EXACT_MAIN_RUNTIME_AND_OPERATOR_PACKET",
  );
  assert.equal(
    pca09.decision.nextGateSelected,
    "PCA-10_PROVIDER_AGNOSTIC_EXACT_MAIN_HOMOLOGATION_RUNTIME_READ_ONLY_CAPABILITY_PREFLIGHT",
  );
  assert.equal(pca09.executionEnvelope.liveExecutionSeparatelyAuthorized, true);

  const wrangler = JSON.parse(read(lockedSources.wranglerTemplate.path));
  assert.equal(wrangler.workers_dev, false);
  assert.equal(wrangler.preview_urls, false);
  assert.deepEqual(wrangler.routes, []);
  assert.deepEqual(wrangler.triggers.crons, []);

  const tenantAuthority = read(lockedSources.tenantHostAuthority.path);
  assert.match(tenantAuthority, /host\.endsWith\("\.lovable\.app"\)/);
  assert.doesNotMatch(tenantAuthority, /workers\.dev/);

  const bridge = read(lockedSources.managedSecretBridge.path);
  assert.match(bridge, /const TARGET_WORKER = "rm-prime-wri01-hml"/);
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CLOUDFLARE_API_TOKEN_DCA01_HML",
  ]) {
    assert.match(bridge, new RegExp(`"${name}"`));
  }
}

export function buildContract() {
  assertLockedAuthority();
  return {
    schemaVersion: 1,
    gate: GATE,
    branch: BRANCH,
    sourceMain: SOURCE_MAIN,
    sourceTree: SOURCE_TREE,
    observedAtUtc: "2026-08-29T23:43:19Z",
    authority: {
      repository: "PROTECTED_GITHUB_MAIN_ONLY",
      canonicalBackend: "LOVABLE_MANAGED_BACKEND_ONLY",
      ownerSupabaseAccess: "LOVABLE_ONLY",
      projectId: "982b91d8-946d-4103-8eb3-40ddbaeedbf4",
      directSupabaseFallbackProhibited: true,
      lovableGithubOperationsProhibited: true,
      lockedSources,
    },
    exactMainEvidence: {
      pullRequest: 177,
      pullRequestHead: "b7f3be4652f17e6b26d19aa02fef831fd25c79c8",
      mergeSha: SOURCE_MAIN,
      mergeTree: SOURCE_TREE,
      protectedBranch: true,
      postMergeReleaseRunId: 33275785259,
      postMergeReleaseJobId: 99162126695,
      postMergeReleaseConclusion: "success",
      wriRunId: 33274097926,
      wriJobId: 99157671538,
      wriHeadTree: SOURCE_TREE,
      wriConclusion: "success",
      wriArtifactCount: 3,
      wriArtifactDigests: {
        bundleAudit: "sha256:e3752fb53d020adcac05f50f44f8d8b329235e5ee54f0886a58d00a52fadcf2e",
        wranglerDryRun: "sha256:824423fe959ee265f1654b19bf316a52da2e4c458dc351d11ed87fa3bd71c1ac",
        workerdProof: "sha256:9b0acc4b6bdafd42e6f42d94befa4df591e0b47a3c0730644e40f06ccd12d799",
      },
    },
    pca10ReadOnlyPreflight: {
      result: "ACCEPTED_READ_ONLY",
      providerWrites: 0,
      deploys: 0,
      sameBackendReads: 0,
      sameBackendWrites: 0,
      directSupabaseCalls: 0,
      lovable: {
        projectStatus: "completed",
        published: true,
        projectVisibility: "private",
        latestCommit: "9d64c7ac6c1259652a70022db08583139cb368af",
        exactMainMatch: false,
        runtimeEligible: false,
        workspacePlan: "pro",
        databaseEnabled: true,
        stack: "supabase",
      },
      cloudflare: {
        accountId: "68ec853e6b04a038f09fca5712d6b26b",
        accountType: "standard",
        usageModel: "standard",
        billingTierAssertedByApi: false,
        workerCount: 1,
        pagesProjectCount: 0,
        historicalWorker: "rm-prime-wri01-hml",
        historicalWorkerSecretCount: 0,
        historicalWorkerSubdomainEnabled: false,
        historicalWorkerPreviewsEnabled: false,
        historicalWorkerReusableForCandidate: false,
      },
      compiledRuntime: {
        moduleCount: 379,
        assetCount: 161,
        uploadKiB: 8455.96,
        gzipKiB: 1745.22,
        freeCompressedLimitMiB: 3,
        freeAssetLimit: 20000,
        freeCpuMillisecondsPerRequest: 10,
        remoteCpuFitProven: false,
        paidPlanMinimumMonthlyUsd: 5,
        paidPlanRequiredBeforeTesting: false,
      },
      currentPlatformChanges: {
        supabaseNode20SupportEnded: "2026-06-30",
        candidateRuntime: "CLOUDFLARE_WORKERD_WITH_NODEJS_COMPAT",
        nodeRuntimeEquivalenceClaimed: false,
        dataApiExposureMutationRequired: false,
      },
    },
    selectedCandidate: {
      provider: "CLOUDFLARE_WORKERS",
      qualification: "CONDITIONALLY_ELIGIBLE_NOT_MATERIALIZED",
      workerName: "rm-prime-pca11-hml",
      deploymentEnvironment: "homologation",
      dedicatedWorkerRequired: true,
      reuseHistoricalWorker: false,
      source: "EXACT_PROTECTED_GITHUB_MAIN_SHA_AND_TREE",
      mode: "INACTIVE_VERSIONED_PREVIEW_ONLY",
      workersDevEnabled: false,
      previewUrlsRequired: true,
      routes: [],
      crons: [],
      dnsMutation: false,
      activeDeploymentAllowed: false,
      productionAllowed: false,
      realTrafficAllowed: false,
      artifactDigestRequired: true,
      runtimeIdentityRequired: true,
      deterministicTeardownRequired: true,
    },
    materializationEnvelope: {
      repositoryConfigAuthority: "wrangler.jsonc",
      generatedConfigTracked: false,
      generatedPreviewOverrideMustBeEphemeral: true,
      exactPreviewHostnameMustBeProviderResolved: true,
      broadWorkersDevWildcardTrustProhibited: true,
      exactPreviewHostAllowlistRequired: true,
      targetWorkerMustBeAbsentBeforeCreation: true,
      targetDeploymentCountBefore: 0,
      targetSecretCountBefore: 0,
      sourceVersionMustRemainInactive: true,
      previewMustRemainUnavailableUntilTrafficControlPasses: true,
      secretValuesMayEnterRepository: false,
      secretValuesMayEnterChatOrLogs: false,
      ownerMayHandleSupabaseServiceRole: false,
      managedSecretCustodian: "LOVABLE_ONLY",
      requiredPlainBindings: [
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "RM_PRIME_AUTH_SITE_ORIGIN",
        "RM_PRIME_EMAIL_SITE_NAME",
        "RM_PRIME_EMAIL_SENDER_DOMAIN",
        "RM_PRIME_EMAIL_FROM_DOMAIN",
      ],
      requiredBuildTimePublicBindings: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"],
      requiredServerSecrets: ["SUPABASE_SERVICE_ROLE_KEY"],
      conditionallyUnavailableProviderBindings: [
        "LOVABLE_API_KEY",
        "CLOUDFLARE_API_TOKEN_DCA01_HML",
        "PORTAL_DLQ_RETRY_SECRET",
      ],
      unavailableFeaturesMustNotReportSuccess: true,
      materializationSeparatelyAuthorized: true,
      controlledHomologationSeparatelyAuthorized: true,
    },
    compatibilityFindings: {
      exactPreviewHostAuthoritySupported: false,
      findingPreviewHost: "WORKERS_DEV_HOST_NOT_ACCEPTED_BY_EXPLICIT_DEVELOPMENT_HOST_AUTHORITY",
      dedicatedManagedBindingBridgeSupported: false,
      findingManagedBridge: "SPR03_TARGET_WORKER_HARDCODED_TO_HISTORICAL_WORKER",
      exactRuntimeBindingSetFrozen: false,
      findingBindingSet: "DEDICATED_CANDIDATE_BINDING_ALLOWLIST_REQUIRES_CORRECTIVE",
      remoteCpuFitProven: false,
      findingCpu: "REMOTE_CPU_REQUIRES_BOUNDED_LIVE_PROOF_AFTER_MATERIALIZATION",
    },
    decision: {
      pca10Result: "ACCEPTED_READ_ONLY",
      pca11State: "REPOSITORY_ENVELOPE_IMPLEMENTED_NOT_EXECUTED",
      candidateSelected: true,
      candidateMaterialized: false,
      materializationReady: false,
      exactMainRuntimeReady: false,
      operatorPacketReady: false,
      controlledHomologationAuthorized: false,
      productionAuthorized: false,
      entryState: "BLOCKED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY",
      nextGateSelected: NEXT_GATE,
      nextGateAuthorized: false,
      dca02Bl2R2Disposition: "DEFERRED_NON_BLOCKING_FOR_HOMOLOGATION_MANDATORY_PRE_PRODUCTION",
    },
    controls: {
      repositoryImplementationOnly: true,
      productCodeMutation: false,
      canonicalMigrationMutation: false,
      wranglerTemplateMutation: false,
      sameBackendReads: 0,
      sameBackendWrites: 0,
      lovableAgentCalls: 0,
      directSupabaseCalls: 0,
      providerReads: 0,
      providerWrites: 0,
      deploy: false,
      secretsProvisioned: 0,
      fixturesCreated: 0,
      production: false,
      pr105Mutation: false,
    },
  };
}
