import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarFormulariosAdmin, excluirFormulario } from "@/lib/api/forms.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Edit2, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/formularios/")({
  component: FormulariosListPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

function FormulariosListPage() {
  const qc = useQueryClient();
  const listarFn = useServerFn(listarFormulariosAdmin);
  const excluirFn = useServerFn(excluirFormulario);
  const { data, isLoading } = useQuery({
    queryKey: ["forms-admin"],
    queryFn: () => listarFn(),
  });
  const excluir = useMutation({
    mutationFn: (id: string) => excluirFn({ data: { id } }),
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["forms-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Formulários</h1>
          <p className="text-sm text-muted-foreground">Crie formulários customizados com destino para leads, e-mail ou webhook.</p>
        </div>
        <Link to="/admin/formularios/novo"><Button><Plus className="size-4 mr-2" />Novo formulário</Button></Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          Nenhum formulário criado ainda.
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <button
                      onClick={() => { navigator.clipboard.writeText(f.slug); toast.success("Slug copiado"); }}
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      {f.slug} <Copy className="size-3" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.status === "published" ? "default" : f.status === "draft" ? "secondary" : "outline"}>
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(f.updated_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Link to="/admin/formularios/$id" params={{ id: f.id }}>
                      <Button size="sm" variant="ghost"><Edit2 className="size-3.5" /></Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { if (confirm(`Excluir "${f.nome}"? Submissões serão apagadas.`)) excluir.mutate(f.id); }}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
