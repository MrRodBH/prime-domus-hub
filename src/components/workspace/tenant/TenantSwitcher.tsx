// F3.5 — Tenant Switcher UX
//
// Dropdown de seleção de tenant para USUÁRIO COMUM.
// Fonte única: `listSelectableTenants` (server-side, active-only).
// NUNCA consulta `tenant_members`, NUNCA filtra `membership_status`.
// A precedência de header é preservada pelo tenant-attacher (F3.4.1):
// impersonação Super Admin > seleção comum > sem header.
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listSelectableTenants } from "@/lib/api/tenant-selection.functions";
import {
  clearSelectedTenantId,
  reconcileSelection,
  setSelectedTenantId,
} from "@/integrations/supabase/tenant-selection-state";
import { useSelectedTenantId } from "@/integrations/supabase/use-tenant-selection";
import { resolveCardinalityAction } from "./tenant-selection-cardinality";

export function TenantSwitcher({
  impersonating,
}: {
  impersonating?: string | null;
}) {
  const qc = useQueryClient();
  const fetchSelectable = useServerFn(listSelectableTenants);
  const selectedId = useSelectedTenantId();

  // Impersonação Super Admin tem precedência absoluta (F3.4.1 §9) e usa
  // sua própria UX. O Tenant Switcher comum não deve aparecer nesse
  // estado — evita ambiguidade entre "tenant selecionado" e "tenant
  // impersonado".
  const disabled = Boolean(impersonating);

  const query = useQuery({
    queryKey: ["tenant-selection", "selectable"],
    queryFn: () => fetchSelectable(),
    enabled: !disabled,
    staleTime: 60_000,
  });

  const tenants = query.data ?? [];
  const activeIds = useMemo(() => tenants.map((t) => t.tenantId), [tenants]);

  // Reconcile + cardinalidade rodam SEMPRE que a lista chega/atualiza.
  useEffect(() => {
    if (disabled) return;
    if (!query.isSuccess) return;
    const reconciled = reconcileSelection(activeIds);
    const action = resolveCardinalityAction(activeIds, reconciled);
    switch (action.kind) {
      case "none":
        // 0 tenants ativos: limpar (defensivo — reconcile já limpou).
        if (reconciled) clearSelectedTenantId();
        return;
      case "auto-select":
        // Cardinalidade === 1: única auto-seleção permitida.
        setSelectedTenantId(action.tenantId);
        void qc.invalidateQueries();
        return;
      case "keep":
      case "require-selection":
        return;
    }
  }, [disabled, query.isSuccess, activeIds, qc]);

  if (disabled) return null;

  const current = tenants.find((t) => t.tenantId === selectedId) ?? null;
  const needsSelection =
    query.isSuccess &&
    tenants.length > 1 &&
    (!selectedId || !activeIds.includes(selectedId));

  const label = query.isLoading
    ? "Carregando…"
    : query.isError
      ? "Erro ao carregar"
      : tenants.length === 0
        ? "Sem organização"
        : current
          ? current.name
          : needsSelection
            ? "Selecione uma organização"
            : "—";

  function handleSelect(tenantId: string) {
    if (!activeIds.includes(tenantId)) return; // defensivo
    if (tenantId === selectedId) return;
    setSelectedTenantId(tenantId);
    // Recarrega dados tenant-scoped — TanStack Query é o mecanismo
    // canônico do projeto (WorkspaceShell / CommandPalette).
    void qc.invalidateQueries();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-2 px-2 max-w-[220px] ${
            needsSelection
              ? "text-amber-700 border border-amber-500/40 bg-amber-500/10"
              : "text-foreground/80"
          }`}
          aria-label="Selecionar organização"
        >
          {query.isLoading ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
          ) : (
            <Building2 className="size-3.5 shrink-0" />
          )}
          <span className="truncate text-xs">{label}</span>
          {tenants.length > 1 && <ChevronDown className="size-3 shrink-0 opacity-60" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Organização ativa
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {query.isLoading && (
          <div className="px-2 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-3 animate-spin" /> Carregando…
          </div>
        )}
        {query.isError && (
          <div className="px-2 py-2 text-xs text-destructive">
            Erro ao carregar organizações.
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 ml-1 text-xs"
              onClick={() => void query.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {query.isSuccess && tenants.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            Nenhuma organização ativa disponível para este usuário.
          </div>
        )}
        {query.isSuccess &&
          tenants.map((t) => {
            const isActive = t.tenantId === selectedId;
            return (
              <DropdownMenuItem
                key={t.tenantId}
                onSelect={() => handleSelect(t.tenantId)}
                className="flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{t.name}</div>
                  {t.slug && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {t.slug}
                    </div>
                  )}
                </div>
                {isActive && <Check className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
