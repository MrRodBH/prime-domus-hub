// Server-only tenant helpers. Never import from client code.
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import { PublicTenantResolutionError } from "@/lib/public-tenant-resolution-error";

export interface PublicTenantIdentity {
  id: string;
  slug: string;
  nome: string;
}

export interface ActivePublicDomainIdentity extends PublicTenantIdentity {
  domainId: string;
  hostname: string;
  hostnameKind: "canonical" | "alias";
  canonicalHostname: string;
  generation: number;
}

export type PublicHostAuthority =
  | { kind: "domain"; domain: string }
  | { kind: "development_slug"; host: string; slug: string }
  | { kind: "none"; reason: "absent_host" | "invalid_host" | "unmapped_development_host" };

const DEVELOPMENT_HOST_MAP_ENV = "PUBLIC_TENANT_DEV_HOST_MAP";
const TENANT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function serverPublishable() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function validPort(port: string | undefined): boolean {
  if (port === undefined) return true;
  const value = Number(port);
  return Number.isInteger(value) && value >= 1 && value <= 65_535;
}

function validIpv4(host: string): boolean {
  const parts = host.split(".");
  return parts.length === 4
    && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function validDomain(host: string): boolean {
  if (host.length > 253 || !host.includes(".")) return false;
  return host.split(".").every((label) => DOMAIN_LABEL_RE.test(label));
}

/** Normalize one Host header value without creating authority by heuristic. */
export function normalizePublicHost(host: string | null | undefined): string | null {
  if (host == null) return null;
  const raw = host.trim().toLowerCase();
  if (!raw) return null;
  if (/[\s,/\\?#@]/.test(raw) || raw.includes("://")) return null;

  if (raw.startsWith("[")) {
    const match = raw.match(/^\[([0-9a-f:.]+)\](?::(\d{1,5}))?$/i);
    if (!match || !validPort(match[2])) return null;
    return `[${match[1]}]`;
  }

  if ((raw.match(/:/g) ?? []).length > 1) return null;
  const match = raw.match(/^([^:]+?)(?::(\d{1,5}))?$/);
  if (!match || !validPort(match[2])) return null;

  const normalized = match[1].replace(/\.$/, "");
  if (!normalized) return null;
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return normalized;
  if (validIpv4(normalized)) return normalized;
  if (!validDomain(normalized)) return null;
  return normalized;
}

export function isExplicitDevelopmentHost(host: string): boolean {
  return host === "localhost"
    || host.endsWith(".localhost")
    || host === "127.0.0.1"
    || host === "0.0.0.0"
    || host === "[::1]"
    || host.endsWith(".lovable.app");
}

export function parseExplicitDevelopmentHostMap(raw: string | null | undefined): ReadonlyMap<string, string> {
  if (raw == null || raw.trim() === "") return new Map();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${DEVELOPMENT_HOST_MAP_ENV} must be valid JSON`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${DEVELOPMENT_HOST_MAP_ENV} must be a JSON object`);
  }
  const result = new Map<string, string>();
  for (const [rawHost, rawSlug] of Object.entries(parsed)) {
    const host = normalizePublicHost(rawHost);
    if (!host || !isExplicitDevelopmentHost(host)) {
      throw new Error(`${DEVELOPMENT_HOST_MAP_ENV} contains a non-development host`);
    }
    if (typeof rawSlug !== "string" || !TENANT_SLUG_RE.test(rawSlug)) {
      throw new Error(`${DEVELOPMENT_HOST_MAP_ENV} contains an invalid tenant slug`);
    }
    if (result.has(host)) throw new Error(`${DEVELOPMENT_HOST_MAP_ENV} contains duplicate normalized hosts`);
    result.set(host, rawSlug);
  }
  return result;
}

export function resolvePublicHostAuthority(
  host: string | null | undefined,
  rawDevelopmentMap: string | null | undefined = process.env[DEVELOPMENT_HOST_MAP_ENV],
): PublicHostAuthority {
  if (host == null || host.trim() === "") return { kind: "none", reason: "absent_host" };
  const normalized = normalizePublicHost(host);
  if (!normalized) return { kind: "none", reason: "invalid_host" };
  if (isExplicitDevelopmentHost(normalized)) {
    const slug = parseExplicitDevelopmentHostMap(rawDevelopmentMap).get(normalized);
    return slug
      ? { kind: "development_slug", host: normalized, slug }
      : { kind: "none", reason: "unmapped_development_host" };
  }
  return { kind: "domain", domain: normalized };
}

export function selectExactlyOneTenant(
  rows: readonly PublicTenantIdentity[] | null | undefined,
): PublicTenantIdentity | null {
  return rows?.length === 1 ? rows[0] : null;
}

function selectExactlyOneResolvedDomain(rows: any[] | null | undefined): ActivePublicDomainIdentity | null {
  if (!rows || rows.length !== 1) return null;
  const row = rows[0];
  if (row.authority_mode !== "tenant_domains"
    || !row.tenant_id
    || !row.tenant_slug
    || !row.tenant_name
    || !row.domain_id
    || !row.hostname
    || !row.canonical_hostname
    || !["canonical", "alias"].includes(row.hostname_kind)
    || !Number.isSafeInteger(Number(row.generation))
    || Number(row.generation) < 1) {
    return null;
  }
  return {
    id: row.tenant_id,
    slug: row.tenant_slug,
    nome: row.tenant_name,
    domainId: row.domain_id,
    hostname: row.hostname,
    hostnameKind: row.hostname_kind,
    canonicalHostname: row.canonical_hostname,
    generation: Number(row.generation),
  };
}

export async function resolveTenantByHost(
  host: string | null | undefined,
  rawDevelopmentMap: string | null | undefined = process.env[DEVELOPMENT_HOST_MAP_ENV],
): Promise<PublicTenantIdentity | null> {
  const authority = resolvePublicHostAuthority(host, rawDevelopmentMap);
  if (authority.kind === "none") return null;
  const client = serverPublishable() as any;
  if (authority.kind === "development_slug") {
    const result = await client.from("tenants").select("id, slug, nome").eq("slug", authority.slug).limit(2);
    if (result.error) throw new Error(`Public development tenant resolution failed: ${result.error.message}`);
    return selectExactlyOneTenant(result.data as PublicTenantIdentity[] | null);
  }

  const result = await client.rpc("resolve_public_tenant_by_host", { _hostname: authority.domain });
  if (result.error) throw new Error(`Active domain resolution failed: ${result.error.message}`);
  return selectExactlyOneResolvedDomain(result.data as any[] | null);
}

export async function resolveCanonicalRedirectByHost(
  host: string | null | undefined,
  rawDevelopmentMap: string | null | undefined = process.env[DEVELOPMENT_HOST_MAP_ENV],
): Promise<{ aliasHostname: string; canonicalHostname: string; generation: number } | null> {
  const authority = resolvePublicHostAuthority(host, rawDevelopmentMap);
  if (authority.kind !== "domain") return null;
  const result = await (serverPublishable() as any).rpc("get_canonical_redirect_for_active_alias", {
    _hostname: authority.domain,
  });
  if (result.error) throw new Error(`Canonical redirect resolution failed: ${result.error.message}`);
  if (!result.data || result.data.length === 0) return null;
  if (result.data.length !== 1) throw new Error("Canonical redirect resolution is ambiguous");
  const row = result.data[0];
  if (row.alias_hostname !== authority.domain
    || row.alias_hostname === row.canonical_hostname
    || !Number.isSafeInteger(Number(row.generation))
    || Number(row.generation) < 1) {
    throw new Error("Canonical redirect contract violation");
  }
  return {
    aliasHostname: row.alias_hostname,
    canonicalHostname: row.canonical_hostname,
    generation: Number(row.generation),
  };
}

export async function resolvePublicTenantFromRequest(): Promise<PublicTenantIdentity | null> {
  return resolveTenantByHost(getRequestHeader("host"));
}

export async function requirePublicTenantFromRequest(): Promise<PublicTenantIdentity> {
  const tenant = await resolvePublicTenantFromRequest();
  if (!tenant) throw new PublicTenantResolutionError();
  return tenant;
}

/**
 * Resolve the public origin from the same server-authoritative domain record
 * that resolved the tenant. Production never trusts forwarded origin headers.
 */
export async function requireAuthoritativePublicOriginFromRequest(): Promise<string> {
  const rawHost = getRequestHeader("host");
  const authority = resolvePublicHostAuthority(rawHost);
  const tenant = await requirePublicTenantFromRequest();

  if (authority.kind === "domain") {
    const canonicalHostname = (tenant as Partial<ActivePublicDomainIdentity>).canonicalHostname;
    if (!canonicalHostname || normalizePublicHost(canonicalHostname) !== canonicalHostname) {
      throw new Error("Canonical public domain unavailable");
    }
    return `https://${canonicalHostname}`;
  }

  if (authority.kind === "development_slug") {
    return `http://${authority.host}`;
  }

  throw new PublicTenantResolutionError();
}

export function publicSupabaseForTenant(tenantId: string) {
  if (!tenantId) throw new Error("Validated public tenant id is required.");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    global: { headers: { "x-tenant-id": tenantId } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
