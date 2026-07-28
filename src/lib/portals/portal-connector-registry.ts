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

export const PortalPublicationRulesSchema = z
  .object({
    only_published: z.boolean(),
    include_statuses: z.array(z.string().min(1).max(80)).max(50).optional(),
    exclude_fields: z.array(z.string().min(1).max(120)).max(100).optional(),
    batch_size: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export const PortalHybridConfigSchema = z
  .object({
    operation_mode: z.literal("HYBRID"),
    automated_method: z.enum(PORTAL_AUTOMATED_METHODS),
    manual_method: z.enum(PORTAL_MANUAL_METHODS),
    configuration_schema_version: z.number().int().positive(),
    credential_reference: z.string().min(1).max(300).nullable().optional(),
    mapping_profile: z.string().min(1).max(160),
    publication_rules: PortalPublicationRulesSchema,
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

export interface PortalConnectorRow {
  id: string;
  tenant_id: string;
  portal_nome: string;
  portal_slug: string;
  ativo: boolean;
  status: string;
  feed_url: string | null;
  webhook_url: string | null;
  config: unknown;
  ultimo_sync_at: string | null;
  ultimo_erro: string | null;
  created_at: string;
  updated_at: string;
  feed_token?: string;
  webhook_secret?: string;
}

export interface PortalConnectorView {
  id: string;
  tenant_id: string;
  portal_nome: string;
  portal_slug: string;
  ativo: boolean;
  status: string;
  feed_url: string | null;
  webhook_url: string | null;
  ultimo_sync_at: string | null;
  ultimo_erro: string | null;
  created_at: string;
  updated_at: string;
  operation_mode: "HYBRID";
  configuration_state: "ready" | "configuration_required";
  hybrid_config: PortalHybridConfig | null;
}

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

export function sanitizePortalConnector(row: PortalConnectorRow): PortalConnectorView {
  const configuration = portalConfigurationState(row.config);
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    portal_nome: row.portal_nome,
    portal_slug: row.portal_slug,
    ativo: row.ativo,
    status: row.status,
    feed_url: row.feed_url,
    webhook_url: row.webhook_url,
    ultimo_sync_at: row.ultimo_sync_at,
    ultimo_erro: row.ultimo_erro,
    created_at: row.created_at,
    updated_at: row.updated_at,
    operation_mode: "HYBRID",
    configuration_state: configuration.state,
    hybrid_config: configuration.config,
  };
}