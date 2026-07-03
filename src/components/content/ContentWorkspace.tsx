// ContentWorkspace — split layout AGNÓSTICO à entidade (Bloco 3.1 §1).
// REGRA: NENHUM condicional `if (kind === ...)`. Todo comportamento vem do descriptor + adapter.
import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Rows3, Rows2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { ContentSessionProvider } from "./session";
import { ContentEditor, ContentEditorEmpty } from "./ContentEditor";
import { ContentList } from "./ContentList";
import type { ContentSearch } from "./search-schema";
import type { EntityDescriptor } from "./types";
import { getRegistration } from "./adapters";
import { pushRecent } from "./recents";

export function ContentWorkspace({
  descriptor, search,
}: { descriptor: EntityDescriptor; search: ContentSearch }) {
  const navigate = useNavigate();
  const density = search.density ?? "compact";
  const adapter = getRegistration(descriptor.kind).useAdapter();

  const { data, isLoading } = useQuery({
    queryKey: ["content-list", descriptor.kind, search.status ?? "", search.q ?? ""],
    queryFn: () => adapter.fetchList({ q: search.q, status: search.status }),
  });

  const items = data ?? [];
  const selectedId = search.item ?? null;
  const isCreating = search.new === "1";
  const canCreate = descriptor.supportedActions.includes("criar");

  useEffect(() => {
    if (!selectedId || isCreating) return;
    if (items.length && !items.find((p) => p.id === selectedId)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: descriptor.route as any, search: { ...search, item: undefined } as any, replace: true, resetScroll: false });
    }
  }, [selectedId, items, navigate, search, descriptor.route, isCreating]);

  useEffect(() => {
    if (selectedId) {
      const item = items.find((i) => i.id === selectedId);
      if (item) pushRecent({ kind: descriptor.kind, id: item.id, titulo: item.titulo, route: descriptor.route });
    }
  }, [selectedId, items, descriptor.kind, descriptor.route]);

  function patchSearch(patch: Partial<ContentSearch>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: descriptor.route as any, search: { ...search, ...patch } as any, replace: true, resetScroll: false });
  }

  const editingId = useMemo(() => (isCreating ? "novo" : selectedId), [isCreating, selectedId]);
  function closeDetail() { patchSearch({ item: undefined, new: undefined, tab: undefined }); }
  function onCreated(id: string) { patchSearch({ item: id, new: undefined }); }

  return (
    <div className="flex flex-col h-[calc(100vh-56px-48px-24px)] min-h-[520px] gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <AdminPageHeader eyebrow="Conteúdo" title={descriptor.plural} />
        <div className="flex items-center gap-2 flex-wrap">
          {canCreate && (
            <Button size="sm" onClick={() => patchSearch({ new: "1", item: undefined })}>
              <Plus className="size-4 mr-1" />
              Nova {descriptor.singular.toLowerCase()}
            </Button>
          )}
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
            <ContentSessionProvider
              descriptor={descriptor}
              adapter={adapter}
              entityId={editingId === "novo" ? null : editingId}
              onCreated={onCreated}
            >
              <ContentEditor search={search} onClose={closeDetail} />
            </ContentSessionProvider>
          ) : (
            <ContentEditorEmpty descriptor={descriptor} />
          )}
        </div>
      </div>
    </div>
  );
}
