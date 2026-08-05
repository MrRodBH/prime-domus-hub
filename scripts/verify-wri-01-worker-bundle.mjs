import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const outputDir = resolve(root, ".output");
const serverDir = resolve(outputDir, "server");
const publicDir = resolve(outputDir, "public");
const entryPath = resolve(serverDir, "index.mjs");
const nitroPath = resolve(outputDir, "nitro.json");
const rootWranglerPath = resolve(root, "wrangler.jsonc");
const generatedWranglerPath = resolve(serverDir, "wrangler.json");
const diagnosticPath = resolve(root, ".wri01-bundle-audit-diagnostic.json");

const diagnostic = {
  WRI01_BUNDLE_AUDIT: "started",
  PHASE: "startup",
  OUTPUT_AUTHORITY: ".output",
  REQUIRED_PATHS: {
    OUTPUT_DIRECTORY: existsSync(outputDir),
    SERVER_DIRECTORY: existsSync(serverDir),
    PUBLIC_DIRECTORY: existsSync(publicDir),
    WORKER_ENTRY: existsSync(entryPath),
    NITRO_METADATA: existsSync(nitroPath),
    ROOT_WRANGLER: existsSync(rootWranglerPath),
    GENERATED_WRANGLER: existsSync(generatedWranglerPath),
  },
};

function persistDiagnostic(extra = {}) {
  Object.assign(diagnostic, extra);
  writeFileSync(diagnosticPath, `${JSON.stringify(diagnostic, null, 2)}\n`);
}

persistDiagnostic();

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

function defaultExportCount(source) {
  const direct = source.match(/\bexport\s+default\b/g) ?? [];
  const aliased = source.match(/\bexport\s*\{[^}]*\bas\s+default\b[^}]*\}/g) ?? [];
  return direct.length + aliased.length;
}

try {
  diagnostic.PHASE = "required-path-validation";
  persistDiagnostic();

  for (const [name, path] of Object.entries({
    OUTPUT_DIRECTORY: outputDir,
    SERVER_DIRECTORY: serverDir,
    PUBLIC_DIRECTORY: publicDir,
    WORKER_ENTRY: entryPath,
    NITRO_METADATA: nitroPath,
    ROOT_WRANGLER: rootWranglerPath,
    GENERATED_WRANGLER: generatedWranglerPath,
  })) {
    assert.ok(existsSync(path), `Required WRI-01 build artifact is missing: ${name}=${path}`);
  }

  diagnostic.PHASE = "module-graph-analysis";
  persistDiagnostic();

  const serverFiles = walk(serverDir);
  const moduleFiles = serverFiles.filter((path) => [".mjs", ".js", ".wasm"].includes(extname(path)));
  const textModuleFiles = serverFiles.filter((path) => [".mjs", ".js", ".json"].includes(extname(path)));
  const entry = readFileSync(entryPath, "utf8");
  const reachableFiles = reachableModuleGraph(entryPath);
  const reachableText = reachableFiles.map((path) => readFileSync(path, "utf8")).join("\n");
  const serverText = textModuleFiles.map((path) => readFileSync(path, "utf8")).join("\n");

  diagnostic.PHASE = "configuration-analysis";
  persistDiagnostic({
    ENTRY_PREVIEW: entry.slice(0, 4000),
    REACHABLE_MODULE_COUNT: reachableFiles.length,
    REACHABLE_MODULES: reachableFiles.map((path) => relative(root, path)),
  });

  const rootWrangler = JSON.parse(readFileSync(rootWranglerPath, "utf8"));
  const generatedWrangler = JSON.parse(readFileSync(generatedWranglerPath, "utf8"));
  const uncompressedBytes = serverFiles.reduce((total, path) => total + statSync(path).size, 0);
  const gzipBytes = gzipSync(Buffer.from(serverText)).byteLength;
  const publicFiles = walk(publicDir);
  const publicBytes = publicFiles.reduce((total, path) => total + statSync(path).size, 0);

  const checks = {
    DEFAULT_EXPORT_COUNT: defaultExportCount(entry),
    FETCH_REACHABLE: hasWorkerHandler(reachableText, "fetch"),
    SCHEDULED_REACHABLE: hasWorkerHandler(reachableText, "scheduled"),
    CLOUDFLARE_SCHEDULED_HOOK_REACHABLE: reachableText.includes("cloudflare:scheduled"),
    FAIL_CLOSED_CONTEXT_REACHABLE: reachableText.includes("cloudflare_runtime_context_missing"),
    SANITIZED_503_REACHABLE: reachableText.includes("Runtime context temporarily unavailable"),
    DCA_SCHEDULED_DELEGATE_REACHABLE: reachableText.includes("[DCA-01] scheduled reconciliation completed"),
    CANONICAL_REDIRECT_REACHABLE: reachableText.includes("[DCA-01] canonical redirect resolution failed closed"),
    CLOUDFLARE_VITE_PLUGIN_ABSENT: !serverText.includes("@cloudflare/vite-plugin"),
    ROOT_WRANGLER_MAIN_MATCH: rootWrangler.main === ".output/server/index.mjs",
    ROOT_ASSETS_DIRECTORY_MATCH: rootWrangler.assets?.directory === ".output/public",
    ROOT_ASSETS_BINDING_MATCH: rootWrangler.assets?.binding === "ASSETS",
    ROOT_ROUTES_EMPTY: Array.isArray(rootWrangler.routes) && rootWrangler.routes.length === 0,
    HOMOLOGATION_ROUTES_EMPTY: Array.isArray(rootWrangler.env?.homologation?.routes) && rootWrangler.env.homologation.routes.length === 0,
    CRON_EXPRESSION_MATCH: rootWrangler.triggers?.crons?.[0] === "*/5 * * * *",
    GENERATED_WRANGLER_MAIN_MATCH: generatedWrangler.main === "index.mjs",
    GENERATED_NO_BUNDLE_MATCH: generatedWrangler.no_bundle === true,
    GENERATED_ASSETS_BINDING_MATCH: generatedWrangler.assets?.binding === "ASSETS",
    MODULE_COUNT_POSITIVE: moduleFiles.length > 0,
    SERVER_BYTES_POSITIVE: uncompressedBytes > 0,
    GZIP_BYTES_POSITIVE: gzipBytes > 0,
    REACHABLE_GRAPH_NONTRIVIAL: reachableFiles.length > 1,
  };

  persistDiagnostic({
    WRI01_BUNDLE_AUDIT: "asserting",
    PHASE: "assertions",
    MODULE_COUNT: moduleFiles.length,
    SERVER_UNCOMPRESSED_BYTES: uncompressedBytes,
    SERVER_TEXT_GZIP_BYTES: gzipBytes,
    PUBLIC_FILE_COUNT: publicFiles.length,
    PUBLIC_BYTES: publicBytes,
    GENERATED_WRANGLER: generatedWrangler,
    CHECKS: checks,
  });

  assert.equal(checks.DEFAULT_EXPORT_COUNT, 1, "Final Worker entry must have exactly one default export authority");
  assert.ok(checks.FETCH_REACHABLE, "Reachable Worker module graph must expose fetch");
  assert.ok(checks.SCHEDULED_REACHABLE, "Reachable Worker module graph must expose scheduled");
  assert.ok(checks.CLOUDFLARE_SCHEDULED_HOOK_REACHABLE, "Reachable compiled graph must contain the Nitro Cloudflare scheduled hook");
  assert.ok(checks.FAIL_CLOSED_CONTEXT_REACHABLE, "Reachable compiled graph must contain fail-closed runtime-context enforcement");
  assert.ok(checks.SANITIZED_503_REACHABLE, "Reachable compiled graph must contain the sanitized 503 runtime response");
  assert.ok(checks.DCA_SCHEDULED_DELEGATE_REACHABLE, "Reachable compiled graph must contain the DCA-01 scheduled delegate");
  assert.ok(checks.CANONICAL_REDIRECT_REACHABLE, "Canonical redirect must remain reachable before SSR and fail closed");
  assert.ok(checks.CLOUDFLARE_VITE_PLUGIN_ABSENT, "Compiled output must not contain a second Cloudflare Vite build authority");
  assert.ok(checks.ROOT_WRANGLER_MAIN_MATCH, "Versioned Wrangler main must match the observed Nitro output");
  assert.ok(checks.ROOT_ASSETS_DIRECTORY_MATCH, "Versioned assets directory must match the observed Nitro output");
  assert.ok(checks.ROOT_ASSETS_BINDING_MATCH, "Versioned assets binding must remain explicit");
  assert.ok(checks.ROOT_ROUTES_EMPTY, "Repository implementation must not contain a zone route");
  assert.ok(checks.HOMOLOGATION_ROUTES_EMPTY, "Homologation must not contain a zone route");
  assert.ok(checks.CRON_EXPRESSION_MATCH, "Approved UTC Cron must remain exact");
  assert.ok(checks.GENERATED_WRANGLER_MAIN_MATCH, "Nitro-generated Wrangler main must point at its local entry");
  assert.ok(checks.GENERATED_NO_BUNDLE_MATCH, "Nitro Cloudflare module output must remain no_bundle");
  assert.ok(checks.GENERATED_ASSETS_BINDING_MATCH, "Generated assets binding must agree with root authority");
  assert.ok(checks.MODULE_COUNT_POSITIVE, "Worker bundle must contain modules");
  assert.ok(checks.SERVER_BYTES_POSITIVE, "Worker bundle must not be empty");
  assert.ok(checks.GZIP_BYTES_POSITIVE, "Gzip measurement must be available");
  assert.ok(checks.REACHABLE_GRAPH_NONTRIVIAL, "Worker entry must reach its generated module graph");

  persistDiagnostic({ WRI01_BUNDLE_AUDIT: "passed", PHASE: "complete" });
  console.log(JSON.stringify(diagnostic, null, 2));
} catch (error) {
  persistDiagnostic({
    WRI01_BUNDLE_AUDIT: "failed",
    PHASE: diagnostic.PHASE,
    ERROR_NAME: error instanceof Error ? error.name : "unknown",
    ERROR_MESSAGE: error instanceof Error ? error.message : String(error),
    ERROR_STACK: error instanceof Error ? error.stack : undefined,
  });
  console.error(JSON.stringify(diagnostic, null, 2));
  throw error;
}
