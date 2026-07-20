import type { PublicTenantIdentity } from "@/lib/tenant.server";

export class PublicTenantResolutionError extends Error {
  readonly code = "PUBLIC_TENANT_NOT_RESOLVED";

  constructor() {
    super("Public tenant authority could not be resolved");
    this.name = "PublicTenantResolutionError";
  }
}

export function requireResolvedPublicTenant(
  tenant: PublicTenantIdentity | null,
): PublicTenantIdentity {
  if (!tenant) throw new PublicTenantResolutionError();
  return tenant;
}

export function isPublicTenantResolutionError(error: unknown): boolean {
  return (
    error instanceof PublicTenantResolutionError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "PUBLIC_TENANT_NOT_RESOLVED")
  );
}

export function assertTenantScopedRows<T extends { tenant_id: string }>(
  tenantId: string,
  rows: readonly T[] | null | undefined,
): T[] {
  const values = rows ? [...rows] : [];
  if (values.some((row) => row.tenant_id !== tenantId)) {
    throw new Error("Cross-tenant row returned by public tenant-scoped read");
  }
  return values;
}

export function selectExactlyOneTenantScopedRow<T extends { tenant_id: string }>(
  tenantId: string,
  rows: readonly T[] | null | undefined,
): T | null {
  const values = assertTenantScopedRows(tenantId, rows);
  return values.length === 1 ? values[0] : null;
}

export function withoutTenantId<T extends { tenant_id: string }>(
  row: T,
): Omit<T, "tenant_id"> {
  const { tenant_id: _tenantId, ...value } = row;
  return value;
}
