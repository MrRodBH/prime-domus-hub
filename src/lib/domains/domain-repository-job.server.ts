import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  DomainCommandAuthority,
  DomainJobRecord,
  DomainJobStatus,
  DomainJsonObject,
  DomainOperationType,
  TenantDomainRecord,
} from "./domain-contracts";
import { DomainError, sanitizeDomainObject, toSafeDomainError } from "./domain-errors";
import { mapDomain, mapJob, sha256 } from "./domain-repository-mappers.server";
const db = supabaseAdmin as any;

export async function enqueueDomainJob(input: {
  authority: DomainCommandAuthority;
  domain: TenantDomainRecord;
  operationType: DomainOperationType;
  payload?: DomainJsonObject;
  maxAttempts?: number;
}): Promise<DomainJobRecord> {
  const idempotencyKey = await sha256([
    "dca01",
    input.authority.tenantId,
    input.domain.id,
    String(input.domain.generation),
    input.operationType,
    JSON.stringify(input.payload ?? {}),
  ].join(":"));
  const { data, error } = await db.from("domain_operation_jobs").upsert({
    tenant_id: input.authority.tenantId,
    domain_id: input.domain.id,
    generation: input.domain.generation,
    operation_type: input.operationType,
    execution_mode: input.domain.executionMode,
    idempotency_key: idempotencyKey,
    requested_by: input.authority.userId,
    authority_origin: input.authority.origin,
    max_attempts: Math.max(1, Math.min(10, input.maxAttempts ?? 5)),
    payload: sanitizeDomainObject(input.payload ?? {}),
  }, { onConflict: "idempotency_key", ignoreDuplicates: false }).select("*");
  if (error) throw toSafeDomainError(error);
  if (!data || data.length !== 1) throw new DomainError("domain_ambiguous", "Job was not resolved exactly once");
  return mapJob(data[0]);
}

export async function leaseDomainJobs(leaseOwner: string, limit = 10): Promise<DomainJobRecord[]> {
  const { data, error } = await db.rpc("lease_domain_operation_jobs", {
    _lease_owner: leaseOwner,
    _lease_seconds: 90,
    _limit: Math.max(1, Math.min(50, limit)),
  });
  if (error) throw toSafeDomainError(error);
  return (data ?? []).map(mapJob);
}

export async function completeDomainJob(input: {
  jobId: string;
  leaseOwner: string;
  outcome: Exclude<DomainJobStatus, "pending" | "leased">;
  result?: DomainJsonObject;
  terminalErrorCode?: string | null;
  retryAfterSeconds?: number | null;
}): Promise<DomainJobRecord> {
  const { data, error } = await db.rpc("complete_domain_operation_job", {
    _job_id: input.jobId,
    _lease_owner: input.leaseOwner,
    _outcome: input.outcome,
    _result_sanitized: sanitizeDomainObject(input.result ?? {}),
    _terminal_error_code: input.terminalErrorCode ?? null,
    _retry_after_seconds: input.retryAfterSeconds ?? null,
  });
  if (error) throw toSafeDomainError(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new DomainError("domain_not_found", "Completed job row was not returned");
  return mapJob(row);
}

export async function listDomainOperationFailures(limit = 100): Promise<DomainJobRecord[]> {
  const { data, error } = await db.from("domain_operation_jobs").select("*")
    .eq("status", "failed").order("updated_at", { ascending: false }).limit(Math.max(1, Math.min(200, limit)));
  if (error) throw toSafeDomainError(error);
  return (data ?? []).map(mapJob);
}

export async function cancelCancellableDomainJob(input: {
  tenantId: string;
  jobId: string;
}): Promise<{ cancelled: true }> {
  const { data, error } = await db.from("domain_operation_jobs").update({
    status: "cancelled",
    lease_owner: null,
    lease_expires_at: null,
    updated_at: new Date().toISOString(),
  }).eq("id", input.jobId)
    .eq("tenant_id", input.tenantId)
    .in("status", ["pending", "retry_wait"])
    .select("id");
  if (error) throw toSafeDomainError(error);
  if (!data || data.length !== 1) {
    throw new DomainError("domain_transition_forbidden", "Only one pending or retry_wait job can be cancelled");
  }
  return { cancelled: true };
}

export async function listTenantDomainJobs(tenantId: string, domainId?: string): Promise<DomainJobRecord[]> {
  let query = db.from("domain_operation_jobs").select("*").eq("tenant_id", tenantId);
  if (domainId) query = query.eq("domain_id", domainId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) throw toSafeDomainError(error);
  return (data ?? []).map(mapJob);
}

export async function enqueueScheduledDomainReconciliationJobs(now = new Date()): Promise<number> {
  const { data, error } = await db.from("tenant_domains").select("*")
    .in("status", ["active", "degraded", "pending_ssl"])
    .eq("enabled", true);
  if (error) throw toSafeDomainError(error);
  const scheduleBucket = now.toISOString().slice(0, 13);
  const domains: TenantDomainRecord[] = (data ?? []).map(mapDomain);
  await Promise.all(domains.map((domain: TenantDomainRecord) => enqueueDomainJob({
    authority: { userId: domain.requestedBy, tenantId: domain.tenantId, origin: "platform", isSuperAdmin: false },
    domain,
    operationType: domain.status === "pending_ssl" ? "observe_ssl_lifecycle" : "reconcile_domain",
    payload: { scheduledReconciliationBucket: scheduleBucket },
    maxAttempts: 10,
  })));
  return domains.length;
}