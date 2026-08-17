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
const ok = (value: unknown, message: string) => { assert.ok(value, message); assertions += 1; };
const equal = (actual: unknown, expected: unknown, message: string) => { assert.equal(actual, expected, message); assertions += 1; };
const match = (value: string, pattern: RegExp, message: string) => { assert.match(value, pattern, message); assertions += 1; };
const count = (value: string, needle: string) => value.split(needle).length - 1;

function runtimeRequest(url: string, marker: string, context: CloudflareExecutionContext): Request {
  const request = new Request(url);
  Object.defineProperty(request, "runtime", {
    configurable: true,
    value: { name: "cloudflare", cloudflare: { env: { REQUEST_MARKER: marker }, context } },
  });
  return request;
}

const context: CloudflareExecutionContext = { waitUntil() {} };
const requestA = runtimeRequest("https://a.example.test", "A", context);
const requestB = runtimeRequest("https://b.example.test", "B", context);
ok(isCloudflareRuntimeRequest(requestA), "Cloudflare runtime marker must be explicit");
const parsedA = readAuthoritativeCloudflareRuntimeContext(requestA);
const parsedB = readAuthoritativeCloudflareRuntimeContext(requestB);
ok(parsedA && parsedB, "Authoritative Nitro runtime values must be readable");
installCloudflareRuntimeContext(requestA, parsedA!);
installCloudflareRuntimeContext(requestB, parsedB!);
equal(requireCloudflareRuntimeContext(requestA).env.REQUEST_MARKER, "A", "Request A must remain isolated");
equal(requireCloudflareRuntimeContext(requestB).env.REQUEST_MARKER, "B", "Request B must remain isolated");
clearCloudflareRuntimeContext(requestA);
equal(requireCloudflareRuntimeContext(requestB).env.REQUEST_MARKER, "B", "Clearing A must not clear B");
assert.throws(
  () => requireCloudflareRuntimeContext(requestA),
  (error) => error instanceof CloudflareRuntimeContextError && error.code === "cloudflare_runtime_context_missing",
);
assertions += 1;
clearCloudflareRuntimeContext(requestB);

const malformed = new Request("https://invalid.example.test");
Object.defineProperty(malformed, "runtime", { value: { name: "cloudflare", cloudflare: { env: null, context: {} } } });
assert.throws(
  () => readAuthoritativeCloudflareRuntimeContext(malformed),
  (error) => error instanceof CloudflareRuntimeContextError && error.code === "cloudflare_runtime_context_invalid",
);
assertions += 1;
const ordinary = new Request("https://local.example.test");
equal(isCloudflareRuntimeRequest(ordinary), false, "Local/Lovable requests must not fabricate Cloudflare context");
equal(readAuthoritativeCloudflareRuntimeContext(ordinary), null, "Non-Cloudflare context must remain absent");

const vite = read("vite.config.ts");
const server = read("src/server.ts");
const plugin = read("src/lib/runtime/wri-01-cloudflare-nitro-plugin.server.ts");
const runtime = read("src/lib/runtime/cloudflare-runtime-context.server.ts");
const workflow = read(".github/workflows/wri-01-worker-runtime-gate.yml");
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string>; devDependencies?: Record<string, string> };
const wrangler = JSON.parse(read("wrangler.jsonc")) as Record<string, any>;

match(vite, /@lovable\.dev\/vite-tanstack-config/, "Lovable/TanStack config must remain build authority");
match(vite, /nitro:\s*\{[\s\S]*plugins:\s*\[wri01RuntimePlugin\]/, "One Nitro bridge must be configured");
match(vite, /output:\s*\{[\s\S]*dir:\s*"dist"[\s\S]*serverDir:\s*"dist\/server"[\s\S]*publicDir:\s*"dist\/client"/, "Nitro output must match the versioned dist authority");
equal(vite.includes("@cloudflare/vite-plugin"), false, "Second build authority is prohibited");
equal(count(vite, "wri-01-cloudflare-nitro-plugin.server.ts"), 1, "Bridge registration cardinality must be one");

match(server, /export async function fetch\(/, "Named fetch boundary must be exported");
match(server, /export async function scheduled\(/, "Named scheduled boundary must be exported");
match(server, /export default \{[\s\S]*fetch,[\s\S]*async scheduled\(/, "Default Worker contract must expose fetch and scheduled");
match(server, /readAuthoritativeCloudflareRuntimeContext\(request\)/, "Cloudflare fetch must read Nitro's exact platform context directly");
equal(server.includes("requireCloudflareRuntimeContext(request)"), false, "Fetch boundary must not depend on a later Nitro request hook");
match(server, /status:\s*503/, "Missing runtime context must fail closed");
match(server, /processScheduledDomainJobs\(\{ runtimeEnv: env, limit: 20 \}\)/, "Scheduled boundary must delegate to DCA-01");
match(server, /ctx\.waitUntil\(execution\)/, "Scheduled work must use waitUntil");
equal(server.includes("/__scheduled"), false, "Application HTTP scheduler route is prohibited");

const hostValidationIndex = server.indexOf("requirePublicCloudflareHost(request, host)");
const exactPathBypassIndex = server.indexOf(
  "new URL(request.url).pathname === SECRETLESS_STRIPE_WEBHOOK_PATH",
);
const canonicalLookupIndex = server.indexOf("resolveCanonicalRedirectByHost(host)");
match(
  server,
  /const SECRETLESS_STRIPE_WEBHOOK_PATH = "\/api\/public\/hooks\/billing-stripe-webhook"/,
  "Secretless webhook bypass path must be pinned exactly",
);
ok(
  hostValidationIndex >= 0 &&
    exactPathBypassIndex > hostValidationIndex &&
    canonicalLookupIndex > exactPathBypassIndex,
  "Cloudflare host validation must precede exact-path bypass and canonical lookup",
);
equal(
  count(server, '"/api/public/hooks/billing-stripe-webhook"'),
  1,
  "Exact webhook bypass path must have cardinality one in the Worker boundary",
);
equal(server.includes("startsWith("), false, "Generic prefix bypass is prohibited");
equal(server.includes(".test("), false, "Regex bypass is prohibited");
equal(server.includes("request.method"), false, "Canonical bypass must not filter by method");
equal(server.includes("/api/public/*"), false, "Generic public API bypass is prohibited");

match(plugin, /readAuthoritativeCloudflareRuntimeContext\(event\.req\)/, "Plugin must read exact Nitro runtime data");
match(plugin, /installCloudflareRuntimeContext\(event\.req, context\)/, "Plugin must install request-scoped context");
match(plugin, /clearCloudflareRuntimeContext\(event\.req\)/, "Plugin must clear request-scoped context");
equal(count(plugin, 'hooks.hook("cloudflare:scheduled"'), 1, "Exactly one scheduled-hook consumer is allowed");
match(plugin, /scheduled\(controller, env, context\)/, "Hook must delegate original platform values");
equal(plugin.includes("fetch("), false, "Plugin must not create a second Worker entry");
match(runtime, /new WeakMap<Request, CloudflareRuntimeContext>/, "Runtime storage must be request-keyed");
equal(runtime.includes("let current"), false, "Global mutable current-context authority is prohibited");

match(workflow, /set -m[\s\S]*WRANGLER_PID=\$![\s\S]*set \+m/, "Local workerd proof must create a dedicated process group");
match(workflow, /kill -TERM -- "-\$\{WRANGLER_PGID\}"/, "Workerd process group must receive controlled termination");
match(workflow, /PROCESS_GROUP_MEMBER_COUNT_AFTER_TERMINATION/, "Process-group residue must be measured and published");
match(workflow, /WORKERD_RESIDUAL_COUNT_AFTER_TERMINATION/, "Residual workerd processes must be measured and published");
match(workflow, /ZERO_ORPHAN_PROCESSES_PROVED/, "Zero-orphan result must be explicit and auditable");
match(workflow, /if \[ "\$\{ZERO_ORPHAN_PROCESSES_PROVED\}" != "true" \]; then exit 1; fi/, "Local proof must fail closed when orphan cleanup is not proved");
for (const token of [
  "P8EE_T01_PROVED",
  "P8EE_T02_PROVED",
  "P8EE_T03_PROVED",
  "P8EE_T04_PROVED",
  "P8EE_T05_PROVED",
  "P8EE_T06_PROVED",
  "P8EE_T07_PROVED",
  "P8EE_T08_PROVED",
  "P8EE_T09_PROVED",
]) {
  match(workflow, new RegExp(token), `Worker runtime matrix must publish ${token}`);
}
match(
  workflow,
  /P8EE_SUPABASE_CALLS_PROVED_ZERO/,
  "Exact webhook probes must prove zero Supabase calls",
);
match(
  workflow,
  /P8EE_STRIPE_API_CALLS_PROVED_ZERO/,
  "Secretless probes must prove zero Stripe API calls",
);
match(
  workflow,
  /P8EE_EXACT_PATH_DCA_LOG_DELTA/,
  "Exact webhook probes must publish the canonical lookup log delta",
);
match(
  workflow,
  /P8EE_NONEXACT_DCA_LOG_DELTA/,
  "Non-exact probes must remain in the canonical redirect flow",
);
match(
  workflow,
  /Host: rm-prime-bcr-p8ef-proof\.workers\.dev/,
  "Exact path probes must use a valid Cloudflare public host",
);
match(
  workflow,
  /billing-stripe-webhook-near/,
  "Similar unauthorized webhook paths must be probed",
);
match(
  workflow,
  /billing-stripe-webhook\/" valid_worker/,
  "Trailing-slash webhook path must remain outside the bypass",
);
const dryRunWorkflowStep = workflow.match(/- name: Wrangler deterministic dry-run[\s\S]*?- name: Preserve Wrangler dry-run diagnostics/)?.[0] ?? "";
match(dryRunWorkflowStep, /bun run wri01:dry-run/, "CI must exercise the same root redirected-config dry-run as the runbook");
equal(dryRunWorkflowStep.includes("--config wrangler.json"), false, "CI dry-run must not bypass the redirected-config path with a generated-config shortcut");

for (const [key, expected] of Object.entries({ name: "rm-prime-wri01-hml", main: "dist/server/index.mjs", no_bundle: true })) {
  equal(wrangler[key], expected, `wrangler.${key} must be deterministic`);
}
equal(wrangler.workers_dev, false, "SPR-03 bootstrap authority must keep workers.dev disabled");
equal(wrangler.preview_urls, true, "BCR-P6 must enable only inactive version Preview URLs");
equal(
  wrangler.vars?.BCR01_PUBLIC_BASE_URL,
  "https://bcr-p5-hml-rm-prime-wri01-hml.rodolfovaz882.workers.dev",
  "BCR-P6 public base URL must stay pinned to the exact homologation Preview URL",
);
equal(wrangler.compatibility_date, "2026-07-29", "Compatibility date must remain pinned to the tested workerd support ceiling");
equal(wrangler.assets?.directory, "dist/client", "Assets directory must match Nitro output");
equal(wrangler.assets?.binding, "ASSETS", "Assets binding must be explicit");
equal(wrangler.compatibility_flags?.includes("nodejs_compat"), true, "nodejs_compat must be enabled");
equal(wrangler.observability?.enabled, true, "Observability must be enabled");
equal(wrangler.triggers?.crons?.length, 0, "SPR-03 bootstrap authority must contain zero Cron triggers");
equal(wrangler.routes?.length, 0, "Repository implementation must contain no zone route");
equal("env" in wrangler, false, "Resolved homologation authority must not define a named Wrangler environment");

ok(pkg.scripts["test:wri-01"], "WRI-01 test script must exist");
ok(pkg.scripts["wri01:bundle-audit"], "WRI-01 bundle audit script must exist");
equal(pkg.scripts["wri01:dry-run"].includes("--env"), false, "WRI-01 dry-run must not select a named environment");
equal(
  pkg.scripts["wri01:dry-run"],
  "bunx wrangler@4.114.0 deploy --dry-run --outdir .wri01-dry-run",
  "WRI-01 dry-run must use the resolved generated config without a named environment",
);
equal("@cloudflare/vite-plugin" in (pkg.devDependencies ?? {}), false, "Cloudflare Vite plugin must remain absent");
const configText = JSON.stringify(wrangler);
equal(configText.includes("68ec853e6b04a038f09fca5712d6b26b"), false, "Account ID must not be persisted");
equal(configText.includes("90832d0006e9e630dbb73d33c551d836"), false, "Zone ID must not be persisted");
equal(configText.includes("SUPABASE_SERVICE_ROLE_KEY"), false, "Secrets must stay outside versioned config");

console.log(`WRI-01 runtime integration specs passed: ${assertions} assertions`);
