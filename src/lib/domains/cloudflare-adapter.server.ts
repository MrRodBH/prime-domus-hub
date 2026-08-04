import type {
  CloudflareCustomHostnameObservation,
  CloudflarePort,
  CloudflareProviderContext,
} from "./cloudflare-port.server";
import type { TenantDomainRecord } from "./domain-contracts";
import { DomainError, sanitizeDomainDetail } from "./domain-errors";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const SECRET_REF_RE = /^env:([A-Z][A-Z0-9_]{2,127})$/;

type CloudflareEnvelope<T> = {
  success: boolean;
  result?: T;
  errors?: Array<{ code: number | string; message: string }>;
  messages?: Array<{ code?: number | string; message?: string }>;
};

type CloudflareHostnameResult = {
  id: string;
  hostname: string;
  custom_metadata?: Record<string, string>;
  status?: string;
  ownership_verification?: { type?: string; name?: string; value?: string };
  ssl?: { status?: string };
  modified_at?: string;
  created_at?: string;
};

function resolveCredential(reference: string, runtimeEnv: Record<string, unknown> = {}): string {
  const match = reference.match(SECRET_REF_RE);
  if (!match) {
    throw new DomainError("domain_secret_reference_missing", "Cloudflare credential reference must use env:NAME");
  }
  const processEnvironment = typeof process !== "undefined" ? process.env : undefined;
  const value = runtimeEnv[match[1]] ?? processEnvironment?.[match[1]];
  if (typeof value !== "string" || value.length < 20) {
    throw new DomainError("domain_secret_reference_missing", "Cloudflare credential is unavailable", {
      safeDetail: { credentialReference: "[redacted]" },
    });
  }
  return value;
}

function assertProviderContext(provider: CloudflareProviderContext): void {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(provider.accountIdentifier)) {
    throw new DomainError("domain_provider_configuration_invalid", "Cloudflare account identifier is invalid");
  }
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(provider.zoneId)) {
    throw new DomainError("domain_provider_configuration_invalid", "Cloudflare zone identifier is invalid");
  }
}

function mapObservation(result: CloudflareHostnameResult, errors: readonly { code: number | string; message: string }[] = []): CloudflareCustomHostnameObservation {
  const verification = result.ownership_verification;
  return {
    id: result.id,
    hostname: result.hostname,
    status: result.status ?? "unknown",
    sslStatus: result.ssl?.status ?? null,
    ownershipVerification:
      verification?.type && verification.name && verification.value
        ? { type: verification.type, name: verification.name, value: verification.value }
        : null,
    errors,
    version: result.modified_at ?? result.created_at ?? null,
  };
}

async function cloudflareRequest<T>(input: {
  method: "GET" | "POST" | "DELETE";
  path: string;
  provider: CloudflareProviderContext;
  runtimeEnv?: Record<string, unknown>;
  body?: Record<string, unknown>;
}): Promise<T> {
  assertProviderContext(input.provider);
  const token = resolveCredential(input.provider.credentialReference, input.runtimeEnv);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${CLOUDFLARE_API_BASE}${input.path}`, {
      method: input.method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: controller.signal,
    });
    const payload = (await response.json()) as CloudflareEnvelope<T>;
    if (!response.ok || payload.success !== true || payload.result === undefined) {
      const safeErrors = (payload.errors ?? []).map((error) => ({ code: error.code, message: error.message }));
      throw new DomainError("domain_provider_unavailable", "Cloudflare operation failed", {
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        safeDetail: { status: response.status, errors: sanitizeDomainDetail(safeErrors) as unknown },
      });
    }
    return payload.result as T;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("domain_provider_unavailable", "Cloudflare request failed", {
      retryable: true,
      safeDetail: { cause: error instanceof Error ? error.name : "unknown" },
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function findExactCustomHostname(input: {
  provider: CloudflareProviderContext;
  hostname: string;
  runtimeEnv?: Record<string, unknown>;
}): Promise<CloudflareHostnameResult | null> {
  const results = await cloudflareRequest<CloudflareHostnameResult[]>({
    method: "GET",
    path: `/zones/${encodeURIComponent(input.provider.zoneId)}/custom_hostnames?hostname.exact=${encodeURIComponent(input.hostname)}&per_page=5`,
    provider: input.provider,
    runtimeEnv: input.runtimeEnv,
  });
  const exact = results.filter((row) => row.hostname.toLowerCase().replace(/\.$/, "") === input.hostname);
  if (exact.length > 1) {
    throw new DomainError("domain_provider_configuration_invalid", "Cloudflare returned multiple exact custom hostnames", {
      safeDetail: { hostname: input.hostname, exactMatchCount: exact.length },
    });
  }
  return exact[0] ?? null;
}

function assertExistingObjectOwnedByDomain(result: CloudflareHostnameResult, domain: TenantDomainRecord): void {
  const metadata = result.custom_metadata ?? {};
  if (metadata.tenant_id !== domain.tenantId
    || metadata.domain_id !== domain.id
    || metadata.generation !== String(domain.generation)) {
    throw new DomainError("domain_provider_configuration_invalid", "Existing Cloudflare hostname is not owned by the current domain generation", {
      safeDetail: { hostname: domain.normalizedHostname, customHostnameId: result.id },
    });
  }
}

export function createCloudflareAdapter(runtimeEnv: Record<string, unknown> = {}): CloudflarePort {
  return {
    async provisionCustomHostname(input: {
      provider: CloudflareProviderContext;
      domain: TenantDomainRecord;
      idempotencyKey: string;
    }) {
      const existing = await findExactCustomHostname({
        provider: input.provider,
        hostname: input.domain.normalizedHostname,
        runtimeEnv,
      });
      if (existing) {
        assertExistingObjectOwnedByDomain(existing, input.domain);
        return mapObservation(existing);
      }

      const result = await cloudflareRequest<CloudflareHostnameResult>({
        method: "POST",
        path: `/zones/${encodeURIComponent(input.provider.zoneId)}/custom_hostnames`,
        provider: input.provider,
        runtimeEnv,
        body: {
          hostname: input.domain.normalizedHostname,
          custom_metadata: {
            tenant_id: input.domain.tenantId,
            domain_id: input.domain.id,
            generation: String(input.domain.generation),
          },
          ssl: { method: "txt", type: "dv" },
        },
      });
      assertExistingObjectOwnedByDomain(result, input.domain);
      return mapObservation(result);
    },

    async observeCustomHostname(input) {
      const result = await cloudflareRequest<CloudflareHostnameResult>({
        method: "GET",
        path: `/zones/${encodeURIComponent(input.provider.zoneId)}/custom_hostnames/${encodeURIComponent(input.customHostnameId)}`,
        provider: input.provider,
        runtimeEnv,
      });
      return mapObservation(result);
    },

    async removeCustomHostname(input) {
      const existing = await findExactCustomHostname({
        provider: input.provider,
        hostname: input.domain.normalizedHostname,
        runtimeEnv,
      });
      if (!existing) return { removed: true as const, alreadyAbsent: true };
      if (existing.id !== input.customHostnameId) {
        throw new DomainError("domain_provider_configuration_invalid", "Cloudflare hostname id differs from the persisted provider binding", {
          safeDetail: { hostname: input.domain.normalizedHostname },
        });
      }
      const result = await cloudflareRequest<{ id: string }>({
        method: "DELETE",
        path: `/zones/${encodeURIComponent(input.provider.zoneId)}/custom_hostnames/${encodeURIComponent(input.customHostnameId)}`,
        provider: input.provider,
        runtimeEnv,
      });
      if (result.id !== input.customHostnameId) {
        throw new DomainError("domain_provider_configuration_invalid", "Cloudflare delete response did not match the requested object");
      }
      return { removed: true as const, alreadyAbsent: false };
    },
  };
}
