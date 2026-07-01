import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado.");
}

/** Descarta um lead (motivo de desqualificação — antes de proposta). */
export const descartarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      lead_id: z.string().uuid(),
      motivo_id: z.string().uuid(),
      observacao: z.string().max(1000).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: motivo, error: eM } = await context.supabase
      .from("lead_discard_reasons")
      .select("id, nome, ativo")
      .eq("id", data.motivo_id)
      .maybeSingle();
    if (eM) throw new Error(eM.message);
    if (!motivo || !motivo.ativo) throw new Error("Motivo de descarte inválido.");

    const { error } = await context.supabase
      .from("leads")
      .update({
        status: "descartado",
        descarte_motivo_id: data.motivo_id,
        descarte_observacao: data.observacao ?? null,
        descartado_em: new Date().toISOString(),
        descartado_por: context.userId,
      } as never)
      .eq("id", data.lead_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Marca lead como perdido (só permitido a partir de 'proposta'). */
export const perderLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      lead_id: z.string().uuid(),
      motivo_id: z.string().uuid(),
      observacao: z.string().max(1000).optional().nullable(),
      valor_proposto: z.number().nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: motivo, error: eM } = await context.supabase
      .from("deal_lost_reasons")
      .select("id, nome, ativo")
      .eq("id", data.motivo_id)
      .maybeSingle();
    if (eM) throw new Error(eM.message);
    if (!motivo || !motivo.ativo) throw new Error("Motivo de perda inválido.");

    // O trigger de status bloqueia transição não permitida (só 'proposta' → 'perdido').
    const { error } = await context.supabase
      .from("leads")
      .update({
        status: "perdido",
        perda_motivo_id: data.motivo_id,
        perda_observacao: data.observacao ?? null,
        perdido_em: new Date().toISOString(),
      } as never)
      .eq("id", data.lead_id);
    if (error) throw new Error(error.message);

    // Registra auditoria da perda
    const { error: eL } = await context.supabase.from("lead_perdas").insert({
      lead_id: data.lead_id,
      motivo_id: data.motivo_id,
      observacao: data.observacao ?? null,
      valor_proposto: data.valor_proposto ?? null,
      registrado_por: context.userId,
    } as never);
    if (eL) throw new Error(eL.message);

    return { ok: true };
  });

/** Lista leads descartados. */
export const listarLeadsDescartados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("leads")
      .select(
        "*, imovel:imoveis(titulo, slug), motivo:lead_discard_reasons!leads_descarte_motivo_id_fkey(nome)",
      )
      .eq("status", "descartado")
      .order("descartado_em", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Lista leads perdidos com motivo e valor. */
export const listarLeadsPerdidos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("leads")
      .select(
        "*, imovel:imoveis(titulo, slug), motivo:deal_lost_reasons!leads_perda_motivo_id_fkey(nome)",
      )
      .eq("status", "perdido")
      .order("perdido_em", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Reabre um lead descartado (volta para 'novo'). */
export const reabrirLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ lead_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("leads")
      .update({
        status: "novo",
        descarte_motivo_id: null,
        descarte_observacao: null,
        descartado_em: null,
        descartado_por: null,
      } as never)
      .eq("id", data.lead_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Métricas de performance comercial (últimos N dias). */
export const performanceComercial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ dias: z.number().int().min(1).max(365).default(30) }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const desde = new Date(Date.now() - data.dias * 86400_000).toISOString();

    const { data: rows, error } = await context.supabase
      .from("leads")
      .select("id, status, valor_estimado, created_at")
      .gte("created_at", desde);
    if (error) throw new Error(error.message);

    const total = rows?.length ?? 0;
    const by = (s: string) => (rows ?? []).filter((r) => r.status === s);
    const ganhos = by("ganho");
    const perdidos = by("perdido");
    const descartados = by("descartado");
    const propostas = by("proposta");
    const emAndamento = (rows ?? []).filter((r) =>
      ["novo", "conversando", "visita", "proposta"].includes(r.status),
    );

    const sum = (arr: typeof ganhos) =>
      arr.reduce((a, l) => a + (Number(l.valor_estimado) || 0), 0);

    const decididos = ganhos.length + perdidos.length;
    const conversao = decididos > 0 ? ganhos.length / decididos : 0;
    const descarteRate = total > 0 ? descartados.length / total : 0;

    // Motivos de descarte (top)
    const { data: dMot } = await context.supabase
      .from("leads")
      .select("descarte_motivo_id, motivo:lead_discard_reasons!leads_descarte_motivo_id_fkey(nome)")
      .eq("status", "descartado")
      .gte("descartado_em", desde);
    // Motivos de perda (top)
    const { data: pMot } = await context.supabase
      .from("leads")
      .select("perda_motivo_id, motivo:deal_lost_reasons!leads_perda_motivo_id_fkey(nome)")
      .eq("status", "perdido")
      .gte("perdido_em", desde);

    const tally = (arr: { motivo: { nome: string } | null }[] | null) => {
      const m = new Map<string, number>();
      for (const r of arr ?? []) {
        const n = r?.motivo?.nome ?? "—";
        m.set(n, (m.get(n) ?? 0) + 1);
      }
      return [...m.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
    };

    return {
      periodoDias: data.dias,
      totais: {
        total,
        emAndamento: emAndamento.length,
        propostas: propostas.length,
        ganhos: ganhos.length,
        perdidos: perdidos.length,
        descartados: descartados.length,
      },
      vgv: {
        emAndamento: sum(emAndamento),
        propostas: sum(propostas),
        ganhos: sum(ganhos),
        perdidos: sum(perdidos),
      },
      taxas: {
        conversao,          // ganhos / (ganhos + perdidos)
        descarteRate,       // descartados / total do período
      },
      motivosDescarte: tally(dMot as never),
      motivosPerda: tally(pMot as never),
    };
  });
