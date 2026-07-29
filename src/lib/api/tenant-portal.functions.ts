import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  DEFAULT_PORTAL_MAPPING,
  PORTAL_CONFIGURATION_STATES,
  PORTAL_CONNECTOR_REGISTRY,
  PORTAL_JOB_STATES,
  PortalHybridConfigSchema,
  PortalMappingSchema,
  type PortalJobState,
  type PortalMapping,
} from "@/lib/portals/portal-connector-registry";
import {
  buildPortalCsv,
  buildPortalPublicationPayload,
  buildPortalXlsx,
  hashPortalPayload,
  stableJson,
  type PortalMediaRecord,
  type PortalPropertyRecord,
  type PortalPublicationPayload,
} from "@/lib/portals/portal-adapter.server";
import {
  assertTenantPortalConnectorReadyForOperation,
  authorizeTenantPortalCredentialOperation,
  authorizeTenantPortalOperation,
  authorizeTenantPortalPublicationOperation,
  executeTenantPortalRpc,
  listTenantPortalConnectorRows,
  loadTenantPortalConnector,
  safeTenantPortalError,
} from "@/lib/api/tenant-portal-authority.server";

const uuid = z.string().uuid();
const revision = z.number().int().min(0);
const trusted = (context: any) => ({
  userId: context.userId as string,
  tenant: context.tenant,
});

const connectorSelect = [
  "id",
  "tenant_id",
  "portal_nome",
  "portal_slug",
  "ativo",
  "status",
  "feed_url",
  "webhook_url",
  "config",
  "ultimo_sync_at",
  "ultimo_erro",
  "created_at",
  "updated_at",
  "credential_version",
  "credential_state",
  "last_rotated_at",
  "rotation_required",
  "row_version",
].join(", ");

export const getPortalConnectorRegistry = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorizeTenantPortalOperation(trusted(context), "view");
    return {
      operationMode: "HYBRID" as const,
      definitions: PORTAL_CONNECTOR_REGISTRY.map((item) => ({
        ...item,
        automatedMethods: [...item.automatedMethods],
        manualMethods: [...item.manualMethods],
        supportedPropertyStatuses: [...item.supportedPropertyStatuses],
        requiredFields: [...item.requiredFields],
        optionalFields: [...item.optionalFields],
      })),
      configurationStates: [...PORTAL_CONFIGURATION_STATES],
      jobStates: [...PORTAL_JOB_STATES],
      automatedSuccessEnabled: false,
      manualExportEnabled: true,
    };
  });

export const listTenantPortalConnectors = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    return listTenantPortalConnectorRows(auth.tenantId);
  });

export const getTenantPortalConnector = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    return loadTenantPortalConnector(auth.tenantId, data.connectorId);
  });

export const saveTenantPortalConnector = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    expectedRowVersion: revision,
    config: PortalHybridConfigSchema,
    feedUrl: z.string().url().startsWith("https://").nullable(),
    webhookUrl: z.string().url().startsWith("https://").nullable(),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "configure");
    try {
      return await executeTenantPortalRpc<{
        id: string;
        row_version: number;
        active: boolean;
        credential_state: string;
      }>("save_tenant_portal_connector", {
        _actor_user_id: auth.actorUserId,
        _tenant_id: auth.tenantId,
        _tenant_origin: context.tenant.origin,
        _connector_id: data.connectorId,
        _expected_row_version: data.expectedRowVersion,
        _config: data.config,
        _feed_url: data.feedUrl,
        _webhook_url: data.webhookUrl,
      });
    } catch (error) {
      throw safeTenantPortalError(error);
    }
  });

export const setTenantPortalConnectorState = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    expectedRowVersion: revision,
    active: z.boolean(),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "configure");
    try {
      return await executeTenantPortalRpc<{
        id: string;
        active: boolean;
        row_version: number;
      }>("set_tenant_portal_connector_state", {
        _actor_user_id: auth.actorUserId,
        _tenant_id: auth.tenantId,
        _tenant_origin: context.tenant.origin,
        _connector_id: data.connectorId,
        _expected_row_version: data.expectedRowVersion,
        _active: data.active,
      });
    } catch (error) {
      throw safeTenantPortalError(error);
    }
  });

export const rotateTenantPortalCredentialReference = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    expectedRowVersion: revision,
    credentialReference: z.string().regex(/^credential:\/\/[a-z0-9][a-z0-9/_-]{2,199}$/i),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalCredentialOperation(trusted(context));
    return executeTenantPortalRpc<{
      id: string;
      credential_version: number;
      credential_state: "credential_provisioning_required";
      row_version: number;
    }>("rotate_tenant_portal_credential_reference", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _connector_id: data.connectorId,
      _expected_row_version: data.expectedRowVersion,
      _credential_reference: data.credentialReference,
    });
  });

export const listTenantPortalMappings = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    await loadTenantPortalConnector(auth.tenantId, data.connectorId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("tenant_portal_mappings")
      .select("id, tenant_id, connector_id, version, mapping, is_current, created_by, created_at, archived_at")
      .eq("tenant_id", auth.tenantId)
      .eq("connector_id", data.connectorId)
      .order("version", { ascending: false });
    if (result.error) throw safeTenantPortalError(result.error);
    return (result.data ?? []).map((row: any) => ({
      id: row.id as string,
      connectorId: row.connector_id as string,
      version: Number(row.version),
      mapping: PortalMappingSchema.parse(row.mapping),
      current: row.is_current === true,
      createdAt: row.created_at as string,
      archivedAt: row.archived_at as string | null,
    }));
  });

export const saveTenantPortalMapping = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    expectedVersion: revision,
    mapping: PortalMappingSchema,
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "configure");
    return executeTenantPortalRpc<{
      id: string;
      version: number;
      is_current: boolean;
    }>("save_tenant_portal_mapping", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _connector_id: data.connectorId,
      _expected_version: data.expectedVersion,
      _mapping: data.mapping,
    });
  });

async function loadCurrentMapping(
  tenantId: string,
  connectorId: string,
): Promise<{ id: string; version: number; mapping: PortalMapping }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_portal_mappings")
    .select("id, tenant_id, connector_id, version, mapping")
    .eq("tenant_id", tenantId)
    .eq("connector_id", connectorId)
    .eq("is_current", true)
    .maybeSingle();
  if (result.error) throw safeTenantPortalError(result.error);
  if (!result.data) throw new Error("tenant_portal_mapping_not_found");
  if (result.data.tenant_id !== tenantId || result.data.connector_id !== connectorId) {
    throw new Error("tenant_portal_cross_tenant_mapping");
  }
  return {
    id: result.data.id as string,
    version: Number(result.data.version),
    mapping: PortalMappingSchema.parse(result.data.mapping),
  };
}

async function buildTenantPropertyPayloads(
  tenantId: string,
  propertyIds: string[],
  mapping: PortalMapping,
): Promise<PortalPublicationPayload[]> {
  if (propertyIds.length === 0) return [];
  const ids = [...new Set(propertyIds)].sort();
  if (ids.length !== propertyIds.length) throw new Error("tenant_portal_duplicate_property_id");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const propertiesResult = await (supabaseAdmin as any)
    .from("imoveis")
    .select(
      "id, tenant_id, titulo, descricao, codigo, tipo, finalidade, preco, preco_sob_consulta, cidade, estado, quartos, banheiros, vagas, area_util, status, publicado_em, updated_at",
    )
    .eq("tenant_id", tenantId)
    .in("id", ids)
    .eq("status", "publicado");
  if (propertiesResult.error) throw safeTenantPortalError(propertiesResult.error);
  if ((propertiesResult.data ?? []).length !== ids.length) {
    throw new Error("tenant_portal_property_ineligible_or_cross_tenant");
  }

  const mediaResult = await (supabaseAdmin as any)
    .from("imovel_imagens")
    .select("id, tenant_id, imovel_id, url, ordem")
    .eq("tenant_id", tenantId)
    .in("imovel_id", ids)
    .order("ordem", { ascending: true });
  if (mediaResult.error) throw safeTenantPortalError(mediaResult.error);
  const media = (mediaResult.data ?? []) as PortalMediaRecord[];

  return (propertiesResult.data as PortalPropertyRecord[])
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((property) => buildPortalPublicationPayload({
      property,
      media: media.filter((item) => item.imovel_id === property.id),
      mapping,
    }));
}

const enqueueSchema = z.object({
  connectorId: uuid,
  propertyId: uuid,
  idempotencyKey: z.string().min(16).max(200),
}).strict();

async function enqueuePortalOperation(
  context: any,
  data: z.infer<typeof enqueueSchema>,
  operation: "publish" | "unpublish",
) {
  const auth = await authorizeTenantPortalPublicationOperation(trusted(context));
  const connector = await assertTenantPortalConnectorReadyForOperation(
    auth.tenantId,
    data.connectorId,
    operation,
  );
  const mapping = await loadCurrentMapping(auth.tenantId, connector.id);
  const payloads = operation === "publish"
    ? await buildTenantPropertyPayloads(auth.tenantId, [data.propertyId], mapping.mapping)
    : [];
  const payloadHash = payloads.length > 0
    ? await hashPortalPayload(payloads[0] as unknown as Json)
    : null;

  return executeTenantPortalRpc<{
    id: string;
    current_state: PortalJobState;
    idempotent_replay: boolean;
    revision: number;
  }>("enqueue_tenant_portal_publication", {
    _actor_user_id: auth.actorUserId,
    _tenant_id: auth.tenantId,
    _tenant_origin: context.tenant.origin,
    _connector_id: data.connectorId,
    _property_id: data.propertyId,
    _operation: operation,
    _idempotency_key: data.idempotencyKey,
    _payload_hash: payloadHash,
  });
}

export const enqueueTenantPortalPublication = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(enqueueSchema)
  .handler(async ({ context, data }) => enqueuePortalOperation(context, data, "publish"));

export const enqueueTenantPortalUnpublication = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(enqueueSchema)
  .handler(async ({ context, data }) => enqueuePortalOperation(context, data, "unpublish"));

export const retryTenantPortalJob = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ jobId: uuid, expectedRevision: revision }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "retry");
    return executeTenantPortalRpc<{
      id: string;
      current_state: "retry_scheduled";
      next_attempt_at: string;
      revision: number;
    }>("schedule_tenant_portal_retry", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _job_id: data.jobId,
      _expected_revision: data.expectedRevision,
    });
  });

export const cancelTenantPortalJob = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ jobId: uuid, expectedRevision: revision }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalPublicationOperation(trusted(context));
    return executeTenantPortalRpc<{
      id: string;
      current_state: "cancelled";
      revision: number;
    }>("cancel_tenant_portal_job", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _job_id: data.jobId,
      _expected_revision: data.expectedRevision,
    });
  });

export const reconcileTenantPortalPublication = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    jobId: uuid,
    expectedRevision: revision,
    resolvedState: z.enum(["published", "unpublished", "failed_terminal"]),
    externalReference: z.string().max(300).nullable(),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "reconcile");
    return executeTenantPortalRpc<{
      id: string;
      current_state: "published" | "unpublished" | "failed_terminal";
      revision: number;
    }>("reconcile_tenant_portal_state", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _job_id: data.jobId,
      _expected_revision: data.expectedRevision,
      _resolved_state: data.resolvedState,
      _external_reference: data.externalReference,
    });
  });

function mapJob(row: any) {
  return {
    id: row.id as string,
    connectorId: row.connector_id as string,
    propertyId: row.property_id as string,
    mappingId: row.mapping_id as string,
    operation: row.operation as "publish" | "unpublish" | "reconcile",
    desiredState: row.desired_state as "published" | "unpublished",
    currentState: row.current_state as PortalJobState,
    idempotencyKey: row.idempotency_key as string,
    payloadHash: row.payload_hash as string | null,
    mappingVersion: Number(row.mapping_version),
    connectorSchemaVersion: Number(row.connector_schema_version),
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    nextAttemptAt: row.next_attempt_at as string | null,
    lastAttemptAt: row.last_attempt_at as string | null,
    lastErrorCode: row.last_error_code as string | null,
    externalReference: row.external_reference as string | null,
    revision: Number(row.revision),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: row.completed_at as string | null,
    cancelledAt: row.cancelled_at as string | null,
  };
}

const jobColumns = [
  "id",
  "tenant_id",
  "connector_id",
  "property_id",
  "mapping_id",
  "operation",
  "desired_state",
  "current_state",
  "idempotency_key",
  "payload_hash",
  "mapping_version",
  "connector_schema_version",
  "attempt_count",
  "max_attempts",
  "next_attempt_at",
  "last_attempt_at",
  "last_error_code",
  "external_reference",
  "revision",
  "created_at",
  "updated_at",
  "completed_at",
  "cancelled_at",
].join(", ");

export const listTenantPortalJobs = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid.optional(),
    state: z.enum(PORTAL_JOB_STATES).optional(),
    limit: z.number().int().min(1).max(200).default(100),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("tenant_portal_jobs")
      .select(jobColumns)
      .eq("tenant_id", auth.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.connectorId) query = query.eq("connector_id", data.connectorId);
    if (data.state) query = query.eq("current_state", data.state);
    const result = await query;
    if (result.error) throw safeTenantPortalError(result.error);
    return (result.data ?? []).map(mapJob);
  });

export const getTenantPortalJob = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ jobId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("tenant_portal_jobs")
      .select(jobColumns)
      .eq("tenant_id", auth.tenantId)
      .eq("id", data.jobId)
      .maybeSingle();
    if (result.error) throw safeTenantPortalError(result.error);
    if (!result.data) throw new Error("tenant_portal_job_not_found");
    return mapJob(result.data);
  });

export const listTenantPortalAttempts = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ jobId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("tenant_portal_job_attempts")
      .select("id, tenant_id, job_id, attempt_number, started_at, completed_at, outcome, error_code, duration_ms, response_code, worker_id")
      .eq("tenant_id", auth.tenantId)
      .eq("job_id", data.jobId)
      .order("attempt_number", { ascending: false });
    if (result.error) throw safeTenantPortalError(result.error);
    return (result.data ?? []).map((row: any) => ({
      id: row.id as string,
      jobId: row.job_id as string,
      attemptNumber: Number(row.attempt_number),
      startedAt: row.started_at as string,
      completedAt: row.completed_at as string | null,
      outcome: row.outcome as string,
      errorCode: row.error_code as string | null,
      durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
      responseCode: row.response_code as string | null,
      workerId: row.worker_id as string,
    }));
  });

export const listTenantPortalLogs = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorSlug: z.string().max(120).optional(),
    limit: z.number().int().min(1).max(200).default(100),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("portal_sync_logs")
      .select("id, tenant_id, job_id, attempt_id, portal_slug, acao, status, error_code, duration_ms, created_at")
      .eq("tenant_id", auth.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.connectorSlug) query = query.eq("portal_slug", data.connectorSlug);
    const result = await query;
    if (result.error) throw safeTenantPortalError(result.error);
    return (result.data ?? []).map((row: any) => ({
      id: row.id as string,
      jobId: row.job_id as string | null,
      attemptId: row.attempt_id as string | null,
      connectorSlug: row.portal_slug as string,
      action: row.acao as string,
      status: row.status as string,
      errorCode: row.error_code as string | null,
      durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
      createdAt: row.created_at as string,
    }));
  });

export const generateTenantPortalManualExport = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    propertyIds: z.array(uuid).max(500),
    format: z.enum(["CSV", "XLSX", "MANUAL_EXPORT"]),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "export");
    await assertTenantPortalConnectorReadyForOperation(auth.tenantId, data.connectorId, "export");
    const mapping = await loadCurrentMapping(auth.tenantId, data.connectorId);
    const payloads = await buildTenantPropertyPayloads(auth.tenantId, data.propertyIds, mapping.mapping);

    let bytes: Uint8Array;
    let extension: string;
    let contentType: string;
    if (data.format === "XLSX") {
      bytes = await buildPortalXlsx(payloads);
      extension = "xlsx";
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (data.format === "MANUAL_EXPORT") {
      bytes = new TextEncoder().encode(stableJson(payloads as unknown as Json));
      extension = "json";
      contentType = "application/json";
    } else {
      bytes = new TextEncoder().encode(buildPortalCsv(payloads));
      extension = "csv";
      contentType = "text/csv;charset=utf-8";
    }

    const { createHash } = await import("node:crypto");
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const objectPath = `${auth.tenantId}/portal-exports/${data.connectorId}/${contentHash}.${extension}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upload = await supabaseAdmin.storage.from("site").upload(objectPath, bytes, {
      contentType,
      upsert: false,
      cacheControl: "private, max-age=0, no-store",
    });
    if (upload.error && !upload.error.message.toLowerCase().includes("already exists")) {
      throw new Error("tenant_portal_export_upload_failed");
    }

    try {
      const recorded = await executeTenantPortalRpc<{
        id: string;
        format: "CSV" | "XLSX" | "MANUAL_EXPORT";
        row_count: number;
        expires_at: string;
      }>("record_tenant_portal_export", {
        _actor_user_id: auth.actorUserId,
        _tenant_id: auth.tenantId,
        _tenant_origin: context.tenant.origin,
        _connector_id: data.connectorId,
        _mapping_id: mapping.id,
        _format: data.format,
        _object_path: objectPath,
        _content_hash: contentHash,
        _row_count: payloads.length,
        _size_bytes: bytes.byteLength,
        _expires_at: expiresAt,
      });
      const signed = await supabaseAdmin.storage.from("site").createSignedUrl(objectPath, 15 * 60, {
        download: `portal-export-${contentHash.slice(0, 12)}.${extension}`,
      });
      if (signed.error || !signed.data?.signedUrl) throw new Error("tenant_portal_export_sign_failed");
      return {
        exportId: recorded.id,
        format: data.format,
        rowCount: payloads.length,
        sizeBytes: bytes.byteLength,
        contentHash,
        expiresAt,
        signedUrl: signed.data.signedUrl,
      };
    } catch (error) {
      if (!upload.error) await supabaseAdmin.storage.from("site").remove([objectPath]);
      throw safeTenantPortalError(error);
    }
  });

export const getTenantPortalDashboard = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [connectors, jobs, exportsResult] = await Promise.all([
      (supabaseAdmin as any)
        .from("portal_connectors")
        .select("id, ativo, credential_state, rotation_required", { count: "exact" })
        .eq("tenant_id", auth.tenantId),
      (supabaseAdmin as any)
        .from("tenant_portal_jobs")
        .select("id, current_state, next_attempt_at, created_at")
        .eq("tenant_id", auth.tenantId)
        .order("created_at", { ascending: false })
        .limit(500),
      (supabaseAdmin as any)
        .from("tenant_portal_exports")
        .select("id, format, row_count, created_at")
        .eq("tenant_id", auth.tenantId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    for (const result of [connectors, jobs, exportsResult]) {
      if (result.error) throw safeTenantPortalError(result.error);
    }
    const jobRows = jobs.data ?? [];
    const byState = Object.fromEntries(PORTAL_JOB_STATES.map((state) => [
      state,
      jobRows.filter((row: any) => row.current_state === state).length,
    ])) as Record<PortalJobState, number>;
    return {
      operationMode: "HYBRID" as const,
      connectorsTotal: connectors.count ?? (connectors.data ?? []).length,
      connectorsActive: (connectors.data ?? []).filter((row: any) => row.ativo === true).length,
      credentialsPending: (connectors.data ?? []).filter(
        (row: any) => row.credential_state === "credential_provisioning_required" || row.rotation_required === true,
      ).length,
      jobsByState: byState,
      activeJobs: byState.queued + byState.processing + byState.unpublish_queued + byState.unpublishing + byState.retry_scheduled,
      retryAvailable: byState.failed_retryable,
      terminalFailures: byState.failed_terminal,
      reconciliationRequired: byState.reconciliation_required,
      exportsGenerated: (exportsResult.data ?? []).length,
      lastExportAt: exportsResult.data?.[0]?.created_at ?? null,
      automatedSuccessEnabled: false,
      manualExportEnabled: true,
    };
  });

export const getTenantPortalDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantPortalOperation(trusted(context), "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const connectorsResult = await (supabaseAdmin as any)
      .from("portal_connectors")
      .select(connectorSelect)
      .eq("tenant_id", auth.tenantId)
      .order("portal_nome", { ascending: true });
    if (connectorsResult.error) throw safeTenantPortalError(connectorsResult.error);
    const connectors = await listTenantPortalConnectorRows(auth.tenantId);
    return {
      tenantId: auth.tenantId,
      actorKind: auth.actorKind,
      connectorCount: connectors.length,
      registryCount: PORTAL_CONNECTOR_REGISTRY.length,
      adapterImplementedCount: 0,
      adapterNotImplementedCount: PORTAL_CONNECTOR_REGISTRY.length,
      inlineSecretsAccepted: false,
      plaintextCredentialsAccepted: false,
      directClientMutation: false,
      superAdminImpersonationRequired: true,
      operationMode: "HYBRID" as const,
      manualFormats: ["CSV", "XLSX", "MANUAL_EXPORT"] as const,
      configurationRequired: connectors.filter((item) => item.configurationState === "configuration_required").length,
      credentialProvisioningRequired: connectors.filter(
        (item) => item.credentialState === "credential_provisioning_required" || item.credentialState === "rotation_required",
      ).length,
      automatedState: "adapter_not_implemented" as const,
      managedLiveBackendMigrationExecuted: false,
      realExternalPortalExecutionPerformed: false,
    };
  });

export { DEFAULT_PORTAL_MAPPING };
