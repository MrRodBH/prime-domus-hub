import type { TenantDomainRecord } from "./domain-contracts";
import { DomainError } from "./domain-errors";
import { observeDnsCname, observeDnsIpv4 } from "./dns-observation.server";
import { getProviderAccountForDomain } from "./domain-repository.server";
import { observeCustomerCname } from "./cloudflare-adapter.server";

/** Public CNAME or provider-authoritative apex flattening, never shared-IP ownership. */
export async function observeDomainDnsPlan(domain: TenantDomainRecord, env: Record<string, unknown>) {
  const plan = domain.metadata.required_dns_plan;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)
      || typeof plan.targetHostname !== "string" || plan.generation !== domain.generation
      || plan.hostname !== domain.normalizedHostname || plan.recordType !== "CNAME") {
    throw new DomainError("domain_provider_configuration_invalid", "Current-generation DNS plan is missing");
  }
  const target = plan.targetHostname;
  const cname = await observeDnsCname(domain.normalizedHostname);
  if (cname.targets.length === 1 && cname.targets[0] === target) return cname;
  // Flattening also applies to proxied www; require authenticated exact DNS configuration.
  const provider = await getProviderAccountForDomain(domain);
  if (!provider.customerDnsZoneId || !provider.customerDnsCredentialReference) {
    throw new DomainError("domain_external_prerequisite_missing", "Customer DNS read access is required to verify flattened DNS", { retryable: true });
  }
  await observeCustomerCname(domain, target, provider, env);
  const [hostAddresses, targetAddresses] = await Promise.all([
    observeDnsIpv4(domain.normalizedHostname), observeDnsIpv4(target),
  ]);
  // Independent propagation evidence, used only after authoritative configuration.
  if (!hostAddresses.addresses.length || !hostAddresses.addresses.every((ip) => targetAddresses.addresses.includes(ip))) {
    throw new DomainError("domain_provider_unavailable", "Flattened DNS is not yet consistent with the managed target", { retryable: true });
  }
  return { ...cname, observedAt: hostAddresses.observedAt, resolver: "cloudflare-api-and-public-dns" };
}
