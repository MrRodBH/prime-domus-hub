import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarPaginas, excluirPagina } from "@/lib/api/pages.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Edit2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/paginas/")({
  component: PaginasListPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

function PaginasListPage() {
  const qc = useQueryClient();
  const listarFn = useServerFn(listarPaginas);
  const excluirFn = useServerFn(excluirPagina);
  const { data, isLoading } = useQuery({ queryKey: ["pages-admin"], queryFn: () => listarFn() });
  const excluir = useMutation({
    mutationFn: (id: string) => excluirFn({ data: { id } }),
    onSuccess: () => { toast.success("Página excluída"); qc.invalidateQueries({ queryKey: ["pages-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Páginas</h1>
          <p className="text-sm text-muted-foreground">Landing pages, institucionais e campanhas montadas em blocos.</p>
        </div>
        <Link to="/admin/paginas/$id" params={{ id: "novo" }}><Button><Plus className="size-4 mr-2" />Nova página</Button></Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          Nenhuma página criada ainda.
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.titulo}</TableCell>
                  <TableCell className="font-mono text-xs">/p/{p.slug}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "published" ? "default" : p.status === "draft" ? "secondary" : "outline"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {p.status === "published" && (
                      <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost"><ExternalLink className="size-3.5" /></Button>
                      </a>
                    )}
                    <Link to="/admin/paginas/$id" params={{ id: p.id }}>
                      <Button size="sm" variant="ghost"><Edit2 className="size-3.5" /></Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Excluir "${p.titulo}"?`)) excluir.mutate(p.id); }}>
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
