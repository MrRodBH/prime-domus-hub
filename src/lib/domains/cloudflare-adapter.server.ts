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

function mapObservation(
  result: CloudflareHostnameResult,
  errors: readonly { code: number | string; message: string }[] = [],
): CloudflareCustomHostnameObservation {
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
    createdAt: result.created_at ?? null,
  };
}

function normalizedProviderHostname(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

function assertExactProviderIdentity(
  result: CloudflareHostnameResult,
  domain: TenantDomainRecord,
  expectedCustomHostnameId: string,
): void {
  if (result.id !== expectedCustomHostnameId) {
    throw new DomainError("domain_provider_configuration_invalid", "Cloudflare object id differs from the server-bound provider identity", {
      safeDetail: { hostname: domain.normalizedHostname },
    });
  }
  if (normalizedProviderHostname(result.hostname) !== domain.normalizedHostname) {
    throw new DomainError("domain_provider_configuration_invalid", "Cloudflare object hostname differs from the authoritative domain", {
      safeDetail: { customHostnameId: expectedCustomHostnameId },
    });
  }
}

function ambiguousMutationStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function cloudflareRequest<T>(input: {
  method: "GET" | "POST" | "DELETE";
  path: string;
  provider: CloudflareProviderContext;
  runtimeEnv?: Record<string, unknown>;
  body?: Record<string, unknown>;
  ambiguousOnTransportFailure?: boolean;
  allowNotFound?: boolean;
}): Promise<T | null> {
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

    if (input.allowNotFound && response.status === 404) return null;

    let payload: CloudflareEnvelope<T>;
    try {
      payload = (await response.json()) as CloudflareEnvelope<T>;
    } catch (error) {
      if (input.ambiguousOnTransportFailure) {
        throw new DomainError("domain_provider_outcome_ambiguous", "Cloudflare mutation returned an unreadable outcome", {
          retryable: false,
          safeDetail: { status: response.status, cause: error instanceof Error ? error.name : "unknown" },
          cause: error,
        });
      }
      throw error;
    }

    if (!response.ok || payload.success !== true || payload.result === undefined) {
      const safeErrors = (payload.errors ?? []).map((error) => ({ code: error.code, message: error.message }));
      const ambiguous = input.ambiguousOnTransportFailure && ambiguousMutationStatus(response.status);
      throw new DomainError(
        ambiguous ? "domain_provider_outcome_ambiguous" : "domain_provider_unavailable",
        ambiguous ? "Cloudflare mutation outcome is ambiguous" : "Cloudflare operation failed",
        {
          retryable: !ambiguous && (response.status === 408 || response.status === 429 || response.status >= 500),
          safeDetail: { status: response.status, errors: sanitizeDomainDetail(safeErrors) },
        },
      );
    }
    return payload.result as T;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    const ambiguous = input.ambiguousOnTransportFailure === true;
    throw new DomainError(
      ambiguous ? "domain_provider_outcome_ambiguous" : "domain_provider_unavailable",
      ambiguous ? "Cloudflare mutation transport outcome is ambiguous" : "Cloudflare request failed",
      {
        retryable: !ambiguous,
        safeDetail: { cause: error instanceof Error ? error.name : "unknown" },
        cause: error,
      },
    );
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
  const exact = (results ?? []).filter(
    (row) => normalizedProviderHostname(row.hostname) === input.hostname,
  );
  if (exact.length > 1) {
    throw new DomainError("domain_provider_configuration_invalid", "Cloudflare returned multiple exact custom hostnames", {
      safeDetail: { hostname: input.hostname, exactMatchCount: exact.length },
    });
  }
  return exact[0] ?? null;
}

async function getCustomHostnameById(input: {
  provider: CloudflareProviderContext;
  customHostnameId: string;
  runtimeEnv?: Record<string, unknown>;
}): Promise<CloudflareHostnameResult | null> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(input.customHostnameId)) {
    throw new DomainError("domain_provider_configuration_invalid", "Cloudflare custom hostname id is invalid");
  }
  return cloudflareRequest<CloudflareHostnameResult>({
    method: "GET",
    path: `/zones/${encodeURIComponent(input.provider.zoneId)}/custom_hostnames/${encodeURIComponent(input.customHostnameId)}`,
    provider: input.provider,
    runtimeEnv: input.runtimeEnv,
    allowNotFound: true,
  });
}

export function createCloudflareAdapter(runtimeEnv: Record<string, unknown> = {}): CloudflarePort {
  return {
    async provisionCustomHostname(input) {
      // The repository idempotency key is server operation identity only. Cloudflare
      // does not become authority for it and no provider-side idempotency is assumed.
      void input.idempotencyKey;

      const collision = await findExactCustomHostname({
        provider: input.provider,
        hostname: input.domain.normalizedHostname,
        runtimeEnv,
      });
      if (collision) {
        throw new DomainError("domain_provider_configuration_invalid", "An unbound Cloudflare hostname already exists; automatic adoption is prohibited", {
          safeDetail: { hostname: input.domain.normalizedHostname, exactMatchCount: 1 },
        });
      }

      const result = await cloudflareRequest<CloudflareHostnameResult>({
        method: "POST",
        path: `/zones/${encodeURIComponent(input.provider.zoneId)}/custom_hostnames`,
        provider: input.provider,
        runtimeEnv,
        ambiguousOnTransportFailure: true,
        body: {
          hostname: input.domain.normalizedHostname,
          ssl: { method: "txt", type: "dv" },
        },
      });
      if (!result || typeof result.id !== "string" || result.id.length < 8 || typeof result.hostname !== "string") {
        throw new DomainError("domain_provider_outcome_ambiguous", "Cloudflare create response did not provide authoritative object identity", {
          retryable: false,
          safeDetail: { hostname: input.domain.normalizedHostname },
        });
      }
      // Hostname equality is deliberately validated by the job layer so a
      // successful POST with a mismatched hostname can be compensated by the
      // exact returned id rather than losing that identity in an exception.
      return mapObservation(result);
    },

    async observeCustomHostname(input) {
      const result = await getCustomHostnameById({
        provider: input.provider,
        customHostnameId: input.expectedCustomHostnameId,
        runtimeEnv,
      });
      if (!result) {
        throw new DomainError("domain_provider_configuration_invalid", "The server-bound Cloudflare hostname no longer exists", {
          safeDetail: { customHostnameId: input.expectedCustomHostnameId },
        });
      }
      assertExactProviderIdentity(result, input.domain, input.expectedCustomHostnameId);
      return mapObservation(result);
    },

    async removeCustomHostname(input) {
      const existing = await getCustomHostnameById({
        provider: input.provider,
        customHostnameId: input.customHostnameId,
        runtimeEnv,
      });
      if (!existing) return { removed: true as const, alreadyAbsent: true };
      assertExactProviderIdentity(existing, input.domain, input.customHostnameId);

      const result = await cloudflareRequest<{ id: string }>({
        method: "DELETE",
        path: `/zones/${encodeURIComponent(input.provider.zoneId)}/custom_hostnames/${encodeURIComponent(input.customHostnameId)}`,
        provider: input.provider,
        runtimeEnv,
        allowNotFound: true,
      });
      if (result === null) return { removed: true as const, alreadyAbsent: true };
      if (result.id !== input.customHostnameId) {
        throw new DomainError("domain_provider_configuration_invalid", "Cloudflare delete response did not match the server-bound object id");
      }
      return { removed: true as const, alreadyAbsent: false };
    },
  };
}
