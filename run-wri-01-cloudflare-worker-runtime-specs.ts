import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CloudflareRuntimeContextError,
  clearCloudflareRuntimeContext,
  installCloudflareRuntimeContext,
  isCloudflareRuntimeRequest,
  readAuthoritativeCloudflareRuntimeContext,
  requireCloudflareRuntimeContext,
  type CloudflareExecutionContext,
} from "./src/lib/runtime/cloudflare-runtime-context.server";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
let assertions = 0;

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function match(value: string, pattern: RegExp, message: string): void {
  assert.match(value, pattern, message);
  assertions += 1;
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function runtimeRequest(
  url: string,
  env: Record<string, unknown>,
  context: CloudflareExecutionContext,
): Request {
  const request = new Request(url);
  Object.defineProperty(request, "runtime", {
    configurable: true,
    enumerable: false,
    value: { name: "cloudflare", cloudflare: { env, context } },
  });
  return request;
}

const waitUntilA: Promise<unknown>[] = [];
const waitUntilB: Promise<unknown>[] = [];
const contextA: CloudflareExecutionContext = {
  waitUntil(promise) {
    waitUntilA.push(promise);
  },
};
const contextB: CloudflareExecutionContext = {
  waitUntil(promise) {
    waitUntilB.push(promise);
  },
};
const envA = { REQUEST_MARKER: "A" };
const envB = { REQUEST_MARKER: "B" };
const requestA = runtimeRequest("https://a.example.test", envA, contextA);
const requestB = runtimeRequest("https://b.example.test", envB, contextB);

ok(isCloudflareRuntimeRequest(requestA), "Cloudflare runtime marker must be explicit");
const authoritativeA = readAuthoritativeCloudflareRuntimeContext(requestA);
ok(authoritativeA, "Authoritative request runtime must be readable");
equal(authoritativeA.env, envA, "Request A env must retain exact identity");
equal(authoritativeA.ctx, contextA, "Request A context must retain exact identity");

installCloudflareRuntimeContext(requestA, authoritativeA);
const authoritativeB = readAuthoritativeCloudflareRuntimeContext(requestB);
ok(authoritativeB, "Request B authoritative runtime must be readable");
installCloudflareRuntimeContext(requestB, authoritativeB);
equal(requireCloudflareRuntimeContext(requestA).env.REQUEST_MARKER, "A", "Request A must stay isolated");
equal(requireCloudflareRuntimeContext(requestB).env.REQUEST_MARKER, "B", "Request B must stay isolated");
clearCloudflareRuntimeContext(requestA);
equal(requireCloudflareRuntimeContext(requestB).env.REQUEST_MARKER, "B", "Clearing A must not clear B");

assert.throws(
  () => requireCloudflareRuntimeContext(requestA),
  (error) => error instanceof CloudflareRuntimeContextError && error.code === "cloudflare_runtime_context_missing",
  "Cleared runtime context must fail closed",
);
assertions += 1;
clearCloudflareRuntimeContext(requestB);

const malformed = new Request("https://invalid.example.test");
Object.defineProperty(malformed, "runtime", {
  configurable: true,
  value: { name: "cloudflare", cloudflare: { env: null, context: {} } },
});
assert.throws(
  () => readAuthoritativeCloudflareRuntimeContext(malformed),
  (error) => error instanceof CloudflareRuntimeContextError && error.code === "cloudflare_runtime_context_invalid",
  "Malformed Cloudflare runtime data must fail closed",
);
assertions += 1;

const ordinaryRequest = new Request("https://local.example.test");
equal(isCloudflareRuntimeRequest(ordinaryRequest), false, "Local/Lovable requests must remain non-Cloudflare");
equal(readAuthoritativeCloudflareRuntimeContext(ordinaryRequest), null, "Non-Cloudflare requests must not fabricate runtime context");

const vite = read("vite.config.ts");
const server = read("src/server.ts");
const plugin = read("src/lib/runtime/wri-01-cloudflare-nitro-plugin.server.ts");
const runtimeContext = read("src/lib/runtime/cloudflare-runtime-context.server.ts");
const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string>; devDependencies?: Record<string, string> };
const wrangler = JSON.parse(read("wrangler.jsonc")) as Record<string, any>;

match(vite, /@lovable\.dev\/vite-tanstack-config/, "Lovable/TanStack config must remain build authority");
match(vite, /nitro:\s*\{[\s\S]*plugins:\s*\[wri01RuntimePlugin\]/, "One Nitro runtime plugin must be registered");
equal(vite.includes("@cloudflare/vite-plugin"), false, "Cloudflare Vite plugin must remain absent");
equal(count(vite, "wri-01-cloudflare-nitro-plugin.server.ts"), 1, "Runtime bridge must be registered exactly once");

match(server, /export async function fetch\(/, "Named fetch boundary must remain exported");
match(server, /export async function scheduled\(/, "Named scheduled boundary must remain exported");
match(server, /export default \{ fetch, scheduled \}/, "Default entry must expose both boundaries");
match(server, /requireCloudflareRuntimeContext\(request\)/, "Cloudflare request path must require installed context");
match(server, /status:\s*503/, "Missing Cloudflare context must fail closed with 503");
equal(server.includes("/__scheduled"), false, "Production scheduler must not be exposed through HTTP");
match(server, /processScheduledDomainJobs\(\{ runtimeEnv: env, limit: 20 \}\)/, "Scheduled boundary must delegate to DCA-01 exactly");
match(server, /ctx\.waitUntil\(execution\)/, "Scheduled execution must use waitUntil");

match(plugin, /readAuthoritativeCloudflareRuntimeContext\(event\.req\)/, "Plugin must read exact Nitro-augmented request context");
match(plugin, /installCloudflareRuntimeContext\(event\.req, context\)/, "Plugin must install request-scoped context");
match(plugin, /clearCloudflareRuntimeContext\(event\.req\)/, "Plugin must clear request-scoped context");
equal(count(plugin, 'hooks.hook("cloudflare:scheduled"'), 1, "Exactly one scheduled-hook consumer is allowed");
match(plugin, /scheduled\(controller, env, context\)/, "Scheduled hook must delegate original platform values");
equal(plugin.includes("fetch("), false, "Plugin must not create a second Worker fetch entry");

match(runtimeContext, /new WeakMap<Request, CloudflareRuntimeContext>/, "Runtime context storage must be request-keyed");
equal(runtimeContext.includes("let current"), false, "Global current-context singleton is prohibited");

const requiredWrangler = {
  name: "rm-prime-wri01-hml",
  main: "dist/server/index.mjs",
  workers_dev: true,
  no_bundle: true,
};
for (const [key, expected] of Object.entries(requiredWrangler)) {
  equal(wrangler[key], expected, `wrangler.${key} must be deterministic`);
}
equal(wrangler.assets?.directory, "dist/client", "Wrangler assets directory must match Nitro output");
equal(wrangler.assets?.binding, "ASSETS", "Wrangler assets binding must be explicit");
equal(wrangler.compatibility_flags?.includes("nodejs_compat"), true, "nodejs_compat must remain enabled");
equal(wrangler.observability?.enabled, true, "Worker observability must be enabled");
equal(wrangler.triggers?.crons?.[0], "*/5 * * * *", "Cron must be the approved UTC expression");
equal(Array.isArray(wrangler.routes) && wrangler.routes.length, 0, "Repository implementation must contain no zone route");
equal(wrangler.env?.homologation?.name, "rm-prime-wri01-hml", "Homologation Worker name must be explicit");
equal(wrangler.env?.homologation?.routes?.length, 0, "Homologation environment must contain no zone route");

ok(packageJson.scripts["test:wri-01"], "WRI-01 deterministic test script must exist");
ok(packageJson.scripts["wri01:bundle-audit"], "WRI-01 bundle audit script must exist");
ok(packageJson.scripts["wri01:dry-run"], "WRI-01 dry-run script must exist");
equal("@cloudflare/vite-plugin" in (packageJson.devDependencies ?? {}), false, "A second build authority is prohibited");

const serializedWrangler = JSON.stringify(wrangler);
equal(serializedWrangler.includes("68ec853e6b04a038f09fca5712d6b26b"), false, "Cloudflare account ID must not be persisted");
equal(serializedWrangler.includes("90832d0006e9e630dbb73d33c551d836"), false, "Cloudflare zone ID must not be persisted");
equal(serializedWrangler.includes("SUPABASE_SERVICE_ROLE_KEY"), false, "Secret values and secret declarations stay outside versioned config");

console.log(`WRI-01 runtime integration specs passed: ${assertions} assertions`);
