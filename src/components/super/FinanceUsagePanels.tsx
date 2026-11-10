import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Building2, CircleDollarSign, Image, Loader2, Users, Home, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSuperFinanceUsage, type SuperFinanceUsageTenant } from "@/lib/api/super-control-plane.functions";

const PALETTE = ["#0f766e", "#c9a227", "#475569", "#c2410c", "#16a34a", "#7c3aed"];
const brl = (minor: number) => (minor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const SUB_LABEL: Record<string, string> = { active: "Em dia", trialing: "Em teste", past_due: "Em atraso", canceled: "Cancelada", suspended: "Suspensa" };
const LIMIT_KEYS: Record<keyof Pick<SuperFinanceUsageTenant, "imoveisAtivos" | "leads30d" | "corretoresAtivos" | "membros">, string[]> = {
  imoveisAtivos: ["max_properties", "max_imoveis", "properties.max"],
  leads30d: ["max_leads_month", "leads.monthly_max"],
  corretoresAtivos: ["max_brokers", "max_corretores"],
  membros: ["max_users", "max_seats", "users.max"],
};

function useData() { return useQuery({ queryKey: ["super-finance-usage"], queryFn: () => getSuperFinanceUsage(), staleTime: 30_000 }); }

function Shell({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl space-y-6 pb-12"><header><div className="flex items-center gap-2 text-primary">{icon}<h1 className="text-2xl font-semibold text-foreground">{title}</h1></div><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></header>{children}</div>;
}
function Kpi({ label, value, hint, icon, color }: { label: string; value: string | number; hint?: string; icon: React.ReactNode; color: string }) {
  return <Card className="p-5"><div className="flex items-center gap-3"><div className="rounded-lg p-2" style={{ background: `${color}1a`, color }}>{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div></div>{hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}</Card>;
}
function Status({ q }: { q: ReturnType<typeof useData> }) {
  if (q.isLoading) return <Card className="flex items-center gap-2 p-6 text-sm"><Loader2 className="size-4 animate-spin" />Carregando…</Card>;
  return <Card className="flex items-center gap-2 p-6 text-sm text-destructive"><AlertTriangle className="size-4" />{q.error instanceof Error ? q.error.message : "Falha ao carregar."}</Card>;
}

export function FinancePanel() {
  const q = useData();
  if (!q.data) return <Shell title="Financeiro" subtitle="Planos, receita prevista e situação de cada empresa." icon={<CircleDollarSign className="size-5" />}><Status q={q} /></Shell>;
  const t = q.data.tenants;
  const mrr = t.reduce((s, x) => s + (x.subscriptionStatus === "active" || x.subscriptionStatus === "trialing" || !x.subscriptionStatus ? x.monthlyAmountMinor ?? 0 : 0), 0);
  const priced = t.filter((x) => x.monthlyAmountMinor != null).length;
  const byPlan = Object.entries(t.reduce<Record<string, number>>((a, x) => { const k = x.planName ?? x.planCode ?? "Sem plano"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value }));
  const late = t.filter((x) => x.subscriptionStatus === "past_due").length;
  return <Shell title="Financeiro" subtitle="Planos, receita prevista e situação de cada empresa." icon={<CircleDollarSign className="size-5" />}>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label="Receita mensal prevista" value={brl(mrr)} hint={priced ? `${priced} empresa(s) com preço de plano` : "Nenhum plano tem preço cadastrado ainda"} icon={<TrendingUp className="size-5" />} color={PALETTE[0]} />
      <Kpi label="Empresas clientes" value={t.length} hint={`${t.filter((x) => x.status === "ativo" || x.status === "active").length} ativas`} icon={<Building2 className="size-5" />} color={PALETTE[1]} />
      <Kpi label="Planos no catálogo" value={q.data.plans.length} icon={<CircleDollarSign className="size-5" />} color={PALETTE[2]} />
      <Kpi label="Em atraso" value={late} hint="Assinaturas com pagamento pendente" icon={<AlertTriangle className="size-5" />} color={PALETTE[3]} />
    </div>
    <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <Card className="p-5"><h2 className="mb-3 font-semibold">Empresas por plano</h2>
        <div className="h-64"><ResponsiveContainer><PieChart><Pie data={byPlan} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>{byPlan.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
      </Card>
      <Card className="overflow-x-auto p-5"><h2 className="mb-3 font-semibold">Situação por empresa</h2>
        <table className="w-full min-w-[600px] text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr className="border-b"><th className="py-2">Empresa</th><th>Plano</th><th>Desde</th><th>Mensalidade</th><th>Situação</th></tr></thead>
          <tbody>{t.map((x) => <tr key={x.id} className="border-b last:border-0"><td className="py-3 font-medium">{x.nome}</td><td>{x.planName ?? x.planCode ?? "—"}</td><td>{new Date(x.createdAt).toLocaleDateString("pt-BR")}</td><td>{x.monthlyAmountMinor != null ? brl(x.monthlyAmountMinor) : <span className="text-muted-foreground">Sem preço</span>}</td><td><Badge variant={x.subscriptionStatus === "past_due" ? "destructive" : "outline"}>{x.subscriptionStatus ? SUB_LABEL[x.subscriptionStatus] ?? x.subscriptionStatus : "Sem assinatura"}</Badge></td></tr>)}</tbody>
        </table>
      </Card>
    </div>
    <p className="text-xs text-muted-foreground">Valores previstos a partir dos preços cadastrados nos planos. A cobrança automática ainda não está ligada, então nada aqui foi cobrado de fato.</p>
  </Shell>;
}

export function UsagePanel() {
  const q = useData();
  if (!q.data) return <Shell title="Consumo" subtitle="Quanto cada empresa usa da plataforma." icon={<Activity className="size-5" />}><Status q={q} /></Shell>;
  const t = q.data.tenants;
  const tot = (k: keyof SuperFinanceUsageTenant) => t.reduce((s, x) => s + (x[k] as number), 0);
  const chart = t.map((x) => ({ name: x.nome, Imóveis: x.imoveisAtivos, "Leads 30d": x.leads30d, Corretores: x.corretoresAtivos }));
  const limitOf = (x: SuperFinanceUsageTenant, k: keyof typeof LIMIT_KEYS) => LIMIT_KEYS[k].map((key) => x.limits[key]).find((v) => v != null);
  const near = t.flatMap((x) => (Object.keys(LIMIT_KEYS) as (keyof typeof LIMIT_KEYS)[]).map((k) => { const lim = limitOf(x, k); return lim ? { x, k, used: x[k], lim, pct: Math.round((x[k] / lim) * 100) } : null; }).filter((v): v is NonNullable<typeof v> => !!v && v.pct >= 80));
  const LABEL: Record<string, string> = { imoveisAtivos: "Imóveis ativos", leads30d: "Leads no mês", corretoresAtivos: "Corretores", membros: "Usuários" };
  return <Shell title="Consumo" subtitle="Quanto cada empresa usa da plataforma." icon={<Activity className="size-5" />}>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label="Imóveis ativos" value={tot("imoveisAtivos")} hint={`${tot("imoveisTotal")} cadastrados`} icon={<Home className="size-5" />} color={PALETTE[0]} />
      <Kpi label="Leads nos últimos 30 dias" value={tot("leads30d")} icon={<TrendingUp className="size-5" />} color={PALETTE[1]} />
      <Kpi label="Corretores ativos" value={tot("corretoresAtivos")} hint={`${tot("membros")} usuários com acesso`} icon={<Users className="size-5" />} color={PALETTE[2]} />
      <Kpi label="Fotos armazenadas" value={tot("fotos")} icon={<Image className="size-5" />} color={PALETTE[3]} />
    </div>
    <Card className="p-5"><h2 className="mb-3 font-semibold">Uso por empresa</h2>
      <div className="h-72"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="Imóveis" fill={PALETTE[0]} radius={[4, 4, 0, 0]} /><Bar dataKey="Leads 30d" fill={PALETTE[1]} radius={[4, 4, 0, 0]} /><Bar dataKey="Corretores" fill={PALETTE[3]} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
    </Card>
    <Card className="p-5"><h2 className="mb-1 font-semibold">Perto do limite do plano</h2>
      {near.length ? <div className="mt-3 space-y-3">{near.map(({ x, k, used, lim, pct }) => <div key={x.id + k}><div className="flex justify-between text-sm"><span>{x.nome} · {LABEL[k]}</span><span className={pct >= 100 ? "text-destructive" : "text-warning"}>{used}/{lim} ({pct}%)</span></div><div className="mt-1 h-2 rounded bg-muted"><div className={`h-2 rounded ${pct >= 100 ? "bg-destructive" : "bg-warning"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div></div>)}</div>
        : <p className="text-sm text-muted-foreground">Nenhuma empresa está perto do limite. Limites aparecem aqui quando forem definidos nos planos.</p>}
    </Card>
  </Shell>;
}
