import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  GENERATED_WRANGLER_CONFIG,
  InfrastructureConfigurationError,
  WRANGLER_TEMPLATE_NAME,
  materializeWranglerConfig,
  materializeWranglerConfiguration,
  resolveInfrastructureIdentifiers,
} from "./scripts/materialize-wrangler-config.mjs";

const ALLOWLIST = [
  ".env.example",
  ".github/workflows/release-gate.yml",
  ".github/workflows/wri-01-worker-runtime-gate.yml",
  ".gitignore",
  "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/arch-12f-02a-infrastructure-identifier-externalization.md",
  "docs/operations/SPR-01-managed-secret-provisioning-runbook.md",
  "docs/operations/WRI-01-cloudflare-worker-runtime-runbook.md",
  "package.json",
  "run-arch-12f-01-config-hygiene-specs.ts",
  "run-arch-12f-02a-identifier-externalization-specs.ts",
  "run-spr-03-worker-bootstrap-managed-secret-recovery-specs.ts",
  "run-wri-01-cloudflare-worker-runtime-specs.ts",
  "scripts/materialize-wrangler-config.mjs",
  "scripts/verify-wri-01-worker-bundle.mjs",
  "supabase/config.toml",
  "wrangler.jsonc",
] as const;

const read = (path: string) => readFileSync(path, "utf8");
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const syntheticEnvironment = {
  RM_PRIME_DEPLOYMENT_ENVIRONMENT: "ci",
  CLOUDFLARE_ACCOUNT_ID: "00000000000000000000000000000001",
  CLOUDFLARE_WORKER_NAME: "rm-prime-arch-12f-ci",
  SUPABASE_PROJECT_REF: "ci000000000000000000",
  SUPABASE_URL: "https://ci000000000000000000.supabase.co",
};

const wranglerTemplate = JSON.parse(read("wrangler.jsonc"));
assert.equal(wranglerTemplate.name, WRANGLER_TEMPLATE_NAME);
assert.equal("account_id" in wranglerTemplate, false);
assert.equal("env" in wranglerTemplate, false);
assert.equal(wranglerTemplate.workers_dev, false);
assert.equal(wranglerTemplate.preview_urls, false);
assert.deepEqual(wranglerTemplate.routes, []);
assert.deepEqual(wranglerTemplate.triggers?.crons, []);

const supabaseConfig = read("supabase/config.toml");
assert.match(supabaseConfig, /^project_id = "rm-prime-local"$/m);
assert.doesNotMatch(supabaseConfig, /^[a-z0-9]{20}$/m);
assert.match(supabaseConfig, /supabase link --project-ref/);

const templateText = read(".env.example");
for (const name of [
  "RM_PRIME_DEPLOYMENT_ENVIRONMENT",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_WORKER_NAME",
  "SUPABASE_PROJECT_REF",
]) {
  assert.match(templateText, new RegExp(`^${name}=$`, "m"));
}
assert.doesNotMatch(templateText, /=[^\r\n]+/);

assert.throws(
  () => resolveInfrastructureIdentifiers({}),
  (error: unknown) =>
    error instanceof InfrastructureConfigurationError &&
    error.code === "missing_required_infrastructure_config" &&
    error.names.length === 5,
);
assert.throws(
  () => materializeWranglerConfig({ outputName: "../.wrangler.generated.jsonc" }),
  (error: unknown) =>
    error instanceof InfrastructureConfigurationError &&
    error.code === "invalid_generated_config_path",
);
assert.throws(
  () =>
    resolveInfrastructureIdentifiers({
      ...syntheticEnvironment,
      CLOUDFLARE_ACCOUNT_ID: "not-an-account-id",
    }),
  (error: unknown) =>
    error instanceof InfrastructureConfigurationError &&
    error.code === "invalid_infrastructure_config" &&
    error.names[0] === "CLOUDFLARE_ACCOUNT_ID",
);
assert.throws(
  () =>
    resolveInfrastructureIdentifiers({
      ...syntheticEnvironment,
      RM_PRIME_DEPLOYMENT_ENVIRONMENT: "production",
    }),
  (error: unknown) =>
    error instanceof InfrastructureConfigurationError &&
    error.names[0] === "CLOUDFLARE_WORKER_NAME",
);
assert.throws(
  () =>
    resolveInfrastructureIdentifiers({
      ...syntheticEnvironment,
      SUPABASE_URL: "https://crossenvironment000.supabase.co",
    }),
  (error: unknown) =>
    error instanceof InfrastructureConfigurationError && error.names[0] === "SUPABASE_URL",
);

const identifiers = resolveInfrastructureIdentifiers(syntheticEnvironment);
const materialized = materializeWranglerConfiguration(wranglerTemplate, identifiers);
assert.equal(materialized.name, syntheticEnvironment.CLOUDFLARE_WORKER_NAME);
assert.equal(materialized.account_id, syntheticEnvironment.CLOUDFLARE_ACCOUNT_ID);
assert.equal("env" in materialized, false);
assert.equal(wranglerTemplate.name, WRANGLER_TEMPLATE_NAME);
assert.equal("account_id" in wranglerTemplate, false);

const pkg = JSON.parse(read("package.json"));
assert.equal(
  pkg.scripts["arch-12f-02a:materialize-wrangler"],
  "node ./scripts/materialize-wrangler-config.mjs",
);
assert.match(pkg.scripts["wri01:dry-run"], /--config \.wrangler\.generated\.jsonc/);
assert.match(read(".gitignore"), /^\.wrangler\.generated\.jsonc$/m);
assert.match(read(".gitignore"), /^supabase\/\.temp\/$/m);
assert.equal(git("ls-files", GENERATED_WRANGLER_CONFIG), "");

const releaseWorkflow = read(".github/workflows/release-gate.yml");
const wriWorkflow = read(".github/workflows/wri-01-worker-runtime-gate.yml");
assert.match(releaseWorkflow, /bun run test:arch-12f-02a/);
assert.match(wriWorkflow, /Materialize synthetic deployment configuration/);
assert.match(wriWorkflow, /RM_PRIME_DEPLOYMENT_ENVIRONMENT: ci/);
assert.match(wriWorkflow, /CLOUDFLARE_WORKER_NAME: rm-prime-arch-12f-ci/);

const baseSha = process.env.ARCH_12F_02A_BASE_SHA;
if (baseSha) {
  assert.match(baseSha, /^[0-9a-f]{40}$/);
  const changedFiles = git("diff", "--name-only", `${baseSha}..HEAD`)
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  assert.deepEqual(changedFiles, [...ALLOWLIST].sort());
  assert.equal(
    changedFiles.some((path) => path.startsWith("supabase/migrations/")),
    false,
  );
  assert.equal(changedFiles.includes("bun.lock"), false);
}

console.log("ARCH-12F-02A INFRASTRUCTURE IDENTIFIER EXTERNALIZATION PASS");
