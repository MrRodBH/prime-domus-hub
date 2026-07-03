// ContentEditor — painel direito do workspace (Bloco 3).
// Tabs por CONTEXTO (Conteúdo/SEO/Preview/Versões/Publicação), nunca por tecnologia.
// Consumidor de ContentSession.
import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Save, Loader2, Cloud, CloudOff } from "lucide-react";
import { useContentSession } from "./session";
import type { ContentSearch } from "./search-schema";
import { BlockEditor } from "./blocks/BlockEditor";
import { SeoPanel } from "./SeoPanel";
import { ContentPreviewPane } from "./ContentPreviewPane";
import { VersionsPanel } from "./VersionsPanel";
import { PublishWorkflow } from "./PublishWorkflow";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  archived: "bg-muted text-muted-foreground border-foreground/10",
};

export function ContentEditorEmpty() {
  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-2">
        <div className="text-sm font-medium">Selecione um item</div>
        <p className="text-xs text-muted-foreground">
          Escolha na lista à esquerda ou pressione <kbd className="px-1.5 py-0.5 rounded border text-[10px]">⌘K</kbd> para buscar.
          Você também pode criar um novo conteúdo pelo botão acima.
        </p>
      </div>
    </div>
  );
}

export function ContentEditor({ search, onClose }: { search: ContentSearch; onClose: () => void }) {
  const s = useContentSession();
  const navigate = useNavigate();
  const tab = search.tab ?? "conteudo";

  function setTab(t: NonNullable<ContentSearch["tab"]>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: s.descriptor.route as any, search: { ...search, tab: t } as any, replace: true, resetScroll: false });
  }

  if (s.loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header inline (Bloco 3 §9: não cria toolbar/header próprios; padrão de detalhe) */}
      <div className="px-4 py-2.5 border-b border-foreground/5 flex items-start gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              className="text-base font-semibold bg-transparent outline-none border-b border-transparent focus:border-primary/40 min-w-0"
              value={s.draft.titulo}
              onChange={(e) => s.patch({ titulo: e.target.value })}
              placeholder={`Título da ${s.descriptor.singular.toLowerCase()}`}
            />
            <Badge variant="outline" className={STATUS_STYLES[s.draft.status]}>{s.draft.status}</Badge>
            <SaveIndicator />
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{s.descriptor.publicPathPrefix}</span>
            <input
              className="bg-transparent outline-none font-mono text-xs border-b border-transparent focus:border-primary/40 min-w-0 flex-1"
              value={s.draft.slug}
              onChange={(e) => s.patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              placeholder="slug-da-pagina"
            />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {s.isNew && (
            <Button size="sm" onClick={() => void s.flush()} disabled={!s.draft.titulo || !s.draft.slug}>
              <Save className="size-4 mr-1.5" /> Salvar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as never)} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="mx-4 mt-2 self-start">
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="versoes">Versões</TabsTrigger>
          <TabsTrigger value="publicacao">Publicação</TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo" className="flex-1 min-h-0 overflow-auto p-4">
          <div className="max-w-3xl mx-auto">
            <BlockEditor />
          </div>
        </TabsContent>

        <TabsContent value="seo" className="flex-1 min-h-0 overflow-auto p-4">
          <SeoPanel />
        </TabsContent>

        <TabsContent value="preview" className="flex-1 min-h-0 p-0 m-0">
          <ContentPreviewPane />
        </TabsContent>

        <TabsContent value="versoes" className="flex-1 min-h-0 overflow-auto p-4">
          <VersionsPanel />
        </TabsContent>

        <TabsContent value="publicacao" className="flex-1 min-h-0 overflow-auto p-4">
          <PublishWorkflow />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SaveIndicator() {
  const s = useContentSession();
  if (s.isNew) return <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Novo</span>;
  if (s.save === "error") return <span className="inline-flex items-center gap-1 text-[10px] text-destructive"><CloudOff className="size-3" /> {s.saveError ?? "Falha"}</span>;
  if (s.save === "saving") return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Salvando…</span>;
  if (s.save === "editing") return <span className="text-[10px] text-amber-600">Editando…</span>;
  if (s.save === "saved" && s.lastSavedAt) return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Cloud className="size-3" /> Salvo às {s.lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>;
  return null;
}
