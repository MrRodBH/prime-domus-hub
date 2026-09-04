import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  PCA15R_ACCEPTED_SOURCE_ENVIRONMENT_NAME,
  PCA15R_CUSTODY_ENVIRONMENT_NAME,
  PCA15R_PROVISIONER_ENVIRONMENT_NAME,
  Pca15rManagedCustodyError,
  verifyPca15rManagedCustody,
  type Pca15rAuthenticatedSession,
  type Pca15rManagedCustodyGateway,
} from "./src/lib/pca-15r/managed-custody.server";
import { executePca15rManagedCustodyProvisioning } from "./src/lib/pca-15r/managed-custody-provisioning.server";
import {
  Pca15rTerminalReconciliationError,
  reconcilePca15rTerminalStateGetOnly,
  type Pca15rTerminalEvidence,
} from "./src/lib/pca-15r/cloudflare-terminal-reconciliation.server";
import { handlePca15rManagedCustodyProvisionRequest } from "./src/routes/api/internal/pca-15r-managed-custody-provision";
import { PCA11_DEDICATED_WORKER } from "./src/lib/cloudflare/managed-inactive-version-contract.server";

const SOURCE_MAIN = "3897936276a0760fe4594bb5e2420ec0cbba2adb";
const SUPER_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const TENANT_ID = "33333333-3333-4333-8333-333333333333";
const VERSION_ID = "44444444-4444-4444-8444-444444444444";
const BOOTSTRAP_ID = "55555555-5555-4555-8555-555555555555";
const SOURCE_FINGERPRINT = "a".repeat(64);
const PROVIDER_TOKEN = "provider-token-must-never-be-serialized";
const SERVICE_ROLE = "service-role-must-never-be-serialized";
const SUPER_PASSWORD = "super-password-must-never-be-serialized";
const MEMBER_PASSWORD = "member-password-must-never-be-serialized";
const PCA15R_PATHS = [
  ".github/workflows/release-gate.yml",
  "docs/architecture/governance/PCA-15R-managed-custody-source-reconciliation-envelope.md",
  "docs/architecture/governance/RM_PRIME_PCA15R_RESTART_HANDOFF_AFTER_SOURCE_GUARD_2026-09-04.md",
  "docs/architecture/impact-analysis/PCA-15R-managed-custody-source-reconciliation-repository-corrective.md",
  "docs/architecture/impact-analysis/manifests/PCA-15R-managed-custody-source-reconciliation-manifest.json",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-15r-managed-custody-source-reconciliation.md",
  "package.json",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-15r-managed-custody-source-reconciliation-specs.ts",
  "scripts/build-pca-11r-preview-host-managed-binding-compatibility.mjs",
  "scripts/build-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.mjs",
  "src/lib/pca-15r/cloudflare-terminal-reconciliation.server.ts",
  "src/lib/pca-15r/managed-custody-provisioning.server.ts",
  "src/lib/pca-15r/managed-custody.server.ts",
  "src/routeTree.gen.ts",
  "src/routes/api/internal/pca-15r-managed-custody-provision.ts",
].sort();

const custodyConfiguration = JSON.stringify({
  schema: "rm-prime.pca15r.managed-custody.v1",
  tenant_id: TENANT_ID,
  tenant_slug: "pca11-hml",
  subjects: [
    {
      kind: "super_admin",
      user_id: SUPER_ID,
      email: "super.synthetic@example.invalid",
      password: SUPER_PASSWORD,
      expected_tenant_role: null,
    },
    {
      kind: "tenant_member",
      user_id: MEMBER_ID,
      email: "member.synthetic@example.invalid",
      password: MEMBER_PASSWORD,
      expected_tenant_role: "owner",
    },
  ],
});

const environment: Record<string, string> = {
  [PCA15R_ACCEPTED_SOURCE_ENVIRONMENT_NAME]: SOURCE_MAIN,
  [PCA15R_CUSTODY_ENVIRONMENT_NAME]: custodyConfiguration,
  [PCA15R_PROVISIONER_ENVIRONMENT_NAME]: PROVIDER_TOKEN,
  PUBLIC_TENANT_PREVIEW_HOST_MAP: JSON.stringify({
    "pca11-hml-rm-prime-pca11-hml.synthetic.workers.dev": "pca11-hml",
  }),
  SUPABASE_URL: "https://synthetic.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
};

const readEnvironment = (name: string) => environment[name];

function authenticatedRequest(body: unknown = validBody()): Request {
  return new Request("https://runtime.invalid/api/internal/pca-15r-managed-custody-provision", {
    method: "POST",
    headers: {
      authorization: "Bearer operator-authentication-proof",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    ceremony_id: "pca15r:managed-custody:2026-09-04",
    expected_worker_id: PCA11_DEDICATED_WORKER,
    expected_bootstrap_version_id: BOOTSTRAP_ID,
    expected_source_fingerprint: SOURCE_FINGERPRINT,
    expected_source_head: SOURCE_MAIN,
    phase: "canary" as const,
  };
}

function makeGateway(events: string[] = []): Pca15rManagedCustodyGateway {
  const sessions = new Map<string, Pca15rAuthenticatedSession>([
    [
      SUPER_ID,
      {
        userId: SUPER_ID,
        accessToken: "super-access-token",
        async revoke() {
          events.push("revoke:super_admin");
        },
      },
    ],
    [
      MEMBER_ID,
      {
        userId: MEMBER_ID,
        accessToken: "member-access-token",
        async revoke() {
          events.push("revoke:tenant_member");
        },
      },
    ],
  ]);
  return {
    async authenticateOperator() {
      events.push("auth:operator");
      return "66666666-6666-4666-8666-666666666666";
    },
    async signIn(subject) {
      events.push(`auth:${subject.kind}`);
      return sessions.get(subject.userId)!;
    },
    async tenantRows() {
      events.push("db:tenant");
      return [{ id: TENANT_ID, slug: "pca11-hml" }];
    },
    async globalSuperAdminRows() {
      events.push("db:super_admin");
      return [{ role: "super_admin" }];
    },
    async activeMembershipRows() {
      events.push("db:membership");
      return [{ membership_status: "active", tenant_role: "owner" }];
    },
    async resolveTenantContext(accessToken) {
      events.push(
        accessToken === "super-access-token" ? "rpc:impersonation" : "rpc:member_selection",
      );
      return TENANT_ID;
    },
  };
}

function terminalEvidence(versionCount = 3): Pca15rTerminalEvidence {
  return {
    method: "GET_ONLY",
    workerId: PCA11_DEDICATED_WORKER,
    expectedVersionObserved: true,
    versionCount,
    deploymentCount: 0,
    routeCount: 0,
    customDomainCount: 0,
    cronCount: 0,
    accessAppCount: 0,
    reusablePolicyCount: 0,
    serviceTokenCount: 0,
    workersDevEnabled: false,
    previewsEnabled: false,
  };
}

const custodyEvents: string[] = [];
const custody = await verifyPca15rManagedCustody(authenticatedRequest(), SOURCE_MAIN, {
  readEnvironment,
  gateway: makeGateway(custodyEvents),
});
assert.equal(custody.publicEvidence.syntheticIdentityCount, 2);
assert.equal(custody.publicEvidence.passwordGrantVerifiedCount, 2);
assert.equal(custody.publicEvidence.explicitImpersonationVerified, true);
assert.equal(custody.publicEvidence.memberTenantSelectionVerified, true);
assert.deepEqual(custody.publicEvidence.exportedSecretNames, []);
assert.deepEqual(custodyEvents, [
  "auth:operator",
  "db:tenant",
  "auth:super_admin",
  "auth:tenant_member",
  "db:super_admin",
  "db:membership",
  "rpc:impersonation",
  "rpc:member_selection",
  "revoke:super_admin",
  "revoke:tenant_member",
]);
const serializedCustody = JSON.stringify(custody.publicEvidence);
for (const forbidden of [
  SUPER_ID,
  MEMBER_ID,
  TENANT_ID,
  "super.synthetic@example.invalid",
  "member.synthetic@example.invalid",
  SUPER_PASSWORD,
  MEMBER_PASSWORD,
  PROVIDER_TOKEN,
  SERVICE_ROLE,
]) {
  assert.ok(!serializedCustody.includes(forbidden), `custody response leaked ${forbidden}`);
}

await assert.rejects(
  verifyPca15rManagedCustody(
    new Request("https://runtime.invalid", {
      headers: { authorization: "Bearer proof", "x-tenant-id": TENANT_ID },
    }),
    SOURCE_MAIN,
    { readEnvironment, gateway: makeGateway() },
  ),
  (error: unknown) =>
    error instanceof Pca15rManagedCustodyError && error.code === "pca15r_tenant_header_prohibited",
);

const failingGateway = makeGateway();
failingGateway.signIn = async () => {
  throw new Pca15rManagedCustodyError("pca15r_synthetic_auth_failed", 409);
};
const readNames: string[] = [];
let providerExecutorCalled = false;
await assert.rejects(
  executePca15rManagedCustodyProvisioning(authenticatedRequest(), validBody(), {
    readEnvironment: (name) => {
      readNames.push(name);
      return environment[name];
    },
    gateway: failingGateway,
    executeManagedBinding: async () => {
      providerExecutorCalled = true;
      throw new Error("must_not_run");
    },
  }),
  (error: unknown) =>
    error instanceof Pca15rManagedCustodyError && error.code === "pca15r_synthetic_auth_failed",
);
assert.equal(providerExecutorCalled, false);
assert.ok(
  !readNames.includes(PCA15R_PROVISIONER_ENVIRONMENT_NAME),
  "Cloudflare credential must not be read before Auth verification",
);

const orderedEvents: string[] = [];
const executed = await executePca15rManagedCustodyProvisioning(
  authenticatedRequest(),
  validBody(),
  {
    readEnvironment,
    gateway: makeGateway(orderedEvents),
    executeManagedBinding: async (_request, body, dependencies) => {
      orderedEvents.push("cloudflare:version");
      assert.equal(
        dependencies.readEnvironment?.("CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER"),
        PROVIDER_TOKEN,
      );
      assert.deepEqual(body, {
        ceremony_id: validBody().ceremony_id,
        expected_worker_id: PCA11_DEDICATED_WORKER,
        expected_bootstrap_version_id: BOOTSTRAP_ID,
        expected_source_fingerprint: SOURCE_FINGERPRINT,
        phase: "canary",
      });
      return {
        ok: true,
        phase: "canary",
        ceremonyId: validBody().ceremony_id,
        workerId: PCA11_DEDICATED_WORKER,
        bootstrapVersionId: BOOTSTRAP_ID,
        createdVersionId: VERSION_ID,
        sourceFingerprint: SOURCE_FINGERPRINT,
        reconciledExistingVersion: false,
        activeDeploymentUnchanged: true,
        deployed: false,
        bindingNames: ["ASSETS"],
        secretBindingNames: [],
        unavailableProviderBindings: [],
      };
    },
    reconcileTerminal: async (token, versionId) => {
      orderedEvents.push("cloudflare:get_only_terminal");
      assert.equal(token, PROVIDER_TOKEN);
      assert.equal(versionId, VERSION_ID);
      return terminalEvidence();
    },
  },
);
assert.ok(
  orderedEvents.indexOf("rpc:member_selection") < orderedEvents.indexOf("cloudflare:version"),
  "Auth/membership/impersonation must precede Cloudflare creation",
);
assert.ok(
  orderedEvents.indexOf("cloudflare:version") <
    orderedEvents.indexOf("cloudflare:get_only_terminal"),
  "GET-only terminal reconciliation must run after version creation",
);
const serializedExecution = JSON.stringify(executed);
for (const forbidden of [PROVIDER_TOKEN, SERVICE_ROLE, SUPER_PASSWORD, MEMBER_PASSWORD]) {
  assert.ok(!serializedExecution.includes(forbidden));
}
assert.equal(executed.sourceAuthority, "GITHUB_MAIN_ACCEPTED_HEAD");
assert.equal(executed.terminalReconciliation.method, "GET_ONLY");

const cloudflareCalls: Array<{ method: string; url: string }> = [];
const cloudflareFetcher: typeof fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init.method ?? "GET").toUpperCase();
  cloudflareCalls.push({ method, url });
  assert.equal(method, "GET");
  assert.equal(new Headers(init.headers).get("authorization"), `Bearer ${PROVIDER_TOKEN}`);
  const envelope = (result: unknown) =>
    Response.json({
      success: true,
      result,
      result_info: { page: 1, total_pages: 1 },
    });
  if (url.includes("/versions?")) return envelope({ items: [{ id: VERSION_ID }] });
  if (url.endsWith("/deployments")) return envelope({ deployments: [] });
  if (url.endsWith("/subdomain")) {
    return envelope({ enabled: false, previews_enabled: false });
  }
  if (url.endsWith("/schedules")) return envelope({ schedules: [] });
  if (url.includes("/zones?") && !url.includes("/workers/routes")) {
    return envelope([{ id: "zone-synthetic" }]);
  }
  return envelope([]);
};
const terminal = await reconcilePca15rTerminalStateGetOnly(PROVIDER_TOKEN, VERSION_ID, {
  fetcher: cloudflareFetcher,
});
assert.deepEqual(terminal, terminalEvidence(1));
assert.ok(cloudflareCalls.length >= 10);
assert.ok(cloudflareCalls.every(({ method }) => method === "GET"));
for (const requiredPath of [
  "/access/apps",
  "/access/policies",
  "/access/service_tokens",
  "/workers/domains",
  "/workers/routes",
  "/deployments",
  "/subdomain",
  "/schedules",
]) {
  assert.ok(
    cloudflareCalls.some(({ url }) => url.includes(requiredPath)),
    `${requiredPath} not read`,
  );
}

await assert.rejects(
  reconcilePca15rTerminalStateGetOnly(PROVIDER_TOKEN, VERSION_ID, {
    fetcher: async (input, init = {}) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/access/apps")) {
        return Response.json({
          success: true,
          result: [{ id: "residual-access-app" }],
          result_info: { total_pages: 1 },
        });
      }
      return cloudflareFetcher(input, init);
    },
  }),
  (error: unknown) =>
    error instanceof Pca15rTerminalReconciliationError &&
    error.code === "pca15r_access_app_not_zero",
);

const handler = await handlePca15rManagedCustodyProvisionRequest(authenticatedRequest(), {
  execute: async () => executed,
});
assert.equal(handler.status, 201);
assert.equal(handler.headers.get("cache-control"), "no-store");
assert.equal((await handler.json()).serviceRoleExported, false);
const methodResponse = await handlePca15rManagedCustodyProvisionRequest(
  new Request("https://runtime.invalid", { method: "GET" }),
);
assert.equal(methodResponse.status, 405);
assert.equal(methodResponse.headers.get("allow"), "POST");

const sourceFiles = [
  "src/lib/pca-15r/managed-custody.server.ts",
  "src/lib/pca-15r/managed-custody-provisioning.server.ts",
  "src/lib/pca-15r/cloudflare-terminal-reconciliation.server.ts",
  "src/routes/api/internal/pca-15r-managed-custody-provision.ts",
].map((path) => readFileSync(path, "utf8"));
const sourceText = sourceFiles.join("\n");
assert.ok(!sourceText.includes(SUPER_ID));
assert.ok(!sourceText.includes(MEMBER_ID));
assert.ok(!sourceText.includes(TENANT_ID));
assert.ok(!sourceText.includes("VITE_SUPABASE_SERVICE_ROLE_KEY"));
assert.ok(!sourceText.includes("VITE_PCA15R_SYNTHETIC_AUTH_CUSTODY_JSON"));
assert.match(sourceText, /process\.env\[name\]/);
assert.match(sourceText, /PCA15R_SYNTHETIC_AUTH_CUSTODY_JSON/);

const reconciliationManifest = JSON.parse(
  readFileSync(
    "docs/architecture/impact-analysis/manifests/PCA-15R-managed-custody-source-reconciliation-manifest.json",
    "utf8",
  ),
) as {
  source: {
    baseHead: string;
    lovableHead: string;
    lovableCommitsClassified: number;
    lovableCommitsPromoted: number;
    lovableCommitClassifications: Array<{ sha: string; classification: string }>;
  };
  controls: Record<string, boolean | number>;
};
assert.equal(reconciliationManifest.source.baseHead, SOURCE_MAIN);
assert.equal(reconciliationManifest.source.lovableHead, "b48ebd7905b9fcc1d496d69df0e2ff46abb6c1f9");
assert.equal(reconciliationManifest.source.lovableCommitsClassified, 26);
assert.equal(reconciliationManifest.source.lovableCommitsPromoted, 0);
assert.equal(reconciliationManifest.source.lovableCommitClassifications.length, 26);
assert.equal(
  new Set(reconciliationManifest.source.lovableCommitClassifications.map(({ sha }) => sha)).size,
  26,
);
assert.ok(
  reconciliationManifest.source.lovableCommitClassifications.every(
    ({ sha, classification }) => /^[0-9a-f]{40}$/.test(sha) && classification.length > 0,
  ),
);
assert.equal(reconciliationManifest.controls.providerWrites, 0);
assert.equal(reconciliationManifest.controls.cloudflareCalls, 0);
assert.equal(reconciliationManifest.controls.supabaseCalls, 0);
assert.equal(reconciliationManifest.controls.lovableCalls, 0);
assert.equal(reconciliationManifest.controls.lsr02DiffPaths, 0);
assert.equal(reconciliationManifest.controls.prM3FrontendBlocked, false);

const impactAnalysis = readFileSync(
  "docs/architecture/impact-analysis/PCA-15R-managed-custody-source-reconciliation-repository-corrective.md",
  "utf8",
);
for (const { sha, classification } of reconciliationManifest.source.lovableCommitClassifications) {
  assert.ok(impactAnalysis.includes(sha.slice(0, 12)));
  assert.ok(impactAnalysis.includes(classification));
}

const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (head !== SOURCE_MAIN) {
  execFileSync("git", ["merge-base", "--is-ancestor", SOURCE_MAIN, head]);
  const changed = execFileSync("git", ["diff", "--name-only", `${SOURCE_MAIN}..${head}`], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .sort();
  const p0VisualProductHomologationPaths = [
    ".github/workflows/p0-visual-product-homologation-gate.yml",
    "package.json",
    "run-p0-visual-product-homologation-specs.ts",
    "run-pr-m2-portal-functional-completion-specs.ts",
    "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
    "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
    "src/components/dashboard/DashboardInsightFeed.tsx",
    "src/components/dashboard/DashboardVisualizations.tsx",
    "src/components/demo/DemoWorkspace.tsx",
    "src/components/demo/demo-data.ts",
    "src/components/workspace/contexts.ts",
    "src/lib/ui-labels.ts",
    "src/routeTree.gen.ts",
    "src/routes/_authenticated.admin.marketing.tsx",
    "src/routes/_authenticated.admin.portais.tsx",
    "src/routes/_authenticated.admin.tracking.tsx",
    "src/routes/auth.tsx",
    "src/routes/demonstracao.tsx",
    "src/routes/design-system.tsx",
  ].sort();
  assert.deepEqual(
    changed,
    [...new Set([...PCA15R_PATHS, ...p0VisualProductHomologationPaths])].sort(),
  );
  assert.ok(!changed.includes(".env"));
  assert.ok(!changed.includes("src/integrations/supabase/types.ts"));
  assert.ok(!changed.includes("src/lib/tenant.server.ts"));
  assert.ok(!changed.some((path) => path.startsWith("supabase/migrations/")));
  assert.ok(!changed.some((path) => path.includes("LSR-02") || path.includes("lsr-02")));
}

console.log("PCA-15R managed custody, source reconciliation, and GET-only terminal specs: PASS");
