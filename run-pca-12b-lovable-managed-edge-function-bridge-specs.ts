import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  executePca11ManagedBindingProvisioning,
  parsePca11ManagedBindingRequest,
  PCA11_DEDICATED_WORKER,
  PCA11_EDGE_BINDING_CONTRACT,
  PCA11_PROVISIONER_ENVIRONMENT_NAME,
  Pca11ProvisioningError,
  sha256WithWebCrypto,
  type Pca11Sha256,
} from "./supabase/functions/_shared/pca11-managed-binding-core";
import {
  PCA11_DEDICATED_WORKER as NODE_PCA11_WORKER,
  PCA11_PREVIEW_ALIAS as NODE_PCA11_ALIAS,
  resolveManagedInactiveVersionTarget,
} from "./src/lib/cloudflare/managed-inactive-version-contract.server";
import {
  buildContract,
  LOCAL_EQUIVALENT_BASE,
  MANIFEST_PATH,
  SOURCE_PROTECTED_MAIN,
  SOURCE_TREE,
} from "./scripts/build-pca-12b-lovable-managed-edge-function-bridge.mjs";

function commitExists(sha: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const requestedBaseCommit = process.env.PCA_12B_BASE_SHA?.trim();
if (requestedBaseCommit) assert.match(requestedBaseCommit, /^[0-9a-f]{40}$/);
const BASE_COMMIT =
  requestedBaseCommit ??
  (commitExists(SOURCE_PROTECTED_MAIN) ? SOURCE_PROTECTED_MAIN : LOCAL_EQUIVALENT_BASE);
assert.ok(commitExists(BASE_COMMIT), `PCA-12B base commit is unavailable: ${BASE_COMMIT}`);
const BOOTSTRAP_ID = "11111111-1111-4111-8111-111111111111";
const CANARY_ID = "22222222-2222-4222-8222-222222222222";
const FINAL_ID = "33333333-3333-4333-8333-333333333333";
const SOURCE = "export default { fetch() { return new Response('pca11'); } };";
const COMPATIBILITY_DATE = "2026-08-30";
const COMPATIBILITY_FLAGS = ["nodejs_compat"];

const nodeSha256: Pca11Sha256 = async (chunks) => {
  const hash = createHash("sha256");
  for (const chunk of chunks) hash.update(chunk);
  return hash.digest("hex");
};
const digestParityChunks = ["prefix", new Uint8Array([0, 1, 2, 255]), "suffix"];
assert.equal(await sha256WithWebCrypto(digestParityChunks), await nodeSha256(digestParityChunks));

const expectedFingerprint = createHash("sha256")
  .update("index.mjs")
  .update(COMPATIBILITY_DATE)
  .update(JSON.stringify(COMPATIBILITY_FLAGS))
  .update(JSON.stringify([{ name: "ASSETS", type: "assets" }]))
  .update("index.mjs")
  .update("index.mjs")
  .update(new TextEncoder().encode(SOURCE))
  .digest("hex");

const validRequest = (phase: "canary" | "final") => ({
  ceremony_id: "pca12b:bridge:2026-08-30",
  expected_worker_id: PCA11_DEDICATED_WORKER,
  expected_bootstrap_version_id: BOOTSTRAP_ID,
  expected_source_fingerprint: expectedFingerprint,
  phase,
});

assert.deepEqual(parsePca11ManagedBindingRequest(validRequest("canary")), validRequest("canary"));
assert.throws(
  () => parsePca11ManagedBindingRequest({ ...validRequest("canary"), tenant_id: "forbidden" }),
  (error: unknown) =>
    error instanceof Pca11ProvisioningError && error.code === "pca11_unknown_or_sensitive_field",
);
assert.throws(
  () =>
    parsePca11ManagedBindingRequest({
      ...validRequest("canary"),
      expected_worker_id: "rm-prime-wri01-hml",
    }),
  (error: unknown) =>
    error instanceof Pca11ProvisioningError && error.code === "pca11_worker_mismatch",
);

const nodeTarget = resolveManagedInactiveVersionTarget(NODE_PCA11_WORKER)!;
assert.equal(PCA11_DEDICATED_WORKER, NODE_PCA11_WORKER);
assert.equal(PCA11_EDGE_BINDING_CONTRACT.previewAlias, NODE_PCA11_ALIAS);
assert.deepEqual(
  PCA11_EDGE_BINDING_CONTRACT.canaryBindingNames,
  nodeTarget.canaryBindings.map(({ name }) => name).sort(),
);
assert.deepEqual(
  PCA11_EDGE_BINDING_CONTRACT.finalBindingNames,
  nodeTarget.finalBindings.map(({ name }) => name).sort(),
);
assert.equal(PCA11_EDGE_BINDING_CONTRACT.expectedActiveDeploymentCount, 0);
assert.ok(
  !PCA11_EDGE_BINDING_CONTRACT.finalBindingNames.includes(PCA11_PROVISIONER_ENVIRONMENT_NAME),
);

type StoredVersion = {
  annotations: Record<string, string>;
  resources: { bindings: Array<Record<string, unknown>> };
};
const stored = new Map<string, StoredVersion>();
const calls: Array<{ method: string; url: string }> = [];
const providerToken = "provider-token-must-never-leak";
const serviceRole = "service-role-must-never-leak";
const environment: Record<string, string> = {
  [PCA11_PROVISIONER_ENVIRONMENT_NAME]: providerToken,
  SUPABASE_URL: "https://canonical.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
  SUPABASE_SERVICE_ROLE_KEY: serviceRole,
  RM_PRIME_AUTH_SITE_ORIGIN: "https://pca11-hml.example.invalid",
  RM_PRIME_EMAIL_SITE_NAME: "RM Prime PCA11",
  RM_PRIME_EMAIL_SENDER_DOMAIN: "mail.example.invalid",
  RM_PRIME_EMAIL_FROM_DOMAIN: "from.example.invalid",
};
const jsonEnvelope = (result: unknown) => Response.json({ success: true, result });

const fetcher: typeof fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init.method ?? "GET").toUpperCase();
  calls.push({ method, url });
  assert.equal(new Headers(init.headers).get("authorization"), `Bearer ${providerToken}`);

  if (url.endsWith("/deployments")) return jsonEnvelope({ deployments: [] });
  if (url.endsWith("/subdomain")) return jsonEnvelope({ enabled: false, previews_enabled: false });
  if (url.endsWith("/schedules")) return jsonEnvelope({ schedules: [] });
  if (url.endsWith("/content/v2")) {
    const form = new FormData();
    form.set("index.mjs", new File([SOURCE], "index.mjs", { type: "application/javascript" }));
    return new Response(form);
  }
  if (url.endsWith(`/versions/${BOOTSTRAP_ID}`)) {
    return jsonEnvelope({
      resources: {
        script_runtime: {
          compatibility_date: COMPATIBILITY_DATE,
          compatibility_flags: COMPATIBILITY_FLAGS,
        },
        bindings: [{ name: "ASSETS", type: "assets" }],
      },
    });
  }
  const detailMatch = url.match(/\/versions\/([0-9a-f-]+)$/i);
  if (method === "GET" && detailMatch) return jsonEnvelope(stored.get(detailMatch[1]));
  if (url.endsWith("/versions?per_page=100")) {
    return jsonEnvelope({
      items: [...stored].map(([id, detail]) => ({ id, annotations: detail.annotations })),
    });
  }
  if (method === "POST" && url.endsWith("/versions")) {
    assert.ok(init.body instanceof FormData);
    const metadata = JSON.parse(String(init.body.get("metadata"))) as {
      annotations: Record<string, string>;
      bindings: Array<Record<string, unknown>>;
    };
    const isFinal = metadata.annotations["workers/tag"].startsWith("pca11-final-");
    assert.equal(metadata.annotations["workers/alias"], isFinal ? "pca11-hml" : undefined);
    assert.ok(!metadata.bindings.some(({ name }) => name === PCA11_PROVISIONER_ENVIRONMENT_NAME));
    const id = isFinal ? FINAL_ID : CANARY_ID;
    stored.set(id, {
      annotations: metadata.annotations,
      resources: { bindings: metadata.bindings },
    });
    return jsonEnvelope({ id });
  }
  throw new Error(`unexpected_provider_request:${method}:${url}`);
};

let providerCalls = 0;
await assert.rejects(
  executePca11ManagedBindingProvisioning(validRequest("canary"), {
    fetcher: async (...args) => {
      providerCalls += 1;
      return fetcher(...args);
    },
    readEnvironment: () => undefined,
    sha256: nodeSha256,
  }),
  (error: unknown) =>
    error instanceof Pca11ProvisioningError && error.code === "pca11_missing_server_dependency",
);
assert.equal(providerCalls, 0, "secretless preflight must fail before every provider request");

const dependencies = {
  fetcher,
  readEnvironment: (name: string) => environment[name],
  sha256: nodeSha256,
};
const canary = await executePca11ManagedBindingProvisioning(validRequest("canary"), dependencies);
assert.equal(canary.createdVersionId, CANARY_ID);
assert.equal(canary.deployed, false);
assert.equal(canary.secretBindingNames.length, 0);
assert.deepEqual(canary.bindingNames, PCA11_EDGE_BINDING_CONTRACT.canaryBindingNames);

const final = await executePca11ManagedBindingProvisioning(validRequest("final"), dependencies);
assert.equal(final.createdVersionId, FINAL_ID);
assert.equal(final.deployed, false);
assert.deepEqual(final.secretBindingNames, ["SUPABASE_SERVICE_ROLE_KEY"]);
assert.deepEqual(final.unavailableProviderBindings, [
  "CLOUDFLARE_API_TOKEN_DCA01_HML",
  "LOVABLE_API_KEY",
  "PORTAL_DLQ_RETRY_SECRET",
]);
const reconciled = await executePca11ManagedBindingProvisioning(
  validRequest("final"),
  dependencies,
);
assert.equal(reconciled.createdVersionId, FINAL_ID);
assert.equal(reconciled.reconciledExistingVersion, true);

const serializedResults = JSON.stringify([canary, final, reconciled]);
assert.ok(!serializedResults.includes(providerToken));
assert.ok(!serializedResults.includes(serviceRole));
assert.ok(
  calls.every(
    ({ method, url }) => method === "GET" || (method === "POST" && /\/versions$/.test(url)),
  ),
);
assert.ok(
  !calls.some(
    ({ method, url }) =>
      method !== "GET" && /\/(deployments|subdomain|schedules|routes)(?:$|\?)/.test(url),
  ),
);

const edgeEntrypoint = readFileSync(
  "supabase/functions/pca-11-managed-binding-provision/index.ts",
  "utf8",
);
assert.match(edgeEntrypoint, /npm:@supabase\/supabase-js@2\.108\.2/);
assert.match(edgeEntrypoint, /Deno\.serve/);
assert.match(edgeEntrypoint, /auth\.getClaims\(token\)/);
assert.match(edgeEntrypoint, /\.from\("user_roles"\)/);
assert.match(edgeEntrypoint, /\.eq\("role", "super_admin"\)/);
assert.match(edgeEntrypoint, /SUPABASE_PUBLISHABLE_KEYS/);
assert.match(edgeEntrypoint, /SUPABASE_SECRET_KEYS/);
assert.doesNotMatch(edgeEntrypoint, /console\.(?:log|error|warn)/);

const supabaseConfig = readFileSync("supabase/config.toml", "utf8");
assert.match(supabaseConfig, /^project_id = "rm-prime-local"$/m);
assert.match(
  supabaseConfig,
  /^\[functions\.pca-11-managed-binding-provision\]\nverify_jwt = true$/m,
);
assert.doesNotMatch(supabaseConfig, /stmcnvzuzlyqammyycxj/);

assert.equal(SOURCE_PROTECTED_MAIN, "ba70d12ec8c5a2340d4399748ccd58c7d0ad432f");
assert.equal(SOURCE_TREE, "f8204bc1a2bf6df66db533a5fc00ff8213aabc01");
assert.equal(LOCAL_EQUIVALENT_BASE, "23acdeba078d9797d48512e5def9b9ac9395b1fa");
assert.deepEqual(JSON.parse(readFileSync(MANIFEST_PATH, "utf8")), buildContract());

for (const frozenPath of [
  "src/lib/cloudflare/managed-inactive-version-contract.server.ts",
  "src/lib/spr-03/managed-secret-provisioning.server.ts",
  "src/routes/api/internal/pca-11-managed-binding-provision.ts",
]) {
  const base = execFileSync("git", ["show", `${BASE_COMMIT}:${frozenPath}`]);
  const current = readFileSync(frozenPath);
  if (!base.equals(current) && frozenPath.endsWith("managed-secret-provisioning.server.ts")) {
    assert.match(
      current.toString("utf8"),
      /provisioningCode\(namespace, "missing_server_dependency"\)/,
    );
    assert.match(
      current.toString("utf8"),
      /authenticateGlobalSuperAdmin\(candidate, "pca11", readEnvironment\)/,
    );
    continue;
  }
  if (!base.equals(current) && frozenPath.endsWith("pca-11-managed-binding-provision.ts")) {
    assert.match(current.toString("utf8"), /handlePca11ManagedBindingProvisionRequest/);
    continue;
  }
  assert.ok(
    base.equals(current),
    `frozen PCA-11R authority changed outside PCA-12C-R3: ${frozenPath}`,
  );
}

const allowedPaths = [
  ".github/workflows/release-gate.yml",
  "docs/architecture/governance/PCA-12B-lovable-managed-edge-function-bridge-envelope.md",
  "docs/architecture/impact-analysis/PCA-12B-lovable-managed-edge-function-bridge-repository-implementation.md",
  "docs/architecture/impact-analysis/manifests/PCA-12B-lovable-managed-edge-function-bridge-manifest.json",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-12b-lovable-managed-edge-function-bridge.md",
  "package.json",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "scripts/build-pca-12b-lovable-managed-edge-function-bridge.mjs",
  "supabase/config.toml",
  "supabase/functions/_shared/pca11-managed-binding-core.ts",
  "supabase/functions/pca-11-managed-binding-provision/index.ts",
].sort();
const pca12cR3Paths = [
  ".github/workflows/release-gate.yml",
  "docs/architecture/governance/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-envelope.md",
  "docs/architecture/impact-analysis/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-repository-implementation.md",
  "docs/architecture/impact-analysis/manifests/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-manifest.json",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.md",
  "package.json",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-spr-03-worker-bootstrap-managed-secret-recovery-specs.ts",
  "scripts/build-pca-11r-preview-host-managed-binding-compatibility.mjs",
  "scripts/build-pca-12b-lovable-managed-edge-function-bridge.mjs",
  "scripts/build-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.mjs",
  "src/lib/spr-03/managed-secret-provisioning.server.ts",
  "src/routes/api/internal/pca-11-managed-binding-provision.ts",
].sort();
const changedPaths = execFileSync("git", ["diff", "--name-only", BASE_COMMIT, "HEAD"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .sort();
const downstreamAllowedPaths = new Set([...allowedPaths, ...pca12cR3Paths]);
assert.deepEqual(
  changedPaths.filter((path) => !downstreamAllowedPaths.has(path)),
  [],
  "PCA-12B plus sanctioned PCA-12C-R3 diff escaped the repository allowlist",
);
for (const path of allowedPaths) {
  assert.ok(changedPaths.includes(path), `PCA-12B historical path missing: ${path}`);
}

console.log("PCA-12B managed Edge Function bridge repository specs: PASS");
