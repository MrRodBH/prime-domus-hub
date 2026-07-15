// PR-M1 — Transition Caller Cutover.
// This module hosts the canonical server-side entry points for lead status
// mutations. All transitions delegate to the typed boundary
// `transitionLead` (src/lib/leads/lead-transition.server) which is the ONLY
// server-side authority calling the RPC `transition_lead_status`.
//
// Rules enforced here:
//   - No direct `leads.update({ status, ...*_reason_id, *_at })` writes.
//   - No supabaseAdmin.
//   - `expectedVersion` is a required client-supplied value (OCC).
//   - Wrappers only validate input, forward to the boundary, and map result.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  transitionLead,
  LeadTransitionError,
  type LeadTransitionResult,
} from "@/lib/leads/lead-transition.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado.");
}

// Serializes a boundary result for the wire. Preserves typed error contract
// by throwing a plain Error whose message is the canonical code (mappable
// on the client via the LeadTransitionError code list).
function serializeResult(r: LeadTransitionResult) {
  return {
    ok: true as const,
    leadId: r.leadId,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    reasonType: r.reasonType,
    version: r.version,
  };
}

function rethrow(err: unknown): never {
  if (err instanceof LeadTransitionError) {
    // Preserve the canonical code as the message head so the client can
    // remap it back to LeadTransitionError.code.
    throw new Error(err.code);
  }
  throw err instanceof Error ? err : new Error("unknown_error");
}

/** Canonical transition entry: advance / ganho / perdido / descartado / reabrir. */
export const transicionarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        leadId: z.string().uuid(),
        toStatus: z.enum([
          "novo",
          "conversando",
          "visita",
          "proposta",
          "ganho",
          "perdido",
          "descartado",
        ]),
        expectedVersion: z.number().int().nonnegative(),
        reasonId: z.string().uuid().nullish(),
        metadata: z
          .object({
            note: z.string().max(2000).nullish(),
            source: z.string().max(200).nullish(),
          })
          .partial()
          .optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    try {
      const r = await transitionLead(context.supabase, {
        leadId: data.leadId,
        toStatus: data.toStatus,
        expectedVersion: data.expectedVersion,
        reasonId: data.reasonId ?? null,
        metadata: data.metadata,
      });
      return serializeResult(r);
    } catch (e) {
      rethrow(e);
    }
  });

/** Descarta um lead (motivo obrigatório). */
export const descartarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        lead_id: z.string().uuid(),
        motivo_id: z.string().uuid(),
        detalhes: z.string().max(1000).optional().nullable(),
        expected_version: z.number().int().nonnegative(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    try {
      const r = await transitionLead(context.supabase, {
        leadId: data.lead_id,
        toStatus: "descartado",
        expectedVersion: data.expected_version,
        reasonId: data.motivo_id,
        metadata: {
          note: data.detalhes ?? undefined,
          source: "pipeline_discard",
        },
      });
      return serializeResult(r);
    } catch (e) {
      rethrow(e);
    }
  });

/** Marca lead como perdido (somente a partir de Proposta; motivo obrigatório). */
export const perderLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        lead_id: z.string().uuid(),
        motivo_id: z.string().uuid(),
        detalhes: z.string().max(1000).optional().nullable(),
        expected_version: z.number().int().nonnegative(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    try {
      const r = await transitionLead(context.supabase, {
        leadId: data.lead_id,
        toStatus: "perdido",
        expectedVersion: data.expected_version,
        reasonId: data.motivo_id,
        metadata: {
          note: data.detalhes ?? undefined,
          source: "pipeline_lost",
        },
      });
      return serializeResult(r);
    } catch (e) {
      rethrow(e);
    }
  });

/** Reabre um lead descartado / perdido, voltando para "novo". */
export const reabrirLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        lead_id: z.string().uuid(),
        expected_version: z.number().int().nonnegative(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    try {
      const r = await transitionLead(context.supabase, {
        leadId: data.lead_id,
        toStatus: "novo",
        expectedVersion: data.expected_version,
        reasonId: null,
        metadata: { source: "pipeline_reopen" },
      });
      return serializeResult(r);
    } catch (e) {
      rethrow(e);
    }
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
    if (error) throw new Error(error.message);
    return data ?? [];
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
