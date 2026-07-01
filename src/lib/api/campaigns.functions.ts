/**
 * CMS — Campanhas (banners e popups).
 * Admin: CRUD. Público: listar ativas + registrar eventos.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient(tenantHeader?: string | null) {
  const opts: {
    auth: { storage: undefined; persistSession: false; autoRefreshToken: false };
    global?: { headers: Record<string, string> };
  } = {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  };
  if (tenantHeader) opts.global = { headers: { "x-tenant-id": tenantHeader } };
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, opts);
}

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
    return row as Campaign;
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
      const { data: row, error } = await context.supabase
        .from("cms_campaigns")
        .update(payload)
        .eq("id", data.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    } else {
      const { data: row, error } = await context.supabase
        .from("cms_campaigns")
        .insert({ ...payload, created_by: context.userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const excluirCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cms_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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

export const listarCampanhasAtivas = createServerFn({ method: "GET" })
  .inputValidator((d: { tenantId?: string | null } | undefined) =>
    z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient(data?.tenantId ?? null);
    const { data: rows, error } = await sb
      .from("cms_campaigns")
      .select("id, nome, tipo, prioridade, conteudo, segmentacao, frequencia, start_at, end_at")
      .eq("status", "active")
      .order("prioridade", { ascending: false });
    if (error) return [];
    return (rows ?? []) as Campaign[];
  });

export const registrarEventoCampanha = createServerFn({ method: "POST" })
  .inputValidator((d: {
    campaign_id: string;
    tipo: "impression" | "click" | "dismiss";
    rota?: string;
    session_id?: string;
    tenantId?: string | null;
  }) =>
    z
      .object({
        campaign_id: z.string().uuid(),
        tipo: z.enum(["impression", "click", "dismiss"]),
        rota: z.string().max(500).optional(),
        session_id: z.string().max(100).optional(),
        tenantId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient(data.tenantId ?? null);
    await sb.from("cms_campaign_events").insert({
      campaign_id: data.campaign_id,
      tipo: data.tipo,
      rota: data.rota ?? null,
      session_id: data.session_id ?? null,
    });
    return { ok: true };
  });
