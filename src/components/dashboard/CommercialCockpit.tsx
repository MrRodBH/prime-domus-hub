import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Building, CircleDollarSign, Clock, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { adminListarImoveis } from "@/lib/api/property-admin.functions";
import { summarizePortfolio, type PortfolioItem } from "@/lib/commercial-portfolio";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: v >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v);
const STATUS: Record<string, string> = { ativo: "Ativos", reservado: "Reservados", vendido: "Vendidos", rascunho: "Rascunho", inativo: "Inativos" };

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] uppercase tracking-[0.14em]">{label}</span>{icon}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CommercialCockpit() {
  const listar = useServerFn(adminListarImoveis);
  const q = useQuery({ queryKey: ["commercial-cockpit-imoveis"], queryFn: () => listar() });
  if (q.isPending || q.isError) return null;
  const s = summarizePortfolio(((q.data as unknown as PortfolioItem[]) ?? []));
  const total = Object.values(s.porStatus).reduce((a, b) => a + b, 0);

  return (
    <section aria-labelledby="cockpit-title" className="rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft">
      <h2 id="cockpit-title" className="text-lg font-semibold text-foreground">Cockpit comercial da carteira</h2>
      <p className="text-xs text-muted-foreground">Calculado a partir dos imóveis cadastrados desta empresa.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<CircleDollarSign className="size-4" />} label="VGV em carteira" value={brl(s.vgv)} hint="Soma dos imóveis ativos com preço" />
        <Kpi icon={<Tag className="size-4" />} label="Ticket médio" value={s.ticketMedio ? brl(s.ticketMedio) : "—"} />
        <Kpi icon={<Building className="size-4" />} label="Imóveis ativos" value={`${s.ativos}/${total}`} hint={s.semPreco ? `${s.semPreco} sem preço publicado` : undefined} />
        <Kpi icon={<Clock className="size-4" />} label="Parados 60+ dias" value={s.parados.length} hint="Ativos sem atualização recente" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">Distribuição da carteira</h3>
          {total === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum imóvel cadastrado ainda. Cadastre o primeiro para ativar os indicadores.</p> : (
            <ul className="mt-2 space-y-2">
              {Object.entries(s.porStatus).map(([k, n]) => (
                <li key={k}>
                  <div className="flex justify-between text-sm"><span>{STATUS[k] ?? k}</span><span className="text-muted-foreground">{n}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / total) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">Revisar preço ou anúncio</h3>
          {s.parados.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum imóvel ativo parado há mais de 60 dias.</p> : (
            <ul className="mt-2 space-y-2">
              {s.parados.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                  <AlertTriangle className="size-4 shrink-0 text-accent-foreground" />
                  <span className="truncate">{p.titulo}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
