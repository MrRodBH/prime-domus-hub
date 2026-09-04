import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ChartNoAxesCombined, Waypoints } from "lucide-react";
import { formatDashboardCurrency, type DashboardReadModel } from "./dashboard-read-model";

const chartTooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--card-foreground)",
};

export function DashboardVisualizations({ model }: { model: DashboardReadModel }) {
  const evolutionDescriptionId = useId();
  const funnelDescriptionId = useId();
  const compactSeries =
    model.series.length > 45
      ? model.series.filter((_, index) => index % Math.ceil(model.series.length / 45) === 0)
      : model.series;

  return (
    <section
      className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]"
      aria-label="Visualizações quantitativas"
    >
      <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5">
        <header className="mb-5 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ChartNoAxesCombined className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Evolução comercial</h2>
            <p id={evolutionDescriptionId} className="mt-1 text-xs leading-5 text-muted-foreground">
              Leads, visitas, propostas e vendas consolidados por dia. A tabela abaixo repete todos
              os valores.
            </p>
          </div>
        </header>
        <div
          className="h-64 w-full min-w-0 sm:h-72"
          role="img"
          aria-labelledby={evolutionDescriptionId}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compactSeries} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10 }}
                stroke="var(--muted-foreground)"
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="var(--muted-foreground)"
                allowDecimals={false}
              />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="visitas"
                name="Visitas"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="propostas"
                name="Propostas"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="vendas"
                name="Vendas"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-4 rounded-xl border border-border bg-workspace-surface/60 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-foreground">
            Tabela da evolução comercial
          </summary>
          <div className="mt-3 max-h-64 overflow-auto">
            <table className="w-full min-w-[34rem] text-xs">
              <caption className="sr-only">Valores diários da evolução comercial</caption>
              <thead className="sticky top-0 bg-workspace-surface text-muted-foreground">
                <tr>
                  <th scope="col" className="px-2 py-2 text-left">
                    Data
                  </th>
                  <th scope="col" className="px-2 py-2 text-right">
                    Leads
                  </th>
                  <th scope="col" className="px-2 py-2 text-right">
                    Visitas
                  </th>
                  <th scope="col" className="px-2 py-2 text-right">
                    Propostas
                  </th>
                  <th scope="col" className="px-2 py-2 text-right">
                    Vendas
                  </th>
                  <th scope="col" className="px-2 py-2 text-right">
                    VGV
                  </th>
                </tr>
              </thead>
              <tbody>
                {model.series.map((row) => (
                  <tr key={row.data} className="border-t border-border/70">
                    <th scope="row" className="px-2 py-2 text-left font-medium">
                      {row.data}
                    </th>
                    <td className="px-2 py-2 text-right">{row.leads}</td>
                    <td className="px-2 py-2 text-right">{row.visitas}</td>
                    <td className="px-2 py-2 text-right">{row.propostas}</td>
                    <td className="px-2 py-2 text-right">{row.vendas}</td>
                    <td className="px-2 py-2 text-right">{formatDashboardCurrency(row.vgv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </article>

      <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5">
        <header className="mb-5 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <Waypoints className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Funil de conversão</h2>
            <p id={funnelDescriptionId} className="mt-1 text-xs leading-5 text-muted-foreground">
              Quantidade consolidada por etapa; a lista após o gráfico apresenta os mesmos valores
              em formato textual.
            </p>
          </div>
        </header>
        <div
          className="h-64 w-full min-w-0 sm:h-72"
          role="img"
          aria-labelledby={funnelDescriptionId}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={model.funnel}
              layout="vertical"
              margin={{ top: 0, right: 12, bottom: 0, left: 6 }}
            >
              <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="etapa"
                width={94}
                tick={{ fontSize: 10 }}
                stroke="var(--muted-foreground)"
              />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar
                isAnimationActive={false}
                dataKey="quantidade"
                name="Quantidade"
                fill="var(--primary)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-4 space-y-2" aria-label="Resumo textual do funil">
          {model.funnel.map((stage) => (
            <li
              key={stage.etapa}
              className="flex items-center justify-between gap-3 rounded-lg bg-workspace-surface/65 px-3 py-2 text-xs"
            >
              <span className="min-w-0 truncate font-medium text-foreground">{stage.etapa}</span>
              <span className="shrink-0 text-muted-foreground">
                {stage.quantidade} · {stage.conversao}%
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Activity className="size-4 shrink-0 text-primary" aria-hidden="true" />
          Gráficos sem animação preservam foco, leitura e reduced motion.
        </div>
      </article>
    </section>
  );
}
