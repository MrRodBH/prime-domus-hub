import type { DomainJobRecord, TenantDomainRecord } from "./domain-contracts";

/** Cancellation concerns only the leased task. It never grants domain authority. */
export function obsoleteDomainJobReason(job: DomainJobRecord, domain: TenantDomainRecord): string | null {
  if (job.tenantId !== domain.tenantId || job.domainId !== domain.id) return "identity_mismatch";
  if (job.generation !== domain.generation) return "generation_superseded";
  const cleanup = job.operationType === "cleanup_domain" || job.operationType === "remove_domain";
  if (domain.status === "revoked") return "domain_revoked";
  if (cleanup) return null;
  if (!domain.enabled || domain.status === "removal_pending") return "domain_retired";
  if (job.executionMode !== domain.executionMode) return "execution_mode_superseded";
  if (domain.status === "failed") return "explicit_recovery_required";

  // Explicit phase membership, never newest-job selection or an ordinal guess.
  const afterOwnership = ["ownership_verified", "pending_dns_configuration", "pending_cloudflare_provisioning", "pending_ssl", "active", "degraded"];
  const afterPreparation = ["pending_dns_configuration", "pending_cloudflare_provisioning", "pending_ssl", "active", "degraded"];
  if (job.operationType === "observe_ownership_dns" && afterOwnership.includes(domain.status)) return "ownership_phase_completed";
  if (job.operationType === "prepare_dns_configuration" && afterPreparation.includes(domain.status)) return "dns_preparation_phase_completed";
  if (job.operationType === "observe_required_dns" && ["pending_cloudflare_provisioning", "pending_ssl", "active", "degraded"].includes(domain.status)) return "dns_observation_phase_completed";
  if (job.operationType === "provision_provider_binding" && ["pending_ssl", "active", "degraded"].includes(domain.status)) return "provider_phase_completed";
  return null;
}

/** A stale failure may finish its own attempt, never regress a newer domain. */
export function mayRecordDomainFailure(job: DomainJobRecord, started: TenantDomainRecord, current: TenantDomainRecord, code: string): boolean {
  if (["domain_challenge_expired", "domain_authority_denied", "domain_generation_mismatch", "domain_version_conflict", "domain_lease_conflict", "domain_transition_forbidden"].includes(code)) return false;
  return job.tenantId === current.tenantId && job.domainId === current.id
    && job.generation === current.generation
    && started.tenantId === current.tenantId && started.id === current.id
    && started.generation === current.generation && started.lockVersion === current.lockVersion
    && started.status === current.status && started.executionMode === current.executionMode;
}
