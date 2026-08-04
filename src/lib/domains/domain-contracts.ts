export const DOMAIN_ACTIVATION_STATUSES = [
  "draft",
  "pending_ownership_verification",
  "ownership_verified",
  "pending_dns_configuration",
  "pending_cloudflare_provisioning",
  "pending_ssl",
  "active",
  "degraded",
  "replacement_pending",
  "removal_pending",
  "failed",
  "revoked",
] as const;

export type DomainActivationStatus = (typeof DOMAIN_ACTIVATION_STATUSES)[number];

export const DOMAIN_EXECUTION_MODES = ["manual_assisted", "api_automated"] as const;
export type DomainExecutionMode = (typeof DOMAIN_EXECUTION_MODES)[number];

export const DOMAIN_HOSTNAME_KINDS = ["canonical", "alias"] as const;
export type DomainHostnameKind = (typeof DOMAIN_HOSTNAME_KINDS)[number];

export const DOMAIN_OPERATION_TYPES = [
  "issue_ownership_challenge",
  "observe_ownership_dns",
  "prepare_dns_configuration",
  "observe_required_dns",
  "provision_provider_binding",
  "observe_ssl_lifecycle",
  "activate_domain_generation",
  "reconcile_domain",
  "replace_domain",
  "remove_domain",
  "cleanup_domain",
  "activate_authoritative_domain_resolution",
] as const;
export type DomainOperationType = (typeof DOMAIN_OPERATION_TYPES)[number];

export const DOMAIN_JOB_STATUSES = ["pending", "leased", "retry_wait", "succeeded", "failed", "cancelled"] as const;
export type DomainJobStatus = (typeof DOMAIN_JOB_STATUSES)[number];

/** JSON-safe value used by every server-function DTO. Undefined, bigint, symbol and function values are prohibited. */
export type DomainJsonValue =
  | string
  | number
  | boolean
  | null
  | DomainJsonValue[]
  | { [key: string]: DomainJsonValue };

export type DomainJsonObject = { [key: string]: DomainJsonValue };

export interface DomainEvidence {
  normalizedHostnameValid: boolean;
  globalHostnameReservationValid: boolean;
  ownershipVerified: boolean;
  requiredDnsObserved: boolean;
  providerBindingConfirmed: boolean;
  sslStatusActive: boolean;
  canonicalOrAliasBindingValid: boolean;
  enabled: boolean;
  reconciliationCurrentGenerationSuccess: boolean;
}

export interface TenantDomainRecord {
  id: string;
  tenantId: string;
  normalizedHostname: string;
  registrableDomain: string;
  hostnameKind: DomainHostnameKind;
  executionMode: DomainExecutionMode;
  status: DomainActivationStatus;
  enabled: boolean;
  generation: number;
  replacementOf: string | null;
  incumbentDomainId: string | null;
  lockVersion: number;
  failureCode: string | null;
  failureDetailSanitized: DomainJsonObject;
  resumeState: DomainActivationStatus | null;
  metadata: DomainJsonObject;
  requestedBy: string;
  activatedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainChallengeRecord {
  id: string;
  domainId: string;
  tenantId: string;
  generation: number;
  challengeVersion: number;
  challengeKind: "dns_txt";
  recordName: string;
  valueDigest: string;
  opaqueNonceReference: string;
  status: "active" | "verified" | "expired" | "revoked";
  expiresAt: string;
  verifiedAt: string | null;
  attemptCount: number;
  observedValueHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainProviderBindingRecord {
  id: string;
  tenantId: string;
  domainId: string;
  generation: number;
  providerAccountId: string;
  zoneId: string | null;
  customHostnameId: string | null;
  providerStatus: string | null;
  sslStatus: string | null;
  providerVersion: string | null;
  observedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainProviderAccountHealthRecord {
  id: string;
  providerCode: string;
  accountIdentifier: string;
  enabled: boolean;
  capabilities: DomainJsonObject;
  healthStatus: string;
  healthDetailSanitized: DomainJsonObject;
  lastHealthCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
  credentialReference: "[redacted]";
}

export interface DomainJobRecord {
  id: string;
  tenantId: string;
  domainId: string;
  generation: number;
  operationType: DomainOperationType;
  executionMode: DomainExecutionMode;
  status: DomainJobStatus;
  idempotencyKey: string;
  requestedBy: string;
  authorityOrigin: string;
  attemptCount: number;
  maxAttempts: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  nextAttemptAt: string;
  payload: DomainJsonObject;
  resultSanitized: DomainJsonObject;
  terminalErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainAuditEventRecord {
  id: string;
  tenantId: string | null;
  domainId: string | null;
  generation: number | null;
  actorUserId: string | null;
  authorityOrigin: string;
  commandId: string | null;
  correlationId: string;
  eventType: string;
  beforeStatus: DomainActivationStatus | null;
  afterStatus: DomainActivationStatus | null;
  detailSanitized: DomainJsonObject;
  createdAt: string;
}

export interface ActiveTenantResolution {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  domainId: string;
  hostname: string;
  hostnameKind: DomainHostnameKind;
  canonicalHostname: string;
  generation: number;
}

export interface CanonicalRedirectResolution {
  tenantId: string;
  aliasHostname: string;
  canonicalHostname: string;
  generation: number;
}

export interface DomainCommandAuthority {
  userId: string;
  tenantId: string;
  origin: "impersonation" | "selection" | "single-membership" | "platform";
  isSuperAdmin: boolean;
}

export const EMPTY_DOMAIN_EVIDENCE: DomainEvidence = Object.freeze({
  normalizedHostnameValid: false,
  globalHostnameReservationValid: false,
  ownershipVerified: false,
  requiredDnsObserved: false,
  providerBindingConfirmed: false,
  sslStatusActive: false,
  canonicalOrAliasBindingValid: false,
  enabled: false,
  reconciliationCurrentGenerationSuccess: false,
});