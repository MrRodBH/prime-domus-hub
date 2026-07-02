import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { dashboardStats } from "@/lib/api/dashboard.functions";
import { adminListarCorretores } from "@/lib/api/admin.functions";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CalendarCheck,
  FileText,
  Trophy,
  Sparkles,
  Flame,
  AlertTriangle,
  Lightbulb,
  ChartLine,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardCRM,
});

type Periodo = "hoje" | "ontem" | "7d" | "30d" | "este_mes" | "mes_anterior" | "este_ano" | "custom";

function rangeFor(p: Periodo, custom?: { ini: string; fim: string }): { inicio: string; fim: string } {
  const now = new Date();
  const fim = new Date(now);
  fim.setHours(23, 59, 59, 999);
  const inicio = new Date(now);
  inicio.setHours(0, 0, 0, 0);

  switch (p) {
    case "hoje":
      return { inicio: inicio.toISOString(), fim: fim.toISOString() };
    case "ontem": {
      inicio.setDate(inicio.getDate() - 1);
      const f = new Date(inicio);
      f.setHours(23, 59, 59, 999);
      return { inicio: inicio.toISOString(), fim: f.toISOString() };
    }
    case "7d":
      inicio.setDate(inicio.getDate() - 6);
      return { inicio: inicio.toISOString(), fim: fim.toISOString() };
    case "30d":
      inicio.setDate(inicio.getDate() - 29);
      return { inicio: inicio.toISOString(), fim: fim.toISOString() };
    case "este_mes": {
      const i = new Date(now.getFullYear(), now.getMonth(), 1);
      return { inicio: i.toISOString(), fim: fim.toISOString() };
    }
    case "mes_anterior": {
      const i = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const f = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { inicio: i.toISOString(), fim: f.toISOString() };
    }
    case "este_ano": {
      const i = new Date(now.getFullYear(), 0, 1);
      return { inicio: i.toISOString(), fim: fim.toISOString() };
    }
    case "custom":
      return {
        inicio: custom?.ini ? new Date(custom.ini).toISOString() : inicio.toISOString(),
        fim: custom?.fim ? new Date(custom.fim + "T23:59:59").toISOString() : fim.toISOString(),
      };
  }
}

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "este_mes", label: "Este mês" },
  { id: "mes_anterior", label: "Mês anterior" },
  { id: "este_ano", label: "Este ano" },
  { id: "custom", label: "Personalizado" },
];

const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const STATUS_QUERY_MAP: Record<string, string[]> = {
  Novo: ["novo"],
  "Contato Realizado": ["conversando", "visita", "proposta", "ganho"],
  Qualificado: ["conversando", "visita", "proposta", "ganho"],
  "Visita Agendada": ["visita", "proposta", "ganho"],
  Proposta: ["proposta", "ganho"],
  Venda: ["ganho"],
  Descartados: ["perdido"],
};

function DashboardCRM() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [custom, setCustom] = useState<{ ini: string; fim: string }>({ ini: "", fim: "" });
  const [corretorId, setCorretorId] = useState<string>("");
  const [origemFiltro, setOrigemFiltro] = useState<string>("");
  const [serieMetricas, setSerieMetricas] = useState<Record<string, boolean>>({
    leads: true,
    visitas: true,
    propostas: true,
    vendas: true,
    vgv: false,
  });

  const range = useMemo(() => rangeFor(periodo, custom), [periodo, custom]);
  const callStats = useServerFn(dashboardStats);

  const stats = useQuery({
    queryKey: ["dashboard", range.inicio, range.fim, corretorId, origemFiltro],
    queryFn: () =>
      callStats({
        data: {
          inicio: range.inicio,
          fim: range.fim,
          corretor_id: corretorId || null,
          origem: origemFiltro || null,
        },
      }),
  });

  const corretores = useQuery({
    queryKey: ["admin", "corretores", "lite"],
    queryFn: () => adminListarCorretores(),
    enabled: !!stats.data?.isPrivileged,
  });

  const d = stats.data;

  // Base search params carried into every drill-down link.
  // Note: corretorId from this page references corretores.id, while /admin/leads
  // filters by assigned_to (user_id). We only carry corretor_id when set from
  // the ranking rows, which provide the proper user_id.
  const baseSearch = useMemo(() => {
    const s: Record<string, string> = {};
    if (range.inicio) s.inicio = range.inicio.slice(0, 10);
    if (range.fim) s.fim = range.fim.slice(0, 10);
    if (origemFiltro) s.origem = origemFiltro;
    return s;
  }, [range, origemFiltro]);

  const buildSearch = (extra: Record<string, string | undefined>) => {
    const merged: Record<string, string> = { ...baseSearch };
    for (const [k, v] of Object.entries(extra)) {
      if (v) merged[k] = v;
    }
    return merged;
  };

  return (
    <div className="space-y-6">
      {/* Header + filtros globais */}
      <div className="flex flex-col gap-4">
        <div>
          <AdminPageHeader
            eyebrow="Principal"
            title="Dashboard Comercial"
          />
<p className="text-sm text-muted-foreground mt-1">
            Indicadores em tempo real, gargalos e oportunidades.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 bg-card border border-foreground/5 rounded-lg p-4">
          <div className="flex flex-wrap gap-1">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  periodo === p.id
                    ? "bg-gold/20 border-gold text-gold"
                    : "border-foreground/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {periodo === "custom" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={custom.ini}
                onChange={(e) => setCustom((c) => ({ ...c, ini: e.target.value }))}
                className="bg-background border border-foreground/10 rounded px-2 py-1 text-sm"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                type="date"
                value={custom.fim}
                onChange={(e) => setCustom((c) => ({ ...c, fim: e.target.value }))}
                className="bg-background border border-foreground/10 rounded px-2 py-1 text-sm"
              />
            </div>
          )}
          {d?.isPrivileged && (
            <select
              value={corretorId}
              onChange={(e) => setCorretorId(e.target.value)}
              className="bg-background border border-foreground/10 rounded px-2 py-1 text-sm"
            >
              <option value="">Todos os corretores</option>
              {corretores.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.nome, c.sobrenome].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          )}
          <select
            value={origemFiltro}
            onChange={(e) => setOrigemFiltro(e.target.value)}
            className="bg-background border border-foreground/10 rounded px-2 py-1 text-sm"
          >
            <option value="">Todas as origens</option>
            {d?.origens.map((o) => (
              <option key={o.nome} value={o.nome}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {stats.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {stats.error && <p className="text-sm text-destructive">Erro ao carregar indicadores.</p>}

      {d && (
        <>
          {/* BLOCO 1 — Resumo Executivo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ResumoCard
              label="Leads Recebidos"
              valor={d.resumo.leads.atual}
              extra={
                <DeltaBadge delta={d.resumo.leads.deltaPct} suffix="em relação ao período anterior" />
              }
              icon={Users}
              search={buildSearch({})}
            />
            <ResumoCard
              label="Visitas Agendadas"
              valor={d.resumo.visitas.atual}
              extra={<span className="text-xs text-muted-foreground">{d.resumo.visitas.conversao}% de conversão</span>}
              icon={CalendarCheck}
              search={buildSearch({ status: "visita,proposta,ganho" })}
            />
            <ResumoCard
              label="Propostas Enviadas"
              valor={d.resumo.propostas.atual}
              extra={<span className="text-xs text-muted-foreground">{d.resumo.propostas.conversao}% de conversão</span>}
              icon={FileText}
              search={buildSearch({ status: "proposta,ganho" })}
            />
            <ResumoCard
              label="Vendas Fechadas"
              valor={d.resumo.vendas.atual}
              extra={<span className="text-xs text-gold">{moeda(d.resumo.vendas.vgv)} em VGV</span>}
              icon={Trophy}
              search={buildSearch({ status: "ganho" })}
            />
          </div>


          {/* BLOCO 2 — IA Comercial */}
          <div className="bg-gradient-to-br from-gold/10 via-card to-card border border-gold/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5 text-gold" />
              <h2 className="font-display text-xl">Assistente Comercial</h2>
            </div>
            {d.insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há dados suficientes para gerar insights neste período.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {d.insights.map((ins, i) => (
                  <div key={i} className="flex gap-3 items-start text-sm">
                    <InsightIcon tipo={ins.tipo} />
                    <p className="text-foreground/90">{ins.mensagem}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* BLOCO 3 — Funil de Vendas */}
            <div className="lg:col-span-2 bg-card border border-foreground/5 rounded-lg p-6">
              <h2 className="font-display text-xl mb-4">Funil de Vendas</h2>
              <div className="space-y-2">
                {d.funil.map((etapa, i) => {
                  const max = d.funil[0]?.quantidade || 1;
                  const pct = max > 0 ? (etapa.quantidade / max) * 100 : 0;
                  const isDescarte = etapa.etapa === "Descartados";
                  return (
                    <Link
                      key={etapa.etapa}
                      to="/admin/leads"
                      search={buildSearch({ status: STATUS_QUERY_MAP[etapa.etapa]?.join(",") }) as never}
                      className="block group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{etapa.etapa}</span>
                        <span className="text-muted-foreground">
                          {etapa.quantidade} {!isDescarte && i > 0 && <>· {etapa.conversao}%</>}
                          {etapa.perda > 0 && !isDescarte && (
                            <span className="text-destructive ml-2">−{etapa.perda}</span>
                          )}
                        </span>
                      </div>
                      <div className="h-7 bg-secondary rounded overflow-hidden">
                        <div
                          className={`h-full ${isDescarte ? "bg-destructive/40" : "bg-gold/70 group-hover:bg-gold"} transition-colors`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* BLOCO 4 — Alertas Inteligentes */}
            <div className="bg-card border border-foreground/5 rounded-lg p-6">
              <h2 className="font-display text-xl mb-4 flex items-center gap-2">
                <Flame className="size-5 text-destructive" /> Alertas
              </h2>
              <div className="space-y-3">
                <AlertaItem n={d.alertas.semAtendimento} label="Leads sem primeiro contato (+24h)" search={buildSearch({ alerta: "sem_atendimento" })} />
                <AlertaItem n={d.alertas.semFollowup} label="Clientes sem follow-up (+3 dias)" search={buildSearch({ alerta: "sem_followup" })} />
                <AlertaItem n={d.alertas.visitasSemFeedback} label="Visitas sem feedback (+3 dias)" search={buildSearch({ alerta: "visitas_sem_feedback" })} />
                <AlertaItem n={d.alertas.propostasParadas} label="Propostas sem atualização (+5 dias)" search={buildSearch({ alerta: "propostas_paradas" })} />
              </div>
            </div>
          </div>

          {/* BLOCO 5 — Evolução Comercial */}
          <div className="bg-card border border-foreground/5 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-display text-xl flex items-center gap-2">
                <ChartLine className="size-5 text-gold" /> Evolução Comercial
              </h2>
              <div className="flex gap-2 flex-wrap">
                {(["leads", "visitas", "propostas", "vendas", "vgv"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSerieMetricas((s) => ({ ...s, [m]: !s[m] }))}
                    className={`text-xs px-2 py-1 rounded border ${
                      serieMetricas[m]
                        ? "bg-gold/20 border-gold text-gold"
                        : "border-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {m === "vgv" ? "VGV" : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={d.serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend />
                  {serieMetricas.leads && <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} />}
                  {serieMetricas.visitas && <Line type="monotone" dataKey="visitas" stroke="#a855f7" strokeWidth={2} />}
                  {serieMetricas.propostas && <Line type="monotone" dataKey="propostas" stroke="#f59e0b" strokeWidth={2} />}
                  {serieMetricas.vendas && <Line type="monotone" dataKey="vendas" stroke="#10b981" strokeWidth={2} />}
                  {serieMetricas.vgv && <Line type="monotone" dataKey="vgv" stroke="#d4af37" strokeWidth={2} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* BLOCO 6 — Origem dos leads */}
            <div className="bg-card border border-foreground/5 rounded-lg p-6">
              <h2 className="font-display text-xl mb-4">Origem dos Leads</h2>
              {d.origens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem leads no período.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="h-56">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={d.origens}
                          dataKey="quantidade"
                          nameKey="nome"
                          innerRadius={45}
                          outerRadius={80}
                          onClick={(slice: { nome?: string }) => {
                            if (slice?.nome) {
                              window.location.href =
                                "/admin/leads?" +
                                new URLSearchParams(buildSearch({ origem: slice.nome })).toString();
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {d.origens.map((_, i) => (
                            <Cell
                              key={i}
                              fill={["#d4af37", "#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#64748b"][i % 7]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {d.origens.map((o, i) => (
                      <Link
                        key={o.nome}
                        to="/admin/leads"
                        search={buildSearch({ origem: o.nome }) as never}
                        className="flex items-center justify-between gap-2 hover:bg-muted/40 rounded px-1 py-0.5"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{
                              background: ["#d4af37", "#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#64748b"][i % 7],
                            }}
                          />
                          {o.nome}
                        </span>
                        <span className="text-muted-foreground">
                          {o.quantidade} · {o.percentual}% · conv. {o.conversao}%
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BLOCO 7 — Taxas de Conversão */}
            <div className="bg-card border border-foreground/5 rounded-lg p-6">
              <h2 className="font-display text-xl mb-4">Taxas de Conversão</h2>
              <div className="space-y-3">
                {d.taxas.map((t) => {
                  const atingiu = t.atual >= t.meta;
                  return (
                    <div key={t.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{t.label}</span>
                        <span className={atingiu ? "text-gold" : "text-muted-foreground"}>
                          {t.atual}% <span className="text-muted-foreground/70">/ meta {t.meta}%</span>
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded overflow-hidden">
                        <div
                          className={`h-full ${atingiu ? "bg-gold" : "bg-foreground/40"}`}
                          style={{ width: `${Math.min((t.atual / t.meta) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BLOCO 8 — Desempenho Individual */}
          {d.desempenho && (
            <div className="bg-card border border-foreground/5 rounded-lg p-6">
              <h2 className="font-display text-xl mb-4">Seu Desempenho</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Mini label="Leads" v={d.desempenho.leads} />
                <Mini label="Visitas" v={d.desempenho.visitas} />
                <Mini label="Propostas" v={d.desempenho.propostas} />
                <Mini label="Vendas" v={d.desempenho.vendas} />
                <Mini label="VGV" v={moeda(d.desempenho.vgv)} />
              </div>
            </div>
          )}

          {/* BLOCO 9 — Ranking */}
          {d.isPrivileged && d.ranking.length > 0 && (
            <div className="bg-card border border-foreground/5 rounded-lg p-6">
              <h2 className="font-display text-xl mb-4">Ranking da Equipe (Top 10)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase">
                    <tr className="border-b border-foreground/5">
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">Corretor</th>
                      <th className="text-right py-2">Leads</th>
                      <th className="text-right py-2">Visitas</th>
                      <th className="text-right py-2">Propostas</th>
                      <th className="text-right py-2">Vendas</th>
                      <th className="text-right py-2">Conv.</th>
                      <th className="text-right py-2">VGV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.ranking.map((r, i) => {
                      const rowSearch = buildSearch({ corretor_id: r.user_id ?? undefined });
                      const goTo = () =>
                        (window.location.href = "/admin/leads?" + new URLSearchParams(rowSearch).toString());
                      return (
                        <tr
                          key={r.corretor_id}
                          onClick={goTo}
                          className="border-b border-foreground/5 last:border-0 cursor-pointer hover:bg-muted/40"
                        >
                          <td className="py-2">{i + 1}</td>
                          <td className="py-2 font-medium">{r.nome}</td>
                          <td className="py-2 text-right">{r.leads}</td>
                          <td className="py-2 text-right">{r.visitas}</td>
                          <td className="py-2 text-right">{r.propostas}</td>
                          <td className="py-2 text-right">{r.vendas}</td>
                          <td className="py-2 text-right">{r.conversao}%</td>
                          <td className="py-2 text-right text-gold">{moeda(r.vgv)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResumoCard({
  label,
  valor,
  extra,
  icon: Icon,
  search,
}: {
  label: string;
  valor: number;
  extra: React.ReactNode;
  icon: typeof Users;
  search: Record<string, string>;
}) {
  return (
    <Link
      to="/admin/leads"
      search={search as never}
      className="bg-card border border-foreground/5 rounded-lg p-5 hover:border-gold transition-colors block"
    >
      <Icon className="size-5 text-gold mb-3" strokeWidth={1.5} />
      <p className="text-3xl font-display">{valor}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
      <div className="mt-2">{extra}</div>
    </Link>
  );
}


function DeltaBadge({ delta, suffix }: { delta: number; suffix: string }) {
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`text-xs flex items-center gap-1 ${up ? "text-emerald-500" : "text-destructive"}`}>
      <Icon className="size-3" />
      {up ? "+" : ""}
      {delta}% <span className="text-muted-foreground">{suffix}</span>
    </span>
  );
}

function AlertaItem({ n, label, search }: { n: number; label: string; search: Record<string, string> }) {
  if (n === 0) return null;
  return (
    <Link to="/admin/leads" search={search as never} className="flex items-center justify-between gap-3 group">
      <span className="text-sm">{label}</span>
      <span className="bg-destructive/15 text-destructive text-xs font-bold px-2 py-0.5 rounded-full group-hover:bg-destructive/25">
        {n}
      </span>
    </Link>
  );
}

function Mini({ label, v }: { label: string; v: number | string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-display mt-1">{v}</p>
    </div>
  );
}

function InsightIcon({ tipo }: { tipo: "performance" | "gargalo" | "oportunidade" | "alerta" | "previsao" }) {
  const map = {
    performance: { I: TrendingUp, c: "text-emerald-500" },
    gargalo: { I: TrendingDown, c: "text-amber-500" },
    oportunidade: { I: Lightbulb, c: "text-gold" },
    alerta: { I: AlertTriangle, c: "text-destructive" },
    previsao: { I: ChartLine, c: "text-blue-500" },
  };
  const { I, c } = map[tipo];
  return <I className={`size-4 mt-0.5 shrink-0 ${c}`} />;
}
