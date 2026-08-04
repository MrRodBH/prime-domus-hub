import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

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

export const PORTAL_CONFIGURATION_STATES = [
  "available",
  "configuration_required",
  "credential_required",
  "credential_provisioning_required",
  "manual_only",
  "adapter_not_implemented",
  "ready",
  "disabled",
] as const;

export const PORTAL_JOB_STATES = [
  "not_selected",
  "queued",
  "processing",
  "published",
  "unpublish_queued",
  "unpublishing",
  "unpublished",
  "retry_scheduled",
  "failed_retryable",
  "failed_terminal",
  "reconciliation_required",
  "cancelled",
] as const;

export type PortalAutomatedMethod = (typeof PORTAL_AUTOMATED_METHODS)[number];
export type PortalManualMethod = (typeof PORTAL_MANUAL_METHODS)[number];
export type PortalConfigurationState = (typeof PORTAL_CONFIGURATION_STATES)[number];
export type PortalJobState = (typeof PORTAL_JOB_STATES)[number];

export type PortalConnectorDefinition = {
  connectorKey: PortalAutomatedMethod;
  displayName: string;
  operationMode: "HYBRID";
  automatedMethods: readonly PortalAutomatedMethod[];
  manualMethods: readonly PortalManualMethod[];
  schemaVersion: 1;
  mappingContract: "versioned_closed_field_map";
  supportedPropertyStatuses: readonly ["publicado"];
  requiredFields: readonly string[];
  optionalFields: readonly string[];
  mediaContract: "persisted_tenant_scoped_media_only";
  endpointContract: "https_only_server_validated";
  credentialContract: "reference_only_no_inline_secret";
  retryContract: "job_orchestrator_only";
  idempotencyContract: "tenant_connector_operation_key";
  publicationContract: "server_built_payload";
  unpublicationContract: "known_publication_or_reconciliation";
  reconciliationContract: "explicit_job_state";
  diagnosticsContract: "sanitized_no_payload_secret";
  availabilityState: "adapter_not_implemented";
};

const definition = (
  connectorKey: PortalAutomatedMethod,
  displayName: string,
): PortalConnectorDefinition => ({
  connectorKey,
  displayName,
  operationMode: "HYBRID",
  automatedMethods: [connectorKey],
  manualMethods: PORTAL_MANUAL_METHODS,
  schemaVersion: 1,
  mappingContract: "versioned_closed_field_map",
  supportedPropertyStatuses: ["publicado"],
  requiredFields: [
    "automated_method",
    "manual_method",
    "configuration_schema_version",
    "mapping_profile",
    "publication_rules",
    "retry_policy",
  ],
  optionalFields: ["credential_reference", "feed_url", "webhook_url"],
  mediaContract: "persisted_tenant_scoped_media_only",
  endpointContract: "https_only_server_validated",
  credentialContract: "reference_only_no_inline_secret",
  retryContract: "job_orchestrator_only",
  idempotencyContract: "tenant_connector_operation_key",
  publicationContract: "server_built_payload",
  unpublicationContract: "known_publication_or_reconciliation",
  reconciliationContract: "explicit_job_state",
  diagnosticsContract: "sanitized_no_payload_secret",
  availabilityState: "adapter_not_implemented",
});

/**
 * Closed build-time registry. It catalogs executable transport contracts, not
 * tenant-provided portal names. A tenant can only configure persisted connector
 * instances and must choose one of these cataloged methods.
 */
export const PORTAL_CONNECTOR_REGISTRY = [
  definition("JSON_API", "JSON API"),
  definition("XML_FEED", "XML Feed"),
  definition("WEBHOOK", "Webhook"),
  definition("CUSTOM_ADAPTER", "Custom Adapter"),
] as const;

export const PORTAL_CONNECTOR_KEYS = PORTAL_CONNECTOR_REGISTRY.map(
  (item) => item.connectorKey,
) as readonly PortalAutomatedMethod[];

export function getPortalConnectorDefinition(
  connectorKey: string,
): PortalConnectorDefinition {
  const match = PORTAL_CONNECTOR_REGISTRY.find(
    (item) => item.connectorKey === connectorKey,
  );
  if (!match) throw new Error("portal_connector_not_cataloged");
  return match;
}

export const PortalPublicationRulesSchema = z
  .object({
    only_published: z.literal(true),
    include_statuses: z.array(z.literal("publicado")).max(1).optional(),
    exclude_fields: z
      .array(
        z.enum([
          "endereco",
          "numero",
          "complemento",
          "latitude",
          "longitude",
          "corretor_id",
        ]),
      )
      .max(6)
      .optional(),
    batch_size: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export const PortalRetryPolicySchema = z
  .object({
    max_attempts: z.number().int().min(1).max(20),
    initial_delay_seconds: z.number().int().min(1).max(86_400),
    max_delay_seconds: z.number().int().min(1).max(604_800),
  })
  .strict();

export const PortalHybridConfigSchema = z
  .object({
    operation_mode: z.literal("HYBRID"),
    automated_method: z.enum(PORTAL_AUTOMATED_METHODS),
    manual_method: z.enum(PORTAL_MANUAL_METHODS),
    configuration_schema_version: z.literal(1),
    credential_reference: z
      .string()
      .regex(/^credential:\/\/[a-z0-9][a-z0-9/_-]{2,199}$/i)
      .nullable()
      .optional(),
    mapping_profile: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/i),
    mapping_version: z.number().int().min(1).max(1_000_000).default(1),
    publication_rules: PortalPublicationRulesSchema,
    retry_policy: PortalRetryPolicySchema,
  })
  .strict()
  .superRefine((config, context) => {
    if (config.retry_policy.max_delay_seconds < config.retry_policy.initial_delay_seconds) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "portal_retry_delay_invalid",
        path: ["retry_policy", "max_delay_seconds"],
      });
    }
  });

export type PortalHybridConfig = z.infer<typeof PortalHybridConfigSchema>;

export const PortalMappingSchema = z
  .object({
    titulo: z.literal("titulo"),
    descricao: z.literal("descricao"),
    codigo: z.literal("codigo"),
    tipo: z.literal("tipo"),
    finalidade: z.literal("finalidade"),
    preco: z.literal("preco"),
    cidade: z.literal("cidade"),
    estado: z.literal("estado"),
    quartos: z.literal("quartos"),
    banheiros: z.literal("banheiros"),
    vagas: z.literal("vagas"),
    area_util: z.literal("area_util"),
    media: z.literal("tenant_scoped_media"),
  })
  .strict();

export type PortalMapping = z.infer<typeof PortalMappingSchema>;

export const DEFAULT_PORTAL_MAPPING: PortalMapping = {
  titulo: "titulo",
  descricao: "descricao",
  codigo: "codigo",
  tipo: "tipo",
  finalidade: "finalidade",
  preco: "preco",
  cidade: "cidade",
  estado: "estado",
  quartos: "quartos",
  banheiros: "banheiros",
  vagas: "vagas",
  area_util: "area_util",
  media: "tenant_scoped_media",
};

const INLINE_SECRET_KEYS = [
  "secret",
  "token",
  "password",
  "api_key",
  "apikey",
  "authorization",
  "private_key",
  "refresh_token",
  "client_secret",
];

export function assertNoPortalInlineSecrets(
  value: unknown,
  path = "config",
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPortalInlineSecrets(item, `${path}[${index}]`));
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
      throw new Error(`portal_inline_secret_prohibited:${path}.${key}`);
    }
    assertNoPortalInlineSecrets(child, `${path}.${key}`);
  }
}

export function parsePortalHybridConfig(raw: unknown): PortalHybridConfig {
  assertNoPortalInlineSecrets(raw);
  const config = PortalHybridConfigSchema.parse(raw);
  getPortalConnectorDefinition(config.automated_method);
  return config;
}

export interface PortalConnectorRow {
  id: string;
  tenant_id: string;
  portal_nome: string;
  portal_slug: string;
  ativo: boolean;
  status: string;
  feed_url: string | null;
  webhook_url: string | null;
  config: Json;
  ultimo_sync_at: string | null;
  ultimo_erro: string | null;
  created_at: string;
  updated_at: string;
  credential_version?: number | null;
  credential_state?: string | null;
  last_rotated_at?: string | null;
  rotation_required?: boolean | null;
  row_version?: number | null;
}

export interface PortalConnectorView {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  active: boolean;
  status: string;
  feedUrl: string | null;
  webhookUrl: string | null;
  lastSyncAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
  operationMode: "HYBRID";
  configurationState: PortalConfigurationState;
  credentialState:
    | "not_required"
    | "credential_provisioning_required"
    | "ready"
    | "rotation_required";
  credentialVersion: number;
  lastRotatedAt: string | null;
  rotationRequired: boolean;
  adapterAvailability: "adapter_not_implemented";
  hybridConfig: PortalHybridConfig | null;
}

export function portalConfigurationState(raw: unknown):
  | { state: "adapter_not_implemented"; config: PortalHybridConfig }
  | { state: "configuration_required"; config: null } {
  try {
    const config = parsePortalHybridConfig(raw);
    return { state: "adapter_not_implemented", config };
  } catch {
    return { state: "configuration_required", config: null };
  }
}

export function sanitizePortalConnector(row: PortalConnectorRow): PortalConnectorView {
  const configuration = portalConfigurationState(row.config);
  const credentialVersion = Math.max(0, Number(row.credential_version ?? 0));
  const rotationRequired = row.rotation_required === true;
  const credentialState = rotationRequired
    ? "rotation_required"
    : row.credential_state === "ready"
      ? "ready"
      : configuration.config?.credential_reference
        ? "credential_provisioning_required"
        : "not_required";

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.portal_nome,
    slug: row.portal_slug,
    active: row.ativo,
    status: row.status,
    feedUrl: row.feed_url,
    webhookUrl: row.webhook_url,
    lastSyncAt: row.ultimo_sync_at,
    lastErrorCode: row.ultimo_erro,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rowVersion: Math.max(1, Number(row.row_version ?? 1)),
    operationMode: "HYBRID",
    configurationState: configuration.state,
    credentialState,
    credentialVersion,
    lastRotatedAt: row.last_rotated_at ?? null,
    rotationRequired,
    adapterAvailability: "adapter_not_implemented",
    hybridConfig: configuration.config,
  };
}

export function assertPortalJobTransition(
  from: PortalJobState,
  to: PortalJobState,
): void {
  const transitions: Record<PortalJobState, readonly PortalJobState[]> = {
    not_selected: ["queued", "unpublish_queued", "cancelled"],
    queued: ["processing", "cancelled"],
    processing: ["published", "failed_retryable", "failed_terminal", "reconciliation_required"],
    published: ["unpublish_queued", "reconciliation_required"],
    unpublish_queued: ["unpublishing", "cancelled"],
    unpublishing: ["unpublished", "failed_retryable", "failed_terminal", "reconciliation_required"],
    unpublished: ["queued", "reconciliation_required"],
    retry_scheduled: ["queued", "unpublish_queued", "cancelled"],
    failed_retryable: ["retry_scheduled", "failed_terminal", "cancelled"],
    failed_terminal: ["reconciliation_required"],
    reconciliation_required: ["published", "unpublished", "failed_terminal"],
    cancelled: [],
  };
  if (!transitions[from].includes(to)) {
    throw new Error(`portal_job_transition_invalid:${from}:${to}`);
  }
}
