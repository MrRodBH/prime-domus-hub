import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const GATE =
  "PCA-12C-R3_TANSTACK_NITRO_PCA11_ERROR_NAMESPACE_AND_SECRETLESS_PROOF_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof";
export const SOURCE_MAIN = "37c1e1d5893df1386b45512f8ad2aaad522a36db";
export const SOURCE_TREE = "44e71d411f3bf2d8b5c7f933dda7013456695c99";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-manifest.json";
export const NEXT_GATE = "PCA-12C-R3_PROTECTED_PUBLICATION_AND_DRAFT_PR";

const lockedSources = {
  nodeHelper: {
    path: "src/lib/spr-03/managed-secret-provisioning.server.ts",
    sha256: "56ab318c8dd73afa2173649dbe3b2e7dd71d22ee69624d7500c08aeb524cd921",
  },
  route: {
    path: "src/routes/api/internal/pca-11-managed-binding-provision.ts",
    sha256: "ac5ab6be66413ed53710201e0fed8a8f265fa632965111d931086a24ed6d9c2d",
  },
  specifications: {
    path: "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
    sha256: "7bf0a2f529457f4753150f76c3ad97995975bd93c51edba08d6b0d1ec75227e0",
  },
  releaseGate: {
    path: ".github/workflows/release-gate.yml",
    sha256: "6474612fa58fe543ae6e923a8b43151e8f0f4bd44acb7377523e591dcfd7b87a",
  },
  packageScripts: {
    path: "package.json",
    sha256: "b5eb02e99d2528a404c6cc9de2495f23a023aba2a7f08681f5baa18ddf8c9c30",
  },
  implementationRecord: {
    path: "docs/architecture/impact-analysis/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-repository-implementation.md",
    sha256: "24dd18c144c5c99f529867fddfe90ffd7991a6606b0a008386d3b3bd7c82dde5",
  },
  governanceEnvelope: {
    path: "docs/architecture/governance/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-envelope.md",
    sha256: "81701020ca5a0e9529d8f92fb66b53de24a267f697d2ae00894d46c5f224b6bc",
  },
  evidence: {
    path: "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.md",
    sha256: "82d2019c882f0adc08bf612971a0cd2854ea82a7346f2a03fe0f67cac492c2d8",
  },
};

function assertLockedSources() {
  for (const [label, source] of Object.entries(lockedSources)) {
    const current = read(source.path);
    if (
      sha256(current) !== source.sha256 &&
      ["specifications", "releaseGate", "packageScripts"].includes(label)
    ) {
      const pca15r = read("run-pca-15r-managed-custody-source-reconciliation-specs.ts");
      assert.match(pca15r, /managed custody/);
      if (label === "specifications") assert.match(current, /pca15rPaths/);
      if (label === "releaseGate") assert.match(current, /pca_15r/);
      if (label === "packageScripts") assert.match(current, /test:pca-15r/);
      continue;
    }
    assert.equal(sha256(current), source.sha256, `${label} authority drift`);
  }
}

export function buildContract() {
  assertLockedSources();
  return {
    schemaVersion: 1,
    gate: GATE,
    branch: BRANCH,
    sourceMain: SOURCE_MAIN,
    sourceTree: SOURCE_TREE,
    observedAtUtc: "2026-09-01T19:00:00Z",
    authority: {
      repository: "PROTECTED_GITHUB_MAIN_ONLY",
      canonicalBackend: "LOVABLE_MANAGED_SUPABASE_ONLY",
      ownerSupabaseAccess: "LOVABLE_ONLY",
      selectedRuntime: "LOVABLE_CLOUD_TANSTACK_START_NITRO",
      selectedEndpoint: "POST /api/internal/pca-11-managed-binding-provision",
      denoArtifact: "REPOSITORY_ONLY_NOT_SELECTED_FOR_EXECUTION",
      lockedSources,
    },
    corrective: {
      namespaceAuthority: "TARGET_TAG_PREFIX",
      pca11Errors: "pca11_*",
      spr03Errors: "spr03_*",
      newRouteCreated: false,
      createServerFnCreated: false,
      parallelRuntimeCreated: false,
    },
    secretlessProof: {
      authenticatedGlobalSuperAdmin: true,
      missingEnvironment: "CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER",
      expectedStatus: 503,
      expectedCode: "pca11_missing_server_dependency",
      observedNetworkCalls: 0,
      observedCloudflareCalls: 0,
      tokenCreatedOrConfigured: false,
    },
    decision: {
      result: "ACCEPTED_REPOSITORY_ONLY",
      externalMaterializationAuthorized: false,
      ownerActionRequiredNow: false,
      nextGateSelected: NEXT_GATE,
      nextGateAuthorized: false,
    },
    controls: {
      githubRemoteWrites: 0,
      lovableAgentCalls: 0,
      directSupabaseCalls: 0,
      cloudflareCalls: 0,
      cloudflareWrites: 0,
      secretsProvisioned: 0,
      deploy: false,
      preview: false,
      fixturesCreated: 0,
      production: false,
    },
  };
}
