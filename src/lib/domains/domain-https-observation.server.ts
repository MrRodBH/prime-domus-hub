import { request as httpsRequest } from "node:https";
import type { TenantDomainRecord } from "./domain-contracts";
import { DomainError } from "./domain-errors";
import { isPublicIpv4, observeDnsIpv4 } from "./dns-observation.server";
import { canonicalForDomain, DOMAIN_PROBE_PATH, routingSignature } from "./domain-routing-contract";

export interface RoutingProbeResponse { status: number; signature?: string; location?: string }

/** Pin a validated address while retaining hostname/SNI and default CA verification.
 * No redirected fetch, private address, alternate port, cookie or credential is sent.
 */
export async function pinnedHttpsProbe(hostname: string, path: string, ip: string): Promise<RoutingProbeResponse> {
  if (!isPublicIpv4(ip) || !/^[a-z0-9.-]+$/.test(hostname) || !path.startsWith(DOMAIN_PROBE_PATH + "?nonce=")) {
    throw new DomainError("domain_provider_configuration_invalid", "Unsafe HTTPS probe target");
  }
  return new Promise((resolve, reject) => {
    const req = httpsRequest({ hostname, servername: hostname, port: 443, path, method: "GET", agent: false,
      rejectUnauthorized: true, maxHeaderSize: 8192,
      lookup: ((_host: unknown, options: any, callback: any) => options?.all
        ? callback(null, [{ address: ip, family: 4 }]) : callback(null, ip, 4)) as any,
    }, (response) => {
      const result = { status: response.statusCode ?? 0,
        signature: typeof response.headers["x-rm-prime-routing-proof"] === "string" ? response.headers["x-rm-prime-routing-proof"] : undefined,
        location: response.headers.location };
      response.destroy();
      resolve(result);
    });
    const timer = setTimeout(() => req.destroy(new Error("routing_probe_timeout")), 10_000);
    req.on("error", reject);
    req.on("close", () => clearTimeout(timer));
    req.end();
  });
}

export async function observeDomainRouting(domain: TenantDomainRecord, siblings: TenantDomainRecord[], env: Record<string, unknown>,
  probe = pinnedHttpsProbe, resolveAddresses = observeDnsIpv4) {
  const canonical = canonicalForDomain(domain, siblings);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join("");
  const expected = await routingSignature(domain, canonical.normalizedHostname, nonce, env.DOMAIN_ROUTING_PROOF_SECRET);
  const { addresses } = await resolveAddresses(domain.normalizedHostname);
  const path = `${DOMAIN_PROBE_PATH}?nonce=${nonce}`;
  const result = await probe(domain.normalizedHostname, path, addresses[0]);
  const expectedLocation = `https://${canonical.normalizedHostname}${path}`;
  const correctStatus = domain.hostnameKind === "alias"
    ? result.status === 308 && result.location === expectedLocation
    : result.status === 204 && !result.location;
  if (!correctStatus || result.signature !== expected) {
    throw new DomainError("domain_provider_unavailable", "HTTPS origin routing proof or canonical redirect is not confirmed", { retryable: true });
  }
  return { generation: domain.generation, observedAt: new Date().toISOString(), canonicalHostname: canonical.normalizedHostname };
}
