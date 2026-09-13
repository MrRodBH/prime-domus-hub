import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mapDomain } from "./domain-repository-mappers.server";
import { getCurrentOwnershipChallenge, listTenantDomains } from "./domain-repository.server";
import { canonicalForDomain, DOMAIN_PROBE_PATH, routingSignature } from "./domain-routing-contract";
import { normalizeDomainHostname } from "./domain-normalization";

/** Diagnostic proof only. Never mounts a tenant, activates it, or returns its content. */
export async function domainRoutingProofResponse(request: Request, env: Record<string, unknown> = {}) {
  const url = new URL(request.url);
  if (url.pathname !== DOMAIN_PROBE_PATH) return null;
  const unavailable = () => new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  if (request.method !== "GET" || url.protocol !== "https:") return unavailable();
  try {
    // URL host must agree with Host; forwarding and tenant headers are never authority.
    const hostname = normalizeDomainHostname(request.headers.get("host") ?? url.hostname).hostname;
    if (hostname !== url.hostname || url.port) return unavailable();
    const nonce = url.searchParams.get("nonce") ?? "";
    if (!/^[a-f0-9]{64}$/.test(nonce)) return unavailable();
    const { data, error } = await (supabaseAdmin as any).from("tenant_domains").select("*")
      .eq("normalized_hostname", hostname).eq("enabled", true).in("status", ["pending_ssl", "active", "degraded"]);
    if (error || data?.length !== 1) return unavailable();
    const domain = mapDomain(data[0]);
    const proof = await getCurrentOwnershipChallenge(domain);
    if (proof?.status !== "verified" || proof.generation !== domain.generation) return unavailable();
    const canonical = canonicalForDomain(domain, await listTenantDomains(domain.tenantId));
    const key = env.DOMAIN_ROUTING_PROOF_SECRET ?? (typeof process !== "undefined" ? process.env.DOMAIN_ROUTING_PROOF_SECRET : undefined);
    const signature = await routingSignature(domain, canonical.normalizedHostname, nonce, key);
    const headers = new Headers({ "cache-control": "no-store", "x-rm-prime-routing-proof": signature });
    if (domain.hostnameKind === "alias") {
      url.hostname = canonical.normalizedHostname;
      headers.set("location", url.toString());
      return new Response(null, { status: 308, headers });
    }
    return new Response(null, { status: 204, headers });
  } catch {
    return unavailable();
  }
}
