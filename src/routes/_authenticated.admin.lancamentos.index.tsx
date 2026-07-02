import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminListarLancamentos, adminExcluirLancamento } from "@/lib/api/lancamentos.functions";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/lancamentos/")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "lancamentos"],
    queryFn: () => adminListarLancamentos(),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => adminExcluirLancamento({ data: { id } }),
    onSuccess: () => {
      toast.success("Empreendimento excluído");
      qc.invalidateQueries({ queryKey: ["admin", "lancamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <AdminPageHeader
            eyebrow="CRM"
            title="Lançamentos"
          />
<p className="text-sm text-muted-foreground mt-1">{data?.length ?? 0} empreendimentos</p>
        </div>
        <Button asChild>
          <Link to="/admin/lancamentos/novo"><Plus className="size-4 mr-1" /> Novo lançamento</Link>
        </Button>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Construtora</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum empreendimento cadastrado.</TableCell></TableRow>
            )}
            {data?.map((p) => {
              const status = p.status as { nome?: string } | null;
              const corretor = p.corretor as { nome?: string } | null;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{p.construtora ?? "—"}</TableCell>
                  <TableCell>{status?.nome ?? "—"}</TableCell>
                  <TableCell>{p.entrega ? String(p.entrega).slice(0, 7).split("-").reverse().join("/") : "—"}</TableCell>
                  <TableCell>{corretor?.nome ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded ${p.publicado ? "bg-green-100 text-green-700" : "bg-secondary"}`}>
                      {p.publicado ? "Sim" : "Rascunho"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {p.publicado && (
                        <Button asChild size="icon" variant="ghost" title="Ver no site">
                          <a href={`/lancamentos/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a>
                        </Button>
                      )}
                      <Button asChild size="icon" variant="ghost" title="Editar">
                        <Link to="/admin/lancamentos/$id" params={{ id: p.id }}><Pencil className="size-4" /></Link>
                      </Button>
                      <Button size="icon" variant="ghost" title="Excluir"
                        onClick={() => { if (confirm(`Excluir "${p.nome}"?`)) excluir.mutate(p.id); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
