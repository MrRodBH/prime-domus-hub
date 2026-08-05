import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  DomainJsonObject,
  DomainProviderAccountHealthRecord,
  DomainProviderBindingRecord,
  TenantDomainRecord,
} from "./domain-contracts";
import { DomainError, sanitizeDomainObject, toSafeDomainError } from "./domain-errors";
import { mapBinding, objectValue } from "./domain-repository-mappers.server";
const db = supabaseAdmin as any;

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

export async function getDomainProviderBinding(domain: TenantDomainRecord): Promise<DomainProviderBindingRecord | null> {
  const { data, error } = await db.from("domain_provider_bindings").select("*")
    .eq("domain_id", domain.id).eq("generation", domain.generation);
  if (error) throw toSafeDomainError(error);
  if (!data || data.length === 0) return null;
  if (data.length !== 1) throw new DomainError("domain_ambiguous", "Provider binding cardinality is ambiguous");
  return mapBinding(data[0]);
}

export async function upsertDomainProviderBinding(input: {
  domain: TenantDomainRecord;
  providerAccountId: string;
  zoneId: string;
  customHostnameId: string;
  providerStatus: string;
  sslStatus: string | null;
  providerVersion: string | null;
  detail?: DomainJsonObject;
}): Promise<DomainProviderBindingRecord> {
  const { data, error } = await db.from("domain_provider_bindings").upsert({
    tenant_id: input.domain.tenantId,
    domain_id: input.domain.id,
    generation: input.domain.generation,
    provider_account_id: input.providerAccountId,
    zone_id: input.zoneId,
    custom_hostname_id: input.customHostnameId,
    provider_status: input.providerStatus,
    ssl_status: input.sslStatus,
    provider_version: input.providerVersion,
    provider_detail_sanitized: sanitizeDomainObject(input.detail ?? {}),
    observed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "domain_id,generation" }).select("*");
  if (error) throw toSafeDomainError(error);
  if (!data || data.length !== 1) throw new DomainError("domain_ambiguous", "Provider binding was not returned exactly once");
  return mapBinding(data[0]);
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