// Campanha — adapter canônico PR-M2.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getTenantCampaign,
  listTenantCampaigns,
  listTenantCampaignVersions,
  publishTenantCampaign,
  saveTenantCampaignDraft,
} from "@/lib/api/tenant-cms.functions";
import type {
  ContentEntityAdapter,
  ContentEntityDetail,
  ContentEntityRecord,
  ContentDraft,
  StatusValue,
  VersionRecord,
} from "../types";

export function useCampaignAdapter(): ContentEntityAdapter {
  const listFn = useServerFn(listTenantCampaigns);
  const getFn = useServerFn(getTenantCampaign);
  const saveDraftFn = useServerFn(saveTenantCampaignDraft);
  const publishFn = useServerFn(publishTenantCampaign);
  const versionsFn = useServerFn(listTenantCampaignVersions);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const rows = await listFn();
    return (rows as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      titulo: row.nome as string,
      slug: null,
      status: row.status as StatusValue,
      updated_at: row.updated_at as string,
      published_at: (row.published_at as string | null) ?? null,
      extra: {
        tipo: row.tipo,
        prioridade: row.prioridade,
        start_at: row.start_at,
        end_at: row.end_at,
        revision: Number(row.revision),
        draftVersionId: row.draft_version_id ?? null,
        publishedVersionId: row.published_version_id ?? null,
      },
    }));
  }, [listFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const result = await getFn({ data: { id } });
    const campaign = result.campaign as Record<string, unknown>;
    const snapshot = result.effectiveSnapshot as Record<string, unknown> | null;
    return {
      id: campaign.id as string,
      titulo: (snapshot?.nome as string) ?? (campaign.nome as string) ?? "",
      slug: null,
      status: campaign.status as StatusValue,
      updated_at: campaign.updated_at as string,
      published_at: (campaign.published_at as string | null) ?? null,
      descricao: null,
      seo: {},
      blocks: [],
      data: {
        revision: Number(campaign.revision ?? 0),
        schemaVersion: Number(campaign.schema_version ?? 0),
        draftVersionId: result.draft?.id ?? null,
        publishedVersionId: result.published?.id ?? null,
        legacySnapshot: result.draft?.schemaVersion === 0 || result.published?.schemaVersion === 0,
        tipo: snapshot?.tipo ?? campaign.tipo,
        prioridade: snapshot?.prioridade ?? campaign.prioridade,
        conteudo: snapshot?.conteudo ?? campaign.conteudo ?? {},
        segmentacao: snapshot?.segmentacao ?? campaign.segmentacao ?? {},
        frequencia: snapshot?.frequencia ?? campaign.frequencia ?? {},
        start_at: snapshot?.start_at ?? campaign.start_at ?? null,
        end_at: snapshot?.end_at ?? campaign.end_at ?? null,
        target_page_ids: snapshot?.target_page_ids ?? [],
      },
    };
  }, [getFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft, opts: { publish: boolean }) => {
      const data = draft.data as Record<string, unknown>;
      const content = data.conteudo && typeof data.conteudo === "object" && !Array.isArray(data.conteudo)
        ? data.conteudo as Record<string, unknown>
        : {};
      const segmentation = data.segmentacao && typeof data.segmentacao === "object" && !Array.isArray(data.segmentacao)
        ? data.segmentacao as Record<string, unknown>
        : {};
      const frequency = data.frequencia && typeof data.frequencia === "object" && !Array.isArray(data.frequencia)
        ? data.frequencia as Record<string, unknown>
        : {};
      const expectedRevision = Number(data.revision ?? 0);
      const saved = await saveDraftFn({
        data: {
          id: id ?? undefined,
          expectedRevision,
          snapshot: {
            ...(id ? { campaign_id: id } : {}),
            schema_version: 1,
            nome: draft.titulo.trim() || "Nova campanha",
            tipo: (data.tipo as "banner_top" | "banner_bottom" | "popup_center" | "modal" | "floating") ?? "banner_top",
            status: "draft",
            prioridade: Number(data.prioridade ?? 0),
            conteudo: {
              titulo: typeof content.titulo === "string" ? content.titulo : undefined,
              mensagem: typeof content.mensagem === "string" ? content.mensagem : undefined,
              media_id: typeof content.media_id === "string" ? content.media_id : undefined,
              cta_label: typeof content.cta_label === "string" ? content.cta_label : undefined,
              cta_url: typeof content.cta_url === "string" ? content.cta_url : undefined,
              cor_fundo: typeof content.cor_fundo === "string" ? content.cor_fundo : undefined,
              cor_texto: typeof content.cor_texto === "string" ? content.cor_texto : undefined,
              dismissible: typeof content.dismissible === "boolean" ? content.dismissible : undefined,
            },
            segmentacao: {
              rotas_incluir: Array.isArray(segmentation.rotas_incluir) ? segmentation.rotas_incluir as string[] : [],
              rotas_excluir: Array.isArray(segmentation.rotas_excluir) ? segmentation.rotas_excluir as string[] : [],
              dispositivo: (segmentation.dispositivo as "all" | "desktop" | "mobile") ?? "all",
            },
            frequencia: {
              max_por_sessao: Number(frequency.max_por_sessao ?? 1),
              cooldown_horas: Number(frequency.cooldown_horas ?? 24),
            },
            start_at: typeof data.start_at === "string" ? data.start_at : null,
            end_at: typeof data.end_at === "string" ? data.end_at : null,
            target_page_ids: Array.isArray(data.target_page_ids) ? data.target_page_ids as string[] : [],
          },
        },
      });
      const campaignId = String(saved.campaignId);
      const revision = Number(saved.revision);
      if (opts.publish) await publishFn({ data: { campaignId, expectedRevision: revision } });
      return { id: campaignId };
    },
    [publishFn, saveDraftFn],
  );

  const remove = useCallback(async () => {
    throw new Error("Exclusão direta retirada: pause ou arquive a campanha por workflow explícito.");
  }, []);

  const listVersions = useCallback(async (id: string): Promise<VersionRecord[]> => {
    const versions = await versionsFn({ data: { campaignId: id } });
    return versions.map((version) => ({
      id: version.id,
      label: `Revisão ${version.revision}`,
      status: version.status,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
      payload: version.snapshot,
    }));
  }, [versionsFn]);

  return useMemo(
    () => ({ fetchList, fetchDetail, save, remove, listVersions }),
    [fetchList, fetchDetail, save, remove, listVersions],
  );
}
