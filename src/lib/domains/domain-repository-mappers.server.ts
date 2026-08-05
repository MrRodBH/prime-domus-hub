import type {
  DomainAuditEventRecord,
  DomainChallengeRecord,
  DomainJobRecord,
  DomainJsonObject,
  DomainProviderBindingRecord,
  TenantDomainRecord,
} from "./domain-contracts";
import { sanitizeDomainObject } from "./domain-errors";

export function objectValue(value: unknown): DomainJsonObject {
  return sanitizeDomainObject(value);
}

export function mapDomain(row: any): TenantDomainRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    normalizedHostname: row.normalized_hostname,
    registrableDomain: row.registrable_domain,
    hostnameKind: row.hostname_kind,
    executionMode: row.execution_mode,
    status: row.status,
    enabled: row.enabled,
    generation: Number(row.generation),
    replacementOf: row.replacement_of ?? null,
    incumbentDomainId: row.incumbent_domain_id ?? null,
    lockVersion: Number(row.lock_version),
    failureCode: row.failure_code ?? null,
    failureDetailSanitized: objectValue(row.failure_detail_sanitized),
    resumeState: row.resume_state ?? null,
    metadata: objectValue(row.metadata),
    requestedBy: row.requested_by,
    activatedAt: row.activated_at ?? null,
    revokedAt: row.revoked_at ?? null,
    hostnameReusableAfter: row.hostname_reusable_after ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapChallenge(row: any): DomainChallengeRecord {
  return {
    id: row.id,
    domainId: row.domain_id,
    tenantId: row.tenant_id,
    generation: Number(row.generation),
    challengeVersion: Number(row.challenge_version),
    challengeKind: row.challenge_kind,
    recordName: row.record_name,
    valueDigest: row.value_digest,
    opaqueNonceReference: row.opaque_nonce_reference,
    status: row.status,
    expiresAt: row.expires_at,
    verifiedAt: row.verified_at ?? null,
    attemptCount: Number(row.attempt_count),
    observedValueHash: row.observed_value_hash ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapJob(row: any): DomainJobRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domainId: row.domain_id,
    generation: Number(row.generation),
    operationType: row.operation_type,
    executionMode: row.execution_mode,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    requestedBy: row.requested_by,
    authorityOrigin: row.authority_origin,
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    leaseOwner: row.lease_owner ?? null,
    leaseExpiresAt: row.lease_expires_at ?? null,
    nextAttemptAt: row.next_attempt_at,
    payload: objectValue(row.payload),
    resultSanitized: objectValue(row.result_sanitized),
    terminalErrorCode: row.terminal_error_code ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBinding(row: any): DomainProviderBindingRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domainId: row.domain_id,
    generation: Number(row.generation),
    providerAccountId: row.provider_account_id,
    zoneId: row.zone_id ?? null,
    customHostnameId: row.custom_hostname_id ?? null,
    providerStatus: row.provider_status ?? null,
    sslStatus: row.ssl_status ?? null,
    providerVersion: row.provider_version ?? null,
    observedAt: row.observed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAudit(row: any): DomainAuditEventRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? null,
    domainId: row.domain_id ?? null,
    generation: row.generation == null ? null : Number(row.generation),
    actorUserId: row.actor_user_id ?? null,
    authorityOrigin: row.authority_origin,
    commandId: row.command_id ?? null,
    correlationId: row.correlation_id,
    eventType: row.event_type,
    beforeStatus: row.before_status ?? null,
    afterStatus: row.after_status ?? null,
    detailSanitized: objectValue(row.detail_sanitized),
    createdAt: row.created_at,
  };
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (item) => item.toString(16).padStart(2, "0")).join("");
}

export function randomHex(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (item) => item.toString(16).padStart(2, "0")).join("");
}
