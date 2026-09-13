import type { TenantDomainRecord } from "./domain-contracts";
import { DomainError } from "./domain-errors";

export const DOMAIN_PROBE_PATH = "/.well-known/rm-prime-domain-routing";
export function canonicalForDomain(domain: TenantDomainRecord, siblings: TenantDomainRecord[]) {
  if (domain.hostnameKind === "canonical") return domain;
  const matches = siblings.filter((row) => row.tenantId === domain.tenantId
    && row.hostnameKind === "canonical" && row.generation === domain.generation
    && row.enabled && ["active", "pending_ssl"].includes(row.status));
  if (matches.length !== 1) throw new DomainError("domain_authority_denied", "Alias requires exactly one same-tenant canonical generation");
  return matches[0];
}
export async function routingSignature(domain: TenantDomainRecord, canonicalHostname: string, nonce: string, secret: unknown) {
  if (typeof secret !== "string" || secret.length < 32) throw new DomainError("domain_secret_reference_missing", "Routing proof key unavailable");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const data = JSON.stringify(["domain-routing-v1", nonce, domain.tenantId, domain.id, domain.generation, domain.normalizedHostname, canonicalHostname]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}
