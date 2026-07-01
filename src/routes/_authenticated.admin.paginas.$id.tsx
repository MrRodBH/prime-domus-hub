import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obterPaginaAdmin, salvarPagina, type CmsBlock } from "@/lib/api/pages.functions";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { CmsPageRenderer } from "@/components/site/CmsPageRenderer";

export const Route = createFileRoute("/_authenticated/admin/paginas/$id")({
  component: PaginaEditor,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

const BLOCK_TYPES: Array<{ type: CmsBlock["type"]; label: string; template: CmsBlock["data"] }> = [
  { type: "hero", label: "Hero", template: { titulo: "Novo hero", subtitulo: "Subtítulo", altura: "md" } },
  { type: "richtext", label: "Texto rico", template: { html: "<p>Escreva aqui...</p>", align: "left" } },
  { type: "image", label: "Imagem", template: { url: "", alt: "" } },
  { type: "gallery", label: "Galeria", template: { imagens: [], colunas: 3 } },
  { type: "video", label: "Vídeo (embed)", template: { embed_url: "" } },
  { type: "cta", label: "Chamada (CTA)", template: { titulo: "Fale conosco", botao_label: "Contato", botao_href: "/contato" } },
  { type: "form", label: "Formulário", template: { form_slug: "" } },
  { type: "features", label: "Diferenciais", template: { titulo: "Diferenciais", itens: [{ titulo: "Item 1" }] } },
  { type: "faq", label: "FAQ", template: { titulo: "Perguntas frequentes", itens: [{ pergunta: "?", resposta: "!" }] } },
  { type: "spacer", label: "Espaçador", template: { altura: "md" } },
];

function PaginaEditor() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const obterFn = useServerFn(obterPaginaAdmin);
  const salvarFn = useServerFn(salvarPagina);

  const { data: loaded } = useQuery({
    queryKey: ["page-admin", id],
    queryFn: () => obterFn({ data: { id } }),
    enabled: !isNew,
  });

  const [slug, setSlug] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [seo, setSeo] = useState<{ meta_title?: string; meta_description?: string; og_image?: string; canonical?: string; noindex?: boolean }>({});
  const [blocks, setBlocks] = useState<CmsBlock[]>([]);

  useEffect(() => {
    if (loaded) {
      setSlug(loaded.slug);
      setTitulo(loaded.titulo);
      setDescricao(loaded.descricao ?? "");
      setStatus(loaded.status as typeof status);
      setSeo((loaded.seo ?? {}) as typeof seo);
      setBlocks(((loaded.blocks ?? []) as CmsBlock[]));
    }
  }, [loaded]);

  const salvar = useMutation({
    mutationFn: () => salvarFn({
      data: {
        id: isNew ? undefined : id,
        slug: slug.trim(),
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        status,
        seo,
        blocks,
      },
    }),
    onSuccess: (row) => {
      toast.success("Página salva");
      qc.invalidateQueries({ queryKey: ["pages-admin"] });
      qc.invalidateQueries({ queryKey: ["cms-page"] });
      if (isNew && row?.id) navigate({ to: "/admin/paginas/$id", params: { id: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addBlock(type: CmsBlock["type"]) {
    const tpl = BLOCK_TYPES.find((b) => b.type === type)!;
    const nb = { id: crypto.randomUUID(), type, data: JSON.parse(JSON.stringify(tpl.template)) } as CmsBlock;
    setBlocks((prev) => [...prev, nb]);
  }
  function updateBlock(idx: number, data: CmsBlock["data"]) {
    setBlocks((prev) => prev.map((b, i) => i === idx ? ({ ...b, data } as CmsBlock) : b));
  }
  function moveBlock(idx: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const arr = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= arr.length) return arr;
      [arr[idx], arr[t]] = [arr[t], arr[idx]];
      return arr;
    });
  }
  function removeBlock(idx: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  const previewBlocks = useMemo(() => blocks, [blocks]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">{isNew ? "Nova página" : titulo || "Página"}</h1>
          <p className="text-sm text-muted-foreground">URL pública: <span className="font-mono">/p/{slug || "…"}</span></p>
        </div>
        <div className="flex gap-2">
          {!isNew && slug && status === "published" && (
            <a href={`/p/${slug}`} target="_blank" rel="noreferrer">
              <Button variant="outline"><Eye className="size-4 mr-2" />Ver publicada</Button>
            </a>
          )}
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending || !slug || !titulo}>
            {salvar.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </header>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="blocos">Blocos ({blocks.length})</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="minha-pagina" />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição interna</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicada</SelectItem>
                  <SelectItem value="archived">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="blocos" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground self-center mr-2">Adicionar:</span>
            {BLOCK_TYPES.map((b) => (
              <Button key={b.type} size="sm" variant="outline" onClick={() => addBlock(b.type)}>
                <Plus className="size-3 mr-1" />{b.label}
              </Button>
            ))}
          </div>

          {blocks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
              Nenhum bloco. Use os botões acima para começar.
            </div>
          ) : (
            <div className="space-y-3">
              {blocks.map((b, i) => (
                <Card key={b.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase">{b.type}</span>
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => moveBlock(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}><ArrowDown className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBlock(i)}><Trash2 className="size-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                    <BlockDataEditor block={b} onChange={(d) => updateBlock(i, d)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 pt-4 max-w-2xl">
          <div>
            <Label>Meta title <span className="text-xs text-muted-foreground">({(seo.meta_title ?? "").length}/60)</span></Label>
            <Input value={seo.meta_title ?? ""} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} maxLength={70} />
          </div>
          <div>
            <Label>Meta description <span className="text-xs text-muted-foreground">({(seo.meta_description ?? "").length}/160)</span></Label>
            <Textarea value={seo.meta_description ?? ""} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} maxLength={180} rows={2} />
          </div>
          <div>
            <Label>Imagem OG (URL absoluta https)</Label>
            <Input value={seo.og_image ?? ""} onChange={(e) => setSeo({ ...seo, og_image: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label>Canonical URL (opcional)</Label>
            <Input value={seo.canonical ?? ""} onChange={(e) => setSeo({ ...seo, canonical: e.target.value })} />
          </div>
          <label className="flex items-center gap-3">
            <Switch checked={!!seo.noindex} onCheckedChange={(v) => setSeo({ ...seo, noindex: v })} />
            <span className="text-sm">Bloquear indexação (noindex)</span>
          </label>
        </TabsContent>

        <TabsContent value="preview" className="pt-4">
          <div className="border rounded-lg overflow-hidden bg-background">
            <CmsPageRenderer blocks={previewBlocks} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Editor específico de cada bloco
// ============================================================================
function BlockDataEditor({ block, onChange }: { block: CmsBlock; onChange: (d: CmsBlock["data"]) => void }) {
  const d = block.data as Record<string, unknown>;
  const set = (patch: Record<string, unknown>) => onChange({ ...d, ...patch } as CmsBlock["data"]);

  switch (block.type) {
    case "hero":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Eyebrow" value={(d.eyebrow as string) ?? ""} onChange={(e) => set({ eyebrow: e.target.value })} />
          <Input placeholder="Título *" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
          <Textarea placeholder="Subtítulo" value={(d.subtitulo as string) ?? ""} onChange={(e) => set({ subtitulo: e.target.value })} rows={2} className="sm:col-span-2" />
          <Input placeholder="URL da imagem de fundo" value={(d.imagem_url as string) ?? ""} onChange={(e) => set({ imagem_url: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="Botão (texto)" value={(d.cta_label as string) ?? ""} onChange={(e) => set({ cta_label: e.target.value })} />
          <Input placeholder="Botão (link)" value={(d.cta_href as string) ?? ""} onChange={(e) => set({ cta_href: e.target.value })} />
          <Select value={(d.altura as string) ?? "md"} onValueChange={(v) => set({ altura: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Altura pequena</SelectItem>
              <SelectItem value="md">Altura média</SelectItem>
              <SelectItem value="lg">Altura grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "richtext":
      return (
        <div className="space-y-2">
          <Textarea value={(d.html as string) ?? ""} onChange={(e) => set({ html: e.target.value })} rows={8} placeholder="HTML permitido (<p>, <h2>, <strong>, <a>, <ul>...)" />
          <Select value={(d.align as string) ?? "left"} onValueChange={(v) => set({ align: v })}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Alinhar à esquerda</SelectItem>
              <SelectItem value="center">Centralizar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "image":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="URL da imagem" value={(d.url as string) ?? ""} onChange={(e) => set({ url: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="Alt (acessibilidade)" value={(d.alt as string) ?? ""} onChange={(e) => set({ alt: e.target.value })} />
          <Input placeholder="Legenda" value={(d.legenda as string) ?? ""} onChange={(e) => set({ legenda: e.target.value })} />
        </div>
      );
    case "gallery": {
      const imagens = (d.imagens as Array<{ url: string; alt?: string }>) ?? [];
      return (
        <div className="space-y-2">
          <Select value={String(d.colunas ?? 3)} onValueChange={(v) => set({ colunas: Number(v) })}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 colunas</SelectItem>
              <SelectItem value="3">3 colunas</SelectItem>
              <SelectItem value="4">4 colunas</SelectItem>
            </SelectContent>
          </Select>
          {imagens.map((im, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="URL" value={im.url} onChange={(e) => { const c = [...imagens]; c[i] = { ...c[i], url: e.target.value }; set({ imagens: c }); }} />
              <Input placeholder="Alt" value={im.alt ?? ""} onChange={(e) => { const c = [...imagens]; c[i] = { ...c[i], alt: e.target.value }; set({ imagens: c }); }} />
              <Button size="sm" variant="ghost" onClick={() => set({ imagens: imagens.filter((_, j) => j !== i) })}><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ imagens: [...imagens, { url: "", alt: "" }] })}><Plus className="size-3 mr-1" />Imagem</Button>
        </div>
      );
    }
    case "video":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="URL de embed (YouTube/Vimeo)" value={(d.embed_url as string) ?? ""} onChange={(e) => set({ embed_url: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="Título opcional" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
        </div>
      );
    case "cta":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Título" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} className="sm:col-span-2" />
          <Textarea placeholder="Descrição" value={(d.descricao as string) ?? ""} onChange={(e) => set({ descricao: e.target.value })} rows={2} className="sm:col-span-2" />
          <Input placeholder="Botão (texto)" value={(d.botao_label as string) ?? ""} onChange={(e) => set({ botao_label: e.target.value })} />
          <Input placeholder="Botão (link)" value={(d.botao_href as string) ?? ""} onChange={(e) => set({ botao_href: e.target.value })} />
          <Select value={(d.variante as string) ?? "default"} onValueChange={(v) => set({ variante: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Preenchido</SelectItem>
              <SelectItem value="outline">Contorno</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "form":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Slug do formulário (ex: contato-parcerias)" value={(d.form_slug as string) ?? ""} onChange={(e) => set({ form_slug: e.target.value })} />
          <Input placeholder="Título opcional" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
        </div>
      );
    case "features": {
      const itens = (d.itens as Array<{ titulo: string; descricao?: string; icone?: string }>) ?? [];
      return (
        <div className="space-y-2">
          <Input placeholder="Título da seção" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
          {itens.map((it, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[80px_1fr_2fr_auto] gap-2 items-start">
              <Input placeholder="Ícone" value={it.icone ?? ""} onChange={(e) => { const c = [...itens]; c[i] = { ...c[i], icone: e.target.value }; set({ itens: c }); }} />
              <Input placeholder="Título" value={it.titulo} onChange={(e) => { const c = [...itens]; c[i] = { ...c[i], titulo: e.target.value }; set({ itens: c }); }} />
              <Textarea placeholder="Descrição" value={it.descricao ?? ""} onChange={(e) => { const c = [...itens]; c[i] = { ...c[i], descricao: e.target.value }; set({ itens: c }); }} rows={1} />
              <Button size="sm" variant="ghost" onClick={() => set({ itens: itens.filter((_, j) => j !== i) })}><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ itens: [...itens, { titulo: "", descricao: "" }] })}><Plus className="size-3 mr-1" />Item</Button>
        </div>
      );
    }
    case "faq": {
      const itens = (d.itens as Array<{ pergunta: string; resposta: string }>) ?? [];
      return (
        <div className="space-y-2">
          <Input placeholder="Título da seção" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
          {itens.map((it, i) => (
            <div key={i} className="space-y-2 border rounded p-2">
              <Input placeholder="Pergunta" value={it.pergunta} onChange={(e) => { const c = [...itens]; c[i] = { ...c[i], pergunta: e.target.value }; set({ itens: c }); }} />
              <Textarea placeholder="Resposta" value={it.resposta} onChange={(e) => { const c = [...itens]; c[i] = { ...c[i], resposta: e.target.value }; set({ itens: c }); }} rows={2} />
              <Button size="sm" variant="ghost" onClick={() => set({ itens: itens.filter((_, j) => j !== i) })}><Trash2 className="size-3.5 text-destructive" /> Remover</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ itens: [...itens, { pergunta: "", resposta: "" }] })}><Plus className="size-3 mr-1" />Pergunta</Button>
        </div>
      );
    }
    case "spacer":
      return (
        <Select value={(d.altura as string) ?? "md"} onValueChange={(v) => set({ altura: v })}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Pequeno</SelectItem>
            <SelectItem value="md">Médio</SelectItem>
            <SelectItem value="lg">Grande</SelectItem>
            <SelectItem value="xl">Extra grande</SelectItem>
          </SelectContent>
        </Select>
      );
    default:
      return null;
  }
}
