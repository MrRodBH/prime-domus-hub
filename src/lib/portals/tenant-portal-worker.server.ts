import type { Json } from "@/integrations/supabase/types";
import {
  buildPortalPublicationPayload,
  getPortalAdapter,
  hashPortalPayload,
  type PortalMediaRecord,
  type PortalPropertyRecord,
} from "@/lib/portals/portal-adapter.server";
import {
  PortalMappingSchema,
  parsePortalHybridConfig,
  type PortalJobState,
} from "@/lib/portals/portal-connector-registry";
import { executeTenantPortalRpc } from "@/lib/api/tenant-portal-authority.server";

export type TenantPortalWorkerInput = {
  tenantId: string;
  jobId: string;
  expectedRevision: number;
  workerId: string;
};

/**
 * Internal service-role worker entry point. It requires an explicit job id and
 * never searches for an authoritative row through ORDER BY/LIMIT 1.
 */
export async function executeTenantPortalJob(
  input: TenantPortalWorkerInput,
): Promise<{
  jobId: string;
  state: PortalJobState;
  attemptNumber: number;
  revision: number;
  errorCode: string | null;
}> {
  const claimed = await executeTenantPortalRpc<{
    id: string;
    current_state: "processing" | "unpublishing";
    attempt_number: number;
    revision: number;
    worker_id: string;
  }>("claim_tenant_portal_job", {
    _tenant_id: input.tenantId,
    _job_id: input.jobId,
    _expected_revision: input.expectedRevision,
    _worker_id: input.workerId,
  });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const jobResult = await (supabaseAdmin as any)
    .from("tenant_portal_jobs")
    .select("id, tenant_id, connector_id, property_id, mapping_id, operation, desired_state, current_state, revision")
    .eq("tenant_id", input.tenantId)
    .eq("id", input.jobId)
    .maybeSingle();
  if (jobResult.error || !jobResult.data) throw new Error("tenant_portal_job_not_found");
  const job = jobResult.data;

  const [connectorResult, propertyResult, mappingResult, mediaResult] = await Promise.all([
    (supabaseAdmin as any)
      .from("portal_connectors")
      .select("id, tenant_id, config, feed_url, webhook_url, credential_reference")
      .eq("tenant_id", input.tenantId)
      .eq("id", job.connector_id)
      .maybeSingle(),
    (supabaseAdmin as any)
      .from("imoveis")
      .select("id, tenant_id, titulo, descricao, codigo, tipo, finalidade, preco, preco_sob_consulta, cidade, estado, quartos, banheiros, vagas, area_util, status, publicado_em, updated_at")
      .eq("tenant_id", input.tenantId)
      .eq("id", job.property_id)
      .maybeSingle(),
    (supabaseAdmin as any)
      .from("tenant_portal_mappings")
      .select("id, tenant_id, connector_id, mapping")
      .eq("tenant_id", input.tenantId)
      .eq("connector_id", job.connector_id)
      .eq("id", job.mapping_id)
      .maybeSingle(),
    (supabaseAdmin as any)
      .from("imovel_imagens")
      .select("id, tenant_id, imovel_id, url, ordem")
      .eq("tenant_id", input.tenantId)
      .eq("imovel_id", job.property_id)
      .order("ordem", { ascending: true }),
  ]);

  for (const result of [connectorResult, propertyResult, mappingResult, mediaResult]) {
    if (result.error) throw new Error("tenant_portal_worker_read_failed");
  }
  if (!connectorResult.data || !propertyResult.data || !mappingResult.data) {
    throw new Error("tenant_portal_cross_tenant_or_missing_resource");
  }

  const config = parsePortalHybridConfig(connectorResult.data.config);
  const adapter = getPortalAdapter(config.automated_method);
  adapter.validateConfiguration(config);
  const payload = buildPortalPublicationPayload({
    property: propertyResult.data as PortalPropertyRecord,
    media: (mediaResult.data ?? []) as PortalMediaRecord[],
    mapping: PortalMappingSchema.parse(mappingResult.data.mapping),
  });
  const payloadHash = await hashPortalPayload(payload as unknown as Json);

  const startedAt = Date.now();
  const result = job.operation === "publish"
    ? await adapter.publish({
        endpoint: connectorResult.data.feed_url,
        credentialReference: connectorResult.data.credential_reference,
        payload,
        timeoutMs: 15_000,
      })
    : await adapter.unpublish({
        endpoint: connectorResult.data.feed_url ?? connectorResult.data.webhook_url,
        credentialReference: connectorResult.data.credential_reference,
        externalReference: "reconciliation_required",
        timeoutMs: 15_000,
      });

  const durationMs = Math.max(0, Date.now() - startedAt);
  const outcome = result.ok
    ? "success"
    : result.errorCode === "adapter_not_implemented"
      ? "adapter_not_implemented"
      : result.retryable
        ? "failed_retryable"
        : "failed_terminal";

  await executeTenantPortalRpc("record_tenant_portal_attempt", {
    _tenant_id: input.tenantId,
    _job_id: input.jobId,
    _attempt_number: claimed.attempt_number,
    _worker_id: input.workerId,
    _outcome: outcome,
    _error_code: result.ok ? null : result.errorCode,
    _duration_ms: durationMs,
    _response_code: result.ok ? result.responseCode : null,
    _response_metadata: result.ok
      ? { payload_hash: payloadHash, result: "success" }
      : { payload_hash: payloadHash, result: "failed" },
  });

  const completed = await executeTenantPortalRpc<{
    id: string;
    current_state: PortalJobState;
    revision: number;
  }>("complete_tenant_portal_job", {
    _tenant_id: input.tenantId,
    _job_id: input.jobId,
    _expected_revision: claimed.revision,
    _success: result.ok,
    _retryable: result.ok ? false : result.retryable,
    _error_code: result.ok ? null : result.errorCode,
    _external_reference: result.ok ? result.externalReference : null,
  });

  return {
    jobId: input.jobId,
    state: completed.current_state,
    attemptNumber: claimed.attempt_number,
    revision: completed.revision,
    errorCode: result.ok ? null : result.errorCode,
  };
}
