import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { adminSalvarPost, adminListarCategorias } from "@/lib/api/blog.functions";
import { adminListarCorretores } from "@/lib/api/admin.functions";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Post = any;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function PostForm({ initial }: { initial?: Post }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ["admin", "blog-cats"], queryFn: () => adminListarCategorias() });
  const { data: corretores } = useQuery({ queryKey: ["admin", "corretores"], queryFn: () => adminListarCorretores() });

  const [form, setForm] = useState<Post>(
    initial ?? {
      titulo: "",
      slug: "",
      resumo: "",
      conteudo: "",
      imagem_capa: "",
      categoria_id: null,
      autor_id: null,
      status: "rascunho",
      meta_title: "",
      meta_description: "",
    },
  );

  useEffect(() => { if (initial) setForm(initial); }, [initial]);

  const salvar = useMutation({
    mutationFn: (p: Post) => adminSalvarPost({ data: p }),
    onSuccess: (res) => {
      toast.success("Post salvo");
      qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] });
      if (!form.id && res.id) navigate({ to: "/admin/blog/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    salvar.mutate({
      ...form,
      categoria_id: form.categoria_id || null,
      autor_id: form.autor_id || null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-1">
          <Label>Título *</Label>
          <Input
            required
            value={form.titulo}
            onChange={(e) => {
              const titulo = e.target.value;
              setForm((f: Post) => ({ ...f, titulo, slug: f.slug || slugify(titulo) }));
            }}
          />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="publicado">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Slug *</Label>
          <Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={form.categoria_id ?? "none"} onValueChange={(v) => setForm({ ...form, categoria_id: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhuma —</SelectItem>
              {cats?.map((c: Post) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Autor</Label>
          <Select value={form.autor_id ?? "none"} onValueChange={(v) => setForm({ ...form, autor_id: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhum —</SelectItem>
              {corretores?.map((c: Post) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Imagem de capa (URL)</Label>
        <Input value={form.imagem_capa ?? ""} onChange={(e) => setForm({ ...form, imagem_capa: e.target.value })} />
      </div>

      <div className="space-y-1">
        <Label>Resumo</Label>
        <Textarea rows={2} value={form.resumo ?? ""} onChange={(e) => setForm({ ...form, resumo: e.target.value })} />
      </div>

      <div className="space-y-1">
        <Label>Conteúdo *</Label>
        <RichTextEditor value={form.conteudo ?? ""} onChange={(html) => setForm((f: Post) => ({ ...f, conteudo: html }))} />
      </div>

      <div className="border-t border-foreground/5 pt-6 space-y-4">
        <h2 className="font-display text-xl">SEO</h2>
        <div className="space-y-1">
          <Label>Meta Title <span className="text-xs text-muted-foreground">(até 60 caracteres)</span></Label>
          <Input maxLength={70} value={form.meta_title ?? ""} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Meta Description <span className="text-xs text-muted-foreground">(até 160 caracteres)</span></Label>
          <Textarea rows={2} maxLength={180} value={form.meta_description ?? ""} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? "Salvando..." : "Salvar"}</Button>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/blog" })}>Cancelar</Button>
      </div>
    </form>
  );
}
