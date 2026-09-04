import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const GATE =
  "PCA-11R_CLOUDFLARE_DEDICATED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-11r-dedicated-preview-host-managed-binding-compatibility";
export const SOURCE_MAIN = "e766b68cc808a9de787b45f7c927de22aac62a3e";
export const SOURCE_TREE = "14ee24136b19168d08293f2bafb5932264867d12";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-11R-preview-host-managed-binding-compatibility-manifest.json";
export const NEXT_GATE = "PCA-11R_PROTECTED_PUBLICATION_AND_DRAFT_PR";

const lockedSources = {
  environmentTemplate: {
    path: ".env.example",
    sha256: "76bc1876581c3b489e18aa2648195a0460aa974d32171cc470b387008fa56653",
  },
  wranglerTemplate: {
    path: "wrangler.jsonc",
    sha256: "0e22b8e92306361c2789f9da057dd28a38e172b6adbdb70442ab0adcae93ab3c",
  },
  tenantHostAuthority: {
    path: "src/lib/tenant.server.ts",
    sha256: "0cde84c25450a4fa08a058eaf6bc907c8665f06b92d353d9712566341000fc15",
  },
  managedBindingContract: {
    path: "src/lib/cloudflare/managed-inactive-version-contract.server.ts",
    sha256: "1a72674e9690be5418bad18854e7409dd3168b6608ae55ae5acac5f5778cdd8b",
  },
  managedBindingBridge: {
    path: "src/lib/spr-03/managed-secret-provisioning.server.ts",
    sha256: "88cbbf2de2986c3f9f18ece4c7c037532cc475b11418f6cc3073de814b48d320",
  },
  managedBindingRoute: {
    path: "src/routes/api/internal/pca-11-managed-binding-provision.ts",
    sha256: "23ec82d67fb53155c4890a6b0aa6f96ed6c1b5db9d6072edb72b234d5b4e1cad",
  },
  generatedRouteTree: {
    path: "src/routeTree.gen.ts",
    sha256: "5fd62df170c73fe70dc73eb39f8847376867591c500d38c326443c87dedcdb36",
  },
};

function assertLockedAuthority() {
  for (const [label, source] of Object.entries(lockedSources)) {
    const current = read(source.path);
    if (
      sha256(current) !== source.sha256 &&
      (label === "managedBindingBridge" || label === "managedBindingRoute")
    ) {
      const pca12cR3 = read(
        "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
      );
      assert.match(pca12cR3, /pca11_missing_server_dependency/);
      assert.match(current, /handlePca11ManagedBindingProvisionRequest|provisioningCode/);
      continue;
    }
    if (sha256(current) !== source.sha256 && label === "generatedRouteTree") {
      const pca15r = read("run-pca-15r-managed-custody-source-reconciliation-specs.ts");
      assert.match(pca15r, /GET-only terminal/);
      assert.match(current, /pca-11-managed-binding-provision/);
      assert.match(current, /pca-15r-managed-custody-provision/);
      continue;
    }
    assert.equal(sha256(current), source.sha256, `${label} authority drift`);
  }

  const wrangler = JSON.parse(read(lockedSources.wranglerTemplate.path));
  assert.equal(wrangler.workers_dev, false);
  assert.equal(wrangler.preview_urls, false);
  assert.deepEqual(wrangler.routes, []);
  assert.deepEqual(wrangler.triggers.crons, []);

  const tenant = read(lockedSources.tenantHostAuthority.path);
  assert.match(tenant, /PUBLIC_TENANT_PREVIEW_HOST_MAP/);
  assert.match(tenant, /parseExactPreviewHostMap/);
  assert.match(tenant, /unmapped_preview_host/);
  assert.match(
    tenant,
    /if \(isWorkersPreviewHost\(normalized\)\) \{.*kind: "preview_slug".*reason: "unmapped_preview_host"/s,
  );

  const contract = read(lockedSources.managedBindingContract.path);
  for (const token of [
    "rm-prime-pca11-hml",
    "pca11-hml",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CLOUDFLARE_API_TOKEN_DCA01_HML",
    "PORTAL_DLQ_RETRY_SECRET",
  ]) {
    assert.match(contract, new RegExp(token));
  }

  const bridge = read(lockedSources.managedBindingBridge.path);
  assert.match(bridge, /pca11_source_fingerprint_mismatch/);
  assert.match(bridge, /CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER/);
  assert.match(bridge, /"workers\/alias": PCA11_PREVIEW_ALIAS/);
  assert.match(bridge, /target\.expectedActiveDeploymentCount === 0/);
  assert.match(bridge, /unavailableProviderBindings/);
}

export function buildContract() {
  assertLockedAuthority();
  return {
    schemaVersion: 1,
    gate: GATE,
    branch: BRANCH,
    sourceMain: SOURCE_MAIN,
    sourceTree: SOURCE_TREE,
    observedAtUtc: "2026-08-30T16:03:59Z",
    authority: {
      repository: "PROTECTED_GITHUB_MAIN_ONLY",
      canonicalBackend: "LOVABLE_MANAGED_BACKEND_ONLY",
      ownerSupabaseAccess: "LOVABLE_ONLY",
      cloudflareAccountId: "68ec853e6b04a038f09fca5712d6b26b",
      lockedSources,
    },
    preMutationRevalidation: {
      result: "ACCEPTED_READ_ONLY",
      protectedMain: SOURCE_MAIN,
      protectedTree: SOURCE_TREE,
      cloudflareWorkerNames: ["rm-prime-wri01-hml"],
      candidatePresent: false,
      providerReads: 1,
      providerWrites: 0,
    },
    exactPreviewHostAuthority: {
      environmentName: "PUBLIC_TENANT_PREVIEW_HOST_MAP",
      cardinality: 1,
      alias: "pca11-hml",
      workerName: "rm-prime-pca11-hml",
      normalizedHostShape: "pca11-hml-rm-prime-pca11-hml.<ACCOUNT_SUBDOMAIN>.workers.dev",
      syntheticTenantSlug: "pca11-hml",
      broadWorkersDevTrust: false,
      adjacentHostsRejected: true,
      forwardedHostAuthority: false,
      realTenantMappingAllowed: false,
    },
    managedBindingBridge: {
      targetWorker: "rm-prime-pca11-hml",
      arbitraryTargetSelectionAllowed: false,
      expectedActiveDeploymentCount: 0,
      expectedPreviewsEnabledBeforeCeremony: false,
      sourceFingerprintRequired: true,
      previewAliasCreatedOnlyOnFinalInactiveVersion: true,
      provisionerEnvironmentName: "CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER",
      provisionerMayBecomeWorkerBinding: false,
      canaryPlainBindingNames: [
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "RM_PRIME_AUTH_SITE_ORIGIN",
        "RM_PRIME_EMAIL_SITE_NAME",
        "RM_PRIME_EMAIL_SENDER_DOMAIN",
        "RM_PRIME_EMAIL_FROM_DOMAIN",
      ],
      canarySecretBindingNames: [],
      requiredFinalSecretBindingNames: ["SUPABASE_SERVICE_ROLE_KEY"],
      optionalFinalSecretBindingNames: [
        "LOVABLE_API_KEY",
        "CLOUDFLARE_API_TOKEN_DCA01_HML",
        "PORTAL_DLQ_RETRY_SECRET",
      ],
      unavailableOptionalBindingsReportedExplicitly: true,
    },
    decision: {
      previewHostAuthoritySupported: true,
      dedicatedManagedBindingBridgeSupported: true,
      exactRuntimeBindingSetFrozen: true,
      repositoryCompatibilityReady: true,
      candidateMaterialized: false,
      materializationAuthorized: false,
      controlledHomologationAuthorized: false,
      productionAuthorized: false,
      nextGateSelected: NEXT_GATE,
      nextGateAuthorized: false,
    },
    controls: {
      sameBackendReads: 0,
      sameBackendWrites: 0,
      lovableAgentCalls: 0,
      directSupabaseCalls: 0,
      providerWrites: 0,
      deploy: false,
      secretsProvisioned: 0,
      fixturesCreated: 0,
      production: false,
      pr105Mutation: false,
    },
  };
}
