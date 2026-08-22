import process from "node:process";

// Server-only configuration. The .server.ts suffix prevents Vite from
// bundling this file into the client. Values are read inside functions so
// Cloudflare request-time environment bindings are available.

export const SUPABASE_SERVER_CONFIG_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
] as const;

type SupabaseServerConfigName = (typeof SUPABASE_SERVER_CONFIG_NAMES)[number];
type Environment = Readonly<Record<string, string | undefined>>;

export class MissingServerConfigError extends Error {
  readonly code = "missing_required_config";
  readonly missingNames: readonly SupabaseServerConfigName[];

  constructor(missingNames: readonly SupabaseServerConfigName[]) {
    super(`Missing required configuration: ${missingNames.join(", ")}`);
    this.name = "MissingServerConfigError";
    this.missingNames = [...missingNames];
  }
}

function requireNonBlank(
  environment: Environment,
  name: SupabaseServerConfigName,
): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new MissingServerConfigError([name]);
  }
  return value;
}

export function getRequiredSupabaseServerConfig(
  environment: Environment = process.env,
) {
  const missingNames = SUPABASE_SERVER_CONFIG_NAMES.filter(
    (name) => !environment[name]?.trim(),
  );

  if (missingNames.length > 0) {
    throw new MissingServerConfigError(missingNames);
  }

  return {
    url: requireNonBlank(environment, "SUPABASE_URL"),
    publishableKey: requireNonBlank(
      environment,
      "SUPABASE_PUBLISHABLE_KEY",
    ),
  } as const;
}

export function getServerConfig(environment: Environment = process.env) {
  return {
    nodeEnv: environment.NODE_ENV,
  } as const;
}
