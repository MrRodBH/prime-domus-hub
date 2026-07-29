import { z } from "zod";

export const MARKETING_CHANNEL_KEYS = [
  "META_ADS",
  "GOOGLE_ADS",
  "MANUAL_IMPORT",
  "WEBSITE_FORM",
] as const;

export const MARKETING_AVAILABILITY_STATES = [
  "configured",
  "credential_required",
  "verification_pending",
  "mapping_required",
  "mapping_invalid",
  "manual_ready",
  "automated_ready",
  "adapter_not_implemented",
  "temporarily_unavailable",
  "failed",
] as const;

export const MARKETING_INGESTION_STATES = [
  "received",
  "verification_failed",
  "verified",
  "mapping_failed",
  "normalized",
  "duplicate_detected",
  "lead_created",
  "lead_linked",
  "rejected",
  "retryable_failed",
  "terminal_failed",
] as const;

export const MARKETING_IMPORT_STATES = [
  "draft",
  "preview_ready",
  "processing",
  "partial_success",
  "completed",
  "failed",
] as const;

export const MARKETING_IMPORT_ROW_STATES = [
  "received",
  "valid",
  "invalid",
  "duplicate_detected",
  "lead_created",
  "failed",
] as const;

export const MARKETING_MANUAL_METHODS = ["CSV", "XLSX", "MANUAL_ROW"] as const;
export const MARKETING_AUTOMATED_METHODS = [
  "LEAD_AD_WEBHOOK",
  "PTW01_HOST_DERIVED",
] as const;

export const MARKETING_MAPPING_TARGETS = [
  "name",
  "email",
  "phone",
  "message",
  "property_reference",
  "source",
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "landing_url",
  "referrer",
  "provider_payload_id",
] as const;

export type MarketingChannelKey = (typeof MARKETING_CHANNEL_KEYS)[number];
export type MarketingAvailabilityState = (typeof MARKETING_AVAILABILITY_STATES)[number];
export type MarketingIngestionState = (typeof MARKETING_INGESTION_STATES)[number];
export type MarketingImportState = (typeof MARKETING_IMPORT_STATES)[number];
export type MarketingManualMethod = (typeof MARKETING_MANUAL_METHODS)[number];
export type MarketingAutomatedMethod = (typeof MARKETING_AUTOMATED_METHODS)[number];
export type MarketingMappingTarget = (typeof MARKETING_MAPPING_TARGETS)[number];

export type MarketingChannelDefinition = {
  channelKey: MarketingChannelKey;
  providerKey: "meta" | "google" | "internal";
  displayName: string;
  operationMode: "HYBRID";
  schemaVersion: 1;
  manualMethods: readonly MarketingManualMethod[];
  automatedMethods: readonly MarketingAutomatedMethod[];
  credentialContract: "reference_only_no_inline_secret" | "not_required";
  signatureContract: "provider_adapter_required" | "host_derived_ptw01" | "not_applicable";
  replayContract: "connector_payload_id_and_hash" | "ptw01_request_contract" | "manual_import_row_hash";
  payloadIdContract: "provider_payload_id_or_deterministic_hash";
  campaignIdContract: "data_only_never_authority";
  adsetIdContract: "data_only_never_authority";
  adIdContract: "data_only_never_authority";
  utmContract: "data_only_never_authority";
  fieldMappingContract: "versioned_closed_target_map";
  deduplicationContract: "exact_normalized_email_or_phone_review_required";
  leadWriterContract: "canonical_crm_internal" | "ptw01_existing_public_writer";
  initialHistoryContract: "canonical_lead_created_plus_ingestion_ledger";
  pipelineContract: "unique_explicit_default_pipeline_and_status_stage";
  diagnosticsContract: "sanitized_no_secret_no_raw_sensitive_payload";
  availabilityState: MarketingAvailabilityState;
  rollbackContract: "disable_connector_preserve_ledger";
};

const manualMethods = [...MARKETING_MANUAL_METHODS] as const;

export const MARKETING_CHANNEL_REGISTRY = [
  {
    channelKey: "META_ADS",
    providerKey: "meta",
    displayName: "Meta Lead Ads",
    operationMode: "HYBRID",
    schemaVersion: 1,
    manualMethods,
    automatedMethods: ["LEAD_AD_WEBHOOK"],
    credentialContract: "reference_only_no_inline_secret",
    signatureContract: "provider_adapter_required",
    replayContract: "connector_payload_id_and_hash",
    payloadIdContract: "provider_payload_id_or_deterministic_hash",
    campaignIdContract: "data_only_never_authority",
    adsetIdContract: "data_only_never_authority",
    adIdContract: "data_only_never_authority",
    utmContract: "data_only_never_authority",
    fieldMappingContract: "versioned_closed_target_map",
    deduplicationContract: "exact_normalized_email_or_phone_review_required",
    leadWriterContract: "canonical_crm_internal",
    initialHistoryContract: "canonical_lead_created_plus_ingestion_ledger",
    pipelineContract: "unique_explicit_default_pipeline_and_status_stage",
    diagnosticsContract: "sanitized_no_secret_no_raw_sensitive_payload",
    availabilityState: "adapter_not_implemented",
    rollbackContract: "disable_connector_preserve_ledger",
  },
  {
    channelKey: "GOOGLE_ADS",
    providerKey: "google",
    displayName: "Google Ads Lead Forms",
    operationMode: "HYBRID",
    schemaVersion: 1,
    manualMethods,
    automatedMethods: ["LEAD_AD_WEBHOOK"],
    credentialContract: "reference_only_no_inline_secret",
    signatureContract: "provider_adapter_required",
    replayContract: "connector_payload_id_and_hash",
    payloadIdContract: "provider_payload_id_or_deterministic_hash",
    campaignIdContract: "data_only_never_authority",
    adsetIdContract: "data_only_never_authority",
    adIdContract: "data_only_never_authority",
    utmContract: "data_only_never_authority",
    fieldMappingContract: "versioned_closed_target_map",
    deduplicationContract: "exact_normalized_email_or_phone_review_required",
    leadWriterContract: "canonical_crm_internal",
    initialHistoryContract: "canonical_lead_created_plus_ingestion_ledger",
    pipelineContract: "unique_explicit_default_pipeline_and_status_stage",
    diagnosticsContract: "sanitized_no_secret_no_raw_sensitive_payload",
    availabilityState: "adapter_not_implemented",
    rollbackContract: "disable_connector_preserve_ledger",
  },
  {
    channelKey: "MANUAL_IMPORT",
    providerKey: "internal",
    displayName: "Importação manual",
    operationMode: "HYBRID",
    schemaVersion: 1,
    manualMethods,
    automatedMethods: [],
    credentialContract: "not_required",
    signatureContract: "not_applicable",
    replayContract: "manual_import_row_hash",
    payloadIdContract: "provider_payload_id_or_deterministic_hash",
    campaignIdContract: "data_only_never_authority",
    adsetIdContract: "data_only_never_authority",
    adIdContract: "data_only_never_authority",
    utmContract: "data_only_never_authority",
    fieldMappingContract: "versioned_closed_target_map",
    deduplicationContract: "exact_normalized_email_or_phone_review_required",
    leadWriterContract: "canonical_crm_internal",
    initialHistoryContract: "canonical_lead_created_plus_ingestion_ledger",
    pipelineContract: "unique_explicit_default_pipeline_and_status_stage",
    diagnosticsContract: "sanitized_no_secret_no_raw_sensitive_payload",
    availabilityState: "manual_ready",
    rollbackContract: "disable_connector_preserve_ledger",
  },
  {
    channelKey: "WEBSITE_FORM",
    providerKey: "internal",
    displayName: "Formulários do site",
    operationMode: "HYBRID",
    schemaVersion: 1,
    manualMethods: [],
    automatedMethods: ["PTW01_HOST_DERIVED"],
    credentialContract: "not_required",
    signatureContract: "host_derived_ptw01",
    replayContract: "ptw01_request_contract",
    payloadIdContract: "provider_payload_id_or_deterministic_hash",
    campaignIdContract: "data_only_never_authority",
    adsetIdContract: "data_only_never_authority",
    adIdContract: "data_only_never_authority",
    utmContract: "data_only_never_authority",
    fieldMappingContract: "versioned_closed_target_map",
    deduplicationContract: "exact_normalized_email_or_phone_review_required",
    leadWriterContract: "ptw01_existing_public_writer",
    initialHistoryContract: "canonical_lead_created_plus_ingestion_ledger",
    pipelineContract: "unique_explicit_default_pipeline_and_status_stage",
    diagnosticsContract: "sanitized_no_secret_no_raw_sensitive_payload",
    availabilityState: "automated_ready",
    rollbackContract: "disable_connector_preserve_ledger",
  },
] as const satisfies readonly MarketingChannelDefinition[];

export function getMarketingChannelDefinition(channelKey: string): MarketingChannelDefinition {
  const definition = MARKETING_CHANNEL_REGISTRY.find((item) => item.channelKey === channelKey);
  if (!definition) throw new Error("marketing_channel_not_cataloged");
  return definition;
}

const inlineSecretTokens = [
  "secret",
  "token",
  "password",
  "api_key",
  "apikey",
  "authorization",
  "private_key",
  "refresh_token",
  "client_secret",
  "access_token",
  "app_secret",
];

export function assertNoMarketingInlineSecrets(value: unknown, path = "config"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoMarketingInlineSecrets(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase();
    if (
      key !== "credentialReference" &&
      key !== "credential_reference" &&
      inlineSecretTokens.some((candidate) => normalized.includes(candidate)) &&
      child !== null && child !== undefined && child !== ""
    ) {
      throw new Error(`marketing_inline_secret_prohibited:${path}.${key}`);
    }
    assertNoMarketingInlineSecrets(child, `${path}.${key}`);
  }
}

export const MarketingConnectorConfigSchema = z.object({
  channelKey: z.enum(MARKETING_CHANNEL_KEYS),
  operationMode: z.literal("HYBRID"),
  configurationVersion: z.literal(1),
  providerAccountReference: z.string().trim().min(1).max(200).nullable(),
  providerFormReference: z.string().trim().min(1).max(200).nullable(),
  credentialReference: z.string().regex(/^credential:\/\/[a-z0-9][a-z0-9/_-]{2,199}$/i).nullable(),
  mappingVersion: z.number().int().min(1).max(1_000_000),
}).strict().superRefine((value, context) => {
  const definition = getMarketingChannelDefinition(value.channelKey);
  if (definition.credentialContract === "not_required" && value.credentialReference !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "marketing_credential_not_allowed", path: ["credentialReference"] });
  }
  if (definition.providerKey !== "internal" && !value.providerAccountReference) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "marketing_provider_account_required", path: ["providerAccountReference"] });
  }
});

export type MarketingConnectorConfig = z.infer<typeof MarketingConnectorConfigSchema>;

const sourcePath = z.string().trim().regex(/^[a-zA-Z0-9_.-]{1,120}$/);
export const MarketingFieldMappingSchema = z.object({
  name: sourcePath,
  email: sourcePath.nullable().default(null),
  phone: sourcePath.nullable().default(null),
  message: sourcePath.nullable().default(null),
  property_reference: sourcePath.nullable().default(null),
  source: sourcePath.nullable().default(null),
  campaign_id: sourcePath.nullable().default(null),
  campaign_name: sourcePath.nullable().default(null),
  adset_id: sourcePath.nullable().default(null),
  adset_name: sourcePath.nullable().default(null),
  ad_id: sourcePath.nullable().default(null),
  ad_name: sourcePath.nullable().default(null),
  utm_source: sourcePath.nullable().default(null),
  utm_medium: sourcePath.nullable().default(null),
  utm_campaign: sourcePath.nullable().default(null),
  utm_content: sourcePath.nullable().default(null),
  utm_term: sourcePath.nullable().default(null),
  gclid: sourcePath.nullable().default(null),
  fbclid: sourcePath.nullable().default(null),
  landing_url: sourcePath.nullable().default(null),
  referrer: sourcePath.nullable().default(null),
  provider_payload_id: sourcePath.nullable().default(null),
}).strict();

export type MarketingFieldMapping = z.infer<typeof MarketingFieldMappingSchema>;

export const DEFAULT_MARKETING_FIELD_MAPPING: MarketingFieldMapping = {
  name: "name",
  email: "email",
  phone: "phone",
  message: "message",
  property_reference: "property_reference",
  source: "source",
  campaign_id: "campaign_id",
  campaign_name: "campaign_name",
  adset_id: "adset_id",
  adset_name: "adset_name",
  ad_id: "ad_id",
  ad_name: "ad_name",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  utm_content: "utm_content",
  utm_term: "utm_term",
  gclid: "gclid",
  fbclid: "fbclid",
  landing_url: "landing_url",
  referrer: "referrer",
  provider_payload_id: "provider_payload_id",
};

export const MarketingAttributionSchema = z.object({
  channel: z.enum(MARKETING_CHANNEL_KEYS),
  provider: z.enum(["meta", "google", "internal"]),
  source: z.string().max(200).nullable(),
  campaignId: z.string().max(200).nullable(),
  campaignName: z.string().max(300).nullable(),
  adsetId: z.string().max(200).nullable(),
  adsetName: z.string().max(300).nullable(),
  adId: z.string().max(200).nullable(),
  adName: z.string().max(300).nullable(),
  utmSource: z.string().max(300).nullable(),
  utmMedium: z.string().max(300).nullable(),
  utmCampaign: z.string().max(300).nullable(),
  utmContent: z.string().max(500).nullable(),
  utmTerm: z.string().max(500).nullable(),
  gclid: z.string().max(500).nullable(),
  fbclid: z.string().max(500).nullable(),
  landingUrl: z.string().max(2000).nullable(),
  referrer: z.string().max(2000).nullable(),
  providerPayloadId: z.string().max(300).nullable(),
  connectorId: z.string().uuid(),
  mappingVersion: z.number().int().min(1),
  receivedAt: z.string().datetime(),
}).strict();

export type MarketingAttribution = z.infer<typeof MarketingAttributionSchema>;

export const MarketingManualImportInputSchema = z.object({
  connectorId: z.string().uuid(),
  format: z.enum(MARKETING_MANUAL_METHODS),
  fileName: z.string().trim().min(1).max(255),
  contentBase64: z.string().min(1).max(8_000_000),
  idempotencyKey: z.string().min(16).max(200),
}).strict();

export function parseMarketingConnectorConfig(value: unknown): MarketingConnectorConfig {
  assertNoMarketingInlineSecrets(value);
  const parsed = MarketingConnectorConfigSchema.parse(value);
  getMarketingChannelDefinition(parsed.channelKey);
  return parsed;
}
