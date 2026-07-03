// BlockEditor — editor de blocos reutilizável, agnóstico à entidade (Bloco 3 §7).
// Extraído de /admin/paginas/$id.tsx para viver dentro do ContentWorkspace.
import type { CmsBlock } from "@/adapters/cms-legacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { useContentSession } from "../session";

const BLOCK_TYPES: Array<{ type: CmsBlock["type"]; label: string; template: CmsBlock["data"] }> = [
  { type: "hero", label: "Hero", template: { titulo: "Novo hero", subtitulo: "Subtítulo", altura: "md" } },
  { type: "richtext", label: "Texto", template: { html: "<p>Escreva aqui...</p>", align: "left" } },
  { type: "image", label: "Imagem", template: { url: "", alt: "" } },
  { type: "gallery", label: "Galeria", template: { imagens: [], colunas: 3 } },
  { type: "video", label: "Vídeo", template: { embed_url: "" } },
  { type: "cta", label: "CTA", template: { titulo: "Fale conosco", botao_label: "Contato", botao_href: "/contato" } },
  { type: "form", label: "Formulário", template: { form_slug: "" } },
  { type: "features", label: "Diferenciais", template: { titulo: "Diferenciais", itens: [{ titulo: "Item 1" }] } },
  { type: "faq", label: "FAQ", template: { titulo: "Perguntas", itens: [{ pergunta: "?", resposta: "!" }] } },
  { type: "spacer", label: "Espaçador", template: { altura: "md" } },
];

export function BlockEditor() {
  const { draft, updateBlocks, descriptor } = useContentSession();
  const supported = new Set(descriptor.supportedBlocks);
  const palette = BLOCK_TYPES.filter((b) => supported.has(b.type));
  const blocks = draft.blocks;

  function add(type: CmsBlock["type"]) {
    const tpl = palette.find((b) => b.type === type) ?? BLOCK_TYPES.find((b) => b.type === type)!;
    const nb = { id: crypto.randomUUID(), type, data: JSON.parse(JSON.stringify(tpl.template)) } as CmsBlock;
    updateBlocks([...blocks, nb]);
  }
  function upd(idx: number, data: CmsBlock["data"]) {
    updateBlocks(blocks.map((b, i) => (i === idx ? ({ ...b, data } as CmsBlock) : b)));
  }
  function move(idx: number, dir: -1 | 1) {
    const arr = [...blocks];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    updateBlocks(arr);
  }
  function remove(idx: number) {
    updateBlocks(blocks.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-foreground/10 bg-muted/30">
        <span className="text-xs text-muted-foreground self-center mr-1">Inserir bloco:</span>
        {palette.map((b) => (
          <Button key={b.type} size="sm" variant="outline" className="h-7" onClick={() => add(b.type)}>
            <Plus className="size-3 mr-1" />{b.label}
          </Button>
        ))}
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-md">
          Nenhum bloco. Use a barra acima para começar.
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((b, i) => (
            <div key={b.id} className="rounded-md border border-foreground/10 bg-card">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-foreground/5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase tracking-wide">{b.type}</span>
                  <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                </div>
                <div className="flex gap-0.5">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><ArrowDown className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => remove(i)}><Trash2 className="size-3.5 text-destructive" /></Button>
                </div>
              </div>
              <div className="p-3">
                <BlockDataEditor block={b} onChange={(d) => upd(i, d)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockDataEditor({ block, onChange }: { block: CmsBlock; onChange: (d: CmsBlock["data"]) => void }) {
  const d = block.data as Record<string, unknown>;
  const set = (patch: Record<string, unknown>) => onChange({ ...d, ...patch } as CmsBlock["data"]);
  switch (block.type) {
    case "hero":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          <Textarea value={(d.html as string) ?? ""} onChange={(e) => set({ html: e.target.value })} rows={6} placeholder="HTML permitido (<p>, <h2>, <strong>, <a>, <ul>...)" />
          <Select value={(d.align as string) ?? "left"} onValueChange={(v) => set({ align: v })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "image":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="URL da imagem" value={(d.url as string) ?? ""} onChange={(e) => set({ url: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="Alt" value={(d.alt as string) ?? ""} onChange={(e) => set({ alt: e.target.value })} />
          <Input placeholder="Legenda" value={(d.legenda as string) ?? ""} onChange={(e) => set({ legenda: e.target.value })} />
        </div>
      );
    case "gallery": {
      const imagens = (d.imagens as Array<{ url: string; alt?: string }>) ?? [];
      return (
        <div className="space-y-2">
          <Select value={String(d.colunas ?? 3)} onValueChange={(v) => set({ colunas: Number(v) })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="URL de embed (YouTube/Vimeo)" value={(d.embed_url as string) ?? ""} onChange={(e) => set({ embed_url: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="Título" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
        </div>
      );
    case "cta":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Título" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} className="sm:col-span-2" />
          <Textarea placeholder="Descrição" value={(d.descricao as string) ?? ""} onChange={(e) => set({ descricao: e.target.value })} rows={2} className="sm:col-span-2" />
          <Input placeholder="Botão (texto)" value={(d.botao_label as string) ?? ""} onChange={(e) => set({ botao_label: e.target.value })} />
          <Input placeholder="Botão (link)" value={(d.botao_href as string) ?? ""} onChange={(e) => set({ botao_href: e.target.value })} />
        </div>
      );
    case "form":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Slug do formulário" value={(d.form_slug as string) ?? ""} onChange={(e) => set({ form_slug: e.target.value })} />
          <Input placeholder="Título" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
        </div>
      );
    case "features": {
      const itens = (d.itens as Array<{ titulo: string; descricao?: string; icone?: string }>) ?? [];
      return (
        <div className="space-y-2">
          <Input placeholder="Título da seção" value={(d.titulo as string) ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
          {itens.map((it, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_2fr_auto] gap-2 items-start">
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
            <div key={i} className="space-y-1.5 border rounded p-2">
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
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
