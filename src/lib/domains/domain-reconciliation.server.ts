import { normalizeDomainHostname } from "./domain-normalization";
import type { DomainCommandAuthority, DomainEvidence, TenantDomainRecord } from "./domain-contracts";
import {
  activateReplacement,
  getCurrentOwnershipChallenge,
  getDomainProviderBinding,
  listTenantDomains,
  patchDomainMetadata,
  transitionTenantDomain,
  upsertDomainProviderBinding,
  getProviderAccountForDomain,
  getTenantDomain,
} from "./domain-repository.server";
import { createCloudflareAdapter } from "./cloudflare-adapter.server";
import { DomainError } from "./domain-errors";

export async function buildCurrentGenerationEvidence(domain: TenantDomainRecord): Promise<DomainEvidence> {
  let normalizedHostnameValid = false;
  try {
    const normalized = normalizeDomainHostname(domain.normalizedHostname);
    normalizedHostnameValid = normalized.hostname === domain.normalizedHostname
      && normalized.registrableDomain === domain.registrableDomain;
  } catch {
    normalizedHostnameValid = false;
  }

  const [challenge, binding, siblings] = await Promise.all([
    getCurrentOwnershipChallenge(domain),
    getDomainProviderBinding(domain),
    listTenantDomains(domain.tenantId),
  ]);
  const canonicalOrAliasBindingValid = domain.hostnameKind === "canonical"
    ? true
    : siblings.filter((row) =>
      row.hostnameKind === "canonical"
      && row.generation === domain.generation
      && row.status === "active"
      && row.enabled,
    ).length === 1;
  const metadata = domain.metadata;

  return {
    normalizedHostnameValid,
    globalHostnameReservationValid: siblings.filter((row) => row.normalizedHostname === domain.normalizedHostname).length === 1,
    ownershipVerified: challenge?.status === "verified" && challenge.generation === domain.generation,
    requiredDnsObserved:
      metadata.required_dns_generation === domain.generation
      && metadata.required_dns_observed === true,
    providerBindingConfirmed:
      binding?.generation === domain.generation
      && !!binding.customHostnameId
      && binding.providerStatus === "active",
    sslStatusActive: binding?.sslStatus === "active",
    canonicalOrAliasBindingValid,
    enabled: domain.enabled,
    reconciliationCurrentGenerationSuccess:
      metadata.last_reconciliation_generation === domain.generation
      && metadata.last_reconciliation_success === true,
  };
}

export async function reconcileDomain(input: {
  authority: DomainCommandAuthority;
  domain: TenantDomainRecord;
  runtimeEnv?: Record<string, unknown>;
}): Promise<{ domain: TenantDomainRecord; evidence: DomainEvidence; changed: boolean }> {
  let current = input.domain;
  const binding = await getDomainProviderBinding(current);
  if (binding?.customHostnameId) {
    const provider = await getProviderAccountForDomain(current);
    const observation = await createCloudflareAdapter(input.runtimeEnv).observeCustomHostname({
      provider: {
        accountIdentifier: provider.accountIdentifier,
        zoneId: provider.zoneId,
        credentialReference: provider.credentialReference,
      },
      customHostnameId: binding.customHostnameId,
    });
    if (observation.hostname.toLowerCase().replace(/\.$/, "") !== current.normalizedHostname) {
      throw new DomainError("domain_provider_configuration_invalid", "Observed provider object does not match the authoritative hostname");
    }
    await upsertDomainProviderBinding({
      domain: current,
      providerAccountId: provider.id,
      zoneId: provider.zoneId,
      customHostnameId: observation.id,
      providerStatus: observation.status,
      sslStatus: observation.sslStatus,
      providerVersion: observation.version,
      detail: { errors: observation.errors },
    });
  }

  const preliminary = await buildCurrentGenerationEvidence(current);
  const reconciliationSucceeded = Object.entries(preliminary)
    .filter(([key]) => key !== "reconciliationCurrentGenerationSuccess")
    .every(([, value]) => value === true);

  current = await patchDomainMetadata({
    domain: current,
    patch: {
      last_reconciliation_generation: current.generation,
      last_reconciliation_success: reconciliationSucceeded,
      last_reconciliation_at: new Date().toISOString(),
    },
  });
  const evidence = await buildCurrentGenerationEvidence(current);

  if (current.status === "active" && Object.values(evidence).some((value) => value !== true)) {
    const degraded = await transitionTenantDomain({
      authority: input.authority,
      domain: current,
      to: "degraded",
    });
    return { domain: degraded, evidence, changed: true };
  }
  if (current.status === "degraded" && Object.values(evidence).every((value) => value === true)) {
    const active = await transitionTenantDomain({
      authority: input.authority,
      domain: current,
      to: "active",
      evidence,
    });
    return { domain: active, evidence, changed: true };
  }
  if (current.status === "pending_ssl" && Object.values(evidence).every((value) => value === true)) {
    if (current.incumbentDomainId) {
      const incumbent = await getTenantDomain(current.tenantId, current.incumbentDomainId);
      const swapped = await activateReplacement({
        authority: input.authority,
        incumbent,
        candidate: current,
        evidence,
      });
      return { domain: swapped.candidate, evidence, changed: true };
    }
    const active = await transitionTenantDomain({
      authority: input.authority,
      domain: current,
      to: "active",
      evidence,
    });
    return { domain: active, evidence, changed: true };
  }
  return { domain: current, evidence, changed: false };
}

export async function assertDomainCutoverReady(): Promise<{
  ready: true;
  domainCount: number;
  legacyDomainCount: number;
  authorityMode: "legacy";
  lockVersion: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: controls, error: controlError } = await db.from("domain_authority_control")
    .select("authority_mode, expected_legacy_domain_count, lock_version")
    .eq("singleton", true);
  if (controlError) throw new DomainError("domain_cutover_blocked", controlError.message);
  if (!controls || controls.length !== 1 || controls[0].authority_mode !== "legacy") {
    throw new DomainError("domain_cutover_blocked", "Domain authority control is not exactly one legacy-mode row");
  }

  const { data: legacy, error: legacyError } = await db.from("tenants")
    .select("id, dominio_principal")
    .not("dominio_principal", "is", null);
  if (legacyError) throw new DomainError("domain_cutover_blocked", legacyError.message);
  const legacyRows = (legacy ?? []).filter((row: any) => typeof row.dominio_principal === "string" && row.dominio_principal.trim() !== "");
  if (legacyRows.length !== Number(controls[0].expected_legacy_domain_count)) {
    throw new DomainError("domain_cutover_blocked", "Legacy domain set changed after schema installation", {
      safeDetail: { expected: Number(controls[0].expected_legacy_domain_count), actual: legacyRows.length },
    });
  }

  const { data: activeRows, error: activeError } = await db.from("tenant_domains")
    .select("id, tenant_id, normalized_hostname, hostname_kind")
    .eq("status", "active")
    .eq("enabled", true);
  if (activeError) throw new DomainError("domain_cutover_blocked", activeError.message);

  const activeDomains = await Promise.all((activeRows ?? []).map((row: any) => getTenantDomain(row.tenant_id, row.id)));
  const blockers: Array<Record<string, unknown>> = [];
  const canonicalByTenant = new Map<string, TenantDomainRecord[]>();

  for (const domain of activeDomains) {
    const evidence = await buildCurrentGenerationEvidence(domain);
    const incomplete = Object.entries(evidence)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);
    if (incomplete.length > 0) {
      blockers.push({ domainId: domain.id, tenantId: domain.tenantId, reason: "active_predicate_incomplete", incomplete });
    }
    if (domain.hostnameKind === "canonical") {
      const rows = canonicalByTenant.get(domain.tenantId) ?? [];
      rows.push(domain);
      canonicalByTenant.set(domain.tenantId, rows);
    }
  }

  for (const tenant of legacyRows) {
    let legacyHostname: string;
    try {
      legacyHostname = normalizeDomainHostname(tenant.dominio_principal).hostname;
    } catch {
      blockers.push({ tenantId: tenant.id, reason: "legacy_hostname_invalid" });
      continue;
    }
    const rows = canonicalByTenant.get(tenant.id) ?? [];
    if (rows.length !== 1 || rows[0].normalizedHostname !== legacyHostname) {
      blockers.push({ tenantId: tenant.id, reason: "active_canonical_mismatch", activeCanonicalCount: rows.length });
    }
  }

  if (blockers.length > 0) {
    throw new DomainError("domain_cutover_blocked", "Authoritative domain cutover preflight failed", {
      safeDetail: { blockerCount: blockers.length, blockers: blockers.slice(0, 100) },
    });
  }
  return {
    ready: true,
    domainCount: activeDomains.length,
    legacyDomainCount: legacyRows.length,
    authorityMode: "legacy",
    lockVersion: Number(controls[0].lock_version),
  };
}