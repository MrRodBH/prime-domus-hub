// Cache global e síncrono do tenant_id do usuário logado.
// Populado pelo AdminShell no mount via useTenantIdInit().
let currentTenantId: string | null = null;

export function setCurrentTenantId(id: string | null) {
  currentTenantId = id;
}

export function getCurrentTenantIdSync(): string {
  if (!currentTenantId) {
    throw new Error("tenant_id não carregado — recarregue a página");
  }
  return currentTenantId;
}

export function prefixTenant(path: string): string {
  const tid = getCurrentTenantIdSync();
  const prefix = `${tid}/`;
  return path.startsWith(prefix) ? path : `${prefix}${path.replace(/^\/+/, "")}`;
}
