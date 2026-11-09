import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Globe, Home, Inbox, Users } from "lucide-react";
import type { ReactNode } from "react";

type Kpis = {
  tenants: number; tenantsAtivos: number; users: number; imoveis: number; leads: number;
  leads24h: number; portalOk7d: number; portalErr7d: number; auditoria24h: number;
};
type Tenant = { id: string; nome: string; status: string; dominio_principal: string | null; owner_user_id: string | null };
type Stats = Record<string, { users: number; imoveis: number; leads: number }>;

export type Insight = { tone: "warn" | "ok"; title: string; detail: string };

/** Derives decision insights only from real measured data — never fabricated values. */
export function buildInsights(kpis: Kpis | undefined, tenants: Tenant[], stats: Stats): Insight[] {
  const out: Insight[] = [];
  if (!kpis) return out;
  const semDominio = tenants.filter(t => !t.dominio_principal).length;
  const semImoveis = tenants.filter(t => (stats[t.id]?.imoveis ?? 0) === 0).length;
  const inativos = kpis.tenants - kpis.tenantsAtivos;
  if (inativos > 0) out.push({ tone: "warn", title: `${inativos} empresa(s) não ativa(s)`, detail: "Revise status e onboarding para iniciar a operação." });
  if (semDominio > 0) out.push({ tone: "warn", title: `${semDominio} empresa(s) sem domínio próprio`, detail: "Domínio conectado aumenta credibilidade e captação." });
  if (semImoveis > 0) out.push({ tone: "warn", title: `${semImoveis} empresa(s) sem imóveis cadastrados`, detail: "Catálogo vazio impede geração de leads no site." });
  if (kpis.portalErr7d > 0) out.push({ tone: "warn", title: `${kpis.portalErr7d} falha(s) de sincronização com portais (7 dias)`, detail: "Verifique Observabilidade e a fila de reprocessamento." });
  if (out.length === 0) out.push({ tone: "ok", title: "Operação saudável", detail: "Nenhuma pendência crítica detectada nos dados atuais." });
  return out;
}

function Metric({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-[0.16em]">{label}</span>{icon}
      </div>
      <div className="mt-3 font-display text-4xl font-semibold text-foreground">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ExecutiveOverview({ kpis, tenants, stats }: { kpis: Kpis | undefined; tenants: Tenant[]; stats: Stats }) {
  const insights = buildInsights(kpis, tenants, stats);
  const ativacao = kpis && kpis.tenants > 0 ? Math.round((kpis.tenantsAtivos / kpis.tenants) * 100) : 0;
  const ranking = [...tenants].sort((a, b) => (stats[b.id]?.leads ?? 0) - (stats[a.id]?.leads ?? 0)).slice(0, 5);
  const maxLeads = Math.max(1, ...ranking.map(t => stats[t.id]?.leads ?? 0));

  return (
    <section aria-labelledby="exec-overview" className="space-y-5">
      <h2 id="exec-overview" className="sr-only">Visão executiva</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Building2 className="size-4" />} label="Empresas ativas" value={kpis ? `${kpis.tenantsAtivos}/${kpis.tenants}` : "—"} hint={`${ativacao}% de ativação da base`} />
        <Metric icon={<Inbox className="size-4" />} label="Leads" value={kpis?.leads ?? "—"} hint={kpis ? `+${kpis.leads24h} nas últimas 24h` : undefined} />
        <Metric icon={<Home className="size-4" />} label="Imóveis na plataforma" value={kpis?.imoveis ?? "—"} />
        <Metric icon={<Users className="size-4" />} label="Usuários" value={kpis?.users ?? "—"} hint="Receita (MRR) disponível após ativar cobrança" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold">O que precisa da sua atenção</h3>
            <Link to="/super/observabilidade" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">Observabilidade <ArrowRight className="size-3" /></Link>
          </div>
          <ul className="mt-4 space-y-3">
            {insights.map(i => (
              <li key={i.title} className="flex gap-3 rounded-lg bg-muted/50 p-3">
                {i.tone === "warn" ? <AlertTriangle className="size-5 shrink-0 text-accent-foreground" /> : <CheckCircle2 className="size-5 shrink-0 text-primary" />}
                <div><p className="font-medium text-sm">{i.title}</p><p className="text-xs text-muted-foreground">{i.detail}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h3 className="font-display text-xl font-semibold">Empresas que mais geram leads</h3>
          {ranking.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhuma empresa cadastrada.</p> : (
            <ul className="mt-4 space-y-3">
              {ranking.map(t => {
                const l = stats[t.id]?.leads ?? 0;
                return (
                  <li key={t.id}>
                    <div className="flex justify-between text-sm"><span className="font-medium truncate">{t.nome}</span><span className="text-muted-foreground">{l}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(l / maxLeads) * 100}%` }} /></div>
                    <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                      <span>{stats[t.id]?.imoveis ?? 0} imóveis</span>
                      <span className="inline-flex items-center gap-1"><Globe className="size-3" />{t.dominio_principal ?? "sem domínio"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
