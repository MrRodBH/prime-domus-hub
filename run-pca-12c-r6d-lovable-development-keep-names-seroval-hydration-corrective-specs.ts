import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { transform } from "esbuild";
import type { ConfigEnv, UserConfig } from "vite";
import {
  executePca11ManagedBindingProvisioning,
  PCA11_MANAGED_BINDING_CONTRACT,
} from "./src/lib/spr-03/managed-secret-provisioning.server";
import { PCA11_DEDICATED_WORKER } from "./src/lib/cloudflare/managed-inactive-version-contract.server";
import { handlePca11ManagedBindingProvisionRequest } from "./src/routes/api/internal/pca-11-managed-binding-provision";
import viteConfigFactory from "./vite.config";

const SOURCE_MAIN = "8487d2325135f0b31bc9a69bd44b603204a8b69c";
const SOURCE_TREE = "5692746294767905387ce091f49a0581802fd75f";
const R6D_PATHS = [
  "docs/architecture/impact-analysis/manifests/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-manifest.json",
  "package.json",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-12c-r6d-lovable-development-keep-names-seroval-hydration-corrective-specs.ts",
  "scripts/build-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.mjs",
  "vite.config.ts",
].sort();

assert.equal(
  execFileSync("git", ["rev-parse", `${SOURCE_MAIN}^{tree}`], { encoding: "utf8" }).trim(),
  SOURCE_TREE,
);

const changedPaths = [
  ...execFileSync("git", ["diff", "--name-only", SOURCE_MAIN, "--"], {
    encoding: "utf8",
  }).split("\n"),
  ...execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    encoding: "utf8",
  }).split("\n"),
]
  .filter(Boolean)
  .sort();
assert.deepEqual(changedPaths, R6D_PATHS, "R6D diff escaped the closed repository allowlist");

const baselinePackage = JSON.parse(
  execFileSync("git", ["show", `${SOURCE_MAIN}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
for (const field of [
  "packageManager",
  "dependencies",
  "devDependencies",
  "pnpm",
  "overrides",
  "resolutions",
]) {
  assert.deepEqual(currentPackage[field], baselinePackage[field], `${field} must remain unchanged`);
}
assert.deepEqual(
  readFileSync("bun.lock"),
  execFileSync("git", ["show", `${SOURCE_MAIN}:bun.lock`]),
  "bun.lock must remain byte-identical",
);

const configEnvironment: ConfigEnv = {
  command: "build",
  mode: "development",
  isSsrBuild: true,
  isPreview: false,
};
assert.equal(typeof viteConfigFactory, "function");
const resolvedConfig = (await viteConfigFactory(configEnvironment)) as UserConfig;
assert.ok(resolvedConfig.esbuild && typeof resolvedConfig.esbuild === "object");
assert.equal(
  resolvedConfig.esbuild.keepNames,
  false,
  "project override must win over Lovable development keepNames=true",
);

const readableStreamFactorySource = `
const READABLE_STREAM_FACTORY_CONSTRUCTOR = (stream) =>
  new ReadableStream({
    start: controller => {
      stream.on({
        next: value => {
          try { controller.enqueue(value); } catch (_error) {}
        },
        throw: value => controller.error(value),
        return: () => {
          try { controller.close(); } catch (_error) {}
        },
      });
    },
  });
export { READABLE_STREAM_FACTORY_CONSTRUCTOR };
`;

async function transformAndSerialize(keepNames: boolean): Promise<string> {
  const transformed = await transform(readableStreamFactorySource, {
    loader: "ts",
    format: "esm",
    target: "es2022",
    keepNames,
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transformed.code).toString("base64")}`;
  const loaded = (await import(moduleUrl)) as {
    READABLE_STREAM_FACTORY_CONSTRUCTOR: Function;
  };
  return loaded.READABLE_STREAM_FACTORY_CONSTRUCTOR.toString();
}

type StreamCallbacks = {
  next(value: string): void;
  throw(value: unknown): void;
  return(): void;
};
const syntheticStream = {
  on(callbacks: StreamCallbacks) {
    callbacks.next("hydrated");
    callbacks.return();
  },
};
const evaluateFactory = (serialized: string) =>
  new Function("ReadableStream", `return (${serialized});`)(ReadableStream) as (
    stream: typeof syntheticStream,
  ) => ReadableStream<string>;

const positiveControl = await transformAndSerialize(true);
assert.match(positiveControl, /\b__name\b/, "positive control must reproduce helper leakage");
assert.throws(
  () => evaluateFactory(positiveControl)(syntheticStream),
  (error: unknown) => error instanceof ReferenceError && /__name/.test(error.message),
  "isolated keepNames=true factory must reproduce the missing helper failure",
);

const serializedFactory = await transformAndSerialize(resolvedConfig.esbuild.keepNames);
assert.doesNotMatch(serializedFactory, /\b__name\b/);
const hydratedStream = evaluateFactory(serializedFactory)(syntheticStream);
const reader = hydratedStream.getReader();
assert.deepEqual(await reader.read(), { value: "hydrated", done: false });
assert.deepEqual(await reader.read(), { value: undefined, done: true });

const serovalReadableStream = readFileSync(
  "node_modules/seroval-plugins/web/readable-stream.ts",
  "utf8",
);
assert.match(
  serovalReadableStream,
  /READABLE_STREAM_FACTORY_CONSTRUCTOR\.toString\(\)/,
  "proof must remain anchored to Seroval's Function.toString serialization path",
);

const router = readFileSync("src/router.tsx", "utf8");
const auth = readFileSync("src/routes/auth.tsx", "utf8");
const authenticated = readFileSync("src/routes/_authenticated.tsx", "utf8");
const provisioning = readFileSync("src/lib/spr-03/managed-secret-provisioning.server.ts", "utf8");
const provisioningRoute = readFileSync(
  "src/routes/api/internal/pca-11-managed-binding-provision.ts",
  "utf8",
);
assert.match(router, /setupRouterSsrQueryIntegration\(\{ router, queryClient \}\)/);
assert.match(auth, /supabase\.auth\.getUser\(\)/);
assert.match(auth, /supabase\.auth\.signInWithPassword\(\{ email, password \}\)/);
assert.match(authenticated, /const \{ data, error \} = await supabase\.auth\.getUser\(\)/);
assert.match(authenticated, /if \(error \|\| !data\.user\) throw redirect\(\{ to: "\/auth" \}\)/);
assert.match(provisioningRoute, /request\.headers\.has\("x-tenant-id"\)/);
assert.match(provisioning, /\.eq\("role", "super_admin"\)/);
assert.doesNotMatch(provisioning, /user_metadata/);

const validBody = {
  ceremony_id: "pca12c-r6d:secretless:2026-09-01",
  expected_worker_id: PCA11_DEDICATED_WORKER,
  expected_bootstrap_version_id: "11111111-1111-4111-8111-111111111111",
  expected_source_fingerprint: "a".repeat(64),
  phase: "canary" as const,
};
const request = new Request(
  "https://runtime.invalid/api/internal/pca-11-managed-binding-provision",
  {
    method: "POST",
    headers: {
      authorization: "Bearer authenticated-global-super-admin-proof",
      "content-type": "application/json",
    },
    body: JSON.stringify(validBody),
  },
);
let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  networkCalls += 1;
  throw new Error("network_call_prohibited_during_r6d_secretless_proof");
};
try {
  const response = await handlePca11ManagedBindingProvisionRequest(request, {
    execute: (candidate, body) =>
      executePca11ManagedBindingProvisioning(candidate, body, {
        authenticateGlobalSuperAdmin: async () => "global-super-admin-user-id",
        readEnvironment: () => undefined,
      }),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: "pca11_missing_server_dependency",
  });
  assert.equal(networkCalls, 0, "secretless failure must precede every Cloudflare request");
} finally {
  globalThis.fetch = originalFetch;
}
assert.equal(
  PCA11_MANAGED_BINDING_CONTRACT.provisionerEnvironmentName,
  "CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER",
);

console.log("PCA-12C-R6D keepNames/Seroval hydration corrective specs: PASS");
