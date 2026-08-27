import process from "node:process";

export const EMAIL_IDENTITY_CONFIG_NAMES = [
  "RM_PRIME_EMAIL_SITE_NAME",
  "RM_PRIME_EMAIL_SENDER_DOMAIN",
  "RM_PRIME_EMAIL_FROM_DOMAIN",
  "RM_PRIME_AUTH_SITE_ORIGIN",
] as const;

type EmailIdentityConfigName = (typeof EMAIL_IDENTITY_CONFIG_NAMES)[number];
type Environment = Readonly<Record<string, string | undefined>>;

const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export class InvalidEmailIdentityConfigError extends Error {
  readonly code = "invalid_email_identity_config";
  readonly configName: EmailIdentityConfigName;

  constructor(configName: EmailIdentityConfigName, reason: string) {
    super(`${configName}: ${reason}`);
    this.name = "InvalidEmailIdentityConfigError";
    this.configName = configName;
  }
}

function required(environment: Environment, name: EmailIdentityConfigName): string {
  const value = environment[name]?.trim();
  if (!value) throw new InvalidEmailIdentityConfigError(name, "required");
  return value;
}

function normalizeDomain(environment: Environment, name: EmailIdentityConfigName): string {
  const value = required(environment, name).toLowerCase().replace(/\.$/, "");
  if (
    value.length > 253 ||
    !value.includes(".") ||
    !value.split(".").every((label) => DOMAIN_LABEL_RE.test(label))
  ) {
    throw new InvalidEmailIdentityConfigError(name, "invalid_domain");
  }
  return value;
}

function normalizeOrigin(environment: Environment): string {
  const raw = required(environment, "RM_PRIME_AUTH_SITE_ORIGIN");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new InvalidEmailIdentityConfigError("RM_PRIME_AUTH_SITE_ORIGIN", "invalid_url");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new InvalidEmailIdentityConfigError("RM_PRIME_AUTH_SITE_ORIGIN", "https_origin_required");
  }
  return parsed.origin;
}

export function getRequiredEmailIdentityConfig(environment: Environment = process.env) {
  const siteName = required(environment, "RM_PRIME_EMAIL_SITE_NAME");
  if (siteName.length > 120 || /[\r\n<>]/.test(siteName)) {
    throw new InvalidEmailIdentityConfigError("RM_PRIME_EMAIL_SITE_NAME", "invalid_display_name");
  }

  const senderDomain = normalizeDomain(environment, "RM_PRIME_EMAIL_SENDER_DOMAIN");
  const fromDomain = normalizeDomain(environment, "RM_PRIME_EMAIL_FROM_DOMAIN");
  if (senderDomain === fromDomain || !senderDomain.endsWith(`.${fromDomain}`)) {
    throw new InvalidEmailIdentityConfigError(
      "RM_PRIME_EMAIL_SENDER_DOMAIN",
      "must_be_subdomain_of_from_domain",
    );
  }

  return {
    siteName,
    senderDomain,
    fromDomain,
    authSiteOrigin: normalizeOrigin(environment),
    from: `${siteName} <noreply@${fromDomain}>`,
  } as const;
}
