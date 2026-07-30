import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  assertNoMarketingInlineSecrets,
  getMarketingChannelDefinition,
  MarketingFieldMappingSchema,
  type MarketingChannelKey,
  type MarketingFieldMapping,
} from "@/lib/marketing/marketing-channel-registry";
import {
  hashMarketingPayload,
  mapMarketingLead,
  sanitizeMarketingPayload,
  type MarketingRawRow,
} from "@/lib/marketing/marketing-ingestion.server";
import { safeTenantMarketingError } from "@/lib/api/tenant-marketing-authority.server";

const uuid = z.string().uuid();
const bounded = (max: number) => z.string().trim().min(1).max(max);
const nullableBounded = (max: number) => z.string().trim().max(max).optional().nullable();

const MetaFieldSchema = z.object({
  name: bounded(120),
  values: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1).max(20),
}).strict();
const MetaLeadValueSchema = z.object({
  leadgen_id: bounded(300),
  form_id: bounded(200),
  ad_id: nullableBounded(200),
  adgroup_id: nullableBounded(200),
  campaign_id: nullableBounded(200),
  page_id: nullableBounded(200),
  created_time: z.number().int().nonnegative().optional(),
  field_data: z.array(MetaFieldSchema).min(1).max(100),
}).strict();
const MetaWebhookSchema = z.object({
  object: z.literal("page").optional(),
  entry: z.array(z.object({
    id: bounded(200),
    time: z.number().int().nonnegative().optional(),
    changes: z.array(z.object({
      field: z.literal("leadgen"),
      value: MetaLeadValueSchema,
    }).strict()).min(1).max(100),
  }).strict()).min(1).max(100),
}).strict();

const GoogleUserColumnSchema = z.object({
  column_name: bounded(120),
  string_value: z.string().max(4_000).optional(),
  column_id: nullableBounded(200),
}).strict();
const GoogleLeadWebhookSchema = z.object({
  lead_id: bounded(300),
  campaign_id: nullableBounded(200),
  adgroup_id: nullableBounded(200),
  creative_id: nullableBounded(200),
  gcl_id: nullableBounded(500),
  form_id: nullableBounded(200),
  is_test: z.boolean().optional().default(false),
  user_column_data: z.array(GoogleUserColumnSchema).min(1).max(100),
}).strict();

const ConnectorRowSchema = z.object({
  id: uuid,
  tenant_id: uuid,
  channel_key: z.enum(["META_ADS", "GOOGLE_ADS"]),
  provider_account_reference: z.string().nullable(),
  provider_form_reference: z.string().nullable(),
  credential_reference: z.string().nullable(),
  verification_state: z.string(),
  availability_state: z.string(),
  adapter_version: z.number().int().positive().nullable(),
  provider_contract_version: z.number().int().positive().nullable(),
  mapping_version: z.number().int().positive(),
  active: z.boolean(),
}).strict();

const ReservationSchema = z.object({
  eventId: uuid,
  tenantId: uuid,
  state: z.string(),
  rowVersion: z.number().int().positive(),
  idempotentReplay: z.boolean(),
}).strict();
const TransitionSchema = z.object({
  eventId: uuid,
  state: z.string(),
  leadId: uuid.nullable().optional(),
  rowVersion: z.number().int().positive(),
}).passthrough();
const IngestionResultSchema = z.object({
  eventId: uuid,
  state: z.enum(["lead_created", "duplicate_detected"]),
  leadId: uuid.optional(),
  leadVersion: z.number().int().positive().optional(),
  duplicateCandidateIds: z.array(uuid).optional(),
  rowVersion: z.number().int().positive(),
  externalProviderExecuted: z.literal(false),
  externalDeliveryProved: z.literal(false).optional(),
}).passthrough();

export type TrustedMarketingProviderEnvelope = {
  connectorId: string;
  rawBody: string;
  receivedAt: string;
  verificationMaterial:
    | { channelKey: "META_ADS"; appSecret: string; signatureHeader: string }
    | { channelKey: "GOOGLE_ADS"; expectedWebhookKey: string; receivedWebhookKey: string };
};

export type MarketingProviderIngestionResult = z.infer<typeof IngestionResultSchema> & {
  channelKey: "META_ADS" | "GOOGLE_ADS";
  adapterVersion: number;
  externalVerificationState: "verified_for_request";
};

function constantTimeTextEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyMetaXHubSignature256(input: {
  rawBody: string;
  signatureHeader: string;
  appSecret: string;
}): boolean {
  if (input.appSecret.length < 16 || !input.signatureHeader.startsWith("sha256=")) return false;
  const signature = input.signatureHeader.slice("sha256=".length);
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", input.appSecret).update(input.rawBody).digest("hex");
  return constantTimeTextEqual(expected.toLowerCase(), signature.toLowerCase());
}

export function verifyGoogleLeadWebhookKey(input: {
  expectedWebhookKey: string;
  receivedWebhookKey: string;
}): boolean {
  if (input.expectedWebhookKey.length < 16 || input.receivedWebhookKey.length < 16) return false;
  return constantTimeTextEqual(input.expectedWebhookKey, input.receivedWebhookKey);
}

type ProviderFieldEntry =
  | { name: string; values?: Array<string | number | boolean> }
  | { column_name: string; string_value?: string; column_id?: string | null };

function fieldMap(entries: ProviderFieldEntry[]) {
  const output: MarketingRawRow = {};
  for (const entry of entries) {
    const key = "name" in entry && entry.name ? entry.name : entry.column_name ?? "";
    if (!key || Object.prototype.hasOwnProperty.call(output, key)) {
      throw new Error("marketing_provider_field_duplicate_or_invalid");
    }
    output[key] = "values" in entry ? entry.values?.[0] ?? null : entry.string_value ?? null;
  }
  return output;
}

export function normalizeMetaLeadWebhook(rawBody: string): {
  providerPayloadId: string;
  providerFormReference: string;
  row: MarketingRawRow;
} {
  const parsed = MetaWebhookSchema.parse(JSON.parse(rawBody));
  const changes = parsed.entry.flatMap((entry) =>
    entry.changes.map((change) => ({ entryId: entry.id, ...change.value })),
  );
  if (changes.length !== 1) throw new Error("marketing_provider_payload_cardinality_invalid");
  const lead = changes[0];
  return {
    providerPayloadId: lead.leadgen_id,
    providerFormReference: lead.form_id,
    row: {
      ...fieldMap(lead.field_data),
      provider_payload_id: lead.leadgen_id,
      provider_form_reference: lead.form_id,
      provider_account_reference: lead.entryId,
      campaign_id: lead.campaign_id ?? null,
      adset_id: lead.adgroup_id ?? null,
      ad_id: lead.ad_id ?? null,
      source: "meta_ads",
    },
  };
}

export function normalizeGoogleLeadWebhook(rawBody: string): {
  providerPayloadId: string;
  providerFormReference: string | null;
  row: MarketingRawRow;
} {
  const lead = GoogleLeadWebhookSchema.parse(JSON.parse(rawBody));
  return {
    providerPayloadId: lead.lead_id,
    providerFormReference: lead.form_id ?? null,
    row: {
      ...fieldMap(lead.user_column_data),
      provider_payload_id: lead.lead_id,
      campaign_id: lead.campaign_id ?? null,
      adset_id: lead.adgroup_id ?? null,
      ad_id: lead.creative_id ?? null,
      gclid: lead.gcl_id ?? null,
      source: "google_ads",
      provider_test_payload: lead.is_test,
    },
  };
}

async function loadCurrentMapping(
  tenantId: string,
  connectorId: string,
  expectedVersion: number,
): Promise<MarketingFieldMapping> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("tenant_marketing_field_mappings")
    .select("tenant_id, connector_id, version, mapping")
    .eq("tenant_id", tenantId)
    .eq("connector_id", connectorId)
    .eq("version", expectedVersion)
    .eq("is_current", true)
    .limit(2);
  if (error) throw safeTenantMarketingError(error);
  if ((data ?? []).length !== 1) throw new Error("marketing_mapping_required");
  return MarketingFieldMappingSchema.parse(data[0].mapping);
}

function verifyEnvelope(
  input: TrustedMarketingProviderEnvelope,
  channelKey: "META_ADS" | "GOOGLE_ADS",
) {
  if (input.verificationMaterial.channelKey !== channelKey) return false;
  return channelKey === "META_ADS"
    ? verifyMetaXHubSignature256({
        rawBody: input.rawBody,
        signatureHeader: (input.verificationMaterial as Extract<typeof input.verificationMaterial, { channelKey: "META_ADS" }>).signatureHeader,
        appSecret: (input.verificationMaterial as Extract<typeof input.verificationMaterial, { channelKey: "META_ADS" }>).appSecret,
      })
    : verifyGoogleLeadWebhookKey({
        expectedWebhookKey: (input.verificationMaterial as Extract<typeof input.verificationMaterial, { channelKey: "GOOGLE_ADS" }>).expectedWebhookKey,
        receivedWebhookKey: (input.verificationMaterial as Extract<typeof input.verificationMaterial, { channelKey: "GOOGLE_ADS" }>).receivedWebhookKey,
      });
}

export async function receiveMarketingProviderPayload(
  input: TrustedMarketingProviderEnvelope,
): Promise<MarketingProviderIngestionResult> {
  uuid.parse(input.connectorId);
  z.string().datetime().parse(input.receivedAt);
  if (input.rawBody.length < 2 || input.rawBody.length > 1_000_000) {
    throw new Error("marketing_provider_payload_size_invalid");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const connectorResult = await (supabaseAdmin as any)
    .from("tenant_marketing_connectors")
    .select("id, tenant_id, channel_key, provider_account_reference, provider_form_reference, credential_reference, verification_state, availability_state, adapter_version, provider_contract_version, mapping_version, active")
    .eq("id", input.connectorId)
    .limit(2);
  if (connectorResult.error) throw safeTenantMarketingError(connectorResult.error);
  if ((connectorResult.data ?? []).length !== 1) {
    throw new Error("tenant_marketing_connector_not_found_or_ambiguous");
  }
  const connector = ConnectorRowSchema.parse(connectorResult.data[0]);
  const definition = getMarketingChannelDefinition(connector.channel_key);
  if (definition.adapterImplementationState !== "implemented" || connector.adapter_version !== 1) {
    throw new Error("marketing_adapter_contract_missing");
  }
  if (
    !connector.active ||
    connector.availability_state !== "automated_ready" ||
    connector.verification_state !== "verified"
  ) {
    throw new Error("marketing_adapter_not_ready");
  }
  if (!connector.credential_reference) throw new Error("marketing_credential_required");
  if (!verifyEnvelope(input, connector.channel_key)) {
    throw new Error("marketing_provider_verification_failed");
  }

  const normalized = connector.channel_key === "META_ADS"
    ? normalizeMetaLeadWebhook(input.rawBody)
    : normalizeGoogleLeadWebhook(input.rawBody);
  if (
    connector.provider_form_reference &&
    normalized.providerFormReference !== connector.provider_form_reference
  ) {
    throw new Error("marketing_provider_form_reference_mismatch");
  }
  const mapping = await loadCurrentMapping(
    connector.tenant_id,
    connector.id,
    connector.mapping_version,
  );
  const prepared = mapMarketingLead({
    row: normalized.row,
    mapping,
    channelKey: connector.channel_key,
    connectorId: connector.id,
    mappingVersion: connector.mapping_version,
    receivedAt: input.receivedAt,
  });
  assertNoMarketingInlineSecrets(prepared);
  const sanitizedRaw = sanitizeMarketingPayload(JSON.parse(input.rawBody));
  const payloadHash = hashMarketingPayload(sanitizedRaw);
  const reserveResult = await (supabaseAdmin as any).rpc("reserve_marketing_ingestion_payload", {
    _connector_id: connector.id,
    _provider_payload_id: normalized.providerPayloadId,
    _payload_hash: payloadHash,
    _payload_sanitized: sanitizedRaw,
    _payload_schema_version: 1,
  });
  if (reserveResult.error) throw safeTenantMarketingError(reserveResult.error);
  const reservation = ReservationSchema.parse(reserveResult.data);
  if (
    reservation.idempotentReplay &&
    ["lead_created", "lead_linked", "duplicate_detected"].includes(reservation.state)
  ) {
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("tenant_marketing_ingestion_events")
      .select("id, ingestion_state, lead_id, duplicate_candidate_ids, row_version")
      .eq("tenant_id", connector.tenant_id)
      .eq("id", reservation.eventId)
      .limit(2);
    if (error || (rows ?? []).length !== 1) {
      throw new Error("marketing_ingestion_event_not_found");
    }
    return {
      eventId: rows[0].id,
      state: rows[0].ingestion_state,
      leadId: rows[0].lead_id ?? undefined,
      duplicateCandidateIds: rows[0].duplicate_candidate_ids ?? undefined,
      rowVersion: Number(rows[0].row_version),
      externalProviderExecuted: false,
      externalDeliveryProved: false,
      channelKey: connector.channel_key,
      adapterVersion: connector.adapter_version,
      externalVerificationState: "verified_for_request",
    } as MarketingProviderIngestionResult;
  }

  const verifiedResult = await (supabaseAdmin as any).rpc("complete_marketing_ingestion_payload", {
    _event_id: reservation.eventId,
    _expected_row_version: reservation.rowVersion,
    _to_state: "verified",
    _lead_id: null,
    _duplicate_candidate_ids: [],
    _error_code: null,
  });
  if (verifiedResult.error) throw safeTenantMarketingError(verifiedResult.error);
  const verified = TransitionSchema.parse(verifiedResult.data);

  const ingestResult = await (supabaseAdmin as any).rpc("ingest_verified_provider_marketing_lead", {
    _event_id: reservation.eventId,
    _expected_row_version: verified.rowVersion,
    _prepared: JSON.parse(JSON.stringify(prepared)),
  });
  if (ingestResult.error) throw safeTenantMarketingError(ingestResult.error);
  const ingested = IngestionResultSchema.parse(ingestResult.data);
  return {
    ...ingested,
    externalDeliveryProved: false,
    channelKey: connector.channel_key,
    adapterVersion: connector.adapter_version,
    externalVerificationState: "verified_for_request",
  };
}

export async function verifyMarketingProviderFixture(input: {
  channelKey: Extract<MarketingChannelKey, "META_ADS" | "GOOGLE_ADS">;
  rawBody: string;
  verificationMaterial: TrustedMarketingProviderEnvelope["verificationMaterial"];
}): Promise<{ valid: boolean; channelKey: string; externalProviderExecuted: false }> {
  const valid = verifyEnvelope({
    connectorId: "00000000-0000-0000-0000-000000000000",
    rawBody: input.rawBody,
    receivedAt: new Date(0).toISOString(),
    verificationMaterial: input.verificationMaterial,
  }, input.channelKey);
  if (valid) {
    if (input.channelKey === "META_ADS") normalizeMetaLeadWebhook(input.rawBody);
    else normalizeGoogleLeadWebhook(input.rawBody);
  }
  return { valid, channelKey: input.channelKey, externalProviderExecuted: false };
}
