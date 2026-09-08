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
    "src/components/demo/SyntheticWorkflowDialogs.tsx",
    "src/components/demo/demo-data.ts",
    "src/components/ui/dialog.tsx",
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
  // Round 42 authorized repository scope; all historical runtime assertions remain active.
  // Authorized Round 43 tests only; production and migration assertions are retained.
  // Round 44 initial-link UI only; server, migrations and historical guards remain frozen.
// Round 46 empty demonstration successor; historical runtime assertions remain intact.
// Round 47 plan form/masks/CEP successor; no server authority changes.
const round56ApprovedNavigationPaths = [
  "run-p0-visual-product-homologation-specs.ts",
  "run-pr-m2-analytics-tracking-conversion-events-functional-completion-specs.ts",
  ".github/workflows/round52-persistent-onboarding.yml",
  "AGENTS.md",
  "docs/architecture/OWNER_UI_APPROVALS.md",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
  "run-round-54-navigation-context-specs.mjs",
  "run-round-56-approved-navigation-specs.mjs",
  "src/components/onboarding/PersistentOnboarding.tsx",
  "src/components/workspace/CommandPalette.tsx",
  "src/components/workspace/ContextTabs.tsx",
  "src/components/workspace/NavigationRail.tsx",
  "src/components/workspace/WorkspaceShell.tsx",
  "src/components/workspace/contexts.ts",
  "src/routes/_authenticated.super.control-plane.tsx",
  "src/routes/_authenticated.super.index.tsx"
];
const round55PlanFormPaths = [
  ".github/workflows/round52-persistent-onboarding.yml",
  "docs/architecture/impact-analysis/ROUND55-plan-form.md",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
  "run-round-55-plan-form-specs.mjs",
  "src/components/onboarding/PersistentOnboarding.tsx",
  "src/lib/onboarding/plan-presentation.ts",
  "tests/round52/ui.mjs"
];
const round54NavigationContextPaths = [
  ".github/workflows/round52-persistent-onboarding.yml",
  "docs/architecture/impact-analysis/ROUND54-navigation-context.md",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
  "run-round-54-navigation-context-specs.mjs",
  "src/components/onboarding/PersistentOnboarding.tsx",
  "src/components/workspace/CommandPalette.tsx",
  "src/components/workspace/NavigationRail.tsx",
  "src/components/workspace/WorkspaceShell.tsx",
  "src/components/workspace/contexts.ts",
  "src/routes/_authenticated.admin.tsx",
  "src/routes/_authenticated.super.index.tsx",
  "tests/round52/fixture.tsx",
  "tests/round52/ui.mjs"
];
const round53AuthenticatedThemePaths = [
  ".github/workflows/round52-persistent-onboarding.yml",
  "docs/architecture/impact-analysis/ROUND53-authenticated-theme.md",
  "run-p0-visual-product-homologation-specs.ts",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
  "run-round-53-authenticated-theme-specs.mjs",
  "src/components/onboarding/PersistentOnboarding.tsx",
  "src/components/workspace/NavigationRail.tsx",
  "src/components/workspace/contexts.ts",
  "src/lib/p0-homologation-entry.ts",
  "src/routes/_authenticated.super.index.tsx",
  "src/styles.css",
  "tests/round52/ui.mjs"
];
const round52PersistentOnboardingPaths = [
  ".github/workflows/round43-broker-identity-concurrency.yml",
  ".github/workflows/round52-persistent-onboarding.yml",
  "docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round52-persistent-onboarding.json",
  "run-pca-05r-prerequisite-closure-manifest-specs.mjs",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
  "run-round-43-broker-identity-concurrency-specs.mjs",
  "run-round-44-broker-identity-ui-specs.mjs",
  "run-round-46-empty-onboarding-specs.mjs",
  "src/components/onboarding/PersistentOnboarding.tsx",
  "src/components/site/Header.tsx",
  "src/lib/api/super-onboarding.functions.ts",
  "src/lib/onboarding/contracts.ts",
  "src/routes/_authenticated.super.index.tsx",
  "supabase/migrations/20260908003058_round52_persistent_onboarding.sql",
  "tests/round52/backend.ts",
  "tests/round52/fixture.tsx",
  "tests/round52/persistence.mjs",
  "tests/round52/server.mjs",
  "tests/round52/ui.mjs"
];
const round51SuperAdminAuthPaths = [
  "src/lib/__tests__/public-settings-campaign-read-recovery.spec.ts",
  "run-pca-12c-r6g-public-supabase-vite-binding-specs.ts",
  "run-pca-12c-r6d-lovable-development-keep-names-seroval-hydration-corrective-specs.ts",
  ".github/workflows/round51-superadmin-auth.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round51-superadmin-auth.json",
  "run-round-51-superadmin-auth-specs.mjs",
  "tests/round51/backend.ts",
  "tests/round51/router.tsx",
  "tests/round51/entry.tsx",
  "src/components/auth/useLogout.ts",
  "src/components/demo/interactive/EmptyDemoWorkspace.tsx",
  "src/components/workspace/AppHeader.tsx",
  "src/components/workspace/WorkspaceShell.tsx",
  "src/routes/auth.tsx",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts"
];
const round50TenantNavigationPaths = [
  ".github/workflows/round50-tenant-navigation.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round50-tenant-navigation.json",
  "run-round-50-tenant-navigation-specs.mjs",
  "run-round-46-empty-onboarding-specs.mjs",
  "run-round-47-plan-address-specs.mjs",
  "src/components/demo/interactive/EmptyDemoWorkspace.tsx",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts"
];
const round49DomainThemePaths = [
  ".github/workflows/round49-domain-theme.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round49-domain-theme.json",
  "run-round-49-domain-theme-specs.mjs",
  "run-round-46-empty-onboarding-specs.mjs",
  "src/components/demo/interactive/EmptyDemoWorkspace.tsx",
  "src/components/domains/TenantDomainWorkspace.tsx",
  "src/components/domains/presentation/domain-status.ts",
  "src/components/domains/presentation/public-dns.ts",
  "src/components/domains/presentation/DomainConnectionChecklist.tsx",
  "src/server.ts",
  "run-p0-visual-product-homologation-specs.ts",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts"
];
const round48TenantDomainPaths = [
  ".github/workflows/round48-tenant-domain.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round48-tenant-domain.json",
  "run-round-48-tenant-domain-specs.mjs",
  "run-round-46-empty-onboarding-specs.mjs",
  "src/components/demo/interactive/EmptyDemoWorkspace.tsx",
  "src/components/demo/interactive/model.ts",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts"
];
const round47PlanAddressPaths = [
  "src/server.ts",
  ".github/workflows/round47-plan-address.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round47-plan-address.json",
  "src/components/demo/interactive/EmptyDemoWorkspace.tsx",
  "src/components/demo/interactive/model.ts",
  "src/components/demo/interactive/formats.ts",
  "src/components/demo/interactive/postal-lookup.ts",
  "src/components/demo/interactive/usePostalAddress.ts",
  "run-round-47-plan-address-specs.mjs",
  "tests/round47/entry.tsx",
  "run-p0-visual-product-homologation-specs.ts",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts"
];
const round46EmptyDemoPaths = [
  ".github/workflows/round46-empty-onboarding.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round46-empty-onboarding.json",
  "src/components/demo/interactive/EmptyDemoWorkspace.tsx",
  "src/components/demo/interactive/model.ts",
  "src/routes/demonstracao.tsx",
  "run-round-46-empty-onboarding-specs.mjs",
  "tests/round46/entry.tsx",
  "run-p0-visual-product-homologation-specs.ts",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts"
];
const round44IdentityUiPaths = [
  ".github/workflows/round44-broker-identity-ui.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round44-broker-identity-ui.md",
  "run-round-44-broker-identity-ui-specs.mjs",
  "tests/round44/backend.ts",
  "tests/round44/entry.tsx",
  "tests/round44/router.tsx",
  "src/components/directory/BrokerIdentityLinkPanel.tsx",
  "src/components/directory/BrokerTeamDirectoryReadOnlyPage.tsx",
  "src/components/directory/broker-team-directory-read-model.ts",
  "src/routes/_authenticated.admin.corretores.tsx",
  "run-pr-m2-tenant-access-control-specs.ts",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts"
];
const round43ConcurrencyPaths = [
    ".github/workflows/round43-broker-identity-concurrency.yml",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round43-broker-identity-concurrency.md",
    "run-round-43-broker-identity-concurrency-specs.mjs",
    "tests/round43/substrate.sql",
    "tests/round43/cadastral-handler.mjs",
    "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
    "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
    "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
  ];
  const round42IdentityPaths = [
    ".github/workflows/round42-broker-identity-link.yml",
    "docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/round42-broker-identity-link.md",
    "run-pca-05r-prerequisite-closure-manifest-specs.mjs",
    "run-pr-m2-tenant-access-control-specs.ts",
    "run-round-42-broker-identity-link-specs.mjs",
    "run-round-42-broker-identity-sql-specs.mjs",
    "src/lib/api/tenant-broker-directory.functions.ts",
    "supabase/migrations/20260907183824_round42_broker_identity_link.sql",
    "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
    "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
    "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
  ];
  // Explicit successor scope; historical assertions remain mandatory.
  const round40JourneyPaths = [".github/workflows/round40-property-interaction.yml", "run-round-40-property-interaction-specs.mjs", "tests/round40/backend.ts", "tests/round40/router.tsx", "tests/round40/entry.tsx", "src/components/admin/ImovelForm.tsx", "src/routes/_authenticated.admin.imoveis.index.tsx"];
const round35JourneyPaths = ["run-round-35-crm-journey-specs.ts", "scripts/verify-release.mjs", "src/components/pipeline/CrmJourneyPanel.tsx", "src/components/pipeline/crm-journey-command.ts", "src/routes/_authenticated.admin.pipeline.tsx"];
  assert.deepEqual(
    changedPaths,
    [
      ...new Set([
        ...(changedPaths.includes("run-round-56-approved-navigation-specs.mjs") ? round56ApprovedNavigationPaths : []), ...(changedPaths.includes("run-round-55-plan-form-specs.mjs") ? round55PlanFormPaths : []), ...(changedPaths.includes("run-round-54-navigation-context-specs.mjs") ? round54NavigationContextPaths : []), ...(changedPaths.includes("run-round-53-authenticated-theme-specs.mjs") ? round53AuthenticatedThemePaths : []), ...(changedPaths.includes("src/lib/api/super-onboarding.functions.ts") ? round52PersistentOnboardingPaths : []), ...(changedPaths.includes("run-round-51-superadmin-auth-specs.mjs") ? round51SuperAdminAuthPaths : []), ...(changedPaths.includes("run-round-50-tenant-navigation-specs.mjs") ? round50TenantNavigationPaths : []), ...(changedPaths.includes("run-round-49-domain-theme-specs.mjs") ? round49DomainThemePaths : []), ...(changedPaths.includes("run-round-48-tenant-domain-specs.mjs") ? round48TenantDomainPaths : []), ...(changedPaths.includes("run-round-47-plan-address-specs.mjs") ? round47PlanAddressPaths : []), ...(changedPaths.includes("run-round-46-empty-onboarding-specs.mjs") ? round46EmptyDemoPaths : []), ...(changedPaths.includes("run-round-44-broker-identity-ui-specs.mjs") ? round44IdentityUiPaths : []), ...(changedPaths.includes("run-round-43-broker-identity-concurrency-specs.mjs") ? round43ConcurrencyPaths : []),
        ...(changedPaths.includes("run-round-42-broker-identity-sql-specs.mjs") ? round42IdentityPaths : []),
        ...historicalPaths,
        ...(changedPaths.includes("run-round-40-property-interaction-specs.mjs") ? round40JourneyPaths : []),
        ...(changedPaths.includes("run-round-35-crm-journey-specs.ts") ? round35JourneyPaths : []),
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
