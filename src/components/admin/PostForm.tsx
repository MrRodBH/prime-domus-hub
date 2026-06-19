import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { adminSalvarPost, adminListarCategorias, adminGerarResumoPost, adminGerarSeoPost, adminImportarPdf } from "@/lib/api/blog.functions";
import { adminListarCorretores, adminAssinarUrl } from "@/lib/api/admin.functions";
import { supabase } from "@/integrations/supabase/client";
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
import { Sparkles, Upload, Loader2, X, FileText } from "lucide-react";

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

  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);

  async function handleImportPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF muito grande (máx. 10 MB).");
      if (pdfRef.current) pdfRef.current.value = "";
      return;
    }
    setImportingPdf(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const pdfBase64 = btoa(bin);
      const res = await adminImportarPdf({ data: { pdfBase64, nomeArquivo: file.name } });
      setForm((f: Post) => ({
        ...f,
        titulo: f.titulo || res.titulo,
        slug: f.slug || slugify(res.titulo),
        resumo: f.resumo || res.resumo,
        meta_title: f.meta_title || res.meta_title,
        meta_description: f.meta_description || res.meta_description,
        conteudo: res.conteudo,
      }));
      toast.success("PDF importado com sucesso");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImportingPdf(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  }

  async function handleUploadCapa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const sanitized = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `blog/${crypto.randomUUID().slice(0, 8)}-${sanitized}`;
      const { error: upErr } = await supabase.storage.from("site").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path, width: 1600, quality: 80 } });
      setForm((f: Post) => ({ ...f, imagem_capa: url }));
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const gerarResumo = useMutation({
    mutationFn: () => adminGerarResumoPost({ data: { conteudo: form.conteudo || "", titulo: form.titulo || "" } }),
    onSuccess: (res) => {
      setForm((f: Post) => ({ ...f, resumo: res.resumo }));
      toast.success("Resumo gerado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gerarSeo = useMutation({
    mutationFn: () => adminGerarSeoPost({ data: { conteudo: form.conteudo || "", titulo: form.titulo || "" } }),
    onSuccess: (res) => {
      setForm((f: Post) => ({ ...f, meta_title: res.meta_title, meta_description: res.meta_description }));
      toast.success("Meta tags geradas");
    },
    onError: (e: Error) => toast.error(e.message),
  });


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

      <div className="space-y-2">
        <Label>Imagem de capa</Label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadCapa}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Upload className="size-4 mr-1" />}
            {uploading ? "Enviando..." : "Enviar do computador"}
          </Button>
          {form.imagem_capa && (
            <>
              <img src={form.imagem_capa} alt="Capa" className="h-16 w-24 object-cover rounded border border-foreground/10" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, imagem_capa: "" })}>
                <X className="size-4 mr-1" /> Remover
              </Button>
            </>
          )}
        </div>
        <Input
          placeholder="Ou cole uma URL"
          value={form.imagem_capa ?? ""}
          onChange={(e) => setForm({ ...form, imagem_capa: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Resumo</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={gerarResumo.isPending || !form.conteudo || form.conteudo.replace(/<[^>]+>/g, "").trim().length < 20}
            onClick={() => gerarResumo.mutate()}
          >
            {gerarResumo.isPending ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
            Gerar com IA
          </Button>
        </div>
        <Textarea rows={3} value={form.resumo ?? ""} onChange={(e) => setForm({ ...form, resumo: e.target.value })} />
      </div>


      <div className="space-y-1">
        <Label>Conteúdo *</Label>
        <RichTextEditor value={form.conteudo ?? ""} onChange={(html) => setForm((f: Post) => ({ ...f, conteudo: html }))} />
      </div>

      <div className="border-t border-foreground/5 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">SEO</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={gerarSeo.isPending || !form.conteudo || form.conteudo.replace(/<[^>]+>/g, "").trim().length < 20}
            onClick={() => gerarSeo.mutate()}
          >
            {gerarSeo.isPending ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
            Gerar com IA
          </Button>
        </div>
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
