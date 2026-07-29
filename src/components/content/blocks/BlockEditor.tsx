// BlockEditor — editor registry-driven do Page Builder PR-M2.
// Referências institucionais usam IDs persistidos; URL/path raw não é autoridade.
import type { CmsBlock } from "@/adapters/cms-legacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { useContentSession } from "../session";

const BLOCK_TYPES: Array<{ type: CmsBlock["type"]; label: string; template: CmsBlock["data"] }> = [
  { type: "hero", label: "Hero", template: { titulo: "Novo hero", subtitulo: "Subtítulo", altura: "md" } },
  { type: "richtext", label: "Texto", template: { format: "sanitized_html_v1", html: "<p>Escreva aqui...</p>", align: "left" } },
  { type: "image", label: "Imagem", template: { media_id: "", alt: "", variant: "medium" } },
  { type: "gallery", label: "Galeria", template: { imagens: [], colunas: 3 } },
  { type: "video", label: "Vídeo", template: { embed_url: "" } },
  { type: "cta", label: "CTA", template: { titulo: "Fale conosco", botao_label: "Contato", botao_href: "/contato" } },
  { type: "form", label: "Formulário", template: { form_id: "" } },
  { type: "features", label: "Diferenciais", template: { titulo: "Diferenciais", itens: [{ titulo: "Item 1" }] } },
  { type: "faq", label: "FAQ", template: { titulo: "Perguntas", itens: [{ pergunta: "?", resposta: "!" }] } },
  { type: "spacer", label: "Espaçador", template: { altura: "md" } },
];

export function BlockEditor() {
  const { draft, updateBlocks, descriptor } = useContentSession();
  const supported = new Set(descriptor.supportedBlocks);
  const palette = BLOCK_TYPES.filter((block) => supported.has(block.type));
  const blocks = draft.blocks;

  function add(type: CmsBlock["type"]) {
    const template = palette.find((block) => block.type === type) ?? BLOCK_TYPES.find((block) => block.type === type)!;
    const next = {
      id: crypto.randomUUID(),
      type,
      data: JSON.parse(JSON.stringify(template.template)),
    } as CmsBlock;
    updateBlocks([...blocks, next]);
  }

  function update(index: number, data: CmsBlock["data"]) {
    updateBlocks(blocks.map((block, current) => current === index ? ({ ...block, data } as CmsBlock) : block));
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateBlocks(next);
  }

  function remove(index: number) {
    updateBlocks(blocks.filter((_, current) => current !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-foreground/10 bg-muted/30">
        <span className="text-xs text-muted-foreground self-center mr-1">Inserir seção catalogada:</span>
        {palette.map((block) => (
          <Button key={block.type} size="sm" variant="outline" className="h-7" onClick={() => add(block.type)}>
            <Plus className="size-3 mr-1" />{block.label}
          </Button>
        ))}
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-md">
          Nenhuma seção. Use a barra acima para começar.
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, index) => (
            <div key={block.id} className="rounded-md border border-foreground/10 bg-card">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-foreground/5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase tracking-wide">{block.type}</span>
                  <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
                </div>
                <div className="flex gap-0.5">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(index, 1)} disabled={index === blocks.length - 1}><ArrowDown className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => remove(index)}><Trash2 className="size-3.5 text-destructive" /></Button>
                </div>
              </div>
              <div className="p-3">
                <BlockDataEditor block={block} onChange={(data) => update(index, data)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockDataEditor({ block, onChange }: { block: CmsBlock; onChange: (data: CmsBlock["data"]) => void }) {
  const data = block.data as Record<string, unknown>;
  const set = (patch: Record<string, unknown>) => onChange({ ...data, ...patch } as CmsBlock["data"]);

  switch (block.type) {
    case "hero":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Eyebrow" value={(data.eyebrow as string) ?? ""} onChange={(event) => set({ eyebrow: event.target.value })} />
          <Input placeholder="Título *" value={(data.titulo as string) ?? ""} onChange={(event) => set({ titulo: event.target.value })} />
          <Textarea placeholder="Subtítulo" value={(data.subtitulo as string) ?? ""} onChange={(event) => set({ subtitulo: event.target.value })} rows={2} className="sm:col-span-2" />
          <Input placeholder="ID da mídia de fundo (media_library.id)" value={(data.media_id as string) ?? ""} onChange={(event) => set({ media_id: event.target.value || undefined })} className="sm:col-span-2" />
          <Input placeholder="Botão (texto)" value={(data.cta_label as string) ?? ""} onChange={(event) => set({ cta_label: event.target.value })} />
          <Input placeholder="Botão (link seguro)" value={(data.cta_href as string) ?? ""} onChange={(event) => set({ cta_href: event.target.value })} />
          <Select value={(data.altura as string) ?? "md"} onValueChange={(value) => set({ altura: value })}>
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
          <Textarea value={(data.html as string) ?? ""} onChange={(event) => set({ format: "sanitized_html_v1", html: event.target.value })} rows={6} placeholder="Rich text sanitizado; scripts, event handlers e URLs inseguras são rejeitados" />
          <Select value={(data.align as string) ?? "left"} onValueChange={(value) => set({ align: value })}>
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
          <Input placeholder="ID da mídia (media_library.id)" value={(data.media_id as string) ?? ""} onChange={(event) => set({ media_id: event.target.value })} className="sm:col-span-2" />
          <Input placeholder="Texto alternativo" value={(data.alt as string) ?? ""} onChange={(event) => set({ alt: event.target.value })} />
          <Input placeholder="Legenda" value={(data.legenda as string) ?? ""} onChange={(event) => set({ legenda: event.target.value })} />
          <Select value={(data.variant as string) ?? "medium"} onValueChange={(value) => set({ variant: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="thumbnail">Thumbnail</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="original">Original</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "gallery": {
      const images = (data.imagens as Array<{ media_id: string; alt?: string; variant?: string }>) ?? [];
      return (
        <div className="space-y-2">
          <Select value={String(data.colunas ?? 3)} onValueChange={(value) => set({ colunas: Number(value) })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 colunas</SelectItem>
              <SelectItem value="3">3 colunas</SelectItem>
              <SelectItem value="4">4 colunas</SelectItem>
            </SelectContent>
          </Select>
          {images.map((image, index) => (
            <div key={`${image.media_id}-${index}`} className="flex gap-2">
              <Input placeholder="media_library.id" value={image.media_id} onChange={(event) => { const copy = [...images]; copy[index] = { ...copy[index], media_id: event.target.value }; set({ imagens: copy }); }} />
              <Input placeholder="Alt" value={image.alt ?? ""} onChange={(event) => { const copy = [...images]; copy[index] = { ...copy[index], alt: event.target.value }; set({ imagens: copy }); }} />
              <Button size="sm" variant="ghost" onClick={() => set({ imagens: images.filter((_, current) => current !== index) })}><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ imagens: [...images, { media_id: "", alt: "", variant: "medium" }] })}><Plus className="size-3 mr-1" />Mídia</Button>
        </div>
      );
    }

    case "video":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="URL HTTPS de embed (YouTube/Vimeo)" value={(data.embed_url as string) ?? ""} onChange={(event) => set({ embed_url: event.target.value })} className="sm:col-span-2" />
          <Input placeholder="Título" value={(data.titulo as string) ?? ""} onChange={(event) => set({ titulo: event.target.value })} />
        </div>
      );

    case "cta":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Título" value={(data.titulo as string) ?? ""} onChange={(event) => set({ titulo: event.target.value })} className="sm:col-span-2" />
          <Textarea placeholder="Descrição" value={(data.descricao as string) ?? ""} onChange={(event) => set({ descricao: event.target.value })} rows={2} className="sm:col-span-2" />
          <Input placeholder="Botão (texto)" value={(data.botao_label as string) ?? ""} onChange={(event) => set({ botao_label: event.target.value })} />
          <Input placeholder="Botão (link seguro)" value={(data.botao_href as string) ?? ""} onChange={(event) => set({ botao_href: event.target.value })} />
        </div>
      );

    case "form":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="ID do formulário publicado (cms_forms.id)" value={(data.form_id as string) ?? ""} onChange={(event) => set({ form_id: event.target.value })} />
          <Input placeholder="Título" value={(data.titulo as string) ?? ""} onChange={(event) => set({ titulo: event.target.value })} />
        </div>
      );

    case "features": {
      const items = (data.itens as Array<{ titulo: string; descricao?: string; icone?: string }>) ?? [];
      return (
        <div className="space-y-2">
          <Input placeholder="Título da seção" value={(data.titulo as string) ?? ""} onChange={(event) => set({ titulo: event.target.value })} />
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[80px_1fr_2fr_auto] gap-2 items-start">
              <Input placeholder="Ícone" value={item.icone ?? ""} onChange={(event) => { const copy = [...items]; copy[index] = { ...copy[index], icone: event.target.value }; set({ itens: copy }); }} />
              <Input placeholder="Título" value={item.titulo} onChange={(event) => { const copy = [...items]; copy[index] = { ...copy[index], titulo: event.target.value }; set({ itens: copy }); }} />
              <Textarea placeholder="Descrição" value={item.descricao ?? ""} onChange={(event) => { const copy = [...items]; copy[index] = { ...copy[index], descricao: event.target.value }; set({ itens: copy }); }} rows={1} />
              <Button size="sm" variant="ghost" onClick={() => set({ itens: items.filter((_, current) => current !== index) })}><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ itens: [...items, { titulo: "", descricao: "" }] })}><Plus className="size-3 mr-1" />Item</Button>
        </div>
      );
    }

    case "faq": {
      const items = (data.itens as Array<{ pergunta: string; resposta: string }>) ?? [];
      return (
        <div className="space-y-2">
          <Input placeholder="Título da seção" value={(data.titulo as string) ?? ""} onChange={(event) => set({ titulo: event.target.value })} />
          {items.map((item, index) => (
            <div key={index} className="space-y-1.5 border rounded p-2">
              <Input placeholder="Pergunta" value={item.pergunta} onChange={(event) => { const copy = [...items]; copy[index] = { ...copy[index], pergunta: event.target.value }; set({ itens: copy }); }} />
              <Textarea placeholder="Resposta sanitizada" value={item.resposta} onChange={(event) => { const copy = [...items]; copy[index] = { ...copy[index], resposta: event.target.value }; set({ itens: copy }); }} rows={2} />
              <Button size="sm" variant="ghost" onClick={() => set({ itens: items.filter((_, current) => current !== index) })}><Trash2 className="size-3.5 text-destructive" /> Remover</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ itens: [...items, { pergunta: "", resposta: "" }] })}><Plus className="size-3 mr-1" />Pergunta</Button>
        </div>
      );
    }

    case "spacer":
      return (
        <Select value={(data.altura as string) ?? "md"} onValueChange={(value) => set({ altura: value })}>
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
