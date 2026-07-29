import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  DEFAULT_MARKETING_FIELD_MAPPING,
  MARKETING_AVAILABILITY_STATES,
  MARKETING_CHANNEL_REGISTRY,
  MARKETING_IMPORT_STATES,
  MARKETING_INGESTION_STATES,
  MarketingConnectorConfigSchema,
  MarketingFieldMappingSchema,
  MarketingManualImportInputSchema,
  assertNoMarketingInlineSecrets,
  getMarketingChannelDefinition,
  type MarketingChannelKey,
  type MarketingFieldMapping,
} from "@/lib/marketing/marketing-channel-registry";
import {
  authorizeTenantMarketingOperation,
  executeTenantMarketingRpc,
  listTenantMarketingConnectorRows,
  loadTenantMarketingConnector,
  safeTenantMarketingError,
} from "@/lib/api/tenant-marketing-authority.server";

const uuid = z.string().uuid();
const positiveVersion = z.number().int().min(1);
const nonNegativeVersion = z.number().int().min(0);
const trusted = (context: any) => ({ userId: context.userId as string, tenant: context.tenant });

type CurrentMapping = { id: string; version: number; mapping: MarketingFieldMapping };
type PreparedRow = {
  rowNumber: number;
  state: "valid" | "invalid";
  errorCode: string | null;
  prepared: {
    name: string;
    email: string | null;
    phone: string | null;
    message: string | null;
    propertyReference: string | null;
    source: string | null;
    attribution: Record<string, unknown>;
    normalizedEmail: string | null;
    normalizedPhone: string | null;
  } | null;
};

async function currentMapping(tenantId: string, connectorId: string): Promise<CurrentMapping> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_marketing_field_mappings")
    .select("id, tenant_id, connector_id, version, mapping")
    .eq("tenant_id", tenantId)
    .eq("connector_id", connectorId)
    .eq("is_current", true)
    .maybeSingle();
  if (result.error) throw safeTenantMarketingError(result.error);
  if (!result.data) throw new Error("marketing_mapping_required");
  if (result.data.tenant_id !== tenantId || result.data.connector_id !== connectorId) {
    throw new Error("tenant_marketing_cross_tenant_mapping");
  }
  return {
    id: String(result.data.id),
    version: Number(result.data.version),
    mapping: MarketingFieldMappingSchema.parse(result.data.mapping),
  };
}

async function prepareRows(input: {
  contentBase64: string;
  format: "CSV" | "XLSX" | "MANUAL_ROW";
  connectorId: string;
  channelKey: MarketingChannelKey;
  mappingVersion: number;
  mapping: MarketingFieldMapping;
}): Promise<PreparedRow[]> {
  const runtime = await import("@/lib/marketing/marketing-ingestion.server");
  const rows = runtime.parseMarketingManualImport({ format: input.format, contentBase64: input.contentBase64 });
  const receivedAt = new Date().toISOString();
  return rows.map((row, index) => {
    try {
      const prepared = runtime.mapMarketingLead({
        row,
        mapping: input.mapping,
        channelKey: input.channelKey,
        connectorId: input.connectorId,
        mappingVersion: input.mappingVersion,
        receivedAt,
      });
      return {
        rowNumber: index + 1,
        state: "valid" as const,
        errorCode: null,
        prepared: JSON.parse(JSON.stringify(prepared)) as PreparedRow["prepared"],
      };
    } catch (error) {
      return {
        rowNumber: index + 1,
        state: "invalid" as const,
        errorCode: error instanceof Error ? error.message.slice(0, 200) : "marketing_import_row_invalid",
        prepared: null,
      };
    }
  });
}

export const listTenantMarketingChannels = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorizeTenantMarketingOperation(trusted(context), "view");
    return {
      operationMode: "HYBRID" as const,
      automatedProviderExecution: false,
      channels: MARKETING_CHANNEL_REGISTRY.map((item) => ({
        ...item,
        manualMethods: [...item.manualMethods],
        automatedMethods: [...item.automatedMethods],
      })),
      availabilityStates: [...MARKETING_AVAILABILITY_STATES],
      ingestionStates: [...MARKETING_INGESTION_STATES],
      importStates: [...MARKETING_IMPORT_STATES],
    };
  });

export const listTenantMarketingConnectors = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "view");
    return listTenantMarketingConnectorRows(auth.tenantId);
  });

export const getTenantMarketingConnector = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "view");
    return loadTenantMarketingConnector(auth.tenantId, data.connectorId);
  });

export const saveTenantMarketingConnectorDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    expectedRowVersion: positiveVersion,
    config: MarketingConnectorConfigSchema,
    providerAccountReference: z.string().trim().min(1).max(200).nullable(),
    providerFormReference: z.string().trim().min(1).max(200).nullable(),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "configure");
    assertNoMarketingInlineSecrets(data.config);
    const connector = await loadTenantMarketingConnector(auth.tenantId, data.connectorId);
    if (connector.channelKey !== data.config.channelKey) throw new Error("tenant_marketing_config_channel_mismatch");
    try {
      return await executeTenantMarketingRpc<{
        id: string; channelKey: string; configurationVersion: number;
        availabilityState: string; rowVersion: number;
      }>("save_tenant_marketing_connector", {
        _actor_user_id: auth.actorUserId,
        _tenant_id: auth.tenantId,
        _tenant_origin: context.tenant.origin,
        _connector_id: data.connectorId,
        _expected_row_version: data.expectedRowVersion,
        _config: data.config,
        _provider_account_reference: data.providerAccountReference,
        _provider_form_reference: data.providerFormReference,
      });
    } catch (error) {
      throw safeTenantMarketingError(error);
    }
  });

export const publishTenantMarketingConnectorConfiguration = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid, expectedRowVersion: positiveVersion, active: z.boolean() }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "configure");
    return executeTenantMarketingRpc<{ id: string; active: boolean; rowVersion: number }>(
      "publish_tenant_marketing_connector",
      {
        _actor_user_id: auth.actorUserId,
        _tenant_id: auth.tenantId,
        _tenant_origin: context.tenant.origin,
        _connector_id: data.connectorId,
        _expected_row_version: data.expectedRowVersion,
        _active: data.active,
      },
    );
  });

export const setTenantMarketingCredentialReference = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    expectedRowVersion: positiveVersion,
    credentialReference: z.string().regex(/^credential:\/\/[a-z0-9][a-z0-9/_-]{2,199}$/i),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "credential");
    return executeTenantMarketingRpc<{
      id: string; credentialVersion: number; credentialState: string;
      verificationState: string; rowVersion: number;
    }>("set_tenant_marketing_credential_reference", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _connector_id: data.connectorId,
      _expected_row_version: data.expectedRowVersion,
      _credential_reference: data.credentialReference,
    });
  });

export const listTenantMarketingMappings = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "view");
    await loadTenantMarketingConnector(auth.tenantId, data.connectorId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("tenant_marketing_field_mappings")
      .select("id, tenant_id, connector_id, version, mapping, is_current, created_at, archived_at")
      .eq("tenant_id", auth.tenantId)
      .eq("connector_id", data.connectorId)
      .order("version", { ascending: false });
    if (result.error) throw safeTenantMarketingError(result.error);
    return (result.data ?? []).map((row: any) => ({
      id: String(row.id),
      connectorId: String(row.connector_id),
      version: Number(row.version),
      mapping: MarketingFieldMappingSchema.parse(row.mapping),
      current: row.is_current === true,
      createdAt: String(row.created_at),
      archivedAt: row.archived_at ? String(row.archived_at) : null,
    }));
  });

export const validateTenantMarketingMapping = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    mapping: MarketingFieldMappingSchema,
    sample: z.record(z.unknown()).optional(),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "mapping");
    const connector = await loadTenantMarketingConnector(auth.tenantId, data.connectorId);
    if (!data.sample) return { valid: true, channelKey: connector.channelKey, sampleResult: null, errorCode: null };
    const runtime = await import("@/lib/marketing/marketing-ingestion.server");
    try {
      return {
        valid: true,
        channelKey: connector.channelKey,
        sampleResult: runtime.mapMarketingLead({
          row: data.sample,
          mapping: data.mapping,
          channelKey: connector.channelKey,
          connectorId: connector.id,
          mappingVersion: connector.mappingVersion,
          receivedAt: new Date().toISOString(),
        }),
        errorCode: null,
      };
    } catch (error) {
      return {
        valid: false,
        channelKey: connector.channelKey,
        sampleResult: null,
        errorCode: error instanceof Error ? error.message.slice(0, 200) : "marketing_mapping_invalid",
      };
    }
  });

export const saveTenantMarketingMapping = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid, expectedVersion: nonNegativeVersion, mapping: MarketingFieldMappingSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "mapping");
    return executeTenantMarketingRpc<{ id: string; connectorId: string; version: number; current: true }>(
      "save_tenant_marketing_mapping",
      {
        _actor_user_id: auth.actorUserId,
        _tenant_id: auth.tenantId,
        _tenant_origin: context.tenant.origin,
        _connector_id: data.connectorId,
        _expected_version: data.expectedVersion,
        _mapping: data.mapping,
      },
    );
  });

export const previewTenantMarketingManualImport = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(MarketingManualImportInputSchema)
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "import");
    const connector = await loadTenantMarketingConnector(auth.tenantId, data.connectorId);
    if (connector.channelKey === "WEBSITE_FORM") throw new Error("marketing_manual_import_channel_invalid");
    const mapping = await currentMapping(auth.tenantId, connector.id);
    const rows = await prepareRows({
      contentBase64: data.contentBase64,
      format: data.format,
      connectorId: connector.id,
      channelKey: connector.channelKey,
      mappingVersion: mapping.version,
      mapping: mapping.mapping,
    });
    const invalidRows = rows.filter((row) => row.state === "invalid").length;
    const runtime = await import("@/lib/marketing/marketing-ingestion.server");
    return {
      state: "preview_ready" as const,
      format: data.format,
      fileName: data.fileName,
      sourceHash: runtime.hashMarketingPayload(data.contentBase64),
      totalRows: rows.length,
      validRows: rows.length - invalidRows,
      invalidRows,
      rows: rows.slice(0, 100).map((row) => ({
        rowNumber: row.rowNumber,
        state: row.state,
        errorCode: row.errorCode,
        name: row.prepared?.name ?? null,
        email: row.prepared?.email ?? null,
        phone: row.prepared?.phone ?? null,
        campaign: row.prepared?.attribution.campaignName
          ? String(row.prepared.attribution.campaignName)
          : null,
      })),
      truncated: rows.length > 100,
    };
  });

export const createTenantMarketingManualImport = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(MarketingManualImportInputSchema)
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "import");
    const connector = await loadTenantMarketingConnector(auth.tenantId, data.connectorId);
    if (connector.channelKey === "WEBSITE_FORM") throw new Error("marketing_manual_import_channel_invalid");
    const mapping = await currentMapping(auth.tenantId, connector.id);
    const rows = await prepareRows({
      contentBase64: data.contentBase64,
      format: data.format,
      connectorId: connector.id,
      channelKey: connector.channelKey,
      mappingVersion: mapping.version,
      mapping: mapping.mapping,
    });
    const invalidRows = rows.filter((row) => row.state === "invalid");
    if (invalidRows.length > 0) throw new Error(`marketing_import_invalid_rows:${invalidRows.length}`);
    const runtime = await import("@/lib/marketing/marketing-ingestion.server");
    const prepared = rows.map((row) => {
      if (!row.prepared) throw new Error("marketing_import_row_invalid");
      return runtime.sanitizeMarketingPayload(row.prepared);
    });
    return executeTenantMarketingRpc<{
      importId: string; state: string; totalRows: number;
      idempotentReplay: boolean; rowVersion: number;
    }>("create_tenant_marketing_manual_import", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _connector_id: connector.id,
      _format: data.format,
      _file_name: data.fileName,
      _source_hash: runtime.hashMarketingPayload(prepared),
      _idempotency_key: data.idempotencyKey,
      _prepared_rows: prepared,
    });
  });

export const executeTenantMarketingManualImport = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ importId: uuid, expectedRowVersion: positiveVersion }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "import");
    return executeTenantMarketingRpc<{
      importId: string; state: string; totalRows: number; createdLeads: number;
      duplicateRows: number; failedRows: number; idempotentReplay: boolean; rowVersion: number;
    }>("execute_tenant_marketing_manual_import", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _import_id: data.importId,
      _expected_row_version: data.expectedRowVersion,
    });
  });

export const listTenantMarketingManualImports = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ limit: z.number().int().min(1).max(200).default(100) }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("tenant_marketing_manual_imports")
      .select("id, tenant_id, connector_id, format, file_name, state, total_rows, valid_rows, invalid_rows, duplicate_rows, created_leads, failed_rows, row_version, created_at, started_at, completed_at, updated_at")
      .eq("tenant_id", auth.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (result.error) throw safeTenantMarketingError(result.error);
    return (result.data ?? []).map((row: any) => ({
      id: String(row.id), connectorId: String(row.connector_id), format: String(row.format),
      fileName: String(row.file_name), state: String(row.state), totalRows: Number(row.total_rows),
      validRows: Number(row.valid_rows), invalidRows: Number(row.invalid_rows),
      duplicateRows: Number(row.duplicate_rows), createdLeads: Number(row.created_leads),
      failedRows: Number(row.failed_rows), rowVersion: Number(row.row_version),
      createdAt: String(row.created_at), startedAt: row.started_at ? String(row.started_at) : null,
      completedAt: row.completed_at ? String(row.completed_at) : null, updatedAt: String(row.updated_at),
    }));
  });

export const getTenantMarketingManualImport = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ importId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [job, rows] = await Promise.all([
      (supabaseAdmin as any).from("tenant_marketing_manual_imports")
        .select("id, tenant_id, connector_id, mapping_id, format, file_name, state, total_rows, valid_rows, invalid_rows, duplicate_rows, created_leads, failed_rows, row_version, created_at, started_at, completed_at, updated_at")
        .eq("tenant_id", auth.tenantId).eq("id", data.importId).maybeSingle(),
      (supabaseAdmin as any).from("tenant_marketing_manual_import_rows")
        .select("id, row_number, state, lead_id, ingestion_event_id, duplicate_candidate_ids, error_code, created_at, updated_at")
        .eq("tenant_id", auth.tenantId).eq("import_id", data.importId)
        .order("row_number", { ascending: true }).limit(5000),
    ]);
    if (job.error || rows.error) throw safeTenantMarketingError(job.error ?? rows.error);
    if (!job.data) throw new Error("marketing_import_not_found");
    return { import: job.data, rows: rows.data ?? [] };
  });

export const listTenantMarketingIngestionEvents = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    state: z.enum(MARKETING_INGESTION_STATES).nullable().default(null),
    limit: z.number().int().min(1).max(500).default(100),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("tenant_marketing_ingestion_events")
      .select("id, tenant_id, connector_id, channel_key, provider_payload_id, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, mapping_version, received_at, verified_at, ingestion_state, lead_id, duplicate_candidate_ids, error_code, retry_count, retry_state, row_version, updated_at")
      .eq("tenant_id", auth.tenantId)
      .order("received_at", { ascending: false })
      .limit(data.limit);
    if (data.state) query = query.eq("ingestion_state", data.state);
    const result = await query;
    if (result.error) throw safeTenantMarketingError(result.error);
    return result.data ?? [];
  });

export const getTenantMarketingIngestionEvent = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ eventId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [event, attempts] = await Promise.all([
      (supabaseAdmin as any).from("tenant_marketing_ingestion_events")
        .select("id, tenant_id, connector_id, channel_key, provider_payload_id, provider_account_reference, provider_form_reference, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, payload_schema_version, mapping_version, payload_hash, received_at, verified_at, ingestion_state, lead_id, duplicate_candidate_ids, error_code, retry_count, retry_state, row_version, updated_at")
        .eq("tenant_id", auth.tenantId).eq("id", data.eventId).maybeSingle(),
      (supabaseAdmin as any).from("tenant_marketing_ingestion_attempts")
        .select("id, attempt_number, attempt_kind, outcome, error_code, metadata, created_at")
        .eq("tenant_id", auth.tenantId).eq("ingestion_event_id", data.eventId)
        .order("attempt_number", { ascending: true }),
    ]);
    if (event.error || attempts.error) throw safeTenantMarketingError(event.error ?? attempts.error);
    if (!event.data) throw new Error("marketing_ingestion_event_not_found");
    return { event: event.data, attempts: attempts.data ?? [] };
  });

export const retryTenantMarketingIngestion = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ eventId: uuid, expectedRowVersion: positiveVersion }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "retry");
    return executeTenantMarketingRpc<{ eventId: string; state: string; retryState: string; rowVersion: number }>(
      "retry_tenant_marketing_ingestion",
      {
        _actor_user_id: auth.actorUserId,
        _tenant_id: auth.tenantId,
        _tenant_origin: context.tenant.origin,
        _event_id: data.eventId,
        _expected_row_version: data.expectedRowVersion,
      },
    );
  });

export const getTenantMarketingDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantMarketingOperation(trusted(context), "diagnostics");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const count = async (table: string, configure?: (query: any) => any): Promise<number> => {
      let query = (supabaseAdmin as any).from(table).select("id", { count: "exact", head: true }).eq("tenant_id", auth.tenantId);
      if (configure) query = configure(query);
      const result = await query;
      if (result.error) throw safeTenantMarketingError(result.error);
      return Number(result.count ?? 0);
    };
    const [connectors, activeConnectors, imports, events, duplicates, failures] = await Promise.all([
      count("tenant_marketing_connectors"),
      count("tenant_marketing_connectors", (query) => query.eq("active", true)),
      count("tenant_marketing_manual_imports"),
      count("tenant_marketing_ingestion_events"),
      count("tenant_marketing_ingestion_events", (query) => query.eq("ingestion_state", "duplicate_detected")),
      count("tenant_marketing_ingestion_events", (query) => query.in("ingestion_state", ["retryable_failed", "terminal_failed", "verification_failed", "mapping_failed"])),
    ]);
    return {
      tenantId: auth.tenantId,
      operationMode: "HYBRID" as const,
      connectors,
      activeConnectors,
      imports,
      ingestionEvents: events,
      duplicateCandidates: duplicates,
      failures,
      metaAdsAdapter: "adapter_not_implemented" as const,
      googleAdsAdapter: "adapter_not_implemented" as const,
      manualImport: "manual_ready" as const,
      websiteForm: "ptw01_existing_public_writer" as const,
      automaticMerge: false,
      plaintextSecrets: false,
      externalProviderExecuted: false,
    };
  });

export { DEFAULT_MARKETING_FIELD_MAPPING };
