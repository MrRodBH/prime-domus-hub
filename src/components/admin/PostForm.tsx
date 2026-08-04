import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { adminSalvarCategoria, adminListarCategorias } from "@/lib/api/blog.functions";
import { saveTenantBlogPost, signTenantBlogCover } from "@/lib/api/content-media.functions";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, Upload, X, Image as ImageIcon, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Props = {
  initial?: any;
  onSaved: () => void;
  onCancel: () => void;
};

export function PostForm({ initial, onSaved, onCancel }: Props) {
  const queryClient = useQueryClient();
  const objectPreviewRef = useRef<string | null>(null);
  const [form, setForm] = useState({
    id: initial?.id as string | undefined,
    titulo: initial?.titulo ?? "",
    slug: initial?.slug ?? "",
    resumo: initial?.resumo ?? "",
    conteudo: initial?.conteudo ?? "",
    categoria_id: initial?.categoria_id ?? "",
    autor_id: initial?.autor_id ?? "",
    status: (initial?.status ?? "rascunho") as "rascunho" | "publicado",
    meta_title: initial?.meta_title ?? "",
    meta_description: initial?.meta_description ?? "",
  });
  const [coverTargetId, setCoverTargetId] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ nome: "", slug: "" });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-blog-categorias"],
    queryFn: () => adminListarCategorias(),
  });

  useEffect(() => {
    let active = true;
    if (!initial?.id || coverTargetId) return;
    signTenantBlogCover({ data: { postId: initial.id } })
      .then((result) => { if (active) setCoverPreview(result.url); })
      .catch(() => { if (active) setCoverPreview(null); });
    return () => { active = false; };
  }, [initial?.id, coverTargetId]);

  useEffect(() => () => {
    if (objectPreviewRef.current) URL.revokeObjectURL(objectPreviewRef.current);
  }, []);

  const saveMutation = useMutation({
    mutationFn: () => saveTenantBlogPost({
      data: {
        ...form,
        coverUploadTargetId: coverTargetId,
        categoria_id: form.categoria_id || null,
        autor_id: form.autor_id || null,
        resumo: form.resumo || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      },
    }),
    onSuccess: () => {
      toast.success("Post salvo");
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const categoryMutation = useMutation({
    mutationFn: () => adminSalvarCategoria({
      data: {
        nome: newCategory.nome,
        slug: newCategory.slug || slugify(newCategory.nome),
        ordem: categories.length,
      },
    }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-categorias"] });
      setForm((current) => ({ ...current, categoria_id: result.id }));
      setNewCategoryOpen(false);
      setNewCategory({ nome: "", slug: "" });
      toast.success("Categoria criada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function uploadCover(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }
    setUploading(true);
    try {
      const target = await createUploadTarget({
        data: {
          domain: "blog-cover",
          originalFileName: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });
      const { error } = await supabase.storage.from(target.bucket).upload(target.path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      if (objectPreviewRef.current) URL.revokeObjectURL(objectPreviewRef.current);
      objectPreviewRef.current = URL.createObjectURL(file);
      setCoverTargetId(target.targetId);
      setCoverPreview(objectPreviewRef.current);
      toast.success("Imagem enviada. O target será consumido ao salvar o post.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-display">{form.id ? "Editar post" : "Novo post"}</h1>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.titulo || !form.slug}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.titulo} onChange={(event) => setForm((current) => ({
              ...current,
              titulo: event.target.value,
              slug: current.slug || slugify(event.target.value),
            }))} />
          </div>
          <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} /></div>
          <div className="space-y-2"><Label>Resumo</Label><Textarea value={form.resumo} onChange={(event) => setForm((current) => ({ ...current, resumo: event.target.value }))} rows={3} /></div>
          <div className="space-y-2"><Label>Conteúdo</Label><RichTextEditor value={form.conteudo} onChange={(conteudo) => setForm((current) => ({ ...current, conteudo }))} /></div>
          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            Geração por IA e importação automática de PDF não possuem adapter factual nesta etapa. O conteúdo permanece manual e auditável.
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Meta title</Label><Input maxLength={60} value={form.meta_title} onChange={(event) => setForm((current) => ({ ...current, meta_title: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Meta description</Label><Textarea maxLength={160} value={form.meta_description} onChange={(event) => setForm((current) => ({ ...current, meta_description: event.target.value }))} rows={2} /></div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(status: "rascunho" | "publicado") => setForm((current) => ({ ...current, status }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="rascunho">Rascunho</SelectItem><SelectItem value="publicado">Publicado</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Categoria</Label>
              <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
                <DialogTrigger asChild><Button variant="ghost" size="sm"><Plus className="h-3 w-3 mr-1" />Nova</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
                  <div className="space-y-3"><Input placeholder="Nome" value={newCategory.nome} onChange={(event) => setNewCategory((current) => ({ ...current, nome: event.target.value, slug: slugify(event.target.value) }))} /><Input placeholder="slug" value={newCategory.slug} onChange={(event) => setNewCategory((current) => ({ ...current, slug: slugify(event.target.value) }))} /></div>
                  <DialogFooter><Button onClick={() => categoryMutation.mutate()} disabled={!newCategory.nome || categoryMutation.isPending}>Criar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={form.categoria_id} onValueChange={(categoria_id) => setForm((current) => ({ ...current, categoria_id }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{categories.map((category: any) => <SelectItem key={category.id} value={category.id}>{category.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Imagem de capa</Label>
            {coverPreview ? (
              <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
                <img src={coverPreview} className="w-full h-full object-cover" alt="Capa" />
                {coverTargetId && <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setCoverTargetId(null); setCoverPreview(null); }}><X className="h-3 w-3" /></Button>}
              </div>
            ) : (
              <label className="aspect-video border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><ImageIcon className="h-6 w-6 mb-2 text-muted-foreground" /><span className="text-xs text-muted-foreground">Enviar imagem</span></>}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => event.target.files?.[0] && uploadCover(event.target.files[0])} />
              </label>
            )}
            {coverTargetId && <p className="text-[11px] text-muted-foreground"><Upload className="inline h-3 w-3 mr-1" />Target pendente de consumo transacional.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
