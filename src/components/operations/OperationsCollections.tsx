import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OperationsReadModel, OperationsRecord } from "./operations-read-model";
import {
  OPERATIONS_SECTION_KEYS,
  type OperationsSearch,
  type OperationsSection,
} from "./search-schema";

const LABELS: Record<OperationsSection, string> = {
  overview: "Visão geral",
  contacts: "Contatos",
  calendar: "Agenda",
  visits: "Visitas",
  proposals: "Propostas",
  automation: "Automações",
  sla: "SLAs",
  alerts: "Alertas",
};

type OperationsCollectionsProps = {
  model: OperationsReadModel;
  search: OperationsSearch;
  section: OperationsSection;
  visibleRecords: readonly OperationsRecord[];
  onSearchChange: (patch: Partial<OperationsSearch>) => void;
};

function CollectionCard({
  title,
  rows,
  compact = false,
}: {
  title: string;
  rows: readonly OperationsRecord[];
  compact?: boolean;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-full bg-workspace-surface px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          {rows.length}
        </span>
      </div>
      <ul className={cn("mt-4 space-y-2", compact && "max-h-[28rem] overflow-y-auto pr-1")}>
        {rows.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            Nenhum registro autorizado nesta coleção.
          </li>
        ) : (
          rows.slice(0, compact ? 6 : 100).map((row) => (
            <li
              key={row.id}
              className="min-w-0 rounded-xl border border-border/80 bg-workspace-surface/55 px-3.5 py-3 focus-within:ring-2 focus-within:ring-workspace-focus"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" title={row.title}>
                    {row.title}
                  </p>
                  <p
                    className="mt-1 truncate text-xs text-muted-foreground"
                    title={row.description}
                  >
                    {row.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-background/70 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                  {row.state}
                </span>
              </div>
              <p className="mt-2 truncate text-[10px] text-muted-foreground/80" title={row.meta}>
                {row.meta}
              </p>
            </li>
          ))
        )}
      </ul>
    </article>
  );
}

export function OperationsCollections({
  model,
  search,
  section,
  visibleRecords,
  onSearchChange,
}: OperationsCollectionsProps) {
  const collections: Array<{
    key: Exclude<OperationsSection, "overview" | "alerts">;
    rows: readonly OperationsRecord[];
  }> = [
    { key: "contacts", rows: model.contacts },
    { key: "calendar", rows: model.calendar },
    { key: "visits", rows: model.visits },
    { key: "proposals", rows: model.proposals },
    { key: "automation", rows: model.automation },
    { key: "sla", rows: model.sla },
  ];

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="operations-collections-title">
      <div className="sr-only" id="operations-collections-title">
        Coleções do CRM Operational Center
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Seções operacionais">
        {OPERATIONS_SECTION_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-current={section === key ? "page" : undefined}
            onClick={() => onSearchChange({ section: key, q: undefined })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus",
              section === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-workspace-elevated text-muted-foreground hover:text-foreground",
            )}
          >
            {LABELS[key]}
          </button>
        ))}
      </nav>

      {section !== "overview" ? (
        <label className="relative block max-w-xl">
          <span className="sr-only">Filtrar registros da seção</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search.q ?? ""}
            onChange={(event) => onSearchChange({ q: event.currentTarget.value || undefined })}
            placeholder={`Filtrar ${LABELS[section].toLocaleLowerCase("pt-BR")}`}
            aria-label={`Filtrar ${LABELS[section].toLocaleLowerCase("pt-BR")}`}
            className="bg-workspace-elevated pl-9"
          />
        </label>
      ) : null}

      {section === "overview" ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.key}
              title={LABELS[collection.key]}
              rows={collection.rows}
              compact
            />
          ))}
        </div>
      ) : section !== "alerts" ? (
        <CollectionCard title={LABELS[section]} rows={visibleRecords} />
      ) : null}
    </section>
  );
}
