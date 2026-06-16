import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListarPosts,
  adminExcluirPost,
  adminListarCategorias,
  adminSalvarCategoria,
  adminExcluirCategoria,
} from "@/lib/api/blog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  component: AdminBlog,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cat = any;

function AdminBlog() {
  const qc = useQueryClient();
  const { data: posts } = useQuery({ queryKey: ["admin", "blog-posts"], queryFn: () => adminListarPosts() });
  const { data: cats } = useQuery({ queryKey: ["admin", "blog-cats"], queryFn: () => adminListarCategorias() });

  const excluirPost = useMutation({
    mutationFn: (id: string) => adminExcluirPost({ data: { id } }),
    onSuccess: () => { toast.success("Post excluído"); qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [openCat, setOpenCat] = useState(false);
  const salvarCat = useMutation({
    mutationFn: (c: Cat) => adminSalvarCategoria({ data: c }),
    onSuccess: () => { toast.success("Categoria salva"); qc.invalidateQueries({ queryKey: ["admin", "blog-cats"] }); setOpenCat(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const excluirCat = useMutation({
    mutationFn: (id: string) => adminExcluirCategoria({ data: { id } }),
    onSuccess: () => { toast.success("Categoria removida"); qc.invalidateQueries({ queryKey: ["admin", "blog-cats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Blog</h1>
        <Link to="/admin/blog/novo">
          <Button><Plus className="size-4 mr-1" /> Novo post</Button>
        </Link>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="cats">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts?.map((p: Cat) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.titulo}</TableCell>
                    <TableCell>{p.categoria?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "publicado" ? "default" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Link to="/admin/blog/$id" params={{ id: p.id }}>
                        <Button size="icon" variant="ghost"><Pencil className="size-4" /></Button>
                      </Link>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir post?")) excluirPost.mutate(p.id); }}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!posts?.length && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum post ainda.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cats" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={openCat} onOpenChange={setOpenCat}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingCat({ nome: "", slug: "", descricao: "", ordem: 0 })}>
                  <Plus className="size-4 mr-1" /> Nova categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingCat?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
                {editingCat && (
                  <form onSubmit={(e) => { e.preventDefault(); salvarCat.mutate(editingCat); }} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Nome *</Label><Input required value={editingCat.nome} onChange={(e) => setEditingCat({ ...editingCat, nome: e.target.value })} /></div>
                      <div><Label>Slug *</Label><Input required value={editingCat.slug} onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })} /></div>
                    </div>
                    <div><Label>Descrição</Label><Textarea value={editingCat.descricao ?? ""} onChange={(e) => setEditingCat({ ...editingCat, descricao: e.target.value })} /></div>
                    <div><Label>Ordem</Label><Input type="number" value={editingCat.ordem} onChange={(e) => setEditingCat({ ...editingCat, ordem: Number(e.target.value) })} /></div>
                    <Button type="submit">Salvar</Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>Ordem</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {cats?.map((c: Cat) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                    <TableCell>{c.ordem}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingCat(c); setOpenCat(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) excluirCat.mutate(c.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!cats?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma categoria.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
