import { Building2, ChevronRight, Clock3, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPipelineCurrency,
  formatPipelineDate,
  PIPELINE_STATUS_META,
  type PipelineLeadReadModel,
} from "./pipeline-read-model";

type PipelineReadOnlyListProps = {
  leads: readonly PipelineLeadReadModel[];
  selectedId?: string;
  onSelect: (leadId: string) => void;
};

export function PipelineReadOnlyList({ leads, selectedId, onSelect }: PipelineReadOnlyListProps) {
  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-workspace-elevated shadow-soft"
      aria-labelledby="pipeline-list-title"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 id="pipeline-list-title" className="font-semibold text-foreground">
            Oportunidades
          </h2>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {leads.length} {leads.length === 1 ? "registro encontrado" : "registros encontrados"}
          </p>
        </div>
        <span className="rounded-full bg-state-info/10 px-2.5 py-1 text-[11px] font-medium text-state-info">
          Somente leitura
        </span>
      </div>

      <div
        className="max-h-[44rem] divide-y divide-border overflow-y-auto overscroll-contain"
        role="listbox"
        aria-label="Leads do pipeline"
      >
        {leads.map((lead) => {
          const selected = lead.id === selectedId;
          const status = PIPELINE_STATUS_META[lead.status];

          return (
            <button
              key={lead.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(lead.id)}
              className={cn(
                "group relative grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-workspace-focus sm:px-5",
                selected ? "bg-primary/[0.07]" : "bg-workspace-elevated hover:bg-workspace-surface",
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-3 left-0 w-0.5 rounded-r-full opacity-0 transition-opacity",
                  status.accent,
                  selected && "opacity-100",
                )}
                aria-hidden="true"
              />

              <span className="min-w-0 space-y-2.5">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-foreground">{lead.nome}</span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                      status.tone,
                    )}
                  >
                    {status.label}
                  </span>
                </span>

                <span className="grid min-w-0 gap-1.5 text-xs text-muted-foreground">
                  {lead.imovel?.titulo ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{lead.imovel.titulo}</span>
                    </span>
                  ) : null}
                  {lead.email ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{lead.email}</span>
                    </span>
                  ) : lead.telefone ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{lead.telefone}</span>
                    </span>
                  ) : null}
                </span>

                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    {formatPipelineCurrency(lead.valor_estimado)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="size-3" aria-hidden="true" />
                    Atualizado {formatPipelineDate(lead.updated_at)}
                  </span>
                </span>
              </span>

              <ChevronRight
                className={cn(
                  "mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5",
                  selected && "text-primary",
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
