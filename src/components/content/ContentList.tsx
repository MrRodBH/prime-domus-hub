// ContentList — lista densa universal (Bloco 3.1 §1).
// NÃO conhece entidades. Renderiza registros conforme descriptor.
import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ContentSearch } from "./search-schema";
import type { EntityDescriptor, ContentEntityRecord } from "./types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-500/15 text-amber-700",
  published: "bg-emerald-500/15 text-emerald-700",
  active: "bg-emerald-500/15 text-emerald-700",
  paused: "bg-amber-500/15 text-amber-700",
  archived: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/15 text-blue-700",
};

export function ContentList({
  descriptor, items, selectedId, density, search,
}: {
  descriptor: EntityDescriptor;
  items: ContentEntityRecord[];
  selectedId: string | null;
  density: "compact" | "comfortable";
  search: ContentSearch;
}) {
  const navigate = useNavigate();
  const rowH = density === "compact" ? "py-2" : "py-3";
  const q = (search.q ?? "").trim().toLowerCase();
  const statusFilter = search.status ?? "all";

  // Agrupamento (usado em Site para "Empresa/Home/Páginas fixas")
  const groups = useMemo(() => {
    const uniques = new Set<string>();
    items.forEach((i) => { const g = i.extra?.group as string | undefined; if (g) uniques.add(g); });
    return Array.from(uniques);
  }, [items]);
  const activeGroup = search.group ?? null;

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (activeGroup) { const g = p.extra?.group as string | undefined; if (g !== activeGroup) return false; }
      if (q) {
        const hay = `${p.titulo} ${p.slug ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, q, statusFilter, activeGroup]);

  function patchSearch(patch: Partial<ContentSearch>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: descriptor.route as any, search: { ...search, ...patch } as any, replace: true, resetScroll: false });
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="p-2 border-b border-foreground/5 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search.q ?? ""}
            onChange={(e) => patchSearch({ q: e.target.value || undefined })}
            placeholder={`Buscar ${descriptor.plural.toLowerCase()}…`}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {descriptor.statusVocabulary.length > 1 && (
            <Select value={statusFilter} onValueChange={(v) => patchSearch({ status: v as ContentSearch["status"] })}>
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {descriptor.statusVocabulary.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {groups.length > 0 && (
            <Select value={activeGroup ?? "all"} onValueChange={(v) => patchSearch({ group: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos grupos</SelectItem>
                {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
            {filtered.length}/{items.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum resultado.</div>
        ) : (
          <ul className="divide-y divide-foreground/5">
            {filtered.map((p) => {
              const active = p.id === selectedId;
              const thumb = (p.extra?.url_thumbnail as string | null) ?? (p.extra?.url_medium as string | null);
              return (
                <li key={p.id}>
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={descriptor.route as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    search={{ ...search, item: p.id } as any}
                    replace resetScroll={false} preload={false}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey) return;
                      e.preventDefault();
                      patchSearch({ item: p.id });
                    }}
                    className={`block px-3 ${rowH} transition-colors hover:bg-muted/50 ${active ? "bg-primary/10 border-l-2 border-primary" : "border-l-2 border-transparent"}`}
                  >
                    <div className="flex items-start gap-2">
                      {thumb && (
                        <img src={thumb} alt="" className="size-10 rounded object-cover shrink-0" loading="lazy" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium truncate">{p.titulo || <span className="text-muted-foreground italic">Sem título</span>}</div>
                          <Badge variant="outline" className={`text-[9px] shrink-0 ${STATUS_STYLES[p.status] ?? ""}`}>{p.status}</Badge>
                        </div>
                        {p.slug && (
                          <div className="text-[11px] font-mono text-muted-foreground truncate">
                            {descriptor.publicPathPrefix}{p.slug}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
