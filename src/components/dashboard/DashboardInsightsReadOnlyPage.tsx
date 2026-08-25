import { useNavigate } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Eraser, Filter, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceState } from "@/components/workspace";
import { cn } from "@/lib/utils";
import { DashboardInsightFeed } from "./DashboardInsightFeed";
import { DashboardMetricGrid } from "./DashboardMetricGrid";
import { DashboardVisualizations } from "./DashboardVisualizations";
import { useDashboardInsightsReadModel } from "./hooks/useDashboardInsightsReadModel";
import { DASHBOARD_PERIOD_KEYS, type DashboardInsightsSearch } from "./search-schema";

const PERIOD_LABELS: Record<(typeof DASHBOARD_PERIOD_KEYS)[number], string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  month: "Este mês",
  year: "Este ano",
  custom: "Personalizado",
};

function defaultCustomDates() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: format(start), to: format(end) };
}

export function DashboardInsightsReadOnlyPage({ search }: { search: DashboardInsightsSearch }) {
  const navigate = useNavigate();
  const dashboard = useDashboardInsightsReadModel(search);
  const activePeriod = search.period ?? "30d";

  function updateSearch(patch: Partial<DashboardInsightsSearch>) {
    navigate({
      to: "/admin",
      search: { ...search, ...patch },
      replace: true,
      resetScroll: false,
    });
  }

  if (dashboard.statsQuery.isPending) {
    return (
      <WorkspaceState
        kind="loading"
        title="Carregando inteligência operacional"
        description="Consultando métricas e insights autorizados para o workspace selecionado."
      />
    );
  }

  if (dashboard.statsQuery.isError) {
    const kind = dashboard.errorKind ?? "error";
    return (
      <WorkspaceState
        kind={kind}
        title={
          kind === "denied"
            ? "Inteligência operacional não autorizada"
            : kind === "unavailable"
              ? "Dashboard indisponível neste contexto"
              : "Não foi possível carregar os insights"
        }
        description={
          kind === "denied"
            ? "O servidor não autorizou este read model para o perfil atual."
            : kind === "unavailable"
              ? "Selecione um workspace elegível; nenhum escopo foi inferido no cliente."
              : "A leitura falhou sem alterar qualquer dado. Tente novamente."
        }
        action={
          kind === "error" ? (
            <Button type="button" variant="outline" onClick={() => dashboard.statsQuery.refetch()}>
              Tentar novamente
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (!dashboard.model || !dashboard.model.hasActivity) {
    return (
      <WorkspaceState
        kind="empty"
        title="Sem atividade no período"
        description="O read model completo não retornou métricas para os filtros selecionados."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              updateSearch({
                period: "30d",
                from: undefined,
                to: undefined,
                origin: undefined,
                broker: undefined,
              })
            }
          >
            Limpar filtros
          </Button>
        }
      />
    );
  }

  const model = dashboard.model;
  const origins = Array.from(new Set(model.sources.map((source) => source.nome))).sort(
    (left, right) => left.localeCompare(right, "pt-BR"),
  );
  const filtersActive = Boolean(
    activePeriod !== "30d" || search.from || search.to || search.origin || search.broker,
  );

  return (
    <main
      className="mx-auto w-full max-w-[var(--workspace-content-max)] space-y-5 sm:space-y-6"
      data-dashboard-mode="read-only"
    >
      <header className="relative overflow-hidden rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_29%),radial-gradient(circle_at_8%_92%,color-mix(in_oklab,var(--state-info)_12%,transparent),transparent_34%)]"
          aria-hidden="true"
        />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] xl:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3" aria-hidden="true" /> Visual intelligence
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-3" aria-hidden="true" /> Somente leitura
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Inteligência que move a operação
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Métricas reais, padrões do funil e sinais acionáveis em uma superfície premium,
              acessível e governada pelo servidor.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2" aria-label="Garantias do dashboard">
            {[
              { label: "Integridade", value: "Completa", icon: ShieldCheck },
              { label: "Fuso", value: "São Paulo", icon: CalendarDays },
              { label: "Visualizações", value: "Acessíveis", icon: BarChart3 },
              { label: "Operação", value: "Read-only", icon: Filter },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-background/70 p-3 backdrop-blur-sm"
              >
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section
        className="rounded-2xl border border-border bg-workspace-elevated p-3 shadow-soft"
        aria-label="Filtros de apresentação"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div
            className="flex min-w-0 gap-2 overflow-x-auto pb-1 xl:pb-0"
            role="group"
            aria-label="Período do dashboard"
          >
            {DASHBOARD_PERIOD_KEYS.map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={activePeriod === period}
                onClick={() => {
                  const custom = period === "custom" ? defaultCustomDates() : undefined;
                  updateSearch({
                    period,
                    from: period === "custom" ? (search.from ?? custom?.from) : undefined,
                    to: period === "custom" ? (search.to ?? custom?.to) : undefined,
                  });
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus",
                  activePeriod === period
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {PERIOD_LABELS[period]}
              </button>
            ))}
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:ml-auto xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_auto]">
            <label className="min-w-0">
              <span className="sr-only">Filtrar por origem</span>
              <select
                value={search.origin ?? ""}
                onChange={(event) =>
                  updateSearch({ origin: event.currentTarget.value || undefined })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus"
                aria-label="Filtrar por origem"
              >
                <option value="">Todas as origens</option>
                {origins.map((origin) => (
                  <option key={origin} value={origin}>
                    {origin}
                  </option>
                ))}
              </select>
            </label>
            {dashboard.canFilterByBroker ? (
              <label className="min-w-0">
                <span className="sr-only">Filtrar por corretor</span>
                <select
                  value={search.broker ?? ""}
                  onChange={(event) =>
                    updateSearch({ broker: event.currentTarget.value || undefined })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus"
                  aria-label="Filtrar por corretor"
                >
                  <option value="">Todos os corretores</option>
                  {dashboard.brokers.map((broker) => (
                    <option key={broker.id} value={broker.id}>
                      {broker.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="hidden xl:block" aria-hidden="true" />
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={!filtersActive}
              onClick={() =>
                updateSearch({
                  period: "30d",
                  from: undefined,
                  to: undefined,
                  origin: undefined,
                  broker: undefined,
                })
              }
            >
              <Eraser className="size-4" aria-hidden="true" /> Limpar
            </Button>
          </div>
        </div>
        {activePeriod === "custom" ? (
          <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:max-w-lg sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              Data inicial
              <input
                type="date"
                value={search.from ?? ""}
                onChange={(event) => {
                  if (event.currentTarget.value) updateSearch({ from: event.currentTarget.value });
                }}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Data final
              <input
                type="date"
                value={search.to ?? ""}
                onChange={(event) => {
                  if (event.currentTarget.value) updateSearch({ to: event.currentTarget.value });
                }}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
          </div>
        ) : null}
      </section>

      <DashboardMetricGrid metrics={model.summary} />
      <DashboardVisualizations model={model} />
      <DashboardInsightFeed model={model} />
    </main>
  );
}
