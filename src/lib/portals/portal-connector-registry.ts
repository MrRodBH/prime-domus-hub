import { z } from "zod";

export const PORTAL_AUTOMATED_METHODS = [
  "JSON_API",
  "XML_FEED",
  "WEBHOOK",
  "CUSTOM_ADAPTER",
] as const;

export const PORTAL_MANUAL_METHODS = [
  "XLSX",
  "CSV",
  "MANUAL_EXPORT",
] as const;

export const PortalHybridConfigSchema = z
  .object({
    operation_mode: z.literal("HYBRID"),
    automated_method: z.enum(PORTAL_AUTOMATED_METHODS),
    manual_method: z.enum(PORTAL_MANUAL_METHODS),
    configuration_schema_version: z.number().int().positive(),
    credential_reference: z.string().min(1).max(300).nullable().optional(),
    mapping_profile: z.string().min(1).max(160),
    publication_rules: z.record(z.string(), z.unknown()).default({}),
    retry_policy: z
      .object({
        max_attempts: z.number().int().min(1).max(20),
        initial_delay_seconds: z.number().int().min(1).max(86_400),
        max_delay_seconds: z.number().int().min(1).max(604_800),
      })
      .strict(),
  })
  .strict();

export type PortalHybridConfig = z.infer<typeof PortalHybridConfigSchema>;

const INLINE_SECRET_KEYS = [
  "secret",
  "token",
  "password",
  "api_key",
  "apikey",
  "authorization",
  "credential",
];

function assertNoInlineSecrets(value: unknown, path = "config"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoInlineSecrets(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase();
    if (
      key !== "credential_reference" &&
      INLINE_SECRET_KEYS.some((candidate) => normalized.includes(candidate)) &&
      child != null &&
      child !== ""
    ) {
      throw new Error(`Portal connector inline secret is prohibited at ${path}.${key}.`);
    }
    assertNoInlineSecrets(child, `${path}.${key}`);
  }
}

export function parsePortalHybridConfig(raw: unknown): PortalHybridConfig {
  assertNoInlineSecrets(raw);
  const config = PortalHybridConfigSchema.parse(raw);
  if (config.retry_policy.max_delay_seconds < config.retry_policy.initial_delay_seconds) {
    throw new Error("Portal connector retry policy is invalid.");
  }
  return config;
}

export function portalConfigurationState(raw: unknown):
  | { state: "ready"; config: PortalHybridConfig }
  | { state: "configuration_required"; config: null } {
  try {
    return { state: "ready", config: parsePortalHybridConfig(raw) };
  } catch {
    return { state: "configuration_required", config: null };
  }
}

export function sanitizePortalConnector<T extends Record<string, unknown>>(row: T) {
  const {
    feed_token: _feedToken,
    webhook_secret: _webhookSecret,
    ...safe
  } = row;
  const configuration = portalConfigurationState(row.config);
  return {
    ...safe,
    operation_mode: "HYBRID" as const,
    configuration_state: configuration.state,
    hybrid_config: configuration.config,
  };
}