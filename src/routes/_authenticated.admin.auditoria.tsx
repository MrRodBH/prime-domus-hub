import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listarAuditoria } from "@/lib/api/rbac.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const log = useQuery({ queryKey: ["rbac","audit"], queryFn: () => listarAuditoria({ data: { limit: 200 } }) });

  return (
    <div className="space-y-6">
      <div>
        <AdminPageHeader
          eyebrow="Sistema"
          title="Auditoria"
        />
<p className="text-sm text-muted-foreground mt-1">Histórico das ações críticas dos usuários (últimas 200).</p>
      </div>
      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-sm">{r.user_email ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary">{r.action}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.entity ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{r.entity_id ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!log.data?.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum evento.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
