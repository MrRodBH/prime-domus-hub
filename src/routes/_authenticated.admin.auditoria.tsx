import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listTenantAccessAudit } from "@/lib/api/tenant-access-control.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({ component: TenantAccessAuditPage });

function TenantAccessAuditPage() {
  const audit = useQuery({ queryKey: ["tenant-access-audit"], queryFn: () => listTenantAccessAudit({ data: { limit: 300 } }) });
  return (
    <div className="space-y-6">
      <div>
        <AdminPageHeader eyebrow="Controle de acesso" title="Auditoria de acessos" />
        <p className="mt-1 text-sm text-muted-foreground">Eventos tenant-scoped gravados dentro das mesmas transações de perfis, permissões, associações e equipes.</p>
      </div>
      {audit.isPending ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">Carregando auditoria…</div>
      ) : audit.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm"><p>Não foi possível carregar a auditoria.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void audit.refetch()}><RefreshCw className="mr-2 size-4" /> Tentar novamente</Button></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3 text-left">Quando</th><th className="px-4 py-3 text-left">Ação</th><th className="px-4 py-3 text-left">Ator</th><th className="px-4 py-3 text-left">Entidade</th><th className="px-4 py-3 text-left">ID</th><th className="px-4 py-3 text-left">Resultado</th></tr></thead>
            <tbody>
              {(audit.data ?? []).map((event: any) => (
                <tr key={event.id} className="border-t align-top">
                  <td className="px-4 py-3 text-xs">{formatDate(event.created_at)}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{event.action}</Badge></td>
                  <td className="px-4 py-3"><div>{event.user_email ?? "—"}</div><div className="font-mono text-[11px] text-muted-foreground">{event.user_id ?? "—"}</div></td>
                  <td className="px-4 py-3">{event.entity ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{event.entity_id ?? "—"}</td>
                  <td className="max-w-[340px] px-4 py-3"><pre className="whitespace-pre-wrap break-all text-[11px] text-muted-foreground">{JSON.stringify(event.after ?? event.before ?? null)}</pre></td>
                </tr>
              ))}
              {!audit.data?.length ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhum evento de controle de acesso registrado.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
