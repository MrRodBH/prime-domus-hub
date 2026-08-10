import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const outputDir = resolve(root, "dist");
const serverDir = resolve(outputDir, "server");
const clientDir = resolve(outputDir, "client");
const entryPath = resolve(serverDir, "index.mjs");
const nitroPath = resolve(outputDir, "nitro.json");
const rootWranglerPath = resolve(root, "wrangler.jsonc");
const generatedWranglerPath = resolve(serverDir, "wrangler.json");
const diagnosticPath = resolve(root, ".wri01-bundle-audit-diagnostic.json");

const diagnostic = {
  WRI01_BUNDLE_AUDIT: "started",
  PHASE: "startup",
  OUTPUT_AUTHORITY: "dist",
  REQUIRED_PATHS: {
    OUTPUT_DIRECTORY: existsSync(outputDir),
    SERVER_DIRECTORY: existsSync(serverDir),
    CLIENT_DIRECTORY: existsSync(clientDir),
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
  return [candidate, `${candidate}.mjs`, `${candidate}.js`, join(candidate, "index.mjs")]
    .find((path) => existsSync(path) && statSync(path).isFile()) ?? null;
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
  return [
    new RegExp(`\\b${escaped}\\s*\\([^)]*\\)\\s*\\{`),
    new RegExp(`\\basync\\s+${escaped}\\s*\\([^)]*\\)\\s*\\{`),
    new RegExp(`\\b${escaped}\\s*:\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>|\\b${escaped}\\s*:\\s*async\\s+function|\\b${escaped}\\s*:\\s*function`),
  ].some((pattern) => pattern.test(source));
}

function defaultExportCount(source) {
  return (source.match(/\bexport\s+default\b/g) ?? []).length
    + (source.match(/\bexport\s*\{[^}]*\bas\s+default\b[^}]*\}/g) ?? []).length;
}

persistDiagnostic();

try {
  diagnostic.PHASE = "required-path-validation";
  persistDiagnostic();
  for (const [name, path] of Object.entries({
    OUTPUT_DIRECTORY: outputDir,
    SERVER_DIRECTORY: serverDir,
    CLIENT_DIRECTORY: clientDir,
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
  const clientFiles = walk(clientDir);
  const clientBytes = clientFiles.reduce((total, path) => total + statSync(path).size, 0);

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
    ROOT_WRANGLER_MAIN_MATCH: rootWrangler.main === "dist/server/index.mjs",
    ROOT_ASSETS_DIRECTORY_MATCH: rootWrangler.assets?.directory === "dist/client",
    ROOT_ASSETS_BINDING_MATCH: rootWrangler.assets?.binding === "ASSETS",
    ROOT_WORKERS_DEV_DISABLED: rootWrangler.workers_dev === false,
    ROOT_PREVIEW_URLS_DISABLED: rootWrangler.preview_urls === false,
    ROOT_ROUTES_EMPTY: Array.isArray(rootWrangler.routes) && rootWrangler.routes.length === 0,
    ROOT_CRON_EMPTY: Array.isArray(rootWrangler.triggers?.crons) && rootWrangler.triggers.crons.length === 0,
    ROOT_ENV_ABSENT: !("env" in rootWrangler),
    GENERATED_NAME_MATCH: generatedWrangler.name === "rm-prime-wri01-hml",
    GENERATED_WRANGLER_MAIN_MATCH: generatedWrangler.main === "index.mjs",
    GENERATED_NO_BUNDLE_MATCH: generatedWrangler.no_bundle === true,
    GENERATED_ASSETS_BINDING_MATCH: generatedWrangler.assets?.binding === "ASSETS",
    GENERATED_WORKERS_DEV_DISABLED: generatedWrangler.workers_dev === false,
    GENERATED_PREVIEW_URLS_DISABLED: generatedWrangler.preview_urls === false,
    GENERATED_ROUTES_EMPTY: Array.isArray(generatedWrangler.routes) && generatedWrangler.routes.length === 0,
    GENERATED_CRON_EMPTY: Array.isArray(generatedWrangler.triggers?.crons) && generatedWrangler.triggers.crons.length === 0,
    GENERATED_ENV_ABSENT: !("env" in generatedWrangler),
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
    CLIENT_FILE_COUNT: clientFiles.length,
    CLIENT_BYTES: clientBytes,
    GENERATED_WRANGLER: generatedWrangler,
    CHECKS: checks,
  });

  assert.equal(checks.DEFAULT_EXPORT_COUNT, 1, "Final Worker entry must have exactly one default export authority");
  for (const [name, passed] of Object.entries(checks)) {
    if (name === "DEFAULT_EXPORT_COUNT") continue;
    assert.ok(passed, `WRI-01 compiled bundle check failed: ${name}`);
  }

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
