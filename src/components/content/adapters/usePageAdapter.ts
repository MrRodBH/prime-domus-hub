// Página — adapter canônico PR-M2.
// Toda mutação passa pelo workflow versionado server-side; o client envia
// apenas intenção e snapshot validado pelo registry fechado.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getTenantPage,
  listTenantPages,
  listTenantPageVersions,
  publishTenantPage,
  rollbackTenantPage,
  saveTenantPageDraft,
} from "@/lib/api/tenant-cms.functions";
import type {
  ContentEntityAdapter,
  ContentEntityDetail,
  ContentEntityRecord,
  ContentDraft,
  StatusValue,
  VersionRecord,
} from "../types";
import type { CmsBlock } from "@/adapters/cms-legacy";

function sectionBlocks(snapshot: Record<string, unknown> | null): CmsBlock[] {
  const layout = snapshot?.layout;
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return [];
  const sections = (layout as Record<string, unknown>).sections;
  if (!Array.isArray(sections)) return [];
  return sections.flatMap((section) => {
    if (!section || typeof section !== "object" || Array.isArray(section)) return [];
    const value = section as Record<string, unknown>;
    if (typeof value.id !== "string" || typeof value.type !== "string" || !value.data || typeof value.data !== "object") return [];
    return [{ id: value.id, type: value.type, data: value.data } as CmsBlock];
  });
}

function collectReferences(blocks: CmsBlock[]) {
  const media = new Set<string>();
  const forms = new Set<string>();
  for (const block of blocks) {
    const data = block.data as Record<string, unknown>;
    if ((block.type === "hero" || block.type === "image") && typeof data.media_id === "string") {
      media.add(data.media_id);
    }
    if (block.type === "gallery" && Array.isArray(data.imagens)) {
      for (const image of data.imagens) {
        if (image && typeof image === "object" && typeof (image as Record<string, unknown>).media_id === "string") {
          media.add((image as Record<string, unknown>).media_id as string);
        }
      }
    }
    if (block.type === "form" && typeof data.form_id === "string") forms.add(data.form_id);
  }
  return { media: [...media], forms: [...forms] };
}

function safeSeo(value: Record<string, unknown>) {
  return {
    ...(typeof value.meta_title === "string" ? { meta_title: value.meta_title } : {}),
    ...(typeof value.meta_description === "string" ? { meta_description: value.meta_description } : {}),
    ...(typeof value.og_media_id === "string" ? { og_media_id: value.og_media_id } : {}),
    ...(typeof value.canonical === "string" ? { canonical: value.canonical } : {}),
    ...(typeof value.noindex === "boolean" ? { noindex: value.noindex } : {}),
  };
}

export function usePageAdapter(): ContentEntityAdapter {
  const listFn = useServerFn(listTenantPages);
  const getFn = useServerFn(getTenantPage);
  const saveDraftFn = useServerFn(saveTenantPageDraft);
  const publishFn = useServerFn(publishTenantPage);
  const versionsFn = useServerFn(listTenantPageVersions);
  const rollbackFn = useServerFn(rollbackTenantPage);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const rows = await listFn();
    return rows.map((row) => ({
      id: row.id,
      titulo: row.title,
      slug: row.slug,
      status: row.status as StatusValue,
      updated_at: row.updatedAt,
      published_at: row.publishedAt,
      extra: {
        pageType: row.pageType,
        layoutType: row.layoutType,
        revision: row.revision,
        draftVersionId: row.draftVersionId,
        publishedVersionId: row.publishedVersionId,
      },
    }));
  }, [listFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const row = await getFn({ data: { id } });
    const snapshot = row.effectiveSnapshot as Record<string, unknown> | null;
    const seo = snapshot?.seo && typeof snapshot.seo === "object" && !Array.isArray(snapshot.seo)
      ? snapshot.seo as Record<string, unknown>
      : {};
    return {
      id: row.id,
      titulo: row.title,
      slug: row.slug,
      status: row.status as StatusValue,
      updated_at: row.updatedAt,
      published_at: row.publishedAt,
      descricao: row.description,
      seo,
      blocks: sectionBlocks(snapshot),
      data: {
        revision: row.revision,
        pageType: row.pageType,
        layoutType: row.layoutType,
        schemaVersion: row.schemaVersion,
        draftVersionId: row.draft?.id ?? null,
        publishedVersionId: row.published?.id ?? null,
        legacySnapshot: row.draft?.schemaVersion === 0 || row.published?.schemaVersion === 0,
      },
    };
  }, [getFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft, opts: { publish: boolean }) => {
      const references = collectReferences(draft.blocks);
      const expectedRevision = Number(draft.data.revision ?? 0);
      const pageType = typeof draft.data.pageType === "string" ? draft.data.pageType : "standard";
      const layoutType = typeof draft.data.layoutType === "string" ? draft.data.layoutType : "single_column";
      const saved = await saveDraftFn({
        data: {
          id: id ?? undefined,
          expectedRevision,
          snapshot: {
            ...(id ? { page_id: id } : {}),
            page_type: pageType as "standard" | "landing" | "institutional",
            schema_version: 1,
            slug: draft.slug.trim(),
            title: draft.titulo.trim(),
            description: draft.descricao.trim() || null,
            status: "draft",
            seo: safeSeo(draft.seo),
            layout: {
              type: layoutType as "single_column" | "sidebar_right" | "full_width",
              sections: draft.blocks.map((block) => ({
                id: block.id,
                type: block.type,
                region: "main",
                data: block.data,
              })),
            },
            navigation_references: [],
            form_references: references.forms,
            campaign_references: [],
            media_references: references.media,
            configuration_references: [],
          },
        },
      });
      const pageId = String(saved.pageId);
      const revision = Number(saved.revision);
      if (opts.publish) {
        await publishFn({ data: { pageId, expectedRevision: revision } });
      }
      return { id: pageId };
    },
    [publishFn, saveDraftFn],
  );

  const remove = useCallback(async () => {
    throw new Error("Exclusão direta retirada: despublique ou arquive a página por workflow explícito.");
  }, []);

  const listVersions = useCallback(async (id: string): Promise<VersionRecord[]> => {
    const versions = await versionsFn({ data: { pageId: id } });
    return versions.map((version) => ({
      id: version.id,
      label: `Revisão ${version.revision}`,
      status: version.status,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
      payload: version.snapshot,
    }));
  }, [versionsFn]);

  const restoreVersion = useCallback(async (id: string, versionId: string) => {
    const detail = await getFn({ data: { id } });
    await rollbackFn({ data: { pageId: id, versionId, expectedRevision: detail.revision } });
  }, [getFn, rollbackFn]);

  return useMemo(
    () => ({
      fetchList,
      fetchDetail,
      save,
      remove,
      listVersions,
      restoreVersion,
      publicUrl: (_detail, draft) => (draft.slug ? `/p/${draft.slug}` : null),
    }),
    [fetchList, fetchDetail, save, remove, listVersions, restoreVersion],
  );
}
