import {
  AlertTriangle,
  BookOpenCheck,
  Database,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDashboardCurrency, type DashboardReadModel } from "./dashboard-read-model";

const INSIGHT_TONES = {
  performance: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  gargalo: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  oportunidade: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  alerta: "bg-destructive/10 text-destructive",
  previsao: "bg-primary/10 text-primary",
};

export function DashboardInsightFeed({ model }: { model: DashboardReadModel }) {
  return (
    <section
      className="grid min-w-0 gap-4 lg:grid-cols-2"
      aria-label="Inteligência operacional e qualidade dos dados"
    >
      <article className="relative min-w-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-workspace-elevated to-workspace-elevated p-4 shadow-soft sm:p-5">
        <header className="mb-4 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
              Inteligência calculada no servidor
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Insights do período</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Recomendações produzidas com dados consolidados e exibidas sem alteração no navegador.
            </p>
          </div>
        </header>
        {model.insights.length === 0 ? (
          <div className="rounded-xl border border-border bg-background/65 p-4 text-sm text-muted-foreground">
            Ainda não há volume suficiente para gerar uma recomendação neste período.
          </div>
        ) : (
          <ol className="space-y-2" aria-live="polite">
            {model.insights.map((insight, index) => (
              <li
                key={`${insight.tipo}-${index}`}
                className="flex gap-3 rounded-xl border border-border/80 bg-background/70 p-3"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    INSIGHT_TONES[insight.tipo],
                  )}
                >
                  {insight.tipo === "alerta" ? (
                    <AlertTriangle className="size-4" aria-hidden="true" />
                  ) : insight.tipo === "performance" ? (
                    <TrendingUp className="size-4" aria-hidden="true" />
                  ) : (
                    <Lightbulb className="size-4" aria-hidden="true" />
                  )}
                </span>
                <p className="text-sm leading-6 text-foreground/85">{insight.mensagem}</p>
              </li>
            ))}
          </ol>
        )}
      </article>

      <article className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5">
        <header className="mb-4 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <Database className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sky-700 dark:text-sky-300">
              Operação consolidada
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Cobertura e integridade</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Snapshot completo em {model.timezone}; fontes parciais falham de forma fechada.
            </p>
          </div>
        </header>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {model.operations.map((metric) => (
            <div
              key={metric.key}
              className="rounded-xl border border-border bg-workspace-surface/60 p-3"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {metric.label}
              </dt>
              <dd className="mt-2 text-xl font-semibold text-foreground">{metric.value}</dd>
            </div>
          ))}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
              Integridade dos dados
            </dt>
            <dd className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <BookOpenCheck className="size-4" aria-hidden="true" /> Completo
            </dd>
          </div>
        </dl>
      </article>

      <article className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5">
        <h2 className="text-base font-semibold text-foreground">Origens e conversão</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Distribuição quantitativa com alternativa tabular.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-xs">
            <caption className="sr-only">Origem dos leads, participação e conversão</caption>
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 text-left">
                  Origem
                </th>
                <th scope="col" className="py-2 text-right">
                  Leads
                </th>
                <th scope="col" className="py-2 text-right">
                  Participação
                </th>
                <th scope="col" className="py-2 text-right">
                  Conversão
                </th>
              </tr>
            </thead>
            <tbody>
              {model.sources.map((source) => (
                <tr key={source.nome} className="border-b border-border/70 last:border-0">
                  <th scope="row" className="py-2 text-left font-medium text-foreground">
                    {source.nome}
                  </th>
                  <td className="py-2 text-right">{source.quantidade}</td>
                  <td className="py-2 text-right">{source.percentual}%</td>
                  <td className="py-2 text-right">{source.conversao}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5">
        <h2 className="text-base font-semibold text-foreground">Ranking e alertas</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Informação consolidada no servidor, sem executar ações comerciais automaticamente.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ol className="space-y-2" aria-label="Classificação de desempenho">
            {model.ranking.length === 0 ? (
              <li className="text-xs text-muted-foreground">
                Ranking indisponível para este escopo.
              </li>
            ) : (
              model.ranking.slice(0, 5).map((row, index) => (
                <li
                  key={`${row.nome}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-workspace-surface/65 px-3 py-2 text-xs"
                >
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {index + 1}. {row.nome}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {row.vendas} vendas · {formatDashboardCurrency(row.vgv)}
                  </span>
                </li>
              ))
            )}
          </ol>
          <ul className="space-y-2" aria-label="Alertas operacionais">
            {model.alerts.map((alert) => (
              <li
                key={alert.key}
                className="flex items-center justify-between gap-3 rounded-lg bg-workspace-surface/65 px-3 py-2 text-xs"
              >
                <span className="text-foreground/85">{alert.label}</span>
                <span
                  className={cn(
                    "font-semibold",
                    alert.value > 0 ? "text-state-warning" : "text-muted-foreground",
                  )}
                >
                  {alert.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </section>
  );
}
