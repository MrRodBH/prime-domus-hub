export type TenantScopedRow = { tenant_id: string };

export function assertTenantScopedRows<T extends TenantScopedRow>(
  tenantId: string,
  rows: readonly T[] | null | undefined,
): T[] {
  const values = rows ? [...rows] : [];
  if (values.some((row) => row.tenant_id !== tenantId)) {
    throw new Error("Cross-tenant row returned by public tenant-scoped read");
  }
  return values;
}

export function assertOptionalTenantScopedRow<T extends TenantScopedRow>(
  tenantId: string,
  row: T | null | undefined,
): T | null {
  if (!row) return null;
  if (row.tenant_id !== tenantId) {
    throw new Error("Cross-tenant row returned by public tenant-scoped read");
  }
  return row;
}

export function withoutTenantId<T extends TenantScopedRow>(
  row: T,
): Omit<T, "tenant_id"> {
  const { tenant_id: _tenantId, ...value } = row;
  return value;
}

export async function loadRequiredPublicRootData<TSettings, TMeta>(
  loadSettings: () => Promise<TSettings>,
  loadMeta: () => Promise<TMeta>,
): Promise<{ settings: TSettings; meta: TMeta }> {
  const settings = await loadSettings();
  const meta = await loadMeta();
  return { settings, meta };
}
