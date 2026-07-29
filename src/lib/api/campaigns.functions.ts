/**
 * CMS Campaign compatibility surface.
 * Admin reads delegate to PR-M2 canonical workflow. Legacy direct mutations
 * are retired. Public reads require Host-derived tenant and a valid published
 * version pointer; public event writes remain owned by PTW-01.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertTenantScopedRows, withoutTenantId } from "@/lib/public-tenant-read-guards";
import { requirePublicWriterTenantFromRequest } from "@/lib/public-writers/public-writer-authority.server";
import { recordPublicCampaignEvent } from "@/lib/public-writers/public-campaign-writer.server";
import {
  getTenantCampaign,
  listTenantCampaigns,
} from "@/lib/api/tenant-cms.functions";
import { authorizeTenantCampaignOperation } from "@/lib/api/tenant-cms-authority.server";
import {
  SIGNED_URL_TTL_PREVIEW_SECONDS,
  validateTenantSignRequest,
} from "@/lib/storage/signed-url";

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

export const listarCampanhas = listTenantCampaigns;
export const obterCampanha = getTenantCampaign;

export const salvarCampanha = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.record(z.string(), z.unknown()))
  .handler(async () => {
    throw new Error("legacy_cms_campaign_mutation_retired");
  });

export const excluirCampanha = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: z.string().uuid() }).strict())
  .handler(async () => {
    throw new Error("legacy_cms_campaign_delete_retired");
  });

export const metricasCampanha = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data, context }) => {
    const auth = await authorizeTenantCampaignOperation(
      { userId: context.userId, tenant: context.tenant },
      "read",
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const campaignResult = await (supabaseAdmin as any)
      .from("cms_campaigns")
      .select("id")
      .eq("tenant_id", auth.tenantId)
      .eq("id", data.id)
      .limit(2);
    if (campaignResult.error) throw new Error(campaignResult.error.message);
    if (!Array.isArray(campaignResult.data) || campaignResult.data.length !== 1) {
      throw new Error("cms_campaign_not_found");
    }
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("cms_campaign_events")
      .select("tipo")
      .eq("tenant_id", auth.tenantId)
      .eq("campaign_id", data.id);
    if (error) throw new Error(error.message);
    const totals = { impression: 0, click: 0, dismiss: 0 };
    for (const row of rows ?? []) {
      const type = (row as { tipo: keyof typeof totals }).tipo;
      if (type in totals) totals[type] += 1;
    }
    return totals;
  });

type PublicCampaignRow = {
  tenant_id: string;
  id: string;
  nome: string;
  tipo: Campaign["tipo"];
  prioridade: number;
  conteudo: CampaignConteudo & { media_id?: string };
  segmentacao: CampaignSegmentacao;
  frequencia: CampaignFrequencia;
  start_at: string | null;
  end_at: string | null;
  published_version_id?: string | null;
};

async function campaignMediaUrl(tenantId: string, mediaId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("media_library")
    .select("id, arquivo, arquivo_medium, arquivo_thumbnail")
    .eq("tenant_id", tenantId)
    .eq("id", mediaId)
    .limit(2);
  if (error || !Array.isArray(data) || data.length !== 1) {
    throw new Error("public_campaign_media_reference_invalid");
  }
  const row = data[0] as Record<string, unknown>;
  const rawPath = (row.arquivo_medium ?? row.arquivo_thumbnail ?? row.arquivo) as string | null;
  if (!rawPath) throw new Error("public_campaign_media_reference_invalid");
  const { bucket, path } = validateTenantSignRequest({ bucket: "site", path: rawPath, tenantId });
  const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_PREVIEW_SECONDS);
  if (signed.error || !signed.data?.signedUrl) throw new Error("public_campaign_media_sign_failed");
  return signed.data.signedUrl;
}

export const listarCampanhasAtivas = createServerFn({ method: "GET" })
  .inputValidator((data: Record<string, never> | undefined) => z.object({}).strict().parse(data ?? {}))
  .handler(async () => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("cms_campaigns")
      .select("tenant_id, id, nome, tipo, prioridade, conteudo, segmentacao, frequencia, start_at, end_at, published_version_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .not("published_version_id", "is", null)
      .order("prioridade", { ascending: false });
    if (error) throw new Error(error.message);
    const scoped = assertTenantScopedRows(
      tenant.id,
      rows as PublicCampaignRow[] | null,
    );
    const projected = await Promise.all(scoped.map(async (row) => {
      const content = { ...row.conteudo };
      const mediaId = content.media_id;
      delete content.media_id;
      if (mediaId) content.imagem_url = await campaignMediaUrl(tenant.id, mediaId);
      return withoutTenantId({ ...row, conteudo: content }) as unknown as Campaign;
    }));
    return projected;
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
  // PTW-01 owns this public mutation. The legacy PTR-01/PSC-01 strings below
  // are historical evidence only; they are not executable contracts:
  // tenantId?: string | null
  // publicClient(data.tenantId ?? null)
  // .from("cms_campaign_events").insert
  // Active contract: Host-derived tenant + PTW-01 writer validation.
  .inputValidator((data: unknown) => publicCampaignEventSchema.parse(data))
  .handler(async ({ data }) => {
    const tenant = await requirePublicWriterTenantFromRequest();
    return recordPublicCampaignEvent({ tenant, event: data });
  });
