// PR-M2 — CRM compatibility surface.
//
// Active callers retain stable export names, but all tenant-scoped reads and
// mutations delegate to the canonical Tenant CRM authority. No legacy direct
// mutation, has_role authority or external insight provider remains here.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  listTenantLeadsForContext,
  transitionTenantLeadForContext,
  type CrmLeadDto,
  type CrmMutationResultDto,
} from "@/lib/api/tenant-crm.functions";
import { LEAD_STATUS_KEYS, type LeadStatusKey } from "@/lib/crm/crm-registry";

function compatibilityKey(
  operation: string,
  leadId: string,
  expectedVersion: number,
  qualifier = "none",
): string {
  return `crm:${operation}:${leadId}:${expectedVersion}:${qualifier}`;
}

function transitionResult(result: CrmMutationResultDto) {
  if (!result.leadId || !result.fromStatus || !result.toStatus || !result.reasonType || result.version === undefined) {
    throw new Error("crm_transition_contract_invalid");
  }
  return {
    ok: true as const,
    leadId: result.leadId,
    fromStatus: result.fromStatus,
    toStatus: result.toStatus,
    reasonType: result.reasonType,
    version: result.version,
  };
}

export const transicionarLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      leadId: z.string().uuid(),
      toStatus: z.enum(LEAD_STATUS_KEYS),
      expectedVersion: z.number().int().nonnegative(),
      reasonId: z.string().uuid().nullish(),
      idempotencyKey: z.string().min(8).max(200).optional(),
      metadata: z.object({ note: z.string().trim().min(1).max(2_000).nullish(), source: z.string().max(200).nullish() }).strict().optional(),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) =>
    transitionResult(await transitionTenantLeadForContext(context, {
      leadId: data.leadId,
      toStatus: data.toStatus,
      expectedVersion: data.expectedVersion,
      reasonId: data.reasonId ?? null,
      note: data.metadata?.note ?? null,
      idempotencyKey: data.idempotencyKey ?? compatibilityKey("transition", data.leadId, data.expectedVersion, `${data.toStatus}:${data.reasonId ?? "none"}`),
    })),
  );

export const descartarLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      lead_id: z.string().uuid(),
      motivo_id: z.string().uuid(),
      detalhes: z.string().max(1_000).nullish(),
      expected_version: z.number().int().nonnegative(),
      idempotencyKey: z.string().min(8).max(200).optional(),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) =>
    transitionResult(await transitionTenantLeadForContext(context, {
      leadId: data.lead_id,
      toStatus: "descartado",
      expectedVersion: data.expected_version,
      reasonId: data.motivo_id,
      note: data.detalhes ?? null,
      idempotencyKey: data.idempotencyKey ?? compatibilityKey("discard", data.lead_id, data.expected_version, data.motivo_id),
    })),
  );

export const perderLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      lead_id: z.string().uuid(),
      motivo_id: z.string().uuid(),
      detalhes: z.string().max(1_000).nullish(),
      expected_version: z.number().int().nonnegative(),
      idempotencyKey: z.string().min(8).max(200).optional(),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) =>
    transitionResult(await transitionTenantLeadForContext(context, {
      leadId: data.lead_id,
      toStatus: "perdido",
      expectedVersion: data.expected_version,
      reasonId: data.motivo_id,
      note: data.detalhes ?? null,
      idempotencyKey: data.idempotencyKey ?? compatibilityKey("lost", data.lead_id, data.expected_version, data.motivo_id),
    })),
  );

export const reabrirLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      lead_id: z.string().uuid(),
      expected_version: z.number().int().nonnegative(),
      motivo: z.string().trim().min(1).max(1_000).optional(),
      idempotencyKey: z.string().min(8).max(200).optional(),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) =>
    transitionResult(await transitionTenantLeadForContext(context, {
      leadId: data.lead_id,
      toStatus: "novo",
      expectedVersion: data.expected_version,
      reasonId: null,
      note: data.motivo ?? "Reabertura solicitada pelo usuário autenticado.",
      idempotencyKey: data.idempotencyKey ?? compatibilityKey("reopen", data.lead_id, data.expected_version),
    })),
  );

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

export const listarLeadsDescartados = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<LeadDescartadoRow[]> => {
    const leads = await listTenantLeadsForContext(context, { status: "descartado", limit: 500 });
    return leads.map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      status: "descartado",
      version: lead.version,
      descartado_at: lead.updated_at,
      origem: lead.origem,
      motivo: null,
      imovel: lead.imovel ? { titulo: lead.imovel.titulo, slug: lead.imovel.slug } : null,
    }));
  });

type CommercialPerformance = {
  periodoDias: number;
  totais: { total: number; emAndamento: number; propostas: number; ganhos: number; perdidos: number; descartados: number };
  vgv: { emAndamento: number; propostas: number; ganhos: number; perdidos: number };
  taxas: { conversao: number; descarteRate: number };
  motivosDescarte: Array<{ nome: string; total: number }>;
  motivosPerda: Array<{ nome: string; total: number }>;
};

function sum(items: readonly CrmLeadDto[]): number {
  return items.reduce((total, lead) => total + (lead.valor_estimado ?? 0), 0);
}

function performance(leads: readonly CrmLeadDto[], dias: number): CommercialPerformance {
  const threshold = Date.now() - dias * 86_400_000;
  const rows = leads.filter((lead) => new Date(lead.created_at).getTime() >= threshold);
  const by = (status: LeadStatusKey) => rows.filter((lead) => lead.status === status);
  const ganhos = by("ganho");
  const perdidos = by("perdido");
  const descartados = by("descartado");
  const propostas = by("proposta");
  const emAndamento = rows.filter((lead) => ["novo", "conversando", "visita", "proposta"].includes(lead.status));
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
    motivosDescarte: [],
    motivosPerda: [],
  };
}

export const performanceComercial = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ dias: z.number().int().min(1).max(365).default(30) }).strict().parse(input))
  .handler(async ({ data, context }): Promise<CommercialPerformance> =>
    performance(await listTenantLeadsForContext(context, { limit: 500 }), data.dias),
  );

export const gerarInsightsPerformance = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({
    periodoDias: z.number().int().min(1).max(365),
    totais: z.object({ total: z.number(), emAndamento: z.number(), propostas: z.number(), ganhos: z.number(), perdidos: z.number(), descartados: z.number() }).strict(),
    taxas: z.object({ conversao: z.number(), descarteRate: z.number() }).strict(),
    vgv: z.object({ emAndamento: z.number(), propostas: z.number(), ganhos: z.number(), perdidos: z.number() }).strict(),
    motivosDescarte: z.array(z.object({ nome: z.string(), total: z.number() }).strict()).max(20),
    motivosPerda: z.array(z.object({ nome: z.string(), total: z.number() }).strict()).max(20),
  }).strict().parse(input))
  .handler(async ({ data, context }) => {
    // Re-authorize and recompute; caller metrics are presentation input only.
    const metrics = performance(await listTenantLeadsForContext(context, { limit: 500 }), data.periodoDias);
    const conversion = (metrics.taxas.conversao * 100).toFixed(1);
    const discard = (metrics.taxas.descarteRate * 100).toFixed(1);
    const recommendation = metrics.totais.propostas > 0 && metrics.totais.ganhos === 0
      ? "Priorize a revisão das propostas abertas e registre o próximo follow-up."
      : metrics.totais.descartados > metrics.totais.ganhos
        ? "Revise qualificação e origem dos leads antes de ampliar a aquisição."
        : "Mantenha o acompanhamento das oportunidades em andamento e das tarefas vencidas.";
    return {
      insight: `Nos últimos ${metrics.periodoDias} dias, a conversão foi ${conversion}% e o descarte ${discard}%. ${recommendation}`,
    };
  });
