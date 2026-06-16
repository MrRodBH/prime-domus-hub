import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListarLeads, adminAtualizarLead } from "@/lib/api/admin.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: AdminLeads,
});

const statuses = ["novo", "em_atendimento", "qualificado", "ganho", "perdido"] as const;

function AdminLeads() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "leads"], queryFn: () => adminListarLeads() });
  const upd = useMutation({
    mutationFn: (p: { id: string; status: typeof statuses[number] }) => adminAtualizarLead({ data: p }),
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Leads</h1>
      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Nome</TableHead><TableHead>Contato</TableHead><TableHead>Imóvel</TableHead><TableHead>Origem</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="font-medium">
                  {l.nome}
                  {l.mensagem && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{l.mensagem}</p>}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{l.email}</div>
                  <div className="text-muted-foreground">{l.telefone}</div>
                </TableCell>
                <TableCell className="text-sm">{(l.imovel as { titulo?: string } | null)?.titulo ?? "—"}</TableCell>
                <TableCell className="text-xs">{l.origem}</TableCell>
                <TableCell>
                  <Select value={l.status} onValueChange={(v) => upd.mutate({ id: l.id, status: v as typeof statuses[number] })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lead recebido.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
