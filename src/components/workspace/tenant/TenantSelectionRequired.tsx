// F3.5 — Bloqueio de conteúdo tenant-scoped quando N>1 sem seleção.
//
// Renderizado dentro do WorkspaceShell. Consome a MESMA query do
// TenantSwitcher (queryKey compartilhado) — nenhuma request adicional.
// Não decide autorização; apenas evita rodar UI tenant-scoped sem um
// `x-tenant-id` válido. Servidor continua sendo a autoridade.
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { listSelectableTenants } from "@/lib/api/tenant-selection.functions";
import { useSelectedTenantId } from "@/integrations/supabase/use-tenant-selection";
import { useImpersonation } from "@/integrations/supabase/use-impersonation";

export function TenantSelectionGate({
  isSuper,
  children,
}: {
  isSuper: boolean;
  children: ReactNode;
}) {
  const impersonating = useImpersonation();
  const selectedId = useSelectedTenantId();
  const fetchSelectable = useServerFn(listSelectableTenants);

  // F3.5.1 — Super Admin (com ou sem impersonação) fica fora do gate comum.
  // SA usa fluxo de impersonação próprio; o header já valida x-tenant-id.
  const skip = Boolean(impersonating) || isSuper;

  const query = useQuery({
    queryKey: ["tenant-selection", "selectable"],
    queryFn: () => fetchSelectable(),
    enabled: !skip,
    staleTime: 60_000,
  });

  if (skip) return <>{children}</>;

  // F3.5.1 — enquanto a lista active-only não retorna, NÃO liberar
  // conteúdo tenant-scoped: qualquer render prematuro poderia usar
  // uma seleção stale antes da reconciliação.
  if (query.isPending) {
    return (
      <EmptyState
        icon={<Loader2 className="size-8 text-muted-foreground animate-spin" />}
        title="Carregando organizações…"
        description="Validando suas organizações ativas."
      />
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-8 text-destructive" />}
        title="Erro ao carregar organizações"
        description="Não foi possível obter suas organizações ativas."
        action={
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const tenants = query.data ?? [];
  const activeIds = tenants.map((t) => t.tenantId);

  if (tenants.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="size-8 text-muted-foreground" />}
        title="Nenhuma organização ativa"
        description="Este usuário não possui organização ativa disponível. Contate o administrador para receber acesso."
      />
    );
  }

  const hasValidSelection = selectedId && activeIds.includes(selectedId);
  if (tenants.length > 1 && !hasValidSelection) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-8 text-amber-600" />}
        title="Selecione uma organização"
        description="Você possui acesso a múltiplas organizações. Escolha uma no seletor no canto superior direito para continuar."
      />
    );
  }

  return <>{children}</>;
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-3">
        <div className="flex justify-center">{icon}</div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
