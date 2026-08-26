import process from "node:process";
import { chmodSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const WRANGLER_TEMPLATE_NAME = "__CLOUDFLARE_WORKER_NAME_REQUIRED__";
export const GENERATED_WRANGLER_CONFIG = ".wrangler.generated.jsonc";

const ENVIRONMENT_SUFFIXES = Object.freeze({
  development: "-dev",
  test: "-test",
  homologation: "-hml",
  production: "-prod",
  ci: "-ci",
});

const REQUIRED_NAMES = Object.freeze([
  "RM_PRIME_DEPLOYMENT_ENVIRONMENT",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_WORKER_NAME",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_URL",
]);

export class InfrastructureConfigurationError extends Error {
  constructor(code, names) {
    super(`${code}: ${names.join(", ")}`);
    this.name = "InfrastructureConfigurationError";
    this.code = code;
    this.names = [...names];
  }
}

function requireNonBlank(environment, name) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new InfrastructureConfigurationError("missing_required_infrastructure_config", [name]);
  }
  return value;
}

function assertFormat(condition, name) {
  if (!condition) {
    throw new InfrastructureConfigurationError("invalid_infrastructure_config", [name]);
  }
}

export function resolveInfrastructureIdentifiers(environment = process.env) {
  const missingNames = REQUIRED_NAMES.filter((name) => !environment[name]?.trim());
  if (missingNames.length > 0) {
    throw new InfrastructureConfigurationError(
      "missing_required_infrastructure_config",
      missingNames,
    );
  }

  const deploymentEnvironment = requireNonBlank(environment, "RM_PRIME_DEPLOYMENT_ENVIRONMENT");
  const accountId = requireNonBlank(environment, "CLOUDFLARE_ACCOUNT_ID");
  const workerName = requireNonBlank(environment, "CLOUDFLARE_WORKER_NAME");
  const supabaseProjectRef = requireNonBlank(environment, "SUPABASE_PROJECT_REF");
  const supabaseUrl = requireNonBlank(environment, "SUPABASE_URL");

  assertFormat(
    Object.hasOwn(ENVIRONMENT_SUFFIXES, deploymentEnvironment),
    "RM_PRIME_DEPLOYMENT_ENVIRONMENT",
  );
  assertFormat(/^[a-f0-9]{32}$/.test(accountId), "CLOUDFLARE_ACCOUNT_ID");
  assertFormat(/^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(workerName), "CLOUDFLARE_WORKER_NAME");
  assertFormat(
    workerName.endsWith(ENVIRONMENT_SUFFIXES[deploymentEnvironment]),
    "CLOUDFLARE_WORKER_NAME",
  );
  assertFormat(/^[a-z0-9]{20}$/.test(supabaseProjectRef), "SUPABASE_PROJECT_REF");

  let parsedSupabaseUrl;
  try {
    parsedSupabaseUrl = new URL(supabaseUrl);
  } catch {
    throw new InfrastructureConfigurationError("invalid_infrastructure_config", ["SUPABASE_URL"]);
  }
  assertFormat(
    parsedSupabaseUrl.protocol === "https:" &&
      parsedSupabaseUrl.username === "" &&
      parsedSupabaseUrl.password === "" &&
      parsedSupabaseUrl.hostname === `${supabaseProjectRef}.supabase.co` &&
      (parsedSupabaseUrl.pathname === "/" || parsedSupabaseUrl.pathname === "") &&
      parsedSupabaseUrl.search === "" &&
      parsedSupabaseUrl.hash === "",
    "SUPABASE_URL",
  );

  return Object.freeze({
    deploymentEnvironment,
    accountId,
    workerName,
    supabaseProjectRef,
  });
}

export function materializeWranglerConfiguration(template, identifiers) {
  if (template.name !== WRANGLER_TEMPLATE_NAME) {
    throw new InfrastructureConfigurationError("invalid_wrangler_template", ["name"]);
  }
  if ("account_id" in template || "env" in template) {
    throw new InfrastructureConfigurationError(
      "invalid_wrangler_template",
      ["account_id", "env"].filter((name) => name in template),
    );
  }

  return {
    ...template,
    name: identifiers.workerName,
    account_id: identifiers.accountId,
  };
}

export function materializeWranglerConfig({
  root = process.cwd(),
  outputName = GENERATED_WRANGLER_CONFIG,
  environment = process.env,
} = {}) {
  if (outputName !== GENERATED_WRANGLER_CONFIG) {
    throw new InfrastructureConfigurationError("invalid_generated_config_path", ["outputName"]);
  }

  const identifiers = resolveInfrastructureIdentifiers(environment);
  const templatePath = resolve(root, "wrangler.jsonc");
  const outputPath = resolve(root, outputName);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  const template = JSON.parse(readFileSync(templatePath, "utf8"));
  const resolvedConfig = materializeWranglerConfiguration(template, identifiers);

  try {
    writeFileSync(temporaryPath, `${JSON.stringify(resolvedConfig, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    renameSync(temporaryPath, outputPath);
    chmodSync(outputPath, 0o600);
  } finally {
    rmSync(temporaryPath, { force: true });
  }

  return {
    deploymentEnvironment: identifiers.deploymentEnvironment,
    outputName,
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  try {
    const result = materializeWranglerConfig();
    process.stdout.write(`${JSON.stringify({ status: "materialized", ...result })}\n`);
  } catch (error) {
    const safeError =
      error instanceof InfrastructureConfigurationError
        ? { status: "failed_closed", code: error.code, names: error.names }
        : { status: "failed_closed", code: "unexpected_materialization_error" };
    process.stderr.write(`${JSON.stringify(safeError)}\n`);
    process.exitCode = 1;
  }
}
