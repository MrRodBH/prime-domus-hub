import { DomainError, sanitizeDomainDetail } from "./domain-errors";

export interface DnsTxtObservation {
  recordName: string;
  values: readonly string[];
  observedAt: string;
  resolver: string;
}

function normalizeTxtValue(value: string): string {
  return value.replace(/^"|"$/g, "").replace(/"\s+"/g, "").trim();
}

export async function observeDnsTxt(
  recordName: string,
  fetcher: typeof fetch = fetch,
): Promise<DnsTxtObservation> {
  if (!/^[a-z0-9_.-]{3,253}$/i.test(recordName)) {
    throw new DomainError("domain_invalid_hostname", "DNS observation record name is invalid");
  }
  const endpoint = new URL("https://cloudflare-dns.com/dns-query");
  endpoint.searchParams.set("name", recordName);
  endpoint.searchParams.set("type", "TXT");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher(endpoint, {
      headers: { accept: "application/dns-json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new DomainError("domain_provider_unavailable", "DNS resolver returned an error", {
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        safeDetail: { status: response.status },
      });
    }
    const payload = (await response.json()) as {
      Status?: number;
      Answer?: Array<{ type?: number; data?: string }>;
    };
    const values = (payload.Answer ?? [])
      .filter((answer) => answer.type === 16 && typeof answer.data === "string")
      .map((answer) => normalizeTxtValue(answer.data as string));
    return {
      recordName,
      values: [...new Set(values)],
      observedAt: new Date().toISOString(),
      resolver: "cloudflare-dns-json",
    };
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("domain_provider_unavailable", "DNS observation failed", {
      retryable: true,
      safeDetail: { cause: sanitizeDomainDetail(error instanceof Error ? error.name : error) },
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export interface DnsCnameObservation {
  recordName: string;
  targets: readonly string[];
  observedAt: string;
  resolver: string;
}

export function isPublicIpv4(ip: string): boolean {
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
  const [a, b, c, d] = ip.split(".").map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return !(a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    || (a === 203 && b === 0 && c === 113));
}

export async function observeDnsIpv4(hostname: string, fetcher: typeof fetch = fetch) {
  if (!/^[a-z0-9.-]{3,253}$/.test(hostname)) throw new DomainError("domain_invalid_hostname", "Invalid DNS hostname");
  const endpoint = new URL("https://cloudflare-dns.com/dns-query");
  endpoint.searchParams.set("name", hostname);
  endpoint.searchParams.set("type", "A");
  const response = await fetcher(endpoint, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new DomainError("domain_provider_unavailable", "Public DNS unavailable", { retryable: true });
  const payload = await response.json() as { Status?: number; Answer?: { type: number; data: string }[] };
  const addresses = [...new Set((payload.Answer ?? []).filter((r) => r.type === 1).map((r) => r.data))];
  if (payload.Status !== 0 || !addresses.length || addresses.some((ip) => !isPublicIpv4(ip))) {
    throw new DomainError("domain_provider_unavailable", "DNS did not resolve exclusively to public IPv4 addresses", { retryable: true });
  }
  return { addresses, observedAt: new Date().toISOString() };
}

export async function observeDnsCname(
  recordName: string,
  fetcher: typeof fetch = fetch,
): Promise<DnsCnameObservation> {
  if (!/^[a-z0-9.-]{3,253}$/i.test(recordName)) {
    throw new DomainError("domain_invalid_hostname", "DNS CNAME record name is invalid");
  }
  const endpoint = new URL("https://cloudflare-dns.com/dns-query");
  endpoint.searchParams.set("name", recordName);
  endpoint.searchParams.set("type", "CNAME");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher(endpoint, {
      headers: { accept: "application/dns-json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new DomainError("domain_provider_unavailable", "DNS resolver returned an error", {
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        safeDetail: { status: response.status },
      });
    }
    const payload = (await response.json()) as { Answer?: Array<{ type?: number; data?: string }> };
    const targets = (payload.Answer ?? [])
      .filter((answer) => answer.type === 5 && typeof answer.data === "string")
      .map((answer) => String(answer.data).toLowerCase().replace(/\.$/, ""));
    return {
      recordName,
      targets: [...new Set(targets)],
      observedAt: new Date().toISOString(),
      resolver: "cloudflare-dns-json",
    };
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("domain_provider_unavailable", "DNS CNAME observation failed", {
      retryable: true,
      safeDetail: { cause: error instanceof Error ? error.name : "unknown" },
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}
