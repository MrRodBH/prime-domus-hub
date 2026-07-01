import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function currentUserBrief(ctx: any) {
  const { data } = await ctx.supabase
    .from("profiles")
    .select("nome, papel_principal")
    .eq("id", ctx.userId)
    .maybeSingle();
  return {
    nome: (data?.nome as string) || "Usuário",
    perfil: (data?.papel_principal as string) || "sem-perfil",
  };
}

/** Descarta um lead (motivo de desqualificação). */
export const descartarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      lead_id: z.string().uuid(),
      motivo_id: z.string().uuid(),
      detalhes: z.string().max(1000).optional().nullable(),
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
        discard_reason_id: data.motivo_id,
      } as never)
      .eq("id", data.lead_id);
    if (error) throw new Error(error.message);

    // registra em lead_descartes (histórico existente) se a tabela existir
    const me = await currentUserBrief(context);
    await context.supabase.from("lead_descartes").insert({
      lead_id: data.lead_id,
      user_id: context.userId,
      user_nome: me.nome,
      user_perfil: me.perfil,
      reason_id: data.motivo_id,
      motivo_nome: motivo.nome,
      detalhes: data.detalhes ?? "",
    } as never);

    return { ok: true };
  });

/** Marca lead como perdido (backend valida transição via trigger). */
export const perderLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      lead_id: z.string().uuid(),
      motivo_id: z.string().uuid(),
      detalhes: z.string().max(1000).optional().nullable(),
      valor_estimado: z.number().nullable().optional(),
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

    const me = await currentUserBrief(context);

    const { data: lead } = await context.supabase
      .from("leads")
      .select("imovel_id, valor_estimado")
      .eq("id", data.lead_id)
      .maybeSingle();

    const { error } = await context.supabase
      .from("leads")
      .update({
        status: "perdido",
        lost_reason_id: data.motivo_id,
      } as never)
      .eq("id", data.lead_id);
    if (error) throw new Error(error.message);

    const { error: eL } = await context.supabase.from("lead_perdas").insert({
      lead_id: data.lead_id,
      user_id: context.userId,
      user_nome: me.nome,
      user_perfil: me.perfil,
      reason_id: data.motivo_id,
      motivo_nome: motivo.nome,
      detalhes: data.detalhes ?? "",
      valor_estimado: data.valor_estimado ?? lead?.valor_estimado ?? null,
      imovel_id: lead?.imovel_id ?? null,
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
      .select("*, imovel:imoveis(titulo, slug), motivo:lead_discard_reasons!leads_discard_reason_id_fkey(nome)")
      .eq("status", "descartado")
      .order("descartado_at", { ascending: false, nullsFirst: false });
    if (error) {
      // fallback sem alias FK caso o nome não bata em algum ambiente
      const alt = await context.supabase
        .from("leads")
        .select("*, imovel:imoveis(titulo, slug)")
        .eq("status", "descartado")
        .order("descartado_at", { ascending: false, nullsFirst: false });
      if (alt.error) throw new Error(alt.error.message);
      return alt.data ?? [];
    }
    return data ?? [];
  });

/** Reabre um lead descartado. */
export const reabrirLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ lead_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("leads")
      .update({
        status: "novo",
        discard_reason_id: null,
        descartado_at: null,
      } as never)
      .eq("id", data.lead_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Métricas de performance comercial nos últimos N dias. */
export const performanceComercial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ dias: z.number().int().min(1).max(365).default(30) }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const desde = new Date(Date.now() - data.dias * 86_400_000).toISOString();

    const { data: rows, error } = await context.supabase
      .from("leads")
      .select("id, status, valor_estimado, created_at, discard_reason_id, lost_reason_id")
      .gte("created_at", desde);
    if (error) throw new Error(error.message);

    const by = (s: string) => (rows ?? []).filter((r) => r.status === s);
    const total = rows?.length ?? 0;
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

    // Mapeia nomes de motivos
    const dIds = [...new Set(descartados.map((r) => r.discard_reason_id).filter(Boolean))] as string[];
    const pIds = [...new Set(perdidos.map((r) => r.lost_reason_id).filter(Boolean))] as string[];

    const [dNames, pNames] = await Promise.all([
      dIds.length
        ? context.supabase.from("lead_discard_reasons").select("id, nome").in("id", dIds)
        : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
      pIds.length
        ? context.supabase.from("deal_lost_reasons").select("id, nome").in("id", pIds)
        : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    ]);

    const dMap = new Map((dNames.data ?? []).map((r) => [r.id, r.nome]));
    const pMap = new Map((pNames.data ?? []).map((r) => [r.id, r.nome]));

    const tally = (
      arr: { discard_reason_id?: string | null; lost_reason_id?: string | null }[],
      kind: "d" | "p",
    ) => {
      const m = new Map<string, number>();
      for (const r of arr) {
        const id = kind === "d" ? r.discard_reason_id : r.lost_reason_id;
        const nome = (id && (kind === "d" ? dMap.get(id) : pMap.get(id))) || "Não informado";
        m.set(nome, (m.get(nome) ?? 0) + 1);
      }
      return [...m.entries()]
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total);
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
      taxas: { conversao, descarteRate },
      motivosDescarte: tally(descartados, "d"),
      motivosPerda: tally(perdidos, "p"),
    };
  });

/** IA — insight sobre performance comercial. */
export const gerarInsightsPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      periodoDias: z.number().int(),
      totais: z.record(z.string(), z.number()),
      taxas: z.object({ conversao: z.number(), descarteRate: z.number() }),
      vgv: z.record(z.string(), z.number()),
      motivosDescarte: z.array(z.object({ nome: z.string(), total: z.number() })).max(20),
      motivosPerda: z.array(z.object({ nome: z.string(), total: z.number() })).max(20),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const md = data.motivosDescarte.slice(0, 5).map((m) => `${m.nome} (${m.total})`).join(", ") || "—";
    const mp = data.motivosPerda.slice(0, 5).map((m) => `${m.nome} (${m.total})`).join(", ") || "—";
    const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

    const user = `Últimos ${data.periodoDias} dias.
Total: ${data.totais.total} | Em andamento: ${data.totais.emAndamento} | Propostas: ${data.totais.propostas} | Ganhos: ${data.totais.ganhos} | Perdidos: ${data.totais.perdidos} | Descartados: ${data.totais.descartados}.
Conversão (ganho / decididos): ${(data.taxas.conversao * 100).toFixed(1)}% | Descarte: ${(data.taxas.descarteRate * 100).toFixed(1)}%.
VGV em andamento: ${brl(data.vgv.emAndamento)} | proposta: ${brl(data.vgv.propostas)} | ganho: ${brl(data.vgv.ganhos)} | perdido: ${brl(data.vgv.perdidos)}.
Top motivos de descarte: ${md}.
Top motivos de perda: ${mp}.

Em 3 a 4 frases curtas, em português do Brasil, sem markdown e sem emojis, aponte gargalos, oportunidades e uma recomendação prática para o gestor comercial. Máximo 550 caracteres.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um consultor de vendas imobiliárias de alto padrão. Seja objetivo e acionável." },
          { role: "user", content: user },
        ],
      }),
    });
    if (resp.status === 429) throw new Error("Limite de uso da IA atingido.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
    if (!resp.ok) throw new Error(`Falha na IA (${resp.status}).`);
    const json = await resp.json();
    return { insight: (json?.choices?.[0]?.message?.content ?? "").trim() as string };
  });
