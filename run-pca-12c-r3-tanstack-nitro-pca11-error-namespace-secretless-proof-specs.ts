import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  executePca11ManagedBindingProvisioning,
  executeSpr03Provisioning,
  PCA11_MANAGED_BINDING_CONTRACT,
  Spr03ProvisioningError,
} from "./src/lib/spr-03/managed-secret-provisioning.server";
import { PCA11_DEDICATED_WORKER } from "./src/lib/cloudflare/managed-inactive-version-contract.server";
import { handlePca11ManagedBindingProvisionRequest } from "./src/routes/api/internal/pca-11-managed-binding-provision";
import {
  buildContract,
  MANIFEST_PATH,
  SOURCE_MAIN,
  SOURCE_TREE,
} from "./scripts/build-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.mjs";

const PROVISIONER_ENVIRONMENT_NAME = "CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER";

assert.equal(
  execFileSync("git", ["rev-parse", `${SOURCE_MAIN}^{tree}`], { encoding: "utf8" }).trim(),
  SOURCE_TREE,
);
assert.equal(
  PCA11_MANAGED_BINDING_CONTRACT.provisionerEnvironmentName,
  PROVISIONER_ENVIRONMENT_NAME,
);

const validBody = {
  ceremony_id: "pca12c-r3:secretless:2026-09-01",
  expected_worker_id: PCA11_DEDICATED_WORKER,
  expected_bootstrap_version_id: "11111111-1111-4111-8111-111111111111",
  expected_source_fingerprint: "a".repeat(64),
  phase: "canary" as const,
};

const authenticatedRequest = () =>
  new Request("https://runtime.invalid/api/internal/pca-11-managed-binding-provision", {
    method: "POST",
    headers: {
      authorization: "Bearer authenticated-global-super-admin-proof",
      "content-type": "application/json",
    },
    body: JSON.stringify(validBody),
  });

let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  networkCalls += 1;
  throw new Error("network_call_prohibited_during_secretless_proof");
};

try {
  const response = await handlePca11ManagedBindingProvisionRequest(authenticatedRequest(), {
    execute: (request, body) =>
      executePca11ManagedBindingProvisioning(request, body, {
        authenticateGlobalSuperAdmin: async () => "global-super-admin-user-id",
        readEnvironment: (name) =>
          name === PROVISIONER_ENVIRONMENT_NAME ? undefined : `synthetic-${name}`,
      }),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: "pca11_missing_server_dependency",
  });
  assert.equal(networkCalls, 0, "secretless route proof must perform zero network calls");

  await assert.rejects(
    executePca11ManagedBindingProvisioning(authenticatedRequest(), validBody, {
      readEnvironment: () => undefined,
    }),
    (error: unknown) =>
      error instanceof Spr03ProvisioningError &&
      error.status === 503 &&
      error.code === "pca11_missing_server_dependency",
  );
  assert.equal(
    networkCalls,
    0,
    "PCA-11 auth dependencies must use the PCA-11 namespace before network access",
  );

  await assert.rejects(
    executeSpr03Provisioning(
      new Request("https://runtime.invalid/api/internal/spr-03-managed-secret-provision", {
        method: "POST",
      }),
      {},
    ),
    (error: unknown) =>
      error instanceof Spr03ProvisioningError &&
      error.status === 401 &&
      error.code === "spr03_unauthorized",
  );
  assert.equal(networkCalls, 0, "SPR-03 auth regression must remain local and namespaced");
} finally {
  globalThis.fetch = originalFetch;
}

const helper = readFileSync("src/lib/spr-03/managed-secret-provisioning.server.ts", "utf8");
const route = readFileSync("src/routes/api/internal/pca-11-managed-binding-provision.ts", "utf8");
assert.match(helper, /authenticateGlobalSuperAdmin\(candidate, "pca11", readEnvironment\)/);
assert.match(helper, /requireEnvironment\(name, target\.tagPrefix, readEnvironment\)/);
assert.match(
  helper,
  /provisioningCode\(target\.tagPrefix, "cloudflare_invalid_response"\)|parseCloudflareJson<any>\(response, target\.tagPrefix\)/,
);
assert.match(
  route,
  /POST: \(\{ request \}\) => handlePca11ManagedBindingProvisionRequest\(request\)/,
);
assert.doesNotMatch(route, /CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER/);
assert.deepEqual(JSON.parse(readFileSync(MANIFEST_PATH, "utf8")), buildContract());

const releaseBase = process.env.PCA_12C_R3_BASE_SHA?.trim();
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (releaseBase) {
  assert.match(releaseBase, /^[0-9a-f]{40}$/);
  assert.doesNotThrow(
    () =>
      execFileSync("git", ["merge-base", "--is-ancestor", SOURCE_MAIN, releaseBase], {
        stdio: "ignore",
      }),
    "PCA-12C-R3 release base must descend from the historical SOURCE_MAIN",
  );
  assert.doesNotThrow(
    () =>
      execFileSync("git", ["merge-base", "--is-ancestor", releaseBase, head], {
        stdio: "ignore",
      }),
    "PCA-12C-R3 exact head must descend from the current release base",
  );
}
if (head !== SOURCE_MAIN) {
  const changedPaths = execFileSync("git", ["diff", "--name-only", `${SOURCE_MAIN}..${head}`], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();
  const historicalPaths = [
    ".github/workflows/release-gate.yml",
    "docs/architecture/governance/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-envelope.md",
    "docs/architecture/impact-analysis/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-repository-implementation.md",
    "docs/architecture/impact-analysis/manifests/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-manifest.json",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.md",
    "package.json",
    "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
    "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
    "run-pca-12c-r6d-lovable-development-keep-names-seroval-hydration-corrective-specs.ts",
    "run-spr-03-worker-bootstrap-managed-secret-recovery-specs.ts",
    "scripts/build-pca-11r-preview-host-managed-binding-compatibility.mjs",
    "scripts/build-pca-12b-lovable-managed-edge-function-bridge.mjs",
    "scripts/build-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.mjs",
    "src/lib/__tests__/public-settings-campaign-read-recovery.spec.ts",
    "src/lib/public-tenant-read-guards.ts",
    "src/lib/spr-03/managed-secret-provisioning.server.ts",
    "src/routes/__root.tsx",
    "src/routes/api/internal/pca-11-managed-binding-provision.ts",
    "vite.config.ts",
  ].sort();
  const r6gPaths = [
    ".env",
    ".gitignore",
    "run-arch-12f-01-config-hygiene-specs.ts",
    "run-pca-12c-r6g-public-supabase-vite-binding-specs.ts",
  ].sort();
  const pca15rPaths = [
    "docs/architecture/governance/PCA-15R-managed-custody-source-reconciliation-envelope.md",
    "docs/architecture/governance/RM_PRIME_PCA15R_RESTART_HANDOFF_AFTER_SOURCE_GUARD_2026-09-04.md",
    "docs/architecture/impact-analysis/PCA-15R-managed-custody-source-reconciliation-repository-corrective.md",
    "docs/architecture/impact-analysis/manifests/PCA-15R-managed-custody-source-reconciliation-manifest.json",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-15r-managed-custody-source-reconciliation.md",
    "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
    "scripts/build-pca-11r-preview-host-managed-binding-compatibility.mjs",
    "src/lib/pca-15r/cloudflare-terminal-reconciliation.server.ts",
    "src/lib/pca-15r/managed-custody-provisioning.server.ts",
    "src/lib/pca-15r/managed-custody.server.ts",
    "src/routes/api/internal/pca-15r-managed-custody-provision.ts",
    "src/routeTree.gen.ts",
  ].sort();
  const p0VisualProductHomologationPaths = [
    ".github/workflows/p0-visual-product-homologation-gate.yml",
    "package.json",
    "run-p0-visual-product-homologation-specs.ts",
    "run-pr-m2-portal-functional-completion-specs.ts",
    "run-pr-m2-marketing-channels-lead-ingestion-functional-completion-specs.ts",
    "run-pr-m2-analytics-tracking-conversion-events-functional-completion-specs.ts",
    "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
    "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
    "src/components/dashboard/DashboardInsightFeed.tsx",
    "src/components/dashboard/DashboardVisualizations.tsx",
    "src/components/demo/DemoWorkspace.tsx",
    "src/components/demo/demo-data.ts",
    "src/components/workspace/contexts.ts",
    "src/lib/ui-labels.ts",
    "src/lib/error-page.ts",
    "src/lib/p0-homologation-entry.ts",
    "src/server.ts",
    "src/routeTree.gen.ts",
    "src/routes/_authenticated.admin.marketing.tsx",
    "src/routes/_authenticated.admin.portais.tsx",
    "src/routes/_authenticated.admin.tracking.tsx",
    "src/routes/auth.tsx",
    "src/routes/demonstracao.tsx",
    "src/routes/design-system.tsx",
  ].sort();
  assert.deepEqual(
    changedPaths,
    [
      ...new Set([
        ...historicalPaths,
        ...(changedPaths.includes("run-pca-12c-r6g-public-supabase-vite-binding-specs.ts")
          ? r6gPaths
          : []),
        ...(changedPaths.includes("run-pca-15r-managed-custody-source-reconciliation-specs.ts")
          ? pca15rPaths
          : []),
        ...(changedPaths.includes("run-p0-visual-product-homologation-specs.ts")
          ? p0VisualProductHomologationPaths
          : []),
      ]),
    ].sort(),
  );
}

console.log("PCA-12C-R3 TanStack/Nitro PCA-11 namespace and secretless proof: PASS");
