import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BarChart3, CircleDollarSign, Filter, Search, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceState } from "@/components/workspace";
import { cn } from "@/lib/utils";
import { PipelineReadOnlyDetail } from "./PipelineReadOnlyDetail";
import { PipelineReadOnlyList } from "./PipelineReadOnlyList";
import { usePipelineReadModel } from "./hooks/usePipelineReadModel";
import {
  formatPipelineCurrency,
  PIPELINE_STATUS_KEYS,
  PIPELINE_STATUS_META,
} from "./pipeline-read-model";
import type { PipelineReadOnlySearch } from "./search-schema";

type PipelineReadOnlyPageProps = {
  search: PipelineReadOnlySearch;
};

export function PipelineReadOnlyPage({ search }: PipelineReadOnlyPageProps) {
  const navigate = useNavigate();
  const model = usePipelineReadModel(search);
  const selectedLead = useMemo(
    () => model.leads.find((lead) => lead.id === search.item),
    [model.leads, search.item],
  );

  function updateSearch(patch: Partial<PipelineReadOnlySearch>) {
    navigate({
      to: "/admin/pipeline",
      search: { ...search, ...patch },
      replace: true,
      resetScroll: false,
    });
  }

  if (model.query.isPending) {
    return (
      <WorkspaceState
        kind="loading"
        title="Carregando pipeline"
        description="Consultando o read model autorizado para este workspace."
      />
    );
  }

  if (model.query.isError) {
    const kind = model.errorKind ?? "error";
    return (
      <WorkspaceState
        kind={kind}
        title={
          kind === "denied"
            ? "Pipeline não autorizado"
            : kind === "unavailable"
              ? "Pipeline indisponível"
              : "Não foi possível carregar o pipeline"
        }
        description={
          kind === "denied"
            ? "Seu perfil não possui a autorização server-side necessária para consultar estes leads."
            : kind === "unavailable"
              ? "Selecione um workspace elegível para consultar o pipeline com segurança."
              : "A consulta read-only falhou sem alterar nenhum dado. Tente novamente."
        }
        action={
          kind === "error" ? (
            <Button type="button" variant="outline" onClick={() => model.query.refetch()}>
              Tentar novamente
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (model.leads.length === 0) {
    return (
      <WorkspaceState
        kind="empty"
        title="Pipeline pronto para receber oportunidades"
        description="Nenhum lead autorizado foi retornado para este workspace."
      />
    );
  }

  const filtersActive = Boolean(search.q || search.status || search.origem);

  return (
    <div
      className="mx-auto w-full max-w-[var(--workspace-content-max)] space-y-6"
      data-pipeline-mode="read-only"
    >
      <header className="relative overflow-hidden rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_30%),linear-gradient(135deg,color-mix(in_oklab,var(--workspace-surface)_82%,transparent),transparent)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3" aria-hidden="true" />
                Visão comercial
              </span>
              <span className="rounded-full border border-border bg-background/65 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Read model server-owned
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Pipeline comercial
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Acompanhe oportunidades e contexto de atendimento em uma visão segura, sem alterar
              etapas ou autoridade comercial.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[32rem]"
            aria-label="Resumo do pipeline"
          >
            {[
              { label: "Em aberto", value: String(model.summary.open), icon: BarChart3 },
              { label: "Propostas", value: String(model.summary.proposals), icon: Filter },
              { label: "Ganhos", value: String(model.summary.won), icon: Trophy },
              {
                label: "Valor estimado",
                value: formatPipelineCurrency(model.summary.estimatedValue),
                icon: CircleDollarSign,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="min-w-0 rounded-xl border border-border bg-background/70 p-3 backdrop-blur-sm"
              >
                <Icon className="mb-2 size-4 text-primary" aria-hidden="true" />
                <p className="truncate text-base font-semibold text-foreground" title={value}>
                  {value}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="space-y-3" aria-label="Filtros locais do pipeline">
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filtrar por etapa"
        >
          <button
            type="button"
            aria-pressed={!search.status}
            onClick={() => updateSearch({ status: undefined, item: undefined })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus",
              !search.status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-workspace-elevated text-muted-foreground hover:text-foreground",
            )}
          >
            Todos · {model.summary.total}
          </button>
          {PIPELINE_STATUS_KEYS.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={search.status === status}
              onClick={() => updateSearch({ status, item: undefined })}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus",
                search.status === status
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-workspace-elevated text-muted-foreground hover:text-foreground",
              )}
            >
              {PIPELINE_STATUS_META[status].shortLabel} · {model.summary.counts[status]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-workspace-elevated p-3 shadow-soft sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.32fr)_auto]">
          <label className="relative min-w-0">
            <span className="sr-only">Buscar leads</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search.q ?? ""}
              onChange={(event) =>
                updateSearch({ q: event.currentTarget.value || undefined, item: undefined })
              }
              placeholder="Buscar por nome, contato ou imóvel"
              aria-label="Buscar leads"
              className="pl-9"
            />
          </label>

          <label className="min-w-0">
            <span className="sr-only">Filtrar por origem</span>
            <select
              value={search.origem ?? ""}
              onChange={(event) =>
                updateSearch({ origem: event.currentTarget.value || undefined, item: undefined })
              }
              aria-label="Filtrar por origem"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus"
            >
              <option value="">Todas as origens</option>
              {model.origins.map((origin) => (
                <option key={origin} value={origin}>
                  {origin}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="ghost"
            disabled={!filtersActive}
            onClick={() =>
              updateSearch({ q: undefined, status: undefined, origem: undefined, item: undefined })
            }
          >
            Limpar filtros
          </Button>
        </div>
      </section>

      {model.filtered.length === 0 ? (
        <WorkspaceState
          kind="empty"
          compact
          title="Nenhum lead corresponde aos filtros"
          description="Ajuste a busca, etapa ou origem para ampliar os resultados desta consulta local."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                updateSearch({
                  q: undefined,
                  status: undefined,
                  origem: undefined,
                  item: undefined,
                })
              }
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(20rem,0.86fr)_minmax(0,1.14fr)] lg:items-start">
          <PipelineReadOnlyList
            leads={model.filtered}
            selectedId={selectedLead?.id}
            onSelect={(item) => updateSearch({ item })}
          />
          <PipelineReadOnlyDetail lead={selectedLead} />
        </div>
      )}
    </div>
  );
}
