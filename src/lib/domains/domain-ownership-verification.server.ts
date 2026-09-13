import type { DomainCommandAuthority, TenantDomainRecord } from "./domain-contracts";
import { DomainError } from "./domain-errors";
import { observeDnsTxt } from "./dns-observation.server";
import { enqueueDomainJob, getCurrentOwnershipChallenge, getTenantDomain, verifyOwnershipObservation } from "./domain-repository.server";

/** One ownership verifier for authenticated manual requests and scheduled jobs.
 * The SQL authority still locks and validates the exact challenge/generation.
 * Neither entry point accepts proof values or a verification claim from a client.
 */
export async function verifyDomainOwnership(input: {
  authority: DomainCommandAuthority;
  domain: TenantDomainRecord;
}) {
  const { authority } = input;
  if (authority.isSuperAdmin || authority.origin === "impersonation" || authority.tenantId !== input.domain.tenantId) {
    throw new DomainError("domain_authority_denied", "Tenant domain verification authority is invalid");
  }
  const domain = await getTenantDomain(authority.tenantId, input.domain.id);
  if (domain.generation !== input.domain.generation) {
    throw new DomainError("domain_generation_mismatch", "Ownership verification generation is stale");
  }
  const challenge = await getCurrentOwnershipChallenge(domain);
  if (challenge?.status === "verified" && challenge.generation === domain.generation) {
    return { verified: true, alreadyVerified: true, status: domain.status, recordName: challenge.recordName };
  }
  if (!challenge || challenge.status !== "active" || Date.parse(challenge.expiresAt) <= Date.now()) {
    throw new DomainError("domain_challenge_expired", "A prova TXT expirou. Gere uma nova prova antes de verificar.");
  }
  if (domain.status !== "pending_ownership_verification") {
    throw new DomainError("domain_transition_forbidden", "O domínio não está aguardando verificação de propriedade.");
  }
  const observation = await observeDnsTxt(challenge.recordName);
  let result;
  try {
    result = await verifyOwnershipObservation({ authority, domain, observedValues: observation.values });
  } catch (error) {
    // Another request may have verified this exact proof while DNS was read.
    // A changed generation or rotated proof must never inherit that success.
    const current = await getTenantDomain(authority.tenantId, domain.id);
    const currentChallenge = await getCurrentOwnershipChallenge(current);
    if (current.generation === domain.generation && currentChallenge?.id === challenge.id && currentChallenge.status === "verified") {
      return { verified: true, alreadyVerified: true, status: current.status, recordName: challenge.recordName };
    }
    throw error;
  }
  if (result.verified) {
    await enqueueDomainJob({
      authority,
      domain: result.domain,
      operationType: "prepare_dns_configuration",
      payload: { ownershipChallengeId: challenge.id, challengeVersion: challenge.challengeVersion },
    });
  }
  return {
    verified: result.verified,
    alreadyVerified: false,
    status: result.domain.status,
    recordName: observation.recordName,
    observedAt: observation.observedAt,
    observedValueCount: observation.values.length,
  };
}
