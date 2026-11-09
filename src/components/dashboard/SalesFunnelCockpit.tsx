import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlarmClock, UserX, Users } from "lucide-react";
import { funilComercial } from "@/lib/api/leads-crm.functions";
import { summarizeFunnel } from "@/lib/commercial-funnel";

const LABEL: Record<string, string> = { novo: "Novos leads", conversando: "Em atendimento", visita: "Visita agendada", proposta: "Proposta", ganho: "Fechamento" };
const pct = (n: number) => `${Math.round(n * 100)}%`;

export function SalesFunnelCockpit() {
  const fn = useServerFn(funilComercial);
  const q = useQuery({ queryKey: ["sales-funnel-cockpit"], queryFn: () => fn() });
  if (q.isPending || q.isError) return null;
  const s = summarizeFunnel(q.data ?? []);
  const topo = s.etapas[0].total;
  const equipe = Object.entries(s.porResponsavel).filter(([k]) => k !== "sem_responsavel").sort((a, b) => b[1].ganhos - a[1].ganhos || b[1].abertos - a[1].abertos);

  return (
    <section aria-labelledby="funil-title" className="rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft">
      <h2 id="funil-title" className="text-lg font-semibold text-foreground">Funil comercial e atendimento</h2>
      <p className="text-xs text-muted-foreground">Calculado a partir dos leads do CRM desta empresa.</p>
      {topo === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum lead recebido ainda. Os indicadores aparecem com o primeiro contato.</p> : (
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="text-sm font-medium text-foreground">Pipeline de oportunidades</h3>
            <ul className="mt-2 space-y-2">
              {s.etapas.map((e, i) => (
                <li key={e.stage}>
                  <div className="flex justify-between text-sm">
                    <span>{LABEL[e.stage]}</span>
                    <span className="text-muted-foreground">{e.total}{i > 0 ? ` · ${pct(s.conversoes[i - 1].taxa)} da etapa anterior` : ""}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(e.total / topo) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between text-muted-foreground"><span className="text-[11px] uppercase tracking-[0.14em]">Sem interação 48h+</span><AlarmClock className="size-4" /></div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{s.semInteracao.length}<span className="text-sm font-normal text-muted-foreground"> / {s.abertos} abertos</span></div>
              {s.semInteracao.slice(0, 3).map((l) => <p key={l.id} className="mt-1 truncate text-xs text-muted-foreground">{l.nome} · {new Date(l.updated_at).toLocaleDateString("pt-BR")}</p>)}
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between text-muted-foreground"><span className="text-[11px] uppercase tracking-[0.14em]">Sem corretor</span><UserX className="size-4" /></div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{s.semResponsavel}</div>
              <p className="text-xs text-muted-foreground">Leads abertos aguardando atribuição</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between text-muted-foreground"><span className="text-[11px] uppercase tracking-[0.14em]">Equipe</span><Users className="size-4" /></div>
              {equipe.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Nenhum lead atribuído a corretores ainda.</p> : (
                <ol className="mt-2 space-y-1 text-sm">
                  {equipe.slice(0, 5).map(([id, r], i) => <li key={id} className="flex justify-between"><span>Corretor {i + 1}</span><span className="text-muted-foreground">{r.abertos} abertos · {r.ganhos} ganhos</span></li>)}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
