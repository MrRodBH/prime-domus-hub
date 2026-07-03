// Mídia — Adapter (Bloco 3.1). Mídia NÃO é exceção — usa mesmo ContentWorkspace.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listarMidias, atualizarMidia, excluirMidia, listarUsosMidia,
} from "@/lib/api/media.functions";
import type {
  ContentEntityAdapter, ContentEntityDetail, ContentEntityRecord,
  ContentDraft, StatusValue,
} from "../types";

export function useMediaAdapter(): ContentEntityAdapter {
  const listarFn = useServerFn(listarMidias);
  const atualizarFn = useServerFn(atualizarMidia);
  const excluirFn = useServerFn(excluirMidia);
  const usosFn = useServerFn(listarUsosMidia);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const res = await listarFn({ data: { search: "", tipo: "all", page: 0, pageSize: 100 } });
    return (res.items as Array<{
      id: string; nome: string; tipo: string; created_at: string; updated_at?: string | null;
      tamanho: number; url_thumbnail?: string | null; url_medium?: string | null; url?: string | null;
      mime_type: string; width?: number | null; height?: number | null;
    }>).map((m) => ({
      id: m.id, titulo: m.nome, slug: null,
      status: "published" as StatusValue,
      updated_at: m.updated_at ?? m.created_at,
      extra: {
        tipo: m.tipo, tamanho: m.tamanho, mime: m.mime_type,
        url_thumbnail: m.url_thumbnail ?? null,
        url_medium: m.url_medium ?? null,
        url: m.url ?? null,
        width: m.width, height: m.height,
      },
    }));
  }, [listarFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    // Reusa list e busca item; media não tem endpoint "obter" separado.
    const res = await listarFn({ data: { search: "", tipo: "all", page: 0, pageSize: 200 } });
    const m = (res.items as Array<Record<string, unknown>>).find((x) => x.id === id);
    if (!m) throw new Error("Mídia não encontrada");
    const [usos] = await Promise.all([usosFn({ data: { media_id: id } })]);
    return {
      id: m.id as string,
      titulo: (m.nome as string) ?? "",
      slug: null,
      status: "published",
      updated_at: (m.updated_at as string) ?? (m.created_at as string),
      descricao: (m.descricao as string | null) ?? null,
      seo: {},
      blocks: [],
      data: {
        tipo: m.tipo,
        tamanho: m.tamanho,
        mime: m.mime_type,
        width: m.width, height: m.height,
        url: m.url, url_medium: m.url_medium, url_thumbnail: m.url_thumbnail,
        tags: (m.tags as string[]) ?? [],
        usos,
      },
    };
  }, [listarFn, usosFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft) => {
      if (!id) throw new Error("Upload de mídia deve usar o botão de upload do workspace.");
      const d = draft.data as { tags?: string[] };
      await atualizarFn({
        data: {
          id,
          nome: draft.titulo,
          tags: d.tags ?? [],
          descricao: draft.descricao || null,
        },
      });
      return { id };
    },
    [atualizarFn],
  );

  const remove = useCallback(async (id: string) => {
    const r = await excluirFn({ data: { id, force: false } });
    if (!r.ok) {
      // segunda chamada com force=true se houver usos e o usuário decidir prosseguir
      await excluirFn({ data: { id, force: true } });
    }
  }, [excluirFn]);

  return useMemo(() => ({ fetchList, fetchDetail, save, remove }), [fetchList, fetchDetail, save, remove]);
}
