// ContentEditor — shell universal com tabs. Dispatch por descriptor.editorKind.
// NÃO conhece entidades específicas — apenas o kind decidido pelo descriptor.
import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Save, Loader2, Cloud, CloudOff } from "lucide-react";
import { useContentSession } from "./session";
import type { ContentSearch } from "./search-schema";
import type { EntityDescriptor, ContentTab } from "./types";
import { SeoPanel } from "./SeoPanel";
import { ContentPreviewPane } from "./ContentPreviewPane";
import { VersionsPanel } from "./VersionsPanel";
import { PublishWorkflow } from "./PublishWorkflow";
import { BlocksContentEditor } from "./editors/BlocksContentEditor";
import { RichTextContentEditor } from "./editors/RichTextContentEditor";
import { FormBuilderEditor } from "./editors/FormBuilderEditor";
import { CampaignContentEditor } from "./editors/CampaignContentEditor";
import { MediaContentEditor } from "./editors/MediaContentEditor";
import { SettingsContentEditor } from "./editors/SettingsContentEditor";
import { AuditViewer } from "./editors/AuditViewer";
import { StructuredContentEditor } from "./editors/StructuredContentEditor";
import { SubmissoesPanel } from "./editors/SubmissoesPanel";
import { CampaignSegmentacaoPanel, CampaignMetricasPanel } from "./editors/CampaignPanels";
import { MediaUsagePanel } from "./editors/MediaUsagePanel";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  archived: "bg-muted text-muted-foreground border-foreground/10",
};

const TAB_LABEL: Record<ContentTab, string> = {
  conteudo: "Conteúdo", seo: "SEO", preview: "Preview",
  versoes: "Versões", publicacao: "Publicação",
  detalhes: "Detalhes", uso: "Uso",
  campos: "Campos", submissoes: "Submissões",
  segmentacao: "Segmentação", metrica: "Métricas",
};

export function ContentEditorEmpty({ descriptor }: { descriptor: EntityDescriptor }) {
  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-2">
        <div className="text-sm font-medium">Selecione um item</div>
        <p className="text-xs text-muted-foreground">
          Escolha na lista à esquerda ou pressione <kbd className="px-1.5 py-0.5 rounded border text-[10px]">⌘K</kbd> para buscar.
          {descriptor.supportedActions.includes("criar") && ` Você também pode criar uma nova ${descriptor.singular.toLowerCase()} pelo botão acima.`}
        </p>
      </div>
    </div>
  );
}

export function ContentEditor({ search, onClose }: { search: ContentSearch; onClose: () => void }) {
  const s = useContentSession();
  const navigate = useNavigate();
  const defaultTab = s.descriptor.tabs[0];
  const tab = (search.tab as ContentTab | undefined) && s.descriptor.tabs.includes(search.tab as ContentTab)
    ? (search.tab as ContentTab)
    : defaultTab;

  function setTab(t: ContentTab) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: s.descriptor.route as any, search: { ...search, tab: t } as any, replace: true, resetScroll: false });
  }

  if (s.loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  const readonly = s.descriptor.editorKind === "audit";

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b border-foreground/5 flex items-start gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {readonly ? (
              <span className="text-base font-semibold truncate">{s.draft.titulo}</span>
            ) : (
              <input
                className="text-base font-semibold bg-transparent outline-none border-b border-transparent focus:border-primary/40 min-w-0"
                value={s.draft.titulo}
                onChange={(e) => s.patch({ titulo: e.target.value })}
                placeholder={`Título ${s.descriptor.singular.toLowerCase()}`}
              />
            )}
            <Badge variant="outline" className={STATUS_STYLES[s.draft.status] ?? ""}>{s.draft.status}</Badge>
            <SaveIndicator />
          </div>
          {s.descriptor.publicPathPrefix && !readonly && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{s.descriptor.publicPathPrefix}</span>
              <input
                className="bg-transparent outline-none font-mono text-xs border-b border-transparent focus:border-primary/40 min-w-0 flex-1"
                value={s.draft.slug}
                onChange={(e) => s.patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                placeholder="slug"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {s.isNew && (
            <Button size="sm" onClick={() => void s.flush()} disabled={!s.draft.titulo}>
              <Save className="size-4 mr-1.5" /> Salvar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ContentTab)} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="mx-4 mt-2 self-start">
          {s.descriptor.tabs.map((t) => (
            <TabsTrigger key={t} value={t}>{TAB_LABEL[t]}</TabsTrigger>
          ))}
        </TabsList>

        {s.descriptor.tabs.includes("conteudo") && (
          <TabsContent value="conteudo" className="flex-1 min-h-0 overflow-auto p-4">
            <ContentBody />
          </TabsContent>
        )}
        {s.descriptor.tabs.includes("detalhes") && (
          <TabsContent value="detalhes" className="flex-1 min-h-0 overflow-auto p-4">
            <ContentBody />
          </TabsContent>
        )}
        {s.descriptor.tabs.includes("seo") && (
          <TabsContent value="seo" className="flex-1 min-h-0 overflow-auto p-4"><SeoPanel /></TabsContent>
        )}
        {s.descriptor.tabs.includes("preview") && (
          <TabsContent value="preview" className="flex-1 min-h-0 p-0 m-0"><ContentPreviewPane /></TabsContent>
        )}
        {s.descriptor.tabs.includes("versoes") && (
          <TabsContent value="versoes" className="flex-1 min-h-0 overflow-auto p-4"><VersionsPanel /></TabsContent>
        )}
        {s.descriptor.tabs.includes("publicacao") && (
          <TabsContent value="publicacao" className="flex-1 min-h-0 overflow-auto p-4"><PublishWorkflow /></TabsContent>
        )}
        {s.descriptor.tabs.includes("uso") && (
          <TabsContent value="uso" className="flex-1 min-h-0 overflow-auto p-4"><MediaUsagePanel /></TabsContent>
        )}
        {s.descriptor.tabs.includes("campos") && (
          <TabsContent value="campos" className="flex-1 min-h-0 overflow-auto p-4"><FormFieldsTab /></TabsContent>
        )}
        {s.descriptor.tabs.includes("submissoes") && (
          <TabsContent value="submissoes" className="flex-1 min-h-0 overflow-auto p-4"><SubmissoesPanel /></TabsContent>
        )}
        {s.descriptor.tabs.includes("segmentacao") && (
          <TabsContent value="segmentacao" className="flex-1 min-h-0 overflow-auto p-4"><CampaignSegmentacaoPanel /></TabsContent>
        )}
        {s.descriptor.tabs.includes("metrica") && (
          <TabsContent value="metrica" className="flex-1 min-h-0 overflow-auto p-4"><CampaignMetricasPanel /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ContentBody() {
  const s = useContentSession();
  const wrap = (node: React.ReactNode) => <div className="max-w-3xl mx-auto">{node}</div>;
  switch (s.descriptor.editorKind) {
    case "blocks":       return wrap(<BlocksContentEditor />);
    case "richtext":     return wrap(<RichTextContentEditor />);
    case "form-builder": return wrap(<FormBuilderEditor />);
    case "campaign":     return wrap(<CampaignContentEditor />);
    case "media":        return <MediaContentEditor />;
    case "settings":     return <SettingsContentEditor />;
    case "audit":        return <AuditViewer />;
  }
}

function FormFieldsTab() {
  // "Campos" é apenas outra visualização do form-builder — o próprio editor de conteúdo já mostra os campos.
  return <FormBuilderEditor />;
}

function SaveIndicator() {
  const s = useContentSession();
  if (s.descriptor.editorKind === "audit") return null;
  if (s.isNew) return <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Novo</span>;
  if (s.save === "error") return <span className="inline-flex items-center gap-1 text-[10px] text-destructive"><CloudOff className="size-3" /> {s.saveError ?? "Falha"}</span>;
  if (s.save === "saving") return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Salvando…</span>;
  if (s.save === "editing") return <span className="text-[10px] text-amber-600">Editando…</span>;
  if (s.save === "saved" && s.lastSavedAt) return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Cloud className="size-3" /> Salvo às {s.lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>;
  return null;
}
