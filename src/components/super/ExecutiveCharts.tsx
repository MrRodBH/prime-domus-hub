import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Lightbulb, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateSuperAiInsights, getSuperFinanceUsage, getSuperLeadTrend } from "@/lib/api/super-control-plane.functions";

const PALETTE = ["#0f766e", "#c9a227", "#475569", "#c2410c", "#16a34a", "#7c3aed"];
const TIPO = {
  oportunidade: { icon: <TrendingUp className="size-4" />, color: PALETTE[4], label: "Oportunidade" },
  risco: { icon: <AlertTriangle className="size-4" />, color: PALETTE[3], label: "Risco" },
  acao: { icon: <Target className="size-4" />, color: PALETTE[0], label: "Ação" },
} as const;

export function ExecutiveCharts() {
  const trend = useQuery({ queryKey: ["super-lead-trend"], queryFn: () => getSuperLeadTrend(), staleTime: 60_000 });
  const usage = useQuery({ queryKey: ["super-finance-usage"], queryFn: () => getSuperFinanceUsage(), staleTime: 30_000 });
  const ai = useMutation({ mutationFn: useServerFn(generateSuperAiInsights) });
  const tenants = usage.data?.tenants ?? [];
  const ranking = [...tenants].sort((a, b) => b.leads30d - a.leads30d).slice(0, 8).map((t) => ({ name: t.nome, Leads: t.leads30d, Imóveis: t.imoveisAtivos }));
  const plans = Object.entries(tenants.reduce<Record<string, number>>((a, t) => { const k = t.planName ?? t.planCode ?? "Sem plano"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value }));
  const trendData = (trend.data ?? []).map((d) => ({ ...d, label: d.dia.slice(8, 10) + "/" + d.dia.slice(5, 7) }));

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-primary/5 p-5">
          <div className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /><div><h2 className="font-semibold">Insights da IA</h2><p className="text-xs text-muted-foreground">Diagnóstico comercial e operacional a partir dos dados reais.</p></div></div>
          <Button onClick={() => ai.mutate(undefined)} disabled={ai.isPending}>{ai.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}Atualizar análise inteligente</Button>
        </div>
        <div className="p-5">
          {ai.isError ? <p className="text-sm text-destructive">{ai.error instanceof Error ? ai.error.message : "Falha na análise."}</p>
            : !ai.data ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lightbulb className="size-4" />Clique em "Atualizar análise inteligente" para gerar o diagnóstico.</p>
            : <div className="space-y-4">
                <p className="text-sm">{ai.data.resumo}</p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ai.data.insights.map((i, n) => { const t = TIPO[i.tipo]; return (
                  <div key={n} className="rounded-lg border-l-4 bg-muted/30 p-4" style={{ borderLeftColor: t.color }}>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium" style={{ color: t.color }}>{t.icon}{t.label}</div>
                    <p className="font-medium">{i.titulo}</p><p className="mt-1 text-sm text-muted-foreground">{i.detalhe}</p>
                  </div>); })}</div>
                <p className="text-xs text-muted-foreground">Gerado em {new Date(ai.data.geradoEm).toLocaleString("pt-BR")}</p>
              </div>}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Evolução de leads — 30 dias</h2>
          <div className="h-64"><ResponsiveContainer><AreaChart data={trendData}><defs><linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.5} /><stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" interval={4} fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Area type="monotone" dataKey="leads" name="Leads" stroke={PALETTE[0]} strokeWidth={2} fill="url(#gLeads)" /></AreaChart></ResponsiveContainer></div>
        </Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Empresas por plano</h2>
          <div className="h-64"><ResponsiveContainer><PieChart><Pie data={plans} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={3}>{plans.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
        </Card>
      </div>
      <Card className="p-5"><h2 className="mb-3 font-semibold">Ranking de empresas — leads e imóveis ativos</h2>
        <div className="h-64"><ResponsiveContainer><BarChart data={ranking} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" width={140} fontSize={12} /><Tooltip /><Legend /><Bar dataKey="Leads" fill={PALETTE[1]} radius={[0, 4, 4, 0]} /><Bar dataKey="Imóveis" fill={PALETTE[2]} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
    </div>
  );
}
