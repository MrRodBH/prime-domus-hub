import type {
  DomainCommandAuthority,
  DomainJobRecord,
  DomainJsonObject,
  TenantDomainRecord,
} from "./domain-contracts";
import {
  bindDomainProviderObjectIdentity,
  claimDomainProviderBinding,
  completeDomainJob,
  enqueueDomainJob,
  enqueueScheduledDomainReconciliationJobs,
  getCurrentOwnershipChallenge,
  getDomainProviderIdentityBinding,
  getProviderAccountForDomain,
  getTenantDomain,
  leaseDomainJobs,
  markDomainProviderClaimAmbiguous,
  patchDomainMetadata,
  releaseDomainProviderClaim,
  transitionTenantDomain,
  updateDomainProviderObservation,
  verifyOwnershipObservation,
} from "./domain-repository.server";
import { observeDnsCname, observeDnsTxt } from "./dns-observation.server";
import { createCloudflareAdapter } from "./cloudflare-adapter.server";
import { reconcileDomain } from "./domain-reconciliation.server";
import { DomainError, sanitizeDomainObject, toSafeDomainError } from "./domain-errors";
import type { CloudflareCustomHostnameObservation, CloudflareProviderContext } from "./cloudflare-port.server";

function jobAuthority(job: DomainJobRecord): DomainCommandAuthority {
  return {
    userId: job.requestedBy,
    tenantId: job.tenantId,
    origin: "platform",
    isSuperAdmin: false,
  };
}

async function observeOwnership(job: DomainJobRecord, domain: TenantDomainRecord): Promise<DomainJsonObject> {
  const challenge = await getCurrentOwnershipChallenge(domain);
  if (!challenge || challenge.status !== "active") {
    throw new DomainError("domain_challenge_expired", "No active ownership challenge exists");
  }
  const observation = await observeDnsTxt(challenge.recordName);
  const result = await verifyOwnershipObservation({
    authority: jobAuthority(job),
    domain,
    observedValues: observation.values,
  });
  if (result.verified) {
    await enqueueDomainJob({
      authority: jobAuthority(job),
      domain: result.domain,
      operationType: "prepare_dns_configuration",
      payload: { sourceJobId: job.id },
    });
  }
  return {
    verified: result.verified,
    recordName: observation.recordName,
    observedAt: observation.observedAt,
    observedValueCount: observation.values.length,
  };
}

async function prepareDns(
  job: DomainJobRecord,
  domain: TenantDomainRecord,
  runtimeEnv: Record<string, unknown>,
): Promise<DomainJsonObject> {
  if (domain.status !== "ownership_verified") {
    throw new DomainError("domain_transition_forbidden", "DNS preparation requires ownership_verified");
  }
  const processEnvironment = typeof process !== "undefined" ? process.env : undefined;
  const target = runtimeEnv.DCA01_MANAGED_CNAME_TARGET ?? processEnvironment?.DCA01_MANAGED_CNAME_TARGET;
  if (typeof target !== "string" || !target.includes(".")) {
    throw new DomainError("domain_external_prerequisite_missing", "Managed CNAME target is unavailable", { retryable: false });
  }
  const plan: DomainJsonObject = {
    hostname: domain.normalizedHostname,
    recordType: "CNAME",
    targetHostname: target.toLowerCase().replace(/\.$/, ""),
    generation: domain.generation,
  };
  let current = await patchDomainMetadata({
    domain,
    patch: {
      required_dns_plan: plan,
      required_dns_generation: domain.generation,
      required_dns_observed: false,
    },
  });
  current = await transitionTenantDomain({
    authority: jobAuthority(job),
    domain: current,
    to: "pending_dns_configuration",
  });
  await enqueueDomainJob({
    authority: jobAuthority(job),
    domain: current,
    operationType: "observe_required_dns",
    payload: { sourceJobId: job.id },
  });
  return { prepared: true, status: current.status, plan };
}

async function observeRequiredDns(job: DomainJobRecord, domain: TenantDomainRecord): Promise<DomainJsonObject> {
  if (domain.status !== "pending_dns_configuration") {
    throw new DomainError("domain_transition_forbidden", "Required DNS observation requires pending_dns_configuration");
  }
  const plan = domain.metadata.required_dns_plan;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new DomainError("domain_provider_configuration_invalid", "Required DNS plan is unavailable");
  }
  const target = plan.targetHostname;
  if (typeof target !== "string") {
    throw new DomainError("domain_provider_configuration_invalid", "Required CNAME target is unavailable");
  }
  const observation = await observeDnsCname(domain.normalizedHostname);
  if (!observation.targets.includes(target)) {
    throw new DomainError("domain_provider_unavailable", "Required CNAME is not yet observed", {
      retryable: true,
      safeDetail: { observedTargetCount: observation.targets.length },
    });
  }
  let current = await patchDomainMetadata({
    domain,
    patch: {
      required_dns_observed: true,
      required_dns_generation: domain.generation,
      required_dns_observed_at: observation.observedAt,
      required_dns_observation_resolver: observation.resolver,
    },
  });
  current = await transitionTenantDomain({
    authority: jobAuthority(job),
    domain: current,
    to: "pending_cloudflare_provisioning",
  });
  await enqueueDomainJob({
    authority: jobAuthority(job),
    domain: current,
    operationType: "provision_provider_binding",
    payload: { sourceJobId: job.id },
  });
  return { observed: true, target, status: current.status };
}

function normalizedProviderHostname(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

function providerObservationDetail(observation: CloudflareCustomHostnameObservation): DomainJsonObject {
  return sanitizeDomainObject({
    errors: observation.errors,
    ownershipVerificationPresent: !!observation.ownershipVerification,
  });
}

async function markAmbiguousAndThrow(input: {
  domain: TenantDomainRecord;
  provisioningKey: string;
  detail: DomainJsonObject;
  cause?: unknown;
}): Promise<never> {
  try {
    await markDomainProviderClaimAmbiguous({
      domain: input.domain,
      provisioningKey: input.provisioningKey,
      detail: input.detail,
    });
  } catch (markError) {
    const markSafe = toSafeDomainError(markError);
    throw new DomainError("domain_provider_outcome_ambiguous", "Provider outcome is ambiguous and the ambiguity marker could not be confirmed", {
      retryable: false,
      safeDetail: {
        ...input.detail,
        ambiguityMarkerError: markSafe.code,
      },
      cause: input.cause ?? markError,
    });
  }
  throw new DomainError("domain_provider_outcome_ambiguous", "Provider mutation outcome is ambiguous; automatic retry is prohibited", {
    retryable: false,
    safeDetail: input.detail,
    cause: input.cause,
  });
}

async function compensateCreatedProviderObject(input: {
  domain: TenantDomainRecord;
  providerContext: CloudflareProviderContext;
  customHostnameId: string;
  provisioningKey: string;
  runtimeEnv: Record<string, unknown>;
  reason: string;
  cause?: unknown;
}): Promise<never> {
  try {
    await createCloudflareAdapter(input.runtimeEnv).removeCustomHostname({
      provider: input.providerContext,
      domain: input.domain,
      customHostnameId: input.customHostnameId,
    });
    await releaseDomainProviderClaim({
      domain: input.domain,
      provisioningKey: input.provisioningKey,
    });
  } catch (compensationError) {
    const safe = toSafeDomainError(compensationError);
    return markAmbiguousAndThrow({
      domain: input.domain,
      provisioningKey: input.provisioningKey,
      detail: sanitizeDomainObject({
        reason: input.reason,
        compensation: "unconfirmed",
        compensationError: safe.code,
        customHostnameId: input.customHostnameId,
      }),
      cause: input.cause ?? compensationError,
    });
  }

  const original = toSafeDomainError(input.cause);
  throw new DomainError(
    original.code === "domain_provider_outcome_ambiguous" ? "domain_provider_configuration_invalid" : original.code,
    "Provider create was compensated before server binding; no provider identity was adopted",
    {
      retryable: false,
      safeDetail: sanitizeDomainObject({
        reason: input.reason,
        compensation: "confirmed",
        customHostnameId: input.customHostnameId,
        originalError: original.code,
      }),
      cause: input.cause,
    },
  );
}

async function automatedProviderObservation(input: {
  job: DomainJobRecord;
  domain: TenantDomainRecord;
  providerId: string;
  providerZoneId: string;
  providerContext: CloudflareProviderContext;
  runtimeEnv: Record<string, unknown>;
}): Promise<CloudflareCustomHostnameObservation> {
  const adapter = createCloudflareAdapter(input.runtimeEnv);
  let observation: CloudflareCustomHostnameObservation;
  try {
    observation = await adapter.provisionCustomHostname({
      provider: input.providerContext,
      domain: input.domain,
      idempotencyKey: input.job.idempotencyKey,
    });
  } catch (error) {
    const safe = toSafeDomainError(error);
    if (safe.code === "domain_provider_outcome_ambiguous") {
      return markAmbiguousAndThrow({
        domain: input.domain,
        provisioningKey: input.job.idempotencyKey,
        detail: sanitizeDomainObject({ reason: "provider_create_outcome_ambiguous", providerError: safe.safeDetail }),
        cause: error,
      });
    }
    await releaseDomainProviderClaim({ domain: input.domain, provisioningKey: input.job.idempotencyKey });
    throw error;
  }

  if (normalizedProviderHostname(observation.hostname) !== input.domain.normalizedHostname) {
    return compensateCreatedProviderObject({
      domain: input.domain,
      providerContext: input.providerContext,
      customHostnameId: observation.id,
      provisioningKey: input.job.idempotencyKey,
      runtimeEnv: input.runtimeEnv,
      reason: "provider_create_hostname_mismatch",
      cause: new DomainError("domain_provider_configuration_invalid", "Created provider object hostname does not match the authoritative domain"),
    });
  }

  try {
    await bindDomainProviderObjectIdentity({
      domain: input.domain,
      providerAccountId: input.providerId,
      zoneId: input.providerZoneId,
      provisioningKey: input.job.idempotencyKey,
      customHostnameId: observation.id,
      providerStatus: observation.status,
      sslStatus: observation.sslStatus,
      providerVersion: observation.version,
      detail: providerObservationDetail(observation),
    });
  } catch (bindError) {
    return compensateCreatedProviderObject({
      domain: input.domain,
      providerContext: input.providerContext,
      customHostnameId: observation.id,
      provisioningKey: input.job.idempotencyKey,
      runtimeEnv: input.runtimeEnv,
      reason: "provider_bind_failed_after_create",
      cause: bindError,
    });
  }
  return observation;
}

async function manualProviderObservation(input: {
  job: DomainJobRecord;
  domain: TenantDomainRecord;
  providerId: string;
  providerZoneId: string;
  providerContext: CloudflareProviderContext;
  runtimeEnv: Record<string, unknown>;
}): Promise<CloudflareCustomHostnameObservation> {
  const providerObjectIdHint = input.job.payload.providerObjectIdHint;
  if (typeof providerObjectIdHint !== "string") {
    await releaseDomainProviderClaim({ domain: input.domain, provisioningKey: input.job.idempotencyKey });
    throw new DomainError("domain_external_prerequisite_missing", "Manual-assisted provider object hint is unavailable");
  }

  const challenge = await getCurrentOwnershipChallenge(input.domain);
  if (!challenge || challenge.status !== "verified" || !challenge.verifiedAt) {
    await releaseDomainProviderClaim({ domain: input.domain, provisioningKey: input.job.idempotencyKey });
    throw new DomainError("domain_provider_configuration_invalid", "Manual-assisted provider binding requires verified current-generation ownership");
  }

  let observation: CloudflareCustomHostnameObservation;
  try {
    observation = await createCloudflareAdapter(input.runtimeEnv).observeCustomHostname({
      provider: input.providerContext,
      domain: input.domain,
      expectedCustomHostnameId: providerObjectIdHint,
    });
  } catch (error) {
    await releaseDomainProviderClaim({ domain: input.domain, provisioningKey: input.job.idempotencyKey });
    throw error;
  }

  if (observation.createdAt) {
    const createdAt = Date.parse(observation.createdAt);
    const verifiedAt = Date.parse(challenge.verifiedAt);
    if (Number.isFinite(createdAt) && Number.isFinite(verifiedAt) && createdAt < verifiedAt) {
      await releaseDomainProviderClaim({ domain: input.domain, provisioningKey: input.job.idempotencyKey });
      throw new DomainError("domain_provider_configuration_invalid", "Manual-assisted provider object predates current-generation ownership verification");
    }
  }

  try {
    await bindDomainProviderObjectIdentity({
      domain: input.domain,
      providerAccountId: input.providerId,
      zoneId: input.providerZoneId,
      provisioningKey: input.job.idempotencyKey,
      customHostnameId: observation.id,
      providerStatus: observation.status,
      sslStatus: observation.sslStatus,
      providerVersion: observation.version,
      detail: providerObservationDetail(observation),
    });
  } catch (error) {
    await releaseDomainProviderClaim({ domain: input.domain, provisioningKey: input.job.idempotencyKey });
    throw error;
  }
  return observation;
}

async function provisionProvider(
  job: DomainJobRecord,
  domain: TenantDomainRecord,
  runtimeEnv: Record<string, unknown>,
): Promise<DomainJsonObject> {
  if (domain.status !== "pending_cloudflare_provisioning") {
    throw new DomainError("domain_transition_forbidden", "Provider provisioning requires pending_cloudflare_provisioning");
  }
  const provider = await getProviderAccountForDomain(domain);
  const providerContext: CloudflareProviderContext = {
    accountIdentifier: provider.accountIdentifier,
    zoneId: provider.zoneId,
    credentialReference: provider.credentialReference,
  };

  const binding = await claimDomainProviderBinding({
    domain,
    providerAccountId: provider.id,
    zoneId: provider.zoneId,
    provisioningKey: job.idempotencyKey,
  });

  let observation: CloudflareCustomHostnameObservation;
  if (binding.bindingState === "ambiguous") {
    throw new DomainError("domain_provider_outcome_ambiguous", "Provider identity claim is ambiguous; automatic provisioning is prohibited", {
      retryable: false,
      safeDetail: { bindingId: binding.id },
    });
  }

  if (binding.bindingState === "bound") {
    if (!binding.customHostnameId) {
      throw new DomainError("domain_provider_configuration_invalid", "Bound provider identity is missing its object id");
    }
    observation = await createCloudflareAdapter(runtimeEnv).observeCustomHostname({
      provider: providerContext,
      domain,
      expectedCustomHostnameId: binding.customHostnameId,
    });
    await updateDomainProviderObservation({
      domain,
      providerAccountId: provider.id,
      zoneId: provider.zoneId,
      customHostnameId: binding.customHostnameId,
      providerStatus: observation.status,
      sslStatus: observation.sslStatus,
      providerVersion: observation.version,
      detail: providerObservationDetail(observation),
    });
  } else {
    observation = domain.executionMode === "api_automated"
      ? await automatedProviderObservation({
          job,
          domain,
          providerId: provider.id,
          providerZoneId: provider.zoneId,
          providerContext,
          runtimeEnv,
        })
      : await manualProviderObservation({
          job,
          domain,
          providerId: provider.id,
          providerZoneId: provider.zoneId,
          providerContext,
          runtimeEnv,
        });
  }

  const transitioned = await transitionTenantDomain({
    authority: jobAuthority(job),
    domain,
    to: "pending_ssl",
  });
  await enqueueDomainJob({
    authority: jobAuthority(job),
    domain: transitioned,
    operationType: "observe_ssl_lifecycle",
    payload: { sourceJobId: job.id },
    maxAttempts: 10,
  });
  return {
    customHostnameId: observation.id,
    providerStatus: observation.status,
    sslStatus: observation.sslStatus,
    status: transitioned.status,
  };
}

async function cleanupDomain(
  job: DomainJobRecord,
  domain: TenantDomainRecord,
  runtimeEnv: Record<string, unknown>,
): Promise<DomainJsonObject> {
  let current = domain;
  if (current.status !== "removal_pending") {
    current = await transitionTenantDomain({
      authority: jobAuthority(job),
      domain: current,
      to: "removal_pending",
      recoveryTarget: current.status === "failed" ? "removal_pending" : null,
    });
  }
  const binding = await getDomainProviderIdentityBinding(current);
  if (binding) {
    if (binding.bindingState === "ambiguous") {
      throw new DomainError("domain_provider_outcome_ambiguous", "Provider identity is ambiguous; automatic deletion is prohibited", {
        retryable: false,
        safeDetail: { bindingId: binding.id },
      });
    }
    if (binding.bindingState !== "bound" || !binding.customHostnameId) {
      throw new DomainError("domain_provider_configuration_invalid", "Unbound provider claim prevents automatic provider deletion", {
        safeDetail: { bindingId: binding.id, bindingState: binding.bindingState },
      });
    }
    const provider = await getProviderAccountForDomain(current);
    if (binding.providerAccountId !== provider.id || binding.zoneId !== provider.zoneId) {
      throw new DomainError("domain_provider_configuration_invalid", "Persisted provider binding no longer matches the server-owned provider configuration");
    }
    await createCloudflareAdapter(runtimeEnv).removeCustomHostname({
      provider: {
        accountIdentifier: provider.accountIdentifier,
        zoneId: provider.zoneId,
        credentialReference: provider.credentialReference,
      },
      domain: current,
      customHostnameId: binding.customHostnameId,
    });
  }
  const revoked = await transitionTenantDomain({
    authority: jobAuthority(job),
    domain: current,
    to: "revoked",
  });
  return { revoked: true, status: revoked.status, providerObjectRemoved: !!binding?.customHostnameId };
}

async function executeLeasedDomainJob(
  job: DomainJobRecord,
  runtimeEnv: Record<string, unknown>,
): Promise<DomainJsonObject> {
  const domain = await getTenantDomain(job.tenantId, job.domainId);
  if (domain.generation !== job.generation) {
    throw new DomainError("domain_generation_mismatch", "Job generation is stale");
  }
  switch (job.operationType) {
    case "observe_ownership_dns":
      return observeOwnership(job, domain);
    case "prepare_dns_configuration":
      return prepareDns(job, domain, runtimeEnv);
    case "observe_required_dns":
      return observeRequiredDns(job, domain);
    case "provision_provider_binding":
      return provisionProvider(job, domain, runtimeEnv);
    case "observe_ssl_lifecycle":
    case "reconcile_domain": {
      const result = await reconcileDomain({ authority: jobAuthority(job), domain, runtimeEnv });
      const evidence = sanitizeDomainObject(result.evidence);
      const replacementAliasReady = result.domain.hostnameKind === "alias"
        && result.domain.replacementOf !== null
        && result.domain.status === "pending_ssl"
        && Object.values(result.evidence).every((value) => value === true);
      if ((result.domain.status === "pending_ssl" && !replacementAliasReady) || result.domain.status === "degraded") {
        throw new DomainError("domain_provider_unavailable", "Current-generation reconciliation evidence is incomplete", {
          retryable: true,
          safeDetail: { status: result.domain.status, evidence },
        });
      }
      return {
        changed: result.changed,
        status: result.domain.status,
        evidence,
        waitingForAtomicReplacementSwap: replacementAliasReady,
      };
    }
    case "remove_domain":
    case "cleanup_domain":
      return cleanupDomain(job, domain, runtimeEnv);
    default:
      throw new DomainError("domain_transition_forbidden", `Unsupported scheduled domain operation: ${job.operationType}`);
  }
}

function retryDelaySeconds(attempt: number): number {
  return Math.min(3_600, 30 * 2 ** Math.max(0, attempt - 1));
}

export async function processScheduledDomainJobs(input: {
  runtimeEnv?: Record<string, unknown>;
  limit?: number;
  leaseOwner?: string;
} = {}): Promise<{
  leaseOwner: string;
  leased: number;
  succeeded: number;
  retried: number;
  failed: number;
}> {
  const runtimeEnv = input.runtimeEnv ?? {};
  await enqueueScheduledDomainReconciliationJobs();
  const leaseOwner = input.leaseOwner ?? `dca01-scheduled:${crypto.randomUUID()}`;
  const jobs = await leaseDomainJobs(leaseOwner, input.limit ?? 10);
  let succeeded = 0;
  let retried = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const result = await executeLeasedDomainJob(job, runtimeEnv);
      await completeDomainJob({ jobId: job.id, leaseOwner, outcome: "succeeded", result });
      succeeded += 1;
    } catch (error) {
      const safe = toSafeDomainError(error);
      const exhausted = job.attemptCount >= job.maxAttempts;
      try {
        const domain = await getTenantDomain(job.tenantId, job.domainId);
        if (domain.status === "active") {
          await transitionTenantDomain({
            authority: jobAuthority(job),
            domain,
            to: "degraded",
          });
        }
      } catch {
        // The job outcome below remains authoritative; transition diagnostics are sanitized separately.
      }
      if (safe.retryable && safe.code !== "domain_provider_outcome_ambiguous" && !exhausted) {
        await completeDomainJob({
          jobId: job.id,
          leaseOwner,
          outcome: "retry_wait",
          result: safe.safeDetail,
          terminalErrorCode: safe.code,
          retryAfterSeconds: retryDelaySeconds(job.attemptCount),
        });
        retried += 1;
      } else {
        let failureDetail: DomainJsonObject = safe.safeDetail;
        try {
          const domain = await getTenantDomain(job.tenantId, job.domainId);
          if (domain.status !== "failed" && domain.status !== "revoked" && domain.status !== "active") {
            await transitionTenantDomain({
              authority: jobAuthority(job),
              domain,
              to: "failed",
              failureCode: safe.code,
              failureDetail: safe.safeDetail,
              recoveryTarget: domain.status,
            });
          }
        } catch (transitionError) {
          const transitionSafe = toSafeDomainError(transitionError);
          failureDetail = {
            ...failureDetail,
            domainFailureTransition: transitionSafe.code,
          };
        }
        await completeDomainJob({
          jobId: job.id,
          leaseOwner,
          outcome: "failed",
          result: failureDetail,
          terminalErrorCode: safe.code,
        });
        failed += 1;
      }
    }
  }
  return { leaseOwner, leased: jobs.length, succeeded, retried, failed };
}
