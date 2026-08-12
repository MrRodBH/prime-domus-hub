import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  DomainJsonObject,
  DomainProviderAccountHealthRecord,
  DomainProviderBindingRecord,
  TenantDomainRecord,
} from "./domain-contracts";
import { DomainError, sanitizeDomainObject, toSafeDomainError } from "./domain-errors";
import { objectValue } from "./domain-repository-mappers.server";
const db = supabaseAdmin as any;

export type DomainProviderIdentityBinding = DomainProviderBindingRecord & {
  bindingState: "claimed" | "bound" | "ambiguous";
  provisioningKey: string;
  identityBoundAt: string | null;
};

function mapIdentityBinding(row: any): DomainProviderIdentityBinding {
  const state = row.binding_state;
  if (!(["claimed", "bound", "ambiguous"] as const).includes(state)) {
    throw new DomainError("domain_provider_configuration_invalid", "Provider binding state is invalid");
  }
  if (typeof row.provisioning_key !== "string" || !/^[0-9a-f]{64}$/.test(row.provisioning_key)) {
    throw new DomainError("domain_provider_configuration_invalid", "Provider binding provisioning key is invalid");
  }
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
    bindingState: state,
    provisioningKey: row.provisioning_key,
    identityBoundAt: row.identity_bound_at ?? null,
  };
}

function singleRpcBinding(data: unknown, message: string): DomainProviderIdentityBinding {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length !== 1) throw new DomainError("domain_ambiguous", message);
  return mapIdentityBinding(rows[0]);
}

function toDca02RpcError(error: unknown): DomainError {
  const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const message = [record.message, record.details, record.hint].filter((value) => typeof value === "string").join(" ");

  if (/dca02_provider_(?:claim_ambiguous|ambiguity_claim_conflict)/.test(message)) {
    return new DomainError("domain_provider_outcome_ambiguous", "Provider identity state is ambiguous; automatic retry is prohibited", {
      retryable: false,
      safeDetail: { databaseCode: typeof record.code === "string" ? record.code : null },
      cause: error,
    });
  }
  if (/dca02_.*(?:conflict|competing_operation)|dca02_provider_identity_rebind_prohibited/.test(message)) {
    return new DomainError("domain_version_conflict", "Provider identity operation conflicted with authoritative state", {
      retryable: false,
      safeDetail: { databaseCode: typeof record.code === "string" ? record.code : null },
      cause: error,
    });
  }
  if (/dca02_/.test(message)) {
    return new DomainError("domain_provider_configuration_invalid", "Provider identity operation was rejected by the server-owned database boundary", {
      retryable: false,
      safeDetail: { databaseCode: typeof record.code === "string" ? record.code : null },
      cause: error,
    });
  }
  return toSafeDomainError(error);
}

export async function getProviderAccountForDomain(domain: TenantDomainRecord): Promise<{
  id: string;
  accountIdentifier: string;
  credentialReference: string;
  enabled: boolean;
  zoneId: string;
}> {
  const { data, error } = await db.from("domain_provider_accounts")
    .select("id, account_identifier, credential_reference, enabled, capabilities")
    .eq("provider_code", "cloudflare")
    .eq("enabled", true);
  if (error) throw toSafeDomainError(error);

  const matches = (data ?? []).flatMap((row: any) => {
    const capabilities = objectValue(row.capabilities);
    const zones = objectValue(capabilities.zones);
    const zoneId = zones[domain.registrableDomain];
    return typeof zoneId === "string" && zoneId.length > 0
      ? [{
          id: row.id as string,
          accountIdentifier: row.account_identifier as string,
          credentialReference: row.credential_reference as string,
          enabled: row.enabled === true,
          zoneId,
        }]
      : [];
  });
  if (matches.length !== 1) {
    throw new DomainError(
      matches.length === 0 ? "domain_provider_configuration_invalid" : "domain_ambiguous",
      "Exactly one enabled server-owned provider account and zone binding is required",
      { safeDetail: { registrableDomain: domain.registrableDomain, matchCount: matches.length } },
    );
  }
  return matches[0];
}

export async function getDomainProviderIdentityBinding(
  domain: TenantDomainRecord,
): Promise<DomainProviderIdentityBinding | null> {
  const { data, error } = await db.from("domain_provider_bindings").select("*")
    .eq("domain_id", domain.id).eq("tenant_id", domain.tenantId).eq("generation", domain.generation);
  if (error) throw toSafeDomainError(error);
  if (!data || data.length === 0) return null;
  if (data.length !== 1) throw new DomainError("domain_ambiguous", "Provider binding cardinality is ambiguous");
  return mapIdentityBinding(data[0]);
}

/** Compatibility read only. Runtime identity decisions must use getDomainProviderIdentityBinding. */
export async function getDomainProviderBinding(domain: TenantDomainRecord): Promise<DomainProviderBindingRecord | null> {
  return getDomainProviderIdentityBinding(domain);
}

export async function claimDomainProviderBinding(input: {
  domain: TenantDomainRecord;
  providerAccountId: string;
  zoneId: string;
  provisioningKey: string;
}): Promise<DomainProviderIdentityBinding> {
  const { data, error } = await db.rpc("dca02_claim_domain_provider_binding", {
    _tenant_id: input.domain.tenantId,
    _domain_id: input.domain.id,
    _expected_generation: input.domain.generation,
    _expected_lock_version: input.domain.lockVersion,
    _provider_account_id: input.providerAccountId,
    _zone_id: input.zoneId,
    _provisioning_key: input.provisioningKey,
  });
  if (error) throw toDca02RpcError(error);
  return singleRpcBinding(data, "Provider claim did not resolve exactly once");
}

export async function bindDomainProviderObjectIdentity(input: {
  domain: TenantDomainRecord;
  providerAccountId: string;
  zoneId: string;
  provisioningKey: string;
  customHostnameId: string;
  providerStatus: string;
  sslStatus: string | null;
  providerVersion: string | null;
  detail?: DomainJsonObject;
}): Promise<DomainProviderIdentityBinding> {
  const { data, error } = await db.rpc("dca02_bind_domain_provider_object_identity", {
    _tenant_id: input.domain.tenantId,
    _domain_id: input.domain.id,
    _expected_generation: input.domain.generation,
    _expected_lock_version: input.domain.lockVersion,
    _provider_account_id: input.providerAccountId,
    _zone_id: input.zoneId,
    _provisioning_key: input.provisioningKey,
    _custom_hostname_id: input.customHostnameId,
    _provider_status: input.providerStatus,
    _ssl_status: input.sslStatus,
    _provider_version: input.providerVersion,
    _provider_detail_sanitized: sanitizeDomainObject(input.detail ?? {}),
  });
  if (error) throw toDca02RpcError(error);
  return singleRpcBinding(data, "Provider bind did not resolve exactly once");
}

export async function updateDomainProviderObservation(input: {
  domain: TenantDomainRecord;
  providerAccountId: string;
  zoneId: string;
  customHostnameId: string;
  providerStatus: string;
  sslStatus: string | null;
  providerVersion: string | null;
  detail?: DomainJsonObject;
}): Promise<DomainProviderIdentityBinding> {
  const { data, error } = await db.rpc("dca02_update_domain_provider_observation", {
    _tenant_id: input.domain.tenantId,
    _domain_id: input.domain.id,
    _expected_generation: input.domain.generation,
    _provider_account_id: input.providerAccountId,
    _zone_id: input.zoneId,
    _custom_hostname_id: input.customHostnameId,
    _provider_status: input.providerStatus,
    _ssl_status: input.sslStatus,
    _provider_version: input.providerVersion,
    _provider_detail_sanitized: sanitizeDomainObject(input.detail ?? {}),
  });
  if (error) throw toDca02RpcError(error);
  return singleRpcBinding(data, "Provider observation did not resolve exactly once");
}

export async function markDomainProviderClaimAmbiguous(input: {
  domain: TenantDomainRecord;
  provisioningKey: string;
  detail?: DomainJsonObject;
}): Promise<DomainProviderIdentityBinding> {
  const { data, error } = await db.rpc("dca02_mark_domain_provider_claim_ambiguous", {
    _tenant_id: input.domain.tenantId,
    _domain_id: input.domain.id,
    _expected_generation: input.domain.generation,
    _provisioning_key: input.provisioningKey,
    _detail_sanitized: sanitizeDomainObject(input.detail ?? {}),
  });
  if (error) throw toDca02RpcError(error);
  return singleRpcBinding(data, "Ambiguous provider claim did not resolve exactly once");
}

export async function releaseDomainProviderClaim(input: {
  domain: TenantDomainRecord;
  provisioningKey: string;
}): Promise<void> {
  const { data, error } = await db.rpc("dca02_release_domain_provider_claim", {
    _tenant_id: input.domain.tenantId,
    _domain_id: input.domain.id,
    _expected_generation: input.domain.generation,
    _provisioning_key: input.provisioningKey,
  });
  if (error) throw toDca02RpcError(error);
  if (data !== true) throw new DomainError("domain_ambiguous", "Provider claim release was not confirmed");
}

export async function listProviderAccountHealth(): Promise<DomainProviderAccountHealthRecord[]> {
  const { data, error } = await db.from("domain_provider_accounts")
    .select("id, provider_code, account_identifier, enabled, capabilities, health_status, health_detail_sanitized, last_health_check_at, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw toSafeDomainError(error);
  return (data ?? []).map((row: any): DomainProviderAccountHealthRecord => ({
    id: row.id,
    providerCode: row.provider_code,
    accountIdentifier: row.account_identifier,
    enabled: row.enabled === true,
    capabilities: objectValue(row.capabilities),
    healthStatus: row.health_status,
    healthDetailSanitized: objectValue(row.health_detail_sanitized),
    lastHealthCheckAt: row.last_health_check_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    credentialReference: "[redacted]",
  }));
}

export async function getDomainPlatformDiagnostics(): Promise<{
  countsByStatus: Record<string, number>;
  jobsByStatus: Record<string, number>;
  activeCanonicalAmbiguities: number;
  dueJobs: number;
  staleLeases: number;
}> {
  const [{ data: domains, error: domainError }, { data: jobs, error: jobError }] = await Promise.all([
    db.from("tenant_domains").select("tenant_id, hostname_kind, status, enabled"),
    db.from("domain_operation_jobs").select("status, next_attempt_at, lease_expires_at"),
  ]);
  if (domainError) throw toSafeDomainError(domainError);
  if (jobError) throw toSafeDomainError(jobError);
  const countsByStatus: Record<string, number> = {};
  const jobsByStatus: Record<string, number> = {};
  const activeByTenant = new Map<string, number>();
  for (const row of domains ?? []) {
    countsByStatus[row.status] = (countsByStatus[row.status] ?? 0) + 1;
    if (row.status === "active" && row.hostname_kind === "canonical" && row.enabled) {
      activeByTenant.set(row.tenant_id, (activeByTenant.get(row.tenant_id) ?? 0) + 1);
    }
  }
  const now = Date.now();
  let dueJobs = 0;
  let staleLeases = 0;
  for (const row of jobs ?? []) {
    jobsByStatus[row.status] = (jobsByStatus[row.status] ?? 0) + 1;
    if (["pending", "retry_wait"].includes(row.status) && Date.parse(row.next_attempt_at) <= now) dueJobs += 1;
    if (row.status === "leased" && row.lease_expires_at && Date.parse(row.lease_expires_at) <= now) staleLeases += 1;
  }
  return {
    countsByStatus,
    jobsByStatus,
    activeCanonicalAmbiguities: [...activeByTenant.values()].filter((count) => count !== 1).length,
    dueJobs,
    staleLeases,
  };
}
