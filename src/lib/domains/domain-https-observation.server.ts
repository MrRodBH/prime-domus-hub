import { request as httpsRequest } from "node:https";
import type { TenantDomainRecord } from "./domain-contracts";
import { DomainError } from "./domain-errors";
import { isPublicIpv4, observeDnsIpv4 } from "./dns-observation.server";
import { canonicalForDomain, DOMAIN_PROBE_PATH, routingSignature } from "./domain-routing-contract";

export interface RoutingProbeResponse { status: number; signature?: string; location?: string }

interface ProbeConnection {
  read(buffer: Uint8Array): Promise<number | null>;
  write(buffer: Uint8Array): Promise<number>;
  close(): void;
  handshake?(): Promise<unknown>;
}
interface ProbeDeno {
  connect(options: { hostname: string; port: number; transport: "tcp" }): Promise<ProbeConnection>;
  startTls(connection: ProbeConnection, options: { hostname: string; alpnProtocols: string[] }): Promise<ProbeConnection>;
}

// The managed Deno runtime does not implement node:https's custom lookup.
// Connect to the validated IP first; TLS still authenticates the original hostname.
async function denoPinnedProbe(deno: ProbeDeno, hostname: string, path: string, ip: string): Promise<RoutingProbeResponse> {
  let connection: ProbeConnection | undefined;
  let expired = false;
  const close = () => { try { connection?.close(); } catch { /* Already closed. */ } };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { expired = true; close(); reject(new Error("routing_probe_timeout")); }, 10_000);
  });
  const operation = (async () => {
    try {
      connection = await deno.connect({ hostname: ip, port: 443, transport: "tcp" });
      if (expired) throw new Error("routing_probe_timeout");
      connection = await deno.startTls(connection, { hostname, alpnProtocols: ["http/1.1"] });
      if (expired) throw new Error("routing_probe_timeout");
      await connection.handshake?.();
      const request = new TextEncoder().encode(`GET ${path} HTTP/1.1\r\nHost: ${hostname}\r\nConnection: close\r\n\r\n`);
      for (let offset = 0; offset < request.length;) {
        const written = await connection.write(request.subarray(offset));
        if (written <= 0) throw new Error("routing_probe_write_failed");
        offset += written;
      }
      const bytes = new Uint8Array(8192);
      let length = 0;
      while (length < bytes.length) {
        const count = await connection.read(bytes.subarray(length));
        if (count === null || count === 0) throw new Error("routing_probe_incomplete_headers");
        length += count;
        const header = new TextDecoder("ascii").decode(bytes.subarray(0, length));
        const end = header.indexOf("\r\n\r\n");
        if (end < 0) continue;
        const lines = header.slice(0, end).split("\r\n");
        const status = /^HTTP\/1\.[01] ([2-5][0-9]{2})(?: |$)/.exec(lines.shift() ?? "");
        if (!status) throw new Error("routing_probe_invalid_status");
        const fields = new Map<string, string>();
        for (const line of lines) {
          const field = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*([^\r\n]*)$/.exec(line);
          if (!field) throw new Error("routing_probe_invalid_header");
          const name = field[1].toLowerCase();
          if (name !== "location" && name !== "x-rm-prime-routing-proof") continue;
          if (fields.has(name)) throw new Error("routing_probe_ambiguous_header");
          fields.set(name, field[2].trim());
        }
        return { status: Number(status[1]), signature: fields.get("x-rm-prime-routing-proof"), location: fields.get("location") };
      }
      throw new Error("routing_probe_headers_too_large");
    } finally { close(); }
  })();
  try { return await Promise.race([operation, timeout]); }
  finally { clearTimeout(timer); close(); }
}

/** Pin a validated address while retaining hostname/SNI and default CA verification.
 * No redirected fetch, private address, alternate port, cookie or credential is sent.
 */
export async function pinnedHttpsProbe(hostname: string, path: string, ip: string): Promise<RoutingProbeResponse> {
  if (!isPublicIpv4(ip) || !/^[a-z0-9.-]+$/.test(hostname)
    || !path.startsWith(DOMAIN_PROBE_PATH + "?nonce=")
    || !/^[0-9a-f]{64}$/.test(path.slice((DOMAIN_PROBE_PATH + "?nonce=").length))) {
    throw new DomainError("domain_provider_configuration_invalid", "Unsafe HTTPS probe target");
  }
  const deno = (globalThis as typeof globalThis & { Deno?: ProbeDeno }).Deno;
  if (deno) {
    if (typeof deno.connect !== "function" || typeof deno.startTls !== "function") {
      throw new DomainError("domain_external_prerequisite_missing", "Managed runtime lacks verified TLS socket transport");
    }
    return denoPinnedProbe(deno, hostname, path, ip);
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
