import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListarImoveis, adminExcluirImovel } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/imoveis")({
  component: AdminImoveis,
});

function AdminImoveis() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "imoveis"], queryFn: () => adminListarImoveis() });

  const excluir = useMutation({
    mutationFn: (id: string) => adminExcluirImovel({ data: { id } }),
    onSuccess: () => {
      toast.success("Imóvel excluído");
      qc.invalidateQueries({ queryKey: ["admin", "imoveis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Imóveis</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.length ?? 0} cadastrados</p>
        </div>
        <Button asChild>
          <Link to="/admin/imoveis/novo"><Plus className="size-4 mr-1" /> Novo imóvel</Link>
        </Button>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {data?.map((im) => (
              <TableRow key={im.id}>
                <TableCell className="font-mono text-xs">{im.codigo}</TableCell>
                <TableCell className="font-medium">{im.titulo}</TableCell>
                <TableCell>{(im.bairro as { nome?: string } | null)?.nome ?? "—"}</TableCell>
                <TableCell className="capitalize">{im.tipo}</TableCell>
                <TableCell><span className="text-xs px-2 py-0.5 rounded bg-secondary">{im.status}</span></TableCell>
                <TableCell>{im.preco ? `R$ ${im.preco.toLocaleString("pt-BR")}` : "—"}</TableCell>
                <TableCell className="flex gap-1">
                  <Button asChild size="icon" variant="ghost"><Link to="/admin/imoveis/$id" params={{ id: im.id }}><Pencil className="size-4" /></Link></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir "${im.titulo}"?`)) excluir.mutate(im.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum imóvel cadastrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
