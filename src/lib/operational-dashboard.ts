import type { FunnelLead } from "@/lib/commercial-funnel";

/** RM Prime operational dashboard model, computed only from real tenant CRM leads. */
export const ETAPAS_OPERACIONAIS = ["novo", "conversando", "visita", "proposta", "ganho", "perdido", "descartado"] as const;
const FECHADOS = ["ganho", "perdido", "descartado"];

export function summarizeOperational(leads: FunnelLead[], now = new Date()) {
  const ativos = leads.filter((l) => !FECHADOS.includes(l.status));
  const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const propostas = leads.filter((l) => l.status === "proposta").length;
  const fechados = leads.filter((l) => l.status === "ganho").length;
  const parados = ativos.filter((l) => inicioHoje - new Date(l.updated_at).getTime() >= 7 * 86_400_000).length;
  const semAtendimento = ativos.filter((l) => l.status === "novo").length;
  const etapas = ETAPAS_OPERACIONAIS.map((etapa) => ({ etapa, total: leads.filter((l) => l.status === etapa).length }));
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const total = leads.filter((l) => { const c = new Date(l.created_at); return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth(); }).length;
    return { mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), total };
  });
  const agrupar = (key: (l: FunnelLead) => string) => {
    const m = new Map<string, number>();
    for (const l of leads) m.set(key(l), (m.get(key(l)) ?? 0) + 1);
    return [...m.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  };
  const origens = agrupar((l) => l.origem?.trim() || "Não informada");
  const corretores = agrupar((l) => (l.assigned_to ? l.corretor_nome?.trim() || "Corretor sem nome" : "Sem atribuição")).slice(0, 6);
  const taxaConversao = leads.length ? Math.round((fechados / leads.length) * 100) : 0;
  return { ativos: ativos.length, propostas, fechados, parados, semAtendimento, etapas, meses, origens, corretores, taxaConversao, total: leads.length };
}
