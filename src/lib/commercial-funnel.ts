export type FunnelLead = { id: string; nome: string; status: string; assigned_to: string | null; created_at: string; updated_at: string; origem?: string | null };
export const FUNNEL_STAGES = ["novo", "conversando", "visita", "proposta", "ganho"] as const;
const OPEN = ["novo", "conversando", "visita", "proposta"];

/** Funnel from real CRM leads. A lead counts in every stage it reached (cumulative). "Sem interação" = open lead not updated for 48h+. */
export function summarizeFunnel(leads: FunnelLead[], now = new Date()) {
  const rank = (s: string) => FUNNEL_STAGES.indexOf(s as (typeof FUNNEL_STAGES)[number]);
  const etapas = FUNNEL_STAGES.map((stage, i) => ({ stage, total: leads.filter((l) => rank(l.status) >= i).length }));
  const conversoes = etapas.slice(1).map((e, i) => ({ de: etapas[i].stage, para: e.stage, taxa: etapas[i].total ? e.total / etapas[i].total : 0 }));
  const abertos = leads.filter((l) => OPEN.includes(l.status));
  const limite = now.getTime() - 48 * 3_600_000;
  const semInteracao = abertos.filter((l) => new Date(l.updated_at).getTime() < limite).sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const porResponsavel: Record<string, { abertos: number; ganhos: number }> = {};
  for (const l of leads) {
    const k = l.assigned_to ?? "sem_responsavel";
    const r = (porResponsavel[k] ??= { abertos: 0, ganhos: 0 });
    if (OPEN.includes(l.status)) r.abertos++;
    if (l.status === "ganho") r.ganhos++;
  }
  return { etapas, conversoes, abertos: abertos.length, semInteracao, semResponsavel: abertos.filter((l) => !l.assigned_to).length, porResponsavel };
}
