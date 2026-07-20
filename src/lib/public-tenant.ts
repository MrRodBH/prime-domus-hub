export type PublicTenantResolutionCode =
  | "invalid_host"
  | "local_mapping_required"
  | "tenant_not_found"
  | "tenant_ambiguous"
  | "tenant_query_failed";

export class PublicTenantResolutionError extends Error {
  readonly code: PublicTenantResolutionCode;

  constructor(code: PublicTenantResolutionCode, message: string) {
    super(message);
    this.name = "PublicTenantResolutionError";
    this.code = code;
  }
}

export interface PublicTenantIdentity {
  id: string;
  nome: string;
  slug: string;
  dominio_principal: string | null;
  status: string;
}

export function normalizePublicHostname(value: string | null | undefined): string {
  if (!value) {
    throw new PublicTenantResolutionError("invalid_host", "Public request host is required.");
  }

  const raw = value.trim().toLowerCase();
  if (!raw) {
    throw new PublicTenantResolutionError("invalid_host", "Public request host is required.");
  }

  let hostname: string;
  try {
    hostname = raw.includes("://") ? new URL(raw).hostname : new URL(`http://${raw}`).hostname;
  } catch {
    throw new PublicTenantResolutionError("invalid_host", "Public request host is invalid.");
  }

  const normalized = hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!normalized || normalized.includes("/") || normalized.includes("\\")) {
    throw new PublicTenantResolutionError("invalid_host", "Public request host is invalid.");
  }
  return normalized;
}

export function isLocalDevelopmentHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function requireExactlyOneTenant(
  rows: PublicTenantIdentity[] | null | undefined,
  authority: string,
): PublicTenantIdentity {
  const candidates = rows ?? [];
  if (candidates.length === 0) {
    throw new PublicTenantResolutionError(
      "tenant_not_found",
      `No tenant is registered for public authority ${authority}.`,
    );
  }
  if (candidates.length !== 1) {
    throw new PublicTenantResolutionError(
      "tenant_ambiguous",
      `Multiple tenants are registered for public authority ${authority}.`,
    );
  }

  const tenant = candidates[0];
  if (!tenant.id || !tenant.slug) {
    throw new PublicTenantResolutionError(
      "tenant_ambiguous",
      `Tenant identity is incomplete for public authority ${authority}.`,
    );
  }
  return tenant;
}
