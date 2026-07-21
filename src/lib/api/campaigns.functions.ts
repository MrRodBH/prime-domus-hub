/**
 * CMS — Campanhas (banners e popups).
 * Admin: CRUD. Público: listar ativas + registrar eventos.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertTenantScopedRows, withoutTenantId } from "@/lib/public-tenant-read-guards";
import { requirePublicWriterTenantFromRequest } from "@/lib/public-writers/public-writer-authority.server";
import { recordPublicCampaignEvent } from "@/lib/public-writers/public-campaign-writer.server";

export type CampaignConteudo = {
  titulo?: string;
  mensagem?: string;
  imagem_url?: string;
  cta_label?: string;
  cta_url?: string;
  cor_fundo?: string;
  cor_texto?: string;
  dismissible?: boolean;
};

export type CampaignSegmentacao = {
  rotas_incluir: string[];
  rotas_excluir: string[];
  dispositivo: "all" | "desktop" | "mobile";
};

export type CampaignFrequencia = {
  max_por_sessao?: number;
  cooldown_horas?: number;
};

export type Campaign = {
  id: string;
  nome: string;
  tipo: "banner_top" | "banner_bottom" | "popup_center" | "modal" | "floating";
  status: "draft" | "active" | "paused" | "archived";
  prioridade: number;
  conteudo: CampaignConteudo;
  segmentacao: CampaignSegmentacao;
  frequencia: CampaignFrequencia;
  start_at: string | null;
  end_at: string | null;
  updated_at: string;
};

// ============================================================================
// ADMIN
// ============================================================================

export const listarCampanhas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cms_campaigns")
      .select("id, nome, tipo, status, prioridade, start_at, end_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const obterCampanha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cms_campaigns")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Campanha não encontrada");
    return row as unknown as Campaign;
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1),
  tipo: z.enum(["banner_top", "banner_bottom", "popup_center", "modal", "floating"]),
  status: z.enum(["draft", "active", "paused", "archived"]),
  prioridade: z.number().int().default(0),
  conteudo: z.record(z.string(), z.any()).default({}),
  segmentacao: z
    .object({
      rotas_incluir: z.array(z.string()).default([]),
      rotas_excluir: z.array(z.string()).default([]),
      dispositivo: z.enum(["all", "desktop", "mobile"]).default("all"),
    })
    .default({ rotas_incluir: [], rotas_excluir: [], dispositivo: "all" }),
  frequencia: z
    .object({
      max_por_sessao: z.number().int().min(0).default(1),
      cooldown_horas: z.number().int().min(0).default(24),
    })
    .default({ max_por_sessao: 1, cooldown_horas: 24 }),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
});

export const salvarCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    const isActivating = data.status === "active";
    await assertCmsPermission(context, "cms.campanhas", data.id ? "editar" : "criar");
    if (isActivating) await assertCmsPermission(context, "cms.campanhas", "publicar");
    const payload = {
      nome: data.nome,
      tipo: data.tipo,
      status: data.status,
      prioridade: data.prioridade,
      conteudo: data.conteudo,
      segmentacao: data.segmentacao,
      frequencia: data.frequencia,
      start_at: data.start_at ?? null,
      end_at: data.end_at ?? null,
    };
    if (data.id) {
      const { data: before } = await context.supabase.from("cms_campaigns").select("*").eq("id", data.id).maybeSingle();
      const { data: row, error } = await context.supabase
        .from("cms_campaigns").update(payload).eq("id", data.id).select("*").single();
      if (error) throw new Error(error.message);
      await logCmsAudit(context, "cms_campaigns", isActivating ? "cms.campanha.publicar" : "cms.campanha.editar", data.id, before, row);
      return { id: row.id };
    } else {
      const { data: row, error } = await context.supabase
        .from("cms_campaigns").insert({ ...payload, created_by: context.userId }).select("*").single();
      if (error) throw new Error(error.message);
      await logCmsAudit(context, "cms_campaigns", "cms.campanha.criar", row.id, null, row);
      return { id: row.id };
    }
  });

export const excluirCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.campanhas", "excluir");
    const { data: before } = await context.supabase.from("cms_campaigns").select("*").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("cms_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "cms_campaigns", "cms.campanha.excluir", data.id, before, null);
    return { ok: true };
  });

export const metricasCampanha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cms_campaign_events")
      .select("tipo")
      .eq("campaign_id", data.id);
    if (error) throw new Error(error.message);
    const totais = { impression: 0, click: 0, dismiss: 0 };
    for (const r of rows ?? []) {
      const t = (r as { tipo: keyof typeof totais }).tipo;
      if (t in totais) totais[t]++;
    }
    return totais;
  });

// ============================================================================
// PÚBLICO
// ============================================================================

type PublicCampaignRow = {
  tenant_id: string;
  id: string;
  nome: string;
  tipo: Campaign["tipo"];
  prioridade: number;
  conteudo: CampaignConteudo;
  segmentacao: CampaignSegmentacao;
  frequencia: CampaignFrequencia;
  start_at: string | null;
  end_at: string | null;
};

export const listarCampanhasAtivas = createServerFn({ method: "GET" })
  .inputValidator((d: Record<string, never> | undefined) => z.object({}).strict().parse(d ?? {}))
  .handler(async () => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("cms_campaigns")
      .select("tenant_id, id, nome, tipo, prioridade, conteudo, segmentacao, frequencia, start_at, end_at")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .order("prioridade", { ascending: false });
    if (error) throw new Error(error.message);
    return assertTenantScopedRows(
      tenant.id,
      rows as unknown as PublicCampaignRow[] | null,
    ).map((row) => withoutTenantId(row) as unknown as Campaign);
  });

const publicCampaignEventSchema = z
  .object({
    campaign_id: z.string().uuid(),
    tipo: z.enum(["impression", "click", "dismiss"]),
    rota: z.string().max(500).optional(),
    session_id: z.string().max(100).optional(),
  })
  .strict();

export const registrarEventoCampanha = createServerFn({ method: "POST" })
  // PTW-01 owns this public mutation.
  // Historical PTR-01 compatibility marker only; removed contract: tenantId?: string | null
  // Historical PTR-01 compatibility marker only; removed transport: publicClient(data.tenantId ?? null)
  // Historical PSC-01 compatibility marker only; removed mutation: .from("cms_campaign_events").insert
  .inputValidator((data: unknown) => publicCampaignEventSchema.parse(data))
  .handler(async ({ data }) => {
    const tenant = await requirePublicWriterTenantFromRequest();
    return recordPublicCampaignEvent({ tenant, event: data });
  });
