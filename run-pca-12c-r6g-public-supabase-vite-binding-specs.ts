import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { transform } from "esbuild";
import { loadEnv, type ConfigEnv, type UserConfig } from "vite";
import viteConfigFactory from "./vite.config";

const SOURCE_MAIN = "db694134bfc161ee6b43d8b9efdf2627f24d9c8e";
const SOURCE_TREE = "3ec6d2c9022126690e509c7b774e6b7dc112c97a";
const R6G_PATHS = [
  ".env",
  ".github/workflows/release-gate.yml",
  ".gitignore",
  "docs/architecture/impact-analysis/manifests/PCA-12C-R3-tanstack-nitro-pca11-error-namespace-secretless-proof-manifest.json",
  "package.json",
  "run-arch-12f-01-config-hygiene-specs.ts",
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
  "run-pca-12c-r6d-lovable-development-keep-names-seroval-hydration-corrective-specs.ts",
  "run-pca-12c-r6g-public-supabase-vite-binding-specs.ts",
  "scripts/build-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof.mjs",
].sort();

const PUBLIC_VITE_ENVIRONMENT_NAMES = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

function loadTrackedPublicEnvironment(): Record<string, string> {
  const processOverrides = new Map(
    PUBLIC_VITE_ENVIRONMENT_NAMES.map((name) => [name, process.env[name]] as const),
  );
  for (const name of PUBLIC_VITE_ENVIRONMENT_NAMES) delete process.env[name];
  try {
    return loadEnv("development", process.cwd(), "VITE_");
  } finally {
    for (const [name, value] of processOverrides) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

assert.equal(git("rev-parse", `${SOURCE_MAIN}^{tree}`), SOURCE_TREE);
const changedPaths = [
  ...git("diff", "--name-only", SOURCE_MAIN, "--").split(/\r?\n/),
  ...git("ls-files", "--others", "--exclude-standard", "--", ...R6G_PATHS).split(/\r?\n/),
]
  .filter(Boolean)
  .sort();
assert.deepEqual(changedPaths, R6G_PATHS, "R6G diff escaped the closed repository allowlist");

const baselinePackage = JSON.parse(git("show", `${SOURCE_MAIN}:package.json`));
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

assert.equal(git("ls-files", "--error-unmatch", ".env"), ".env");
const environmentEntries = readFileSync(".env", "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const separator = line.indexOf("=");
    assert.notEqual(separator, -1, "invalid public environment entry");
    return [line.slice(0, separator), line.slice(separator + 1)] as const;
  });
assert.deepEqual(
  environmentEntries.map(([name]) => name),
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"],
);
const publicEnvironment = new Map(environmentEntries);
const publicUrl = publicEnvironment.get("VITE_SUPABASE_URL") ?? "";
const publishableKey = publicEnvironment.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
assert.ok(/^https:\/\//.test(publicUrl), "public URL must use HTTPS");
assert.ok(/^sb_publishable_/.test(publishableKey), "browser key must remain publishable-class");
for (const forbidden of [/\bsb_secret_/i, /\bservice[_-]?role\b/i, /\bSUPABASE_SECRET/i]) {
  assert.ok(!forbidden.test(readFileSync(".env", "utf8")), "secret-class material is prohibited");
}

const ignoreRules = new Set(readFileSync(".gitignore", "utf8").split(/\r?\n/));
assert.ok(!ignoreRules.has(".env"));
for (const rule of [
  ".env.*",
  "!.env.example",
  "!.env.*.example",
  ".dev.vars",
  ".dev.vars.*",
  "!.dev.vars.example",
  "!.dev.vars.*.example",
]) {
  assert.ok(ignoreRules.has(rule), `missing local-environment guard: ${rule}`);
}

const loadedEnvironment = loadTrackedPublicEnvironment();
assert.equal(loadedEnvironment.VITE_SUPABASE_URL, publicUrl);
assert.equal(loadedEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY, publishableKey);

const client = readFileSync("src/integrations/supabase/client.ts", "utf8");
const auth = readFileSync("src/routes/auth.tsx", "utf8");
const authenticated = readFileSync("src/routes/_authenticated.tsx", "utf8");
assert.match(client, /import\.meta\.env\.VITE_SUPABASE_URL/);
assert.match(client, /import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/);
assert.match(auth, /supabase\.auth\.getUser\(\)/);
assert.match(auth, /supabase\.auth\.signInWithPassword\(\{ email, password \}\)/);
assert.match(authenticated, /if \(error \|\| !data\.user\) throw redirect\(\{ to: "\/auth" \}\)/);

assert.deepEqual(
  readFileSync("vite.config.ts"),
  execFileSync("git", ["show", `${SOURCE_MAIN}:vite.config.ts`]),
  "R6D Vite authority must remain byte-identical",
);
const configEnvironment: ConfigEnv = {
  command: "build",
  mode: "development",
  isSsrBuild: true,
  isPreview: false,
};
const resolvedConfig = (await viteConfigFactory(configEnvironment)) as UserConfig;
assert.ok(resolvedConfig.esbuild && typeof resolvedConfig.esbuild === "object");
assert.equal(resolvedConfig.esbuild.keepNames, false);
const transformed = await transform("export const factory = (value) => value;", {
  loader: "ts",
  format: "esm",
  target: "es2022",
  keepNames: resolvedConfig.esbuild.keepNames,
});
assert.doesNotMatch(transformed.code, /\b__name\b/);

assert.deepEqual(
  readFileSync("scripts/build-pca-12b-lovable-managed-edge-function-bridge.mjs"),
  execFileSync("git", [
    "show",
    `${SOURCE_MAIN}:scripts/build-pca-12b-lovable-managed-edge-function-bridge.mjs`,
  ]),
  "PCA-12B build authority must remain byte-identical",
);
const r6dRunner = readFileSync(
  "run-pca-12c-r6d-lovable-development-keep-names-seroval-hydration-corrective-specs.ts",
  "utf8",
);
assert.match(r6dRunner, /const R6G_SUCCESSOR_PATHS = new Set\(\[/);
assert.match(r6dRunner, /\.filter\(\(path\) => !R6G_SUCCESSOR_PATHS\.has\(path\)\)/);
for (const path of [
  ".env",
  ".github/workflows/release-gate.yml",
  ".gitignore",
  "run-arch-12f-01-config-hygiene-specs.ts",
  "run-pca-12c-r6g-public-supabase-vite-binding-specs.ts",
]) {
  assert.ok(r6dRunner.includes(JSON.stringify(path)), `R6D successor scope missing ${path}`);
}

for (const runner of [
  "run-pca-12b-lovable-managed-edge-function-bridge-specs.ts",
  "run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts",
]) {
  const result = spawnSync(process.execPath, ["--import", "tsx/esm", runner], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${runner} regression failed`);
}

assert.equal(
  currentPackage.scripts?.["test:pca-12c-r6g"],
  "node --import tsx/esm ./run-pca-12c-r6g-public-supabase-vite-binding-specs.ts",
);
const workflow = readFileSync(".github/workflows/release-gate.yml", "utf8");
assert.match(workflow, /Verify PCA-12C-R6G public Supabase Vite binding/);
assert.match(workflow, /bun run test:pca-12c-r6g/);

console.log("PCA-12C-R6G public Supabase Vite binding specs: PASS");
