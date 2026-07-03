// ContentWorkspace — split layout do contexto Conteúdo (Bloco 3).
// Mesmo padrão do PipelinePage: List esquerda + Editor direito, seleção via ?item=<id>.
// Sem trocar de rota ao selecionar. Sem modals para fluxo principal.
import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Rows3, Rows2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { ContentSessionProvider } from "./session";
import { ContentEditor, ContentEditorEmpty } from "./ContentEditor";
import { ContentList } from "./ContentList";
import type { ContentSearch } from "./search-schema";
import type { ContentEntityRecord, EntityDescriptor } from "./entity-registry";
import { listarPaginas } from "@/lib/api/pages.functions";

export function ContentWorkspace({ descriptor, search }: { descriptor: EntityDescriptor; search: ContentSearch }) {
  const navigate = useNavigate();
  const density = search.density ?? "compact";

  // Bloco 3: apenas 'pagina' totalmente implementada. Blog/Form/Campanha exibem placeholder.
  const listarFn = useServerFn(listarPaginas);
  const { data, isLoading } = useQuery({
    queryKey: ["content-list", descriptor.kind],
    queryFn: async (): Promise<ContentEntityRecord[]> => {
      if (descriptor.kind !== "pagina") return [];
      const rows = await listarFn();
      return rows.map((r) => ({
        id: r.id, titulo: r.titulo, slug: r.slug,
        status: r.status as ContentEntityRecord["status"],
        updated_at: r.updated_at, published_at: r.published_at,
      }));
    },
    enabled: descriptor.ready,
  });

  const items = data ?? [];
  const selectedId = search.item ?? null;
  const isCreating = search.new === "1";

  // Se o item selecionado sumiu, limpar
  useEffect(() => {
    if (!selectedId || isCreating) return;
    if (items.length && !items.find((p) => p.id === selectedId)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: descriptor.route as any, search: { ...search, item: undefined } as any, replace: true, resetScroll: false });
    }
  }, [selectedId, items, navigate, search, descriptor.route, isCreating]);

  function patchSearch(patch: Partial<ContentSearch>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: descriptor.route as any, search: { ...search, ...patch } as any, replace: true, resetScroll: false });
  }

  const editingId = useMemo(() => {
    if (isCreating) return "novo";
    return selectedId;
  }, [isCreating, selectedId]);

  function closeDetail() { patchSearch({ item: undefined, new: undefined, tab: undefined }); }
  function onCreated(id: string) { patchSearch({ item: id, new: undefined }); }

  if (!descriptor.ready) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Conteúdo" title={descriptor.plural} />
        <div className="rounded-lg border border-dashed border-foreground/10 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          {descriptor.plural} migrarão para o novo workspace na próxima etapa do Bloco 3.
          Enquanto isso, o formato antigo permanece disponível.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px-48px-24px)] min-h-[520px] gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <AdminPageHeader eyebrow="Conteúdo" title={descriptor.plural} />
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => patchSearch({ new: "1", item: undefined })}>
            <Plus className="size-4 mr-1" />
            Nova {descriptor.singular.toLowerCase()}
          </Button>
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button size="sm" variant={density === "compact" ? "secondary" : "ghost"} className="h-7 w-7 p-0" onClick={() => patchSearch({ density: "compact" })} title="Denso">
              <Rows3 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant={density === "comfortable" ? "secondary" : "ghost"} className="h-7 w-7 p-0" onClick={() => patchSearch({ density: "comfortable" })} title="Confortável">
              <Rows2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(280px,32%)_minmax(0,1fr)] rounded-lg border border-foreground/10 bg-card overflow-hidden">
        <div className="border-b lg:border-b-0 lg:border-r border-foreground/5 min-h-0 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <ContentList descriptor={descriptor} items={items} selectedId={selectedId} density={density} search={search} />
          )}
        </div>
        <div className="min-h-0 flex flex-col">
          {editingId ? (
            <ContentSessionProvider descriptor={descriptor} entityId={editingId === "novo" ? null : editingId} onCreated={onCreated}>
              <ContentEditor search={search} onClose={closeDetail} />
            </ContentSessionProvider>
          ) : (
            <ContentEditorEmpty />
          )}
        </div>
      </div>
    </div>
  );
}
