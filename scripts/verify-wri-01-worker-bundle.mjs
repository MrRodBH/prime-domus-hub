import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
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

const serverFiles = walk(serverDir);
const moduleFiles = serverFiles.filter((path) => [".mjs", ".js", ".wasm"].includes(extname(path)));
const textModuleFiles = serverFiles.filter((path) => [".mjs", ".js", ".json"].includes(extname(path)));
const entry = readFileSync(entryPath, "utf8");
const serverText = textModuleFiles.map((path) => readFileSync(path, "utf8")).join("\n");
const rootWrangler = JSON.parse(readFileSync(rootWranglerPath, "utf8"));

assert.match(entry, /fetch\s*\(/, "Final Worker entry must expose fetch");
assert.match(entry, /scheduled\s*\(/, "Final Worker entry must expose scheduled");
assert.ok(
  serverText.includes("cloudflare:scheduled"),
  "Compiled bundle must contain the Nitro Cloudflare scheduled hook",
);
assert.ok(
  serverText.includes("cloudflare_runtime_context_missing"),
  "Compiled bundle must contain fail-closed runtime-context enforcement",
);
assert.ok(
  serverText.includes("Runtime context temporarily unavailable"),
  "Compiled bundle must contain the sanitized 503 runtime response",
);
assert.ok(
  serverText.includes("[DCA-01] scheduled reconciliation completed"),
  "Compiled bundle must contain the DCA-01 scheduled delegate",
);
assert.ok(
  serverText.includes("[DCA-01] canonical redirect resolution failed closed"),
  "Canonical redirect must remain before SSR and fail closed",
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

console.log(JSON.stringify({
  WRI01_BUNDLE_AUDIT: "passed",
  WORKER_ENTRY: "dist/server/index.mjs",
  MODULE_COUNT: moduleFiles.length,
  SERVER_UNCOMPRESSED_BYTES: uncompressedBytes,
  SERVER_TEXT_GZIP_BYTES: gzipBytes,
  CLIENT_FILE_COUNT: clientFiles.length,
  CLIENT_BYTES: clientBytes,
  ROUTES_CONFIGURED: 0,
  CRON_EXPRESSION: "*/5 * * * *",
}, null, 2));
