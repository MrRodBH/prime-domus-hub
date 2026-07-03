// Página — Adapter (Bloco 3.1). Toda comunicação server side desta entidade vive aqui.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listarPaginas, obterPaginaAdmin, salvarPagina, excluirPagina,
} from "@/lib/api/pages.functions";
import type {
  ContentEntityAdapter, ContentEntityDetail, ContentEntityRecord,
  ContentDraft, StatusValue, VersionRecord,
} from "../types";
import type { CmsBlock } from "@/adapters/cms-legacy";

export function usePageAdapter(): ContentEntityAdapter {
  const listarFn = useServerFn(listarPaginas);
  const obterFn = useServerFn(obterPaginaAdmin);
  const salvarFn = useServerFn(salvarPagina);
  const excluirFn = useServerFn(excluirPagina);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const rows = await listarFn();
    return rows.map((r) => ({
      id: r.id, titulo: r.titulo, slug: r.slug,
      status: r.status as StatusValue,
      updated_at: r.updated_at, published_at: r.published_at,
    }));
  }, [listarFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const row = await obterFn({ data: { id } });
    return {
      id: row.id, titulo: row.titulo, slug: row.slug,
      status: row.status as StatusValue,
      updated_at: row.updated_at, published_at: row.published_at,
      descricao: row.descricao,
      seo: (row.seo ?? {}) as Record<string, unknown>,
      blocks: (Array.isArray(row.blocks) ? row.blocks : []) as CmsBlock[],
      data: {},
    };
  }, [obterFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft, opts: { publish: boolean }) => {
      const status = opts.publish ? "published" : (draft.status as "draft" | "published" | "archived");
      const row = await salvarFn({
        data: {
          id: id ?? undefined,
          slug: draft.slug.trim(),
          titulo: draft.titulo.trim(),
          descricao: draft.descricao.trim() || null,
          status,
          seo: draft.seo as never,
          blocks: draft.blocks as never,
        },
      });
      return { id: (row as { id: string }).id };
    },
    [salvarFn],
  );

  const remove = useCallback(async (id: string) => { await excluirFn({ data: { id } }); }, [excluirFn]);

  const listVersions = useCallback(async (): Promise<VersionRecord[]> => {
    // cms_pages ainda não tem tabela dedicada — VersionsPanel gera "atual x rascunho"
    // a partir do detail carregado. Retornamos vazio (VersionsPanel cobre esse caso).
    return [];
  }, []);

  return useMemo(
    () => ({
      fetchList, fetchDetail, save, remove, listVersions,
      publicUrl: (_d, draft) => (draft.slug ? `/p/${draft.slug}` : null),
    }),
    [fetchList, fetchDetail, save, remove, listVersions],
  );
}
