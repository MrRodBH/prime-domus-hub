import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  DomainActivationStatus,
  DomainAuditEventRecord,
  DomainChallengeRecord,
  DomainCommandAuthority,
  DomainEvidence,
  DomainExecutionMode,
  DomainJsonObject,
  TenantDomainRecord,
} from "./domain-contracts";
import { DomainError, sanitizeDomainObject, toSafeDomainError } from "./domain-errors";
import { normalizeDomainHostname } from "./domain-normalization";
import { assertAtomicReplacementSwap, assertDomainTransition, assertStatusPreservingOwnershipCommand } from "./domain-state-machine";
import { mapAudit, mapChallenge, mapDomain, randomHex, sha256 } from "./domain-repository-mappers.server";
const db = supabaseAdmin as any;

export async function listTenantDomains(tenantId: string): Promise<TenantDomainRecord[]> {
  const { data, error } = await db
    .from("tenant_domains")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw toSafeDomainError(error);
  return (data ?? []).map(mapDomain);
}

export async function getTenantDomain(tenantId: string, domainId: string): Promise<TenantDomainRecord> {
  const { data, error } = await db
    .from("tenant_domains")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", domainId);
  if (error) throw toSafeDomainError(error);
  if (!data || data.length !== 1) {
    throw new DomainError(data?.length ? "domain_ambiguous" : "domain_not_found", "Domain row was not resolved exactly once");
  }
  return mapDomain(data[0]);
}

export async function createTenantDomainRequest(input: {
  authority: DomainCommandAuthority;
  hostname: string;
  executionMode: DomainExecutionMode;
  hostnameKind?: "canonical" | "alias";
  incumbentDomainId?: string | null;
}): Promise<TenantDomainRecord> {
  const normalized = normalizeDomainHostname(input.hostname);
  const { data, error } = await db.rpc("create_tenant_domain_request", {
    _tenant_id: input.authority.tenantId,
    _normalized_hostname: normalized.hostname,
    _registrable_domain: normalized.registrableDomain,
    _hostname_kind: input.hostnameKind ?? "canonical",
    _execution_mode: input.executionMode,
    _incumbent_domain_id: input.incumbentDomainId ?? null,
    _requested_by: input.authority.userId,
    _authority_origin: input.authority.origin,
    _metadata: { public_suffix: normalized.publicSuffix, authority_origin: input.authority.origin },
    _correlation_id: crypto.randomUUID(),
  });
  if (error) {
    if (String(error.code) === "23505") {
      throw new DomainError("domain_hostname_conflict", "Hostname or live replacement is already reserved", { cause: error });
    }
    throw toSafeDomainError(error);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new DomainError("domain_ambiguous", "Created domain was not returned exactly once");
  return mapDomain(row);
}

export async function transitionTenantDomain(input: {
  authority: DomainCommandAuthority;
  domain: TenantDomainRecord;
  to: DomainActivationStatus;
  evidence?: DomainEvidence;
  failureCode?: string | null;
  failureDetail?: DomainJsonObject;
  recoveryTarget?: DomainActivationStatus | null;
}): Promise<TenantDomainRecord> {
  assertDomainTransition(input.domain.status, input.to, {
    evidence: input.evidence,
    recoveryTarget: input.recoveryTarget,
  });
  const { data, error } = await db.rpc("transition_tenant_domain", {
    _tenant_id: input.authority.tenantId,
    _domain_id: input.domain.id,
    _expected_lock_version: input.domain.lockVersion,
    _from_status: input.domain.status,
    _to_status: input.to,
    _actor_user_id: input.authority.userId,
    _authority_origin: input.authority.origin,
    _active_evidence: input.evidence ?? {},
    _failure_code: input.failureCode ?? null,
    _failure_detail_sanitized: sanitizeDomainObject(input.failureDetail ?? {}),
    _resume_state: input.recoveryTarget ?? null,
  });
  if (error) throw toSafeDomainError(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new DomainError("domain_not_found", "Domain transition returned no row");
  return mapDomain(row);
}

export async function activateReplacement(input: {
  authority: DomainCommandAuthority;
  incumbent: TenantDomainRecord;
  candidate: TenantDomainRecord;
  evidence: DomainEvidence;
}): Promise<{ incumbent: TenantDomainRecord; candidate: TenantDomainRecord }> {
  assertAtomicReplacementSwap({
    incumbent: input.incumbent,
    candidate: input.candidate,
    incumbentExpectedVersion: input.incumbent.lockVersion,
    candidateExpectedVersion: input.candidate.lockVersion,
    candidateEvidence: input.evidence,
  });
  const { data, error } = await db.rpc("activate_domain_replacement", {
    _tenant_id: input.authority.tenantId,
    _incumbent_domain_id: input.incumbent.id,
    _candidate_domain_id: input.candidate.id,
    _incumbent_expected_lock_version: input.incumbent.lockVersion,
    _candidate_expected_lock_version: input.candidate.lockVersion,
    _actor_user_id: input.authority.userId,
    _authority_origin: input.authority.origin,
    _candidate_evidence: input.evidence,
  });
  if (error) throw toSafeDomainError(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.incumbent || !row?.candidate) throw new DomainError("domain_ambiguous", "Replacement swap returned incomplete rows");
  return { incumbent: mapDomain(row.incumbent), candidate: mapDomain(row.candidate) };
}

export async function issueOwnershipChallenge(input: {
  authority: DomainCommandAuthority;
  domain: TenantDomainRecord;
  ttlMinutes?: number;
}): Promise<{ challenge: DomainChallengeRecord; proofValue: string }> {
  assertStatusPreservingOwnershipCommand(input.domain.status, "issue_ownership_challenge");
  const ttlMinutes = Math.min(60, Math.max(5, input.ttlMinutes ?? 30));
  const proofValue = `rmprime-domain-verification=${randomHex(32)}`;
  const valueDigest = await sha256(proofValue);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const valueReference = `challenge:${input.domain.id}:${input.domain.generation}:${crypto.randomUUID()}`;
  const { data, error } = await db.rpc("issue_domain_ownership_challenge", {
    _tenant_id: input.authority.tenantId,
    _domain_id: input.domain.id,
    _expected_generation: input.domain.generation,
    _actor_user_id: input.authority.userId,
    _authority_origin: input.authority.origin,
    _record_name: `_rm-prime.${input.domain.normalizedHostname}`,
    _value_digest: valueDigest,
    _value_reference: valueReference,
    _expires_at: expiresAt,
    _correlation_id: crypto.randomUUID(),
  });
  if (error) throw toSafeDomainError(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new DomainError("domain_ambiguous", "Challenge was not returned exactly once");
  return { challenge: mapChallenge(row), proofValue };
}

export async function verifyOwnershipObservation(input: {
  authority: DomainCommandAuthority;
  domain: TenantDomainRecord;
  observedValues: readonly string[];
}): Promise<{ verified: boolean; domain: TenantDomainRecord; challenge: DomainChallengeRecord }> {
  assertStatusPreservingOwnershipCommand(input.domain.status, "observe_ownership_dns_without_verified_evidence");
  const challenge = await getCurrentOwnershipChallenge(input.domain);
  if (!challenge || challenge.status !== "active") {
    throw new DomainError("domain_challenge_expired", "No active ownership challenge exists");
  }
  const observedDigests = await Promise.all(input.observedValues.map((value) => sha256(value)));
  const observationDigest = await sha256([...observedDigests].sort().join("\n"));
  const { data, error } = await db.rpc("verify_domain_ownership_challenge", {
    _tenant_id: input.authority.tenantId,
    _domain_id: input.domain.id,
    _expected_generation: input.domain.generation,
    _challenge_id: challenge.id,
    _challenge_version: challenge.challengeVersion,
    _observed_digests: observedDigests,
    _observation_digest: observationDigest,
    _actor_user_id: input.authority.userId,
    _authority_origin: input.authority.origin,
    _correlation_id: crypto.randomUUID(),
  });
  if (error) throw toSafeDomainError(error);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object") {
    throw new DomainError("domain_ambiguous", "Ownership verification returned incomplete authority state");
  }
  const resultObject = result as Record<string, any>;
  if (!resultObject.domain || !resultObject.challenge) {
    throw new DomainError("domain_ambiguous", "Ownership verification returned incomplete authority state");
  }
  return {
    verified: resultObject.verified === true,
    domain: mapDomain(resultObject.domain),
    challenge: mapChallenge(resultObject.challenge),
  };
}

export async function appendDomainAudit(input: {
  authority: DomainCommandAuthority;
  domainId: string | null;
  generation: number | null;
  eventType: string;
  beforeStatus: DomainActivationStatus | null;
  afterStatus: DomainActivationStatus | null;
  detail?: DomainJsonObject;
  correlationId?: string;
}): Promise<void> {
  const { error } = await db.from("domain_audit_events").insert({
    tenant_id: input.authority.tenantId,
    domain_id: input.domainId,
    generation: input.generation,
    actor_user_id: input.authority.userId,
    authority_origin: input.authority.origin,
    correlation_id: input.correlationId ?? crypto.randomUUID(),
    event_type: input.eventType,
    before_status: input.beforeStatus,
    after_status: input.afterStatus,
    detail_sanitized: sanitizeDomainObject(input.detail ?? {}),
  });
  if (error) throw toSafeDomainError(error);
}

export async function listDomainAuditEvents(tenantId: string, domainId?: string): Promise<DomainAuditEventRecord[]> {
  let query = db.from("domain_audit_events").select("*").eq("tenant_id", tenantId);
  if (domainId) query = query.eq("domain_id", domainId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) throw toSafeDomainError(error);
  return (data ?? []).map(mapAudit);
}

export async function getCurrentOwnershipChallenge(domain: TenantDomainRecord): Promise<DomainChallengeRecord | null> {
  const { data, error } = await db.from("domain_verification_challenges").select("*")
    .eq("domain_id", domain.id).eq("generation", domain.generation)
    .in("status", ["active", "verified"]);
  if (error) throw toSafeDomainError(error);
  if (!data || data.length === 0) return null;
  const verified = data.filter((row: any) => row.status === "verified");
  const candidates = verified.length > 0 ? verified : data.filter((row: any) => row.status === "active");
  if (candidates.length !== 1) throw new DomainError("domain_ambiguous", "Current challenge cardinality is ambiguous");
  return mapChallenge(candidates[0]);
}

export async function patchDomainMetadata(input: {
  domain: TenantDomainRecord;
  patch: DomainJsonObject;
}): Promise<TenantDomainRecord> {
  const metadata: DomainJsonObject = { ...input.domain.metadata, ...sanitizeDomainObject(input.patch) };
  const { data, error } = await db.from("tenant_domains").update({
    metadata,
    lock_version: input.domain.lockVersion + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", input.domain.id)
    .eq("tenant_id", input.domain.tenantId)
    .eq("lock_version", input.domain.lockVersion)
    .select("*");
  if (error) throw toSafeDomainError(error);
  if (!data || data.length !== 1) throw new DomainError("domain_version_conflict", "Domain metadata version conflict");
  return mapDomain(data[0]);
}