// Tela de Blog aprovada da RM Prime, alimentada pelas funções de blog do tenant.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PainelLayout } from "@/components/painel-rm/PainelLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminExcluirPost, adminListarPosts, adminObterPost, adminSalvarPost } from "@/lib/api/blog.functions";

function slugify(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
}
function dataBr(v: string | null | undefined) {
  return v ? new Date(v).toLocaleDateString("pt-BR") : "—";
}

type Form = { id?: string; titulo: string; slug: string; resumo: string; conteudo: string; publicado: boolean };
const vazio: Form = { titulo: "", slug: "", resumo: "", conteudo: "", publicado: false };

export function BlogPage() {
  const listar = useServerFn(adminListarPosts);
  const obter = useServerFn(adminObterPost);
  const salvar = useServerFn(adminSalvarPost);
  const excluir = useServerFn(adminExcluirPost);
  const qc = useQueryClient();
  const { data: posts = [], isLoading } = useQuery({ queryKey: ["painel", "blog"], queryFn: () => listar() });
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(vazio);
  const [carregando, setCarregando] = useState(false);
  const invalidar = () => qc.invalidateQueries({ queryKey: ["painel", "blog"] });

  const salvarM = useMutation({
    mutationFn: salvar,
    onSuccess: () => { toast.success("Post salvo."); setAberto(false); void invalidar(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });
  const excluirM = useMutation({
    mutationFn: excluir,
    onSuccess: () => { toast.success("Post excluído."); void invalidar(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível excluir."),
  });

  async function abrirEdicao(id: string) {
    setCarregando(true);
    try {
      const p = await obter({ data: { id } });
      if (!p) return toast.error("Post não encontrado.");
      setForm({ id: p.id, titulo: p.titulo ?? "", slug: p.slug ?? "", resumo: p.resumo ?? "", conteudo: p.conteudo ?? "", publicado: p.status === "publicado" });
      setAberto(true);
    } finally { setCarregando(false); }
  }

  function aoSalvar(e: React.FormEvent) {
    e.preventDefault();
    salvarM.mutate({ data: { id: form.id, titulo: form.titulo, slug: slugify(form.slug || form.titulo), resumo: form.resumo || null, conteudo: form.conteudo, status: form.publicado ? "publicado" : "rascunho" } });
  }

  return (
    <PainelLayout
      titulo="Blog"
      descricao="Escreva e gerencie os artigos publicados no site."
      acoes={<Button onClick={() => { setForm(vazio); setAberto(true); }}><Plus className="mr-2 h-4 w-4" />Novo post</Button>}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando posts…</p>
      ) : posts.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum post ainda. Clique em “Novo post” para escrever o primeiro.</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Criado em</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {posts.map((p) => {
                const pub = p.status === "publicado";
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">{p.titulo}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{dataBr(p.publicado_em ?? p.updated_at)}</td>
                    <td className="px-4 py-3">
                      <span className={pub ? "rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground" : "rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"}>
                        {pub ? "Publicado" : "Rascunho"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {pub ? (
                          <Button variant="ghost" size="icon" asChild title="Abrir no site">
                            <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" title="Editar" disabled={carregando} onClick={() => void abrirEdicao(p.id)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Excluir" onClick={() => { if (window.confirm(`Excluir o post “${p.titulo}”?`)) excluirM.mutate({ data: { id: p.id } }); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar post" : "Novo post"}</DialogTitle></DialogHeader>
          <form onSubmit={aoSalvar} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="bt">Título</Label>
              <Input id="bt" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} /></div>
            <div className="space-y-2"><Label htmlFor="bs">Endereço (slug)</Label>
              <Input id="bs" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="br">Resumo</Label>
              <Textarea id="br" rows={3} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="bc">Conteúdo</Label>
              <Textarea id="bc" rows={14} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch id="bp" checked={form.publicado} onCheckedChange={(v) => setForm({ ...form, publicado: v })} /><Label htmlFor="bp">Publicado</Label></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvarM.isPending}>{salvarM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PainelLayout>
  );
}
