import { requirePublicTenantFromRequest } from "@/lib/tenant.server";

export type PublicWriterErrorCode =
  | "public_tenant_unresolved"
  | "resource_not_found"
  | "resource_ambiguous"
  | "resource_foreign_tenant"
  | "resource_missing_tenant_id"
  | "portal_connector_invalid"
  | "portal_connector_ambiguous"
  | "portal_connector_inactive"
  | "writer_input_invalid"
  | "portal_link_state_ambiguous";

export class PublicWriterError extends Error {
  readonly code: PublicWriterErrorCode;
  readonly status: number;

  constructor(code: PublicWriterErrorCode, message: string, status = 400) {
    super(message);
    this.name = "PublicWriterError";
    this.code = code;
    this.status = status;
  }
}

export interface PublicWriterTenantIdentity {
  readonly id: string;
}

export interface PortalConnectorAuthority {
  readonly id: string;
  readonly portalSlug: string;
  readonly tenant: PublicWriterTenantIdentity;
  readonly active: true;
}

type TenantScopedRow = { tenant_id?: string | null };

export async function requirePublicWriterTenantFromRequest(): Promise<PublicWriterTenantIdentity> {
  const tenant = await requirePublicTenantFromRequest().catch((error) => {
    if (error instanceof PublicWriterError) throw error;
    throw new PublicWriterError(
      "public_tenant_unresolved",
      "Public tenant authority could not be resolved.",
      404,
    );
  });

  if (!tenant?.id) {
    throw new PublicWriterError(
      "public_tenant_unresolved",
      "Public tenant authority could not be resolved.",
      404,
    );
  }

  return Object.freeze(tenant);
}

export function selectExactlyOneRow<T>(
  rows: readonly T[] | null | undefined,
  options: {
    zeroCode?: PublicWriterErrorCode;
    zeroMessage?: string;
    zeroStatus?: number;
    ambiguousCode?: PublicWriterErrorCode;
    ambiguousMessage?: string;
    ambiguousStatus?: number;
    allowZero?: boolean;
  } = {},
): T | null {
  const list = rows ?? [];
  if (list.length === 0) {
    if (options.allowZero) return null;
    throw new PublicWriterError(
      options.zeroCode ?? "resource_not_found",
      options.zeroMessage ?? "Resource not found.",
      options.zeroStatus ?? 404,
    );
  }
  if (list.length !== 1) {
    throw new PublicWriterError(
      options.ambiguousCode ?? "resource_ambiguous",
      options.ambiguousMessage ?? "Resource authority is ambiguous.",
      options.ambiguousStatus ?? 409,
    );
  }
  return list[0];
}

export function assertTenantScopedRow<T extends TenantScopedRow>(
  tenant: PublicWriterTenantIdentity,
  row: T,
): T {
  if (!row.tenant_id) {
    throw new PublicWriterError(
      "resource_missing_tenant_id",
      "Tenant-scoped resource is missing tenant identity.",
      500,
    );
  }
  if (row.tenant_id !== tenant.id) {
    throw new PublicWriterError(
      "resource_foreign_tenant",
      "Tenant-scoped resource belongs to another tenant.",
      403,
    );
  }
  return row;
}

export function selectExactlyOneTenantScopedRow<T extends TenantScopedRow>(
  tenant: PublicWriterTenantIdentity,
  rows: readonly T[] | null | undefined,
  options: Parameters<typeof selectExactlyOneRow<T>>[1] = {},
): T | null {
  const row = selectExactlyOneRow(rows, options);
  return row ? assertTenantScopedRow(tenant, row) : null;
}

export function assertTenantScopedCollection<T extends TenantScopedRow>(
  tenant: PublicWriterTenantIdentity,
  rows: readonly T[] | null | undefined,
): T[] {
  return (rows ?? []).map((row) => assertTenantScopedRow(tenant, row));
}

function normalizePortalSlug(value: string): string {
  const portalSlug = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(portalSlug)) {
    throw new PublicWriterError("writer_input_invalid", "Invalid portal slug.", 400);
  }
  return portalSlug;
}

function freezeConnector(row: {
  id: string;
  tenant_id: string;
  portal_slug: string;
  ativo: boolean;
}): PortalConnectorAuthority {
  if (!row.ativo) {
    throw new PublicWriterError(
      "portal_connector_inactive",
      "Portal connector is inactive.",
      403,
    );
  }
  const tenant = Object.freeze({ id: row.tenant_id });
  return Object.freeze({
    id: row.id,
    portalSlug: row.portal_slug,
    tenant,
    active: true as const,
  });
}

export async function resolvePortalConnectorAuthority(input: {
  portalSlug: string;
  token: string;
}): Promise<PortalConnectorAuthority> {
  const portalSlug = normalizePortalSlug(input.portalSlug);
  if (!input.token || input.token.length < 10) {
    throw new PublicWriterError("portal_connector_invalid", "Invalid portal credential.", 401);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("portal_connectors")
    .select("id, tenant_id, portal_slug, ativo")
    .eq("feed_token", input.token)
    .eq("portal_slug", portalSlug)
    .limit(2);

  if (error) throw new Error(error.message);
  const row = selectExactlyOneRow(
    data as Array<{ id: string; tenant_id: string; portal_slug: string; ativo: boolean }> | null,
    {
      zeroCode: "portal_connector_invalid",
      zeroMessage: "Invalid portal credential.",
      zeroStatus: 401,
      ambiguousCode: "portal_connector_ambiguous",
      ambiguousMessage: "Portal connector authority is ambiguous.",
      ambiguousStatus: 409,
    },
  );
  if (!row?.tenant_id) {
    throw new PublicWriterError(
      "resource_missing_tenant_id",
      "Portal connector is missing tenant identity.",
      500,
    );
  }
  if (row.portal_slug !== portalSlug) {
    throw new PublicWriterError("portal_connector_invalid", "Invalid portal credential.", 401);
  }
  return freezeConnector(row);
}

export async function resolvePortalConnectorForTenant(input: {
  tenantId: string;
  portalSlug: string;
}): Promise<PortalConnectorAuthority> {
  const portalSlug = normalizePortalSlug(input.portalSlug);
  if (!input.tenantId) {
    throw new PublicWriterError(
      "resource_missing_tenant_id",
      "Persisted portal queue item is missing tenant identity.",
      500,
    );
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("portal_connectors")
    .select("id, tenant_id, portal_slug, ativo")
    .eq("tenant_id", input.tenantId)
    .eq("portal_slug", portalSlug)
    .limit(2);

  if (error) throw new Error(error.message);
  const tenant = Object.freeze({ id: input.tenantId });
  const row = selectExactlyOneTenantScopedRow(
    tenant,
    data as Array<{ id: string; tenant_id: string; portal_slug: string; ativo: boolean }> | null,
    {
      zeroCode: "portal_connector_invalid",
      zeroMessage: "Persisted portal connector no longer exists.",
      zeroStatus: 409,
      ambiguousCode: "portal_connector_ambiguous",
      ambiguousMessage: "Persisted portal connector authority is ambiguous.",
      ambiguousStatus: 409,
    },
  );
  if (!row || row.portal_slug !== portalSlug) {
    throw new PublicWriterError("portal_connector_invalid", "Invalid portal connector.", 409);
  }
  return freezeConnector(row);
}
