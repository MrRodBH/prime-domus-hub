// PR-M1 — Transition Caller Cutover.
// Canonical mutations continue delegating exclusively to transitionLead.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  transitionLead,
  LeadTransitionError,
  type LeadTransitionResult,
} from "@/lib/leads/lead-transition.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertCrmAdmin(context: any): Promise<string> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "CRM");
  if (context.tenant.isSuperAdmin) return tenantId;

  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Falha ao validar autorização CRM.");
  if (data !== true) throw new Error("Acesso negado.");
  return tenantId;
}

function serializeResult(result: LeadTransitionResult) {
  return {
    ok: true as const,
    leadId: result.leadId,
    fromStatus: result.fromStatus,
    toStatus: result.toStatus,
    reasonType: result.reasonType,
    version: result.version,
  };
}

function rethrow(error: unknown): never {
  if (error instanceof LeadTransitionError) {
    throw new Error(error.code);
  }
  throw error instanceof Error ? error : new Error("unknown_error");
}

/** Canonical transition entry: advance / ganho / perdido / descartado / reabrir. */
export const transicionarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
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
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      return serializeResult(
        await transitionLead(context.supabase, {
          leadId: data.leadId,
          toStatus: data.toStatus,
          expectedVersion: data.expectedVersion,
          reasonId: data.reasonId ?? null,
          metadata: data.metadata,
        }),
      );
    } catch (error) {
      rethrow(error);
    }
  });

/** Descarta um lead (motivo obrigatório). */
export const descartarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lead_id: z.string().uuid(),
        motivo_id: z.string().uuid(),
        detalhes: z.string().max(1000).optional().nullable(),
        expected_version: z.number().int().nonnegative(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      return serializeResult(
        await transitionLead(context.supabase, {
          leadId: data.lead_id,
          toStatus: "descartado",
          expectedVersion: data.expected_version,
          reasonId: data.motivo_id,
          metadata: {
            note: data.detalhes ?? undefined,
            source: "pipeline_discard",
          },
        }),
      );
    } catch (error) {
      rethrow(error);
    }
  });

/** Marca lead como perdido a partir do boundary canônico. */
export const perderLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lead_id: z.string().uuid(),
        motivo_id: z.string().uuid(),
        detalhes: z.string().max(1000).optional().nullable(),
        expected_version: z.number().int().nonnegative(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      return serializeResult(
        await transitionLead(context.supabase, {
          leadId: data.lead_id,
          toStatus: "perdido",
          expectedVersion: data.expected_version,
          reasonId: data.motivo_id,
          metadata: {
            note: data.detalhes ?? undefined,
            source: "pipeline_lost",
          },
        }),
      );
    } catch (error) {
      rethrow(error);
    }
  });

/** Reabre um lead descartado/perdido, voltando para novo. */
export const reabrirLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lead_id: z.string().uuid(),
        expected_version: z.number().int().nonnegative(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      return serializeResult(
        await transitionLead(context.supabase, {
          leadId: data.lead_id,
          toStatus: "novo",
          expectedVersion: data.expected_version,
          reasonId: null,
          metadata: { source: "pipeline_reopen" },
        }),
      );
    } catch (error) {
      rethrow(error);
    }
  });

export type LeadDescartadoRow = {
  id: string;
  nome: string;
  status: "descartado";
  version: number;
  descartado_at: string | null;
  origem: string | null;
  motivo: { nome: string } | null;
  imovel: { titulo: string | null; slug: string | null } | null;
};

type RelatedReason = { tenant_id: string; nome: string };
type RelatedProperty = {
  tenant_id: string;
  titulo: string | null;
  slug: string | null;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export const listarLeadsDescartados = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<LeadDescartadoRow[]> => {
    const tenantId = await assertCrmAdmin(context);
    const { data, error } = await context.supabase
      .from("leads")
      .select(
        "id, nome, status, version, descartado_at, origem, imovel:imoveis(tenant_id, titulo, slug), motivo:lead_discard_reasons!leads_discard_reason_id_fkey(tenant_id, nome)",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "descartado")
      .order("descartado_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      id: string;
      nome: string;
      status: string;
      version: number;
      descartado_at: string | null;
      origem: string | null;
      imovel: RelatedProperty | RelatedProperty[] | null;
      motivo: RelatedReason | RelatedReason[] | null;
    }>;

    return rows.map((row) => {
      const imovel = normalizeRelation(row.imovel);
      const motivo = normalizeRelation(row.motivo);
      if (imovel && imovel.tenant_id !== tenantId) {
        throw new Error("CRM property relation crossed the tenant boundary.");
      }
      if (motivo && motivo.tenant_id !== tenantId) {
        throw new Error("CRM discard reason crossed the tenant boundary.");
      }
      return {
        id: row.id,
        nome: row.nome,
        status: "descartado" as const,
        version: row.version,
        descartado_at: row.descartado_at,
        origem: row.origem,
        motivo: motivo ? { nome: motivo.nome } : null,
        imovel: imovel
          ? { titulo: imovel.titulo, slug: imovel.slug }
          : null,
      };
    });
  });

type PerformanceLead = {
  id: string;
  status: string;
  valor_estimado: number | null;
  created_at: string;
  discard_reason_id: string | null;
  lost_reason_id: string | null;
};

type CommercialPerformance = {
  periodoDias: number;
  totais: {
    total: number;
    emAndamento: number;
    propostas: number;
    ganhos: number;
    perdidos: number;
    descartados: number;
  };
  vgv: {
    emAndamento: number;
    propostas: number;
    ganhos: number;
    perdidos: number;
  };
  taxas: { conversao: number; descarteRate: number };
  motivosDescarte: Array<{ nome: string; total: number }>;
  motivosPerda: Array<{ nome: string; total: number }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadCommercialPerformance(
  context: any,
  tenantId: string,
  dias: number,
): Promise<CommercialPerformance> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const { data, error } = await context.supabase
    .from("leads")
    .select(
      "id, status, valor_estimado, created_at, discard_reason_id, lost_reason_id",
    )
    .eq("tenant_id", tenantId)
    .gte("created_at", desde);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PerformanceLead[];
  const by = (status: string) => rows.filter((row) => row.status === status);
  const ganhos = by("ganho");
  const perdidos = by("perdido");
  const descartados = by("descartado");
  const propostas = by("proposta");
  const emAndamento = rows.filter((row) =>
    ["novo", "conversando", "visita", "proposta"].includes(row.status),
  );
  const sum = (items: PerformanceLead[]) =>
    items.reduce(
      (total, row) => total + (Number(row.valor_estimado) || 0),
      0,
    );

  const dIds = Array.from(
    new Set(
      descartados
        .map((row) => row.discard_reason_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const pIds = Array.from(
    new Set(
      perdidos
        .map((row) => row.lost_reason_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [discardNames, lostNames] = await Promise.all([
    dIds.length > 0
      ? context.supabase
          .from("lead_discard_reasons")
          .select("id, nome")
          .eq("tenant_id", tenantId)
          .in("id", dIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string }>, error: null }),
    pIds.length > 0
      ? context.supabase
          .from("deal_lost_reasons")
          .select("id, nome")
          .eq("tenant_id", tenantId)
          .in("id", pIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string }>, error: null }),
  ]);
  if (discardNames.error) throw new Error(discardNames.error.message);
  if (lostNames.error) throw new Error(lostNames.error.message);

  const discardMap = new Map<string, string>(
    ((discardNames.data ?? []) as Array<{ id: string; nome: string }>).map((row) => [
      row.id,
      row.nome,
    ]),
  );
  const lostMap = new Map<string, string>(
    ((lostNames.data ?? []) as Array<{ id: string; nome: string }>).map((row) => [
      row.id,
      row.nome,
    ]),
  );

  const tally = (
    items: PerformanceLead[],
    kind: "discard" | "lost",
  ): Array<{ nome: string; total: number }> => {
    const result = new Map<string, number>();
    for (const item of items) {
      const id = kind === "discard"
        ? item.discard_reason_id
        : item.lost_reason_id;
      const name =
        (id && (kind === "discard" ? discardMap.get(id) : lostMap.get(id))) ||
        "Não informado";
      result.set(name, (result.get(name) ?? 0) + 1);
    }
    return Array.from(result.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((left, right) => right.total - left.total);
  };

  const decided = ganhos.length + perdidos.length;
  return {
    periodoDias: dias,
    totais: {
      total: rows.length,
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
      conversao: decided > 0 ? ganhos.length / decided : 0,
      descarteRate: rows.length > 0 ? descartados.length / rows.length : 0,
    },
    motivosDescarte: tally(descartados, "discard"),
    motivosPerda: tally(perdidos, "lost"),
  };
}

/** Métricas de performance comercial derivadas exclusivamente no servidor. */
export const performanceComercial = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ dias: z.number().int().min(1).max(365).default(30) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<CommercialPerformance> => {
    const tenantId = await assertCrmAdmin(context);
    return loadCommercialPerformance(context, tenantId, data.dias);
  });

/**
 * IA — insight sobre performance comercial.
 * Mantém campos legados opcionais no input para compatibilidade de frontend,
 * mas nunca confia neles: todas as métricas são recalculadas no servidor.
 */
export const gerarInsightsPerformance = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z
      .object({
        periodoDias: z.number().int().min(1).max(365),
        totais: z.record(z.string(), z.number()).optional(),
        taxas: z
          .object({ conversao: z.number(), descarteRate: z.number() })
          .optional(),
        vgv: z.record(z.string(), z.number()).optional(),
        motivosDescarte: z
          .array(z.object({ nome: z.string(), total: z.number() }))
          .max(20)
          .optional(),
        motivosPerda: z
          .array(z.object({ nome: z.string(), total: z.number() }))
          .max(20)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await assertCrmAdmin(context);
    const metrics = await loadCommercialPerformance(
      context,
      tenantId,
      data.periodoDias,
    );
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const discardReasons =
      metrics.motivosDescarte
        .slice(0, 5)
        .map((reason) => `${reason.nome} (${reason.total})`)
        .join(", ") || "—";
    const lostReasons =
      metrics.motivosPerda
        .slice(0, 5)
        .map((reason) => `${reason.nome} (${reason.total})`)
        .join(", ") || "—";
    const brl = (value: number) =>
      value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      });

    const user = `Últimos ${metrics.periodoDias} dias.
Total: ${metrics.totais.total} | Em andamento: ${metrics.totais.emAndamento} | Propostas: ${metrics.totais.propostas} | Ganhos: ${metrics.totais.ganhos} | Perdidos: ${metrics.totais.perdidos} | Descartados: ${metrics.totais.descartados}.
Conversão (ganho / decididos): ${(metrics.taxas.conversao * 100).toFixed(1)}% | Descarte: ${(metrics.taxas.descarteRate * 100).toFixed(1)}%.
VGV em andamento: ${brl(metrics.vgv.emAndamento)} | proposta: ${brl(metrics.vgv.propostas)} | ganho: ${brl(metrics.vgv.ganhos)} | perdido: ${brl(metrics.vgv.perdidos)}.
Top motivos de descarte: ${discardReasons}.
Top motivos de perda: ${lostReasons}.

Em 3 a 4 frases curtas, em português do Brasil, sem markdown e sem emojis, aponte gargalos, oportunidades e uma recomendação prática para o gestor comercial. Máximo 550 caracteres.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "Você é um consultor de vendas imobiliárias de alto padrão. Seja objetivo e acionável.",
            },
            { role: "user", content: user },
          ],
        }),
      },
    );
    if (response.status === 429) throw new Error("Limite de uso da IA atingido.");
    if (response.status === 402) throw new Error("Créditos de IA esgotados.");
    if (!response.ok) throw new Error(`Falha na IA (${response.status}).`);
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return { insight: (json.choices?.[0]?.message?.content ?? "").trim() };
  });