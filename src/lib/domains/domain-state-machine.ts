import {
  DOMAIN_ACTIVATION_STATUSES,
  type DomainActivationStatus,
  type DomainEvidence,
  type TenantDomainRecord,
} from "./domain-contracts";
import { DomainError } from "./domain-errors";

export const DOMAIN_TRANSITIONS: Readonly<Record<DomainActivationStatus, readonly DomainActivationStatus[]>> = Object.freeze({
  draft: ["pending_ownership_verification", "removal_pending", "failed"],
  pending_ownership_verification: ["ownership_verified", "removal_pending", "failed"],
  ownership_verified: ["pending_dns_configuration", "removal_pending", "failed"],
  pending_dns_configuration: ["pending_cloudflare_provisioning", "removal_pending", "failed"],
  pending_cloudflare_provisioning: ["pending_ssl", "removal_pending", "failed"],
  pending_ssl: ["active", "removal_pending", "failed"],
  active: ["degraded", "removal_pending"],
  degraded: ["active", "pending_cloudflare_provisioning", "pending_ssl", "removal_pending", "failed"],
  replacement_pending: ["pending_ownership_verification", "removal_pending", "failed"],
  removal_pending: ["revoked", "failed"],
  failed: [
    "pending_ownership_verification",
    "pending_dns_configuration",
    "pending_cloudflare_provisioning",
    "pending_ssl",
    "removal_pending",
    "revoked",
  ],
  revoked: [],
});

export const DOMAIN_PREDECESSORS: Readonly<Record<DomainActivationStatus, readonly DomainActivationStatus[]>> = Object.freeze(
  DOMAIN_ACTIVATION_STATUSES.reduce<Record<DomainActivationStatus, readonly DomainActivationStatus[]>>(
    (accumulator, status) => {
      accumulator[status] = DOMAIN_ACTIVATION_STATUSES.filter((candidate) =>
        DOMAIN_TRANSITIONS[candidate].includes(status),
      );
      return accumulator;
    },
    {} as Record<DomainActivationStatus, readonly DomainActivationStatus[]>,
  ),
);

export const STATUS_PRESERVING_DOMAIN_COMMANDS = Object.freeze([
  "issue_ownership_challenge",
  "rotate_ownership_challenge",
  "observe_ownership_dns_without_verified_evidence",
] as const);
export type StatusPreservingDomainCommand = (typeof STATUS_PRESERVING_DOMAIN_COMMANDS)[number];

const ACTIVE_PREDICATE_KEYS: readonly (keyof DomainEvidence)[] = [
  "normalizedHostnameValid",
  "globalHostnameReservationValid",
  "ownershipVerified",
  "requiredDnsObserved",
  "providerBindingConfirmed",
  "sslStatusActive",
  "canonicalOrAliasBindingValid",
  "enabled",
  "reconciliationCurrentGenerationSuccess",
];

export function incompleteActivePredicate(evidence: DomainEvidence): (keyof DomainEvidence)[] {
  return ACTIVE_PREDICATE_KEYS.filter((key) => evidence[key] !== true);
}

export function assertActivePredicate(evidence: DomainEvidence): void {
  const incomplete = incompleteActivePredicate(evidence);
  if (incomplete.length > 0) {
    throw new DomainError("domain_active_predicate_incomplete", "The current-generation active predicate is incomplete", {
      safeDetail: { incomplete },
    });
  }
}

export function canTransition(from: DomainActivationStatus, to: DomainActivationStatus): boolean {
  return DOMAIN_TRANSITIONS[from].includes(to);
}

export function assertDomainTransition(
  from: DomainActivationStatus,
  to: DomainActivationStatus,
  options: { evidence?: DomainEvidence; recoveryTarget?: DomainActivationStatus | null } = {},
): void {
  if (!canTransition(from, to)) {
    throw new DomainError("domain_transition_forbidden", `Domain transition ${from} -> ${to} is forbidden`, {
      safeDetail: { from, to },
    });
  }

  if (to === "active") {
    if (from !== "pending_ssl" && from !== "degraded") {
      throw new DomainError("domain_transition_forbidden", "Only pending_ssl or degraded may enter active");
    }
    if (!options.evidence) {
      throw new DomainError("domain_active_predicate_incomplete", "Active transition requires current-generation evidence");
    }
    assertActivePredicate(options.evidence);
  }

  if (from === "failed") {
    if (!options.recoveryTarget || options.recoveryTarget !== to) {
      throw new DomainError("domain_transition_forbidden", "Failed state requires an explicit matching recovery target", {
        safeDetail: { requested: to, recoveryTarget: options.recoveryTarget ?? null },
      });
    }
  }

  if (from === "removal_pending" && to === "active") {
    throw new DomainError("domain_transition_forbidden", "Post-swap direct reactivation is prohibited");
  }
}

export function assertStatusPreservingOwnershipCommand(
  status: DomainActivationStatus,
  command: StatusPreservingDomainCommand,
): void {
  if (status !== "pending_ownership_verification") {
    throw new DomainError("domain_transition_forbidden", `${command} requires pending_ownership_verification`, {
      safeDetail: { status, command },
    });
  }
}

export function assertAtomicReplacementSwap(input: {
  incumbent: TenantDomainRecord;
  candidate: TenantDomainRecord;
  incumbentExpectedVersion: number;
  candidateExpectedVersion: number;
  candidateEvidence: DomainEvidence;
}): void {
  const { incumbent, candidate } = input;
  if (incumbent.status !== "active" || incumbent.hostnameKind !== "canonical") {
    throw new DomainError("domain_transition_forbidden", "Replacement incumbent must be the active canonical row");
  }
  if (candidate.status !== "pending_ssl" || candidate.hostnameKind !== "canonical") {
    throw new DomainError("domain_transition_forbidden", "Replacement candidate must be canonical and pending_ssl");
  }
  if (incumbent.tenantId !== candidate.tenantId || candidate.incumbentDomainId !== incumbent.id) {
    throw new DomainError("domain_authority_denied", "Replacement candidate and incumbent must belong to the same tenant");
  }
  if (incumbent.lockVersion !== input.incumbentExpectedVersion || candidate.lockVersion !== input.candidateExpectedVersion) {
    throw new DomainError("domain_version_conflict", "Replacement lock version conflict");
  }
  if (candidate.generation <= incumbent.generation) {
    throw new DomainError("domain_generation_mismatch", "Replacement candidate must use a newer generation");
  }
  assertDomainTransition(candidate.status, "active", { evidence: input.candidateEvidence });
  assertDomainTransition(incumbent.status, "removal_pending");
}

export function assertTransitionGraphClosed(): void {
  const statuses = new Set<string>(DOMAIN_ACTIVATION_STATUSES);
  for (const [from, successors] of Object.entries(DOMAIN_TRANSITIONS)) {
    if (!statuses.has(from)) throw new Error(`Unknown transition source: ${from}`);
    for (const successor of successors) {
      if (!statuses.has(successor)) throw new Error(`Unknown transition target: ${from} -> ${successor}`);
    }
  }
  if (!DOMAIN_TRANSITIONS.degraded.includes("active") || !DOMAIN_PREDECESSORS.active.includes("degraded")) {
    throw new Error("degraded -> active transition is not symmetric");
  }
  if (DOMAIN_TRANSITIONS.pending_ownership_verification.includes("pending_ownership_verification")) {
    throw new Error("pending ownership self-transition is prohibited");
  }
  if (DOMAIN_TRANSITIONS.removal_pending.includes("active")) {
    throw new Error("removal_pending -> active is prohibited");
  }
}
