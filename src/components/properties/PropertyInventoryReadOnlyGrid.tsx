import { Building2, ChevronRight, Clock3, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPropertyCurrency,
  formatPropertyDate,
  propertyStatusMeta,
  type PropertyInventoryReadModel,
} from "./property-inventory-read-model";

type PropertyInventoryReadOnlyGridProps = {
  properties: readonly PropertyInventoryReadModel[];
  selectedId?: string;
  onSelect: (propertyId: string) => void;
};

export function PropertyInventoryReadOnlyGrid({
  properties,
  selectedId,
  onSelect,
}: PropertyInventoryReadOnlyGridProps) {
  return (
    <section
      className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-3 shadow-soft sm:p-4"
      aria-labelledby="property-inventory-title"
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <h2 id="property-inventory-title" className="font-semibold text-foreground">
            Portfólio do workspace
          </h2>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {properties.length}{" "}
            {properties.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
          </p>
        </div>
        <span className="rounded-full bg-state-info/10 px-2.5 py-1 text-[11px] font-medium text-state-info">
          Somente leitura
        </span>
      </div>

      <div
        className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        role="listbox"
        aria-label="Inventário de imóveis"
      >
        {properties.map((property) => {
          const selected = property.id === selectedId;
          const status = propertyStatusMeta(property.status);

          return (
            <button
              key={property.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(property.id)}
              className={cn(
                "group min-w-0 overflow-hidden rounded-xl border bg-workspace-elevated text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus motion-safe:hover:-translate-y-0.5",
                selected
                  ? "border-primary/55 shadow-md shadow-primary/10"
                  : "border-border hover:border-primary/30 hover:shadow-soft",
              )}
            >
              <span
                className={cn(
                  "relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br to-workspace-surface",
                  status.accent,
                )}
                data-image-fallback="true"
              >
                <span
                  className="absolute inset-0 bg-[linear-gradient(120deg,transparent_35%,color-mix(in_oklab,var(--foreground)_5%,transparent)_50%,transparent_65%)] opacity-60 motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:translate-x-4"
                  aria-hidden="true"
                />
                <Building2 className="size-10 text-foreground/18" aria-hidden="true" />
                <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-background/80 px-2.5 py-1 font-mono text-[10px] font-semibold text-foreground backdrop-blur-sm">
                  {property.codigo}
                </span>
                {property.destaque ? (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/90 px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
                    <Sparkles className="size-3" aria-hidden="true" />
                    Destaque
                  </span>
                ) : null}
              </span>

              <span className="block min-w-0 space-y-3 p-4">
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">
                      {property.titulo}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {property.bairro ?? "Localização não informada"}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5",
                      selected && "text-primary",
                    )}
                    aria-hidden="true"
                  />
                </span>

                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                      status.tone,
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="rounded-full border border-border bg-workspace-surface px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                    {property.finalidade}
                  </span>
                  <span className="rounded-full border border-border bg-workspace-surface px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                    {property.tipo}
                  </span>
                </span>

                <span className="flex items-end justify-between gap-3 border-t border-border pt-3">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {formatPropertyCurrency(property.preco)}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock3 className="size-3" aria-hidden="true" />
                    {formatPropertyDate(property.updated_at)}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
