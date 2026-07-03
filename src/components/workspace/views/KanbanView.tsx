// KanbanView — visualização kanban genérica (Fase 6 · Bloco 4 · Etapa 4.1.c).
//
// REGRA (Instrução Normativa §3.3): componente puro, sem conhecimento de
// domínio. Recebe descriptor + items via contrato ViewProps e agrupa por
// `descriptor.views.kanban.groupBy` (path lido em item ou item.extra).
//
// Registrado no ViewRegistry com id "kanban" pelo bootstrap.
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ViewProps } from "@/components/workspace/registry";

function getGroup(item: Record<string, unknown>, groupBy: string): string | null {
  if (groupBy in item) return (item[groupBy] as string) ?? null;
  const extra = item.extra as Record<string, unknown> | undefined;
  if (extra && groupBy in extra) return (extra[groupBy] as string) ?? null;
  return null;
}

export function KanbanView({ descriptor, items, selectedId, density, search }: ViewProps) {
  const navigate = useNavigate();
  const spec = descriptor.views?.kanban;
  if (!spec) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Descriptor "{descriptor.kind}" não declarou views.kanban.
      </div>
    );
  }

  const columns = spec.columns;
  const grouped: Record<string, typeof items> = {};
  for (const c of columns) grouped[c.id] = [];
  for (const it of items) {
    const g = getGroup(it as unknown as Record<string, unknown>, spec.groupBy);
    if (g && grouped[g]) grouped[g].push(it);
  }

  function open(id: string) {
    navigate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to: descriptor.route as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: { ...search, item: id } as any,
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <div className="h-full overflow-x-auto p-2">
      <div className="flex gap-2 h-full min-w-max">
        {columns.map((col) => {
          const list = grouped[col.id] ?? [];
          return (
            <div
              key={col.id}
              className="w-64 flex-shrink-0 flex flex-col rounded-md border bg-muted/20"
            >
              <div className="px-2 py-1.5 border-b flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide">{col.label}</span>
                <span className="text-[10px] text-muted-foreground">{list.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                {list.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => open(it.id)}
                    className={cn(
                      "w-full text-left rounded border bg-background px-2 py-1.5 text-xs hover:border-primary/40 transition",
                      density === "comfortable" && "py-2",
                      selectedId === it.id && "border-primary ring-1 ring-primary/30",
                    )}
                  >
                    <div className="font-medium truncate">{it.titulo}</div>
                    {it.extra?.origem ? (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {String(it.extra.origem)}
                      </div>
                    ) : null}
                  </button>
                ))}
                {list.length === 0 && (
                  <div className="text-[10px] text-muted-foreground text-center py-3">vazio</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
