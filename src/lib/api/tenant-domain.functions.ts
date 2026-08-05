import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { authorizeTenantDomainOperation } from "@/lib/domains/domain-authority.server";
import {
  cancelCancellableDomainJob,
  changeTenantDomainExecutionMode,
  createTenantDomainRequest,
  enqueueDomainJob,
  getCurrentOwnershipChallenge,
  getTenantDomain,
  issueOwnershipChallenge,
  listDomainAuditEvents,
  listTenantDomainJobs,
  listTenantDomains,
  transitionTenantDomain,
} from "@/lib/domains/domain-repository.server";
import type { DomainOperationType, TenantDomainRecord } from "@/lib/domains/domain-contracts";
import { DomainError, toSafeDomainError } from "@/lib/domains/domain-errors";

const trusted = (context: any) => ({ userId: context.userId as string, tenant: context.tenant });
const domainIdSchema = z.object({ domainId: z.string().uuid() }).strict();
const requestSchema = z.object({
  hostname: z.string().trim().min(3).max(253),
  executionMode: z.enum(["manual_assisted", "api_automated"]),
  hostnameKind: z.enum(["canonical", "alias"]).optional().default("canonical"),
}).strict();
const replacementSchema = z.object({
  hostname: z.string().trim().min(3).max(253),
  executionMode: z.enum(["manual_assisted", "api_automated"]),
  incumbentDomainId: z.string().uuid(),
}).strict();
const cancelSchema = z.object({ jobId: z.string().uuid() }).strict();
const modeChangeSchema = z.object({
  domainId: z.string().uuid(),
  executionMode: z.enum(["manual_assisted", "api_automated"]),
}).strict();

function nextOperationFor(domain: TenantDomainRecord): DomainOperationType {
  switch (domain.status) {
    case "pending_ownership_verification": return "observe_ownership_dns";
    case "ownership_verified": return "prepare_dns_configuration";
    case "pending_dns_configuration": return "observe_required_dns";
    case "pending_cloudflare_provisioning": return "provision_provider_binding";
    case "pending_ssl":
    case "active":
    case "degraded": return "reconcile_domain";
    case "removal_pending": return "cleanup_domain";
    default:
      throw new DomainError("domain_transition_forbidden", `No deterministic retry operation exists for ${domain.status}`);
  }
}

export const getTenantDomainState = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "read");
    const domains = await listTenantDomains(authority.tenantId);
    const challengePairs = await Promise.all(domains.map(async (domain) => {
      const challenge = await getCurrentOwnershipChallenge(domain);
      return [domain.id, challenge ? {
        id: challenge.id,
        domainId: challenge.domainId,
        generation: challenge.generation,
        challengeVersion: challenge.challengeVersion,
        recordName: challenge.recordName,
        status: challenge.status,
        expiresAt: challenge.expiresAt,
        verifiedAt: challenge.verifiedAt,
        attemptCount: challenge.attemptCount,
      } : null] as const;
    }));
    return {
      tenantId: authority.tenantId,
      domains,
      challenges: Object.fromEntries(challengePairs),
      jobs: await listTenantDomainJobs(authority.tenantId),
      clientStatusAuthority: false,
      clientProviderAuthority: false,
      silentModeFallback: false,
    };
  });

export const requestTenantDomain = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "request");
    let domain = await createTenantDomainRequest({
      authority,
      hostname: data.hostname,
      executionMode: data.executionMode,
      hostnameKind: data.hostnameKind,
    });
    domain = await transitionTenantDomain({ authority, domain, to: "pending_ownership_verification" });
    const { challenge, proofValue } = await issueOwnershipChallenge({ authority, domain });
    return {
      domain,
      challenge: {
        id: challenge.id,
        recordName: challenge.recordName,
        proofValue,
        expiresAt: challenge.expiresAt,
        challengeVersion: challenge.challengeVersion,
      },
      proofValueReturnedOnce: true,
    };
  });

export const rotateDomainOwnershipChallenge = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => domainIdSchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "operate");
    const domain = await getTenantDomain(authority.tenantId, data.domainId);
    const { challenge, proofValue } = await issueOwnershipChallenge({ authority, domain });
    return {
      challenge: {
        id: challenge.id,
        recordName: challenge.recordName,
        proofValue,
        expiresAt: challenge.expiresAt,
        challengeVersion: challenge.challengeVersion,
      },
      statusPreserved: domain.status,
      proofValueReturnedOnce: true,
    };
  });

export const requestDomainVerificationCheck = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => domainIdSchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "operate");
    const domain = await getTenantDomain(authority.tenantId, data.domainId);
    const job = await enqueueDomainJob({
      authority,
      domain,
      operationType: "observe_ownership_dns",
      payload: { requestedAt: new Date().toISOString() },
    });
    return { job, clientVerificationAssertionAccepted: false };
  });

export const requestDomainOperationRetry = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => domainIdSchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "operate");
    let domain = await getTenantDomain(authority.tenantId, data.domainId);
    if (domain.status === "failed") {
      if (!domain.resumeState || domain.resumeState === "failed" || domain.resumeState === "revoked") {
        throw new DomainError("domain_transition_forbidden", "Failed domain has no explicit recoverable resume state");
      }
      domain = await transitionTenantDomain({
        authority,
        domain,
        to: domain.resumeState,
        recoveryTarget: domain.resumeState,
      });
    }
    const operationType = nextOperationFor(domain);
    return enqueueDomainJob({
      authority,
      domain,
      operationType,
      payload: { explicitRetryRequestedAt: new Date().toISOString(), recoveredFromFailed: true },
    });
  });

export const requestDomainReplacement = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => replacementSchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "request");
    let domain = await createTenantDomainRequest({
      authority,
      hostname: data.hostname,
      executionMode: data.executionMode,
      hostnameKind: "canonical",
      incumbentDomainId: data.incumbentDomainId,
    });
    domain = await transitionTenantDomain({ authority, domain, to: "pending_ownership_verification" });
    const { challenge, proofValue } = await issueOwnershipChallenge({ authority, domain });
    const aliasCandidates = (await listTenantDomains(authority.tenantId)).filter((candidateAlias) =>
      candidateAlias.hostnameKind === "alias"
      && candidateAlias.generation === domain.generation
      && candidateAlias.replacementOf !== null
      && candidateAlias.status === "pending_ownership_verification",
    );
    const aliasChallenges: Array<{
      domainId: string;
      hostname: string;
      id: string;
      recordName: string;
      proofValue: string;
      expiresAt: string;
      challengeVersion: number;
    }> = [];
    const aliasChallengeFailures: Array<{
      domainId: string;
      hostname: string;
      errorCode: string;
    }> = [];
    for (const candidateAlias of aliasCandidates) {
      try {
        const issued = await issueOwnershipChallenge({ authority, domain: candidateAlias });
        aliasChallenges.push({
          domainId: candidateAlias.id,
          hostname: candidateAlias.normalizedHostname,
          id: issued.challenge.id,
          recordName: issued.challenge.recordName,
          proofValue: issued.proofValue,
          expiresAt: issued.challenge.expiresAt,
          challengeVersion: issued.challenge.challengeVersion,
        });
      } catch (error) {
        const safe = toSafeDomainError(error);
        aliasChallengeFailures.push({
          domainId: candidateAlias.id,
          hostname: candidateAlias.normalizedHostname,
          errorCode: safe.code,
        });
      }
    }
    return {
      domain,
      challenge: {
        domainId: domain.id,
        hostname: domain.normalizedHostname,
        id: challenge.id,
        recordName: challenge.recordName,
        proofValue,
        expiresAt: challenge.expiresAt,
        challengeVersion: challenge.challengeVersion,
      },
      aliasChallenges,
      aliasChallengeFailures,
      incumbentAuthorityPreserved: true,
      aliasAuthorityPreparedForAtomicSwap: true,
    };
  });

export const changeDomainExecutionMode = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => modeChangeSchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "operate");
    const current = await getTenantDomain(authority.tenantId, data.domainId);
    const domain = await changeTenantDomainExecutionMode({
      authority,
      domain: current,
      executionMode: data.executionMode,
    });
    let job = null;
    if (!["draft", "replacement_pending", "failed"].includes(domain.status)) {
      job = await enqueueDomainJob({
        authority,
        domain,
        operationType: nextOperationFor(domain),
        payload: { executionModeChangedAt: new Date().toISOString() },
      });
    }
    return { domain, job, modeChangeVersionedAndAudited: true, silentFallback: false };
  });

export const requestDomainRemoval = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => domainIdSchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "remove");
    let domain = await getTenantDomain(authority.tenantId, data.domainId);
    if (domain.status === "revoked") throw new DomainError("domain_transition_forbidden", "Revoked domain is terminal");
    if (domain.status !== "removal_pending") {
      domain = await transitionTenantDomain({
        authority,
        domain,
        to: "removal_pending",
        recoveryTarget: domain.status === "failed" ? "removal_pending" : null,
      });
    }
    const job = await enqueueDomainJob({
      authority,
      domain,
      operationType: "cleanup_domain",
      payload: { requestedAt: new Date().toISOString(), publicAuthorityClosedAtRequest: true },
    });
    return { domain, job, publicAuthorityClosed: true };
  });

export const cancelCancellableDomainOperation = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => cancelSchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "operate");
    return cancelCancellableDomainJob({ tenantId: authority.tenantId, jobId: data.jobId });
  });

export const listTenantDomainEvents = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => z.object({ domainId: z.string().uuid().optional() }).strict().parse(data ?? {}))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trusted(context), "read");
    return listDomainAuditEvents(authority.tenantId, data.domainId);
  });
