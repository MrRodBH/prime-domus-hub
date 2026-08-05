import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const serverDir = resolve(root, "dist/server");
const clientDir = resolve(root, "dist/client");
const entryPath = resolve(serverDir, "index.mjs");
const nitroPath = resolve(root, "dist/nitro.json");
const rootWranglerPath = resolve(root, "wrangler.jsonc");
const generatedWranglerPath = resolve(serverDir, "wrangler.json");

for (const path of [serverDir, clientDir, entryPath, nitroPath, rootWranglerPath]) {
  assert.ok(existsSync(path), `Required WRI-01 build artifact is missing: ${path}`);
}

function walk(directory) {
  const result = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...walk(path));
    else result.push(path);
  }
  return result;
}

function resolveLocalModule(importer, specifier) {
  if (!specifier.startsWith(".")) return null;
  const candidate = resolve(dirname(importer), specifier);
  const candidates = [candidate, `${candidate}.mjs`, `${candidate}.js`, join(candidate, "index.mjs")];
  return candidates.find((path) => existsSync(path) && statSync(path).isFile()) ?? null;
}

function reachableModuleGraph(entryFile) {
  const visited = new Set();
  const queue = [entryFile];
  const importPattern = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

  while (queue.length > 0) {
    const file = queue.shift();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    importPattern.lastIndex = 0;
    for (const match of source.matchAll(importPattern)) {
      const resolved = resolveLocalModule(file, match[1] ?? match[2]);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }

  return [...visited];
}

function hasWorkerHandler(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const methodForm = new RegExp(`\\b${escaped}\\s*\\([^)]*\\)\\s*\\{`);
  const asyncMethodForm = new RegExp(`\\basync\\s+${escaped}\\s*\\([^)]*\\)\\s*\\{`);
  const propertyForm = new RegExp(`\\b${escaped}\\s*:\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>|\\b${escaped}\\s*:\\s*async\\s+function|\\b${escaped}\\s*:\\s*function`);
  return methodForm.test(source) || asyncMethodForm.test(source) || propertyForm.test(source);
}

const serverFiles = walk(serverDir);
const moduleFiles = serverFiles.filter((path) => [".mjs", ".js", ".wasm"].includes(extname(path)));
const textModuleFiles = serverFiles.filter((path) => [".mjs", ".js", ".json"].includes(extname(path)));
const entry = readFileSync(entryPath, "utf8");
const reachableFiles = reachableModuleGraph(entryPath);
const reachableText = reachableFiles.map((path) => readFileSync(path, "utf8")).join("\n");
const serverText = textModuleFiles.map((path) => readFileSync(path, "utf8")).join("\n");
const rootWrangler = JSON.parse(readFileSync(rootWranglerPath, "utf8"));

assert.equal(
  (entry.match(/export\s+default/g) ?? []).length,
  1,
  "Final Worker entry must have exactly one default export authority",
);
assert.ok(hasWorkerHandler(reachableText, "fetch"), "Reachable Worker module graph must expose fetch");
assert.ok(hasWorkerHandler(reachableText, "scheduled"), "Reachable Worker module graph must expose scheduled");
assert.ok(
  reachableText.includes("cloudflare:scheduled"),
  "Reachable compiled graph must contain the Nitro Cloudflare scheduled hook",
);
assert.ok(
  reachableText.includes("cloudflare_runtime_context_missing"),
  "Reachable compiled graph must contain fail-closed runtime-context enforcement",
);
assert.ok(
  reachableText.includes("Runtime context temporarily unavailable"),
  "Reachable compiled graph must contain the sanitized 503 runtime response",
);
assert.ok(
  reachableText.includes("[DCA-01] scheduled reconciliation completed"),
  "Reachable compiled graph must contain the DCA-01 scheduled delegate",
);
assert.ok(
  reachableText.includes("[DCA-01] canonical redirect resolution failed closed"),
  "Canonical redirect must remain reachable before SSR and fail closed",
);
assert.equal(
  serverText.includes("@cloudflare/vite-plugin"),
  false,
  "Compiled output must not contain a second Cloudflare Vite build authority",
);
assert.equal(rootWrangler.main, "dist/server/index.mjs", "Versioned Wrangler main must match the bundle");
assert.equal(rootWrangler.assets?.directory, "dist/client", "Versioned assets directory must match the bundle");
assert.equal(rootWrangler.assets?.binding, "ASSETS", "Versioned assets binding must remain explicit");
assert.deepEqual(rootWrangler.routes, [], "Repository implementation must not contain a zone route");
assert.deepEqual(rootWrangler.env?.homologation?.routes, [], "Homologation must not contain a zone route");
assert.equal(rootWrangler.triggers?.crons?.[0], "*/5 * * * *", "Approved UTC Cron must remain exact");

if (existsSync(generatedWranglerPath)) {
  const generatedWrangler = JSON.parse(readFileSync(generatedWranglerPath, "utf8"));
  assert.equal(generatedWrangler.main, "index.mjs", "Nitro-generated Wrangler main must point at its local entry");
  assert.equal(generatedWrangler.no_bundle, true, "Nitro Cloudflare module output must remain no_bundle");
  assert.equal(generatedWrangler.assets?.binding, "ASSETS", "Generated assets binding must agree with root authority");
}

const uncompressedBytes = serverFiles.reduce((total, path) => total + statSync(path).size, 0);
const gzipBytes = gzipSync(Buffer.from(serverText)).byteLength;
const clientFiles = walk(clientDir);
const clientBytes = clientFiles.reduce((total, path) => total + statSync(path).size, 0);

assert.ok(moduleFiles.length > 0, "Worker bundle must contain modules");
assert.ok(uncompressedBytes > 0, "Worker bundle must not be empty");
assert.ok(gzipBytes > 0, "Gzip measurement must be available");
assert.ok(reachableFiles.length > 1, "Worker entry must reach its generated module graph");

console.log(JSON.stringify({
  WRI01_BUNDLE_AUDIT: "passed",
  WORKER_ENTRY: "dist/server/index.mjs",
  REACHABLE_MODULE_COUNT: reachableFiles.length,
  REACHABLE_MODULES: reachableFiles.map((path) => relative(root, path)),
  MODULE_COUNT: moduleFiles.length,
  SERVER_UNCOMPRESSED_BYTES: uncompressedBytes,
  SERVER_TEXT_GZIP_BYTES: gzipBytes,
  CLIENT_FILE_COUNT: clientFiles.length,
  CLIENT_BYTES: clientBytes,
  ROUTES_CONFIGURED: 0,
  CRON_EXPRESSION: "*/5 * * * *",
}, null, 2));
