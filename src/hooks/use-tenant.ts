import { useQuery } from "@tanstack/react-query";
import { meuTenantId } from "@/lib/api/tenant.functions";

/** Retorna o tenant_id do usuário logado (resolvido no server). */
export function useTenantId(): string | null {
  const { data } = useQuery({
    queryKey: ["meu-tenant-id"],
    queryFn: () => meuTenantId(),
    staleTime: 5 * 60_000,
  });
  return (data as string | null) ?? null;
}

/** Prefixa um path de bucket com `${tenantId}/`. Idempotente. */
export function withTenantPrefix(tenantId: string | null, path: string): string {
  if (!tenantId) throw new Error("tenant_id ausente — recarregue a página");
  const prefix = `${tenantId}/`;
  return path.startsWith(prefix) ? path : `${prefix}${path.replace(/^\/+/, "")}`;
}
