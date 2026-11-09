import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { AlertCircle, Building2, CalendarDays, CircleDollarSign, Clock3, Lightbulb, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { funilComercial } from "@/lib/api/leads-crm.functions";
import { adminListarImoveis } from "@/lib/api/property-admin.functions";
import { summarizeOperational } from "@/lib/operational-dashboard";

const ROTULO: Record<string, string> = { novo: "Novo", conversando: "Conversando", visita: "Visita", proposta: "Proposta", ganho: "Negócio fechado", perdido: "Perdido", descartado: "Descartado" };
const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const CORES_ETAPA: Record<string, string> = {
  novo: "var(--crm-novo)",
  conversando: "var(--crm-conversando)",
  visita: "var(--crm-visita)",
  proposta: "var(--crm-proposta)",
  ganho: "var(--crm-fechado)",
  perdido: "var(--muted-foreground)",
  descartado: "var(--muted-foreground)",
};
const TOOLTIP = { border: "1px solid var(--border)", borderRadius: 6, background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 };
const EIXO = { fill: "var(--muted-foreground)", fontSize: 11 };

/** Operational dashboard imported from the approved RM Prime /painel model, fed only by this tenant's real data. */
export function OperationalDashboard() {
  const leadsFn = useServerFn(funilComercial);
  const imoveisFn = useServerFn(adminListarImoveis);
  const leadsQ = useQuery({ queryKey: ["sales-funnel-cockpit"], queryFn: () => leadsFn() });
  const imoveisQ = useQuery({ queryKey: ["commercial-cockpit-imoveis"], queryFn: () => imoveisFn() });
  if (leadsQ.isPending || leadsQ.isError) return null;
  const s = summarizeOperational(leadsQ.data ?? []);
  const imoveisAtivos = ((imoveisQ.data as unknown as { status: string }[] | undefined) ?? []).filter((i) => i.status === "ativo").length;
  const etapas = s.etapas.map((e) => ({ ...e, chave: e.etapa, etapa: ROTULO[e.etapa] }));
  const origemPrincipal = s.origens[0];

  return (
    <section aria-labelledby="operacao-title" className="space-y-5">
      <h2 id="operacao-title" className="sr-only">Visão geral da operação</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icone: Building2, rotulo: "Imóveis ativos", valor: imoveisQ.isSuccess ? imoveisAtivos : "—" },
          { icone: Users, rotulo: "Leads ativos", valor: s.ativos },
          { icone: TrendingUp, rotulo: "Em proposta", valor: s.propostas },
          { icone: CircleDollarSign, rotulo: "Negócios fechados", valor: s.fechados },
        ].map((k) => (
          <div key={k.rotulo} className="rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft">
            <div className="flex items-center justify-between"><k.icone className="size-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Agora</span></div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{k.valor}</p>
            <p className="mt-1 text-sm text-muted-foreground">{k.rotulo}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <Grafico titulo="Leads nos últimos 6 meses" descricao="Novas oportunidades recebidas por mês">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s.meses} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={EIXO} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={EIXO} />
                <Tooltip contentStyle={TOOLTIP} />
                <Line type="monotone" dataKey="total" name="Leads" stroke="var(--chart-2)" strokeWidth={3} dot={{ fill: "var(--chart-2)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Grafico>
          <Grafico titulo="Funil de vendas" descricao="Distribuição atual por etapa">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={etapas} layout="vertical" margin={{ top: 0, right: 8, left: 14, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={EIXO} />
                <YAxis type="category" dataKey="etapa" width={100} axisLine={false} tickLine={false} tick={EIXO} />
                <Tooltip contentStyle={TOOLTIP} />
                <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]}>
                  {etapas.map((e) => <Cell key={e.chave} fill={CORES_ETAPA[e.chave] ?? "var(--primary)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Grafico>
          <Grafico titulo="Origem dos leads" descricao="Canais que mais geram oportunidades">
            {s.total ? (
              <div className="flex h-full items-center gap-3">
                <ResponsiveContainer width="52%" height="100%">
                  <PieChart>
                    <Pie data={s.origens} dataKey="total" nameKey="nome" innerRadius={48} outerRadius={76} paddingAngle={3}>
                      {s.origens.map((o, i) => <Cell key={o.nome} fill={CORES[i % CORES.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="min-w-0 flex-1 space-y-2">
                  {s.origens.slice(0, 5).map((o, i) => (
                    <li key={o.nome} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2 text-muted-foreground"><span className="size-2.5 shrink-0 rounded-sm" style={{ background: CORES[i % CORES.length] }} /><span className="truncate capitalize">{o.nome}</span></span>
                      <strong>{o.total}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <Vazio />}
          </Grafico>
          <Grafico titulo="Leads por corretor" descricao="Carteira atual da equipe">
            {s.total ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.corretores} margin={{ top: 8, right: 8, left: -24, bottom: 24 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="nome" axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={54} tick={EIXO} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={EIXO} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Bar dataKey="total" name="Leads" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Vazio />}
          </Grafico>
        </div>

        <aside className="overflow-hidden rounded-2xl border border-border bg-workspace-elevated shadow-soft">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2"><Lightbulb className="size-5 text-primary" /><h3 className="text-lg font-semibold">Alertas e insights</h3></div>
            <p className="mt-1 text-sm text-muted-foreground">Prioridades da operação neste momento.</p>
          </div>
          <div className="divide-y divide-border">
            <Insight icone={CalendarDays} titulo="Tarefas dos próximos 7 dias" texto="A agenda consolidada ainda não está disponível neste painel; consulte as tarefas em cada lead do CRM." />
            <Insight icone={AlertCircle} titulo={`${s.semAtendimento} sem atendimento`} texto="Leads ativos ainda na etapa Novo." />
            <Insight icone={Clock3} titulo={`${s.parados} parados há 7 dias`} texto="Oportunidades sem atualização recente no funil." />
            <Insight icone={TrendingUp} titulo={`${s.propostas} em proposta`} texto="Negociações que merecem acompanhamento próximo." />
          </div>
          <div className="border-t border-border bg-muted/50 p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Leitura rápida</p>
            <p className="mt-2 text-sm leading-relaxed">A conversão geral está em <strong>{s.taxaConversao}%</strong>{origemPrincipal ? <> e <strong className="capitalize">{origemPrincipal.nome}</strong> é a principal origem, com {origemPrincipal.total} lead(s).</> : "."}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Grafico({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft">
      <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
      <div className="mt-4 h-64">{children}</div>
    </section>
  );
}

function Vazio() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Os dados aparecerão com os novos leads.</div>;
}

function Insight({ icone: Icone, titulo, texto }: { icone: typeof AlertCircle; titulo: string; texto: string }) {
  return (
    <div className="flex gap-3 p-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icone className="size-4" /></div>
      <div className="min-w-0"><p className="text-sm font-semibold">{titulo}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{texto}</p></div>
    </div>
  );
}
