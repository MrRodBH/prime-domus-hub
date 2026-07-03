// Post (Blog) — Adapter (Bloco 3.1). Encapsula blog.functions.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListarPosts, adminObterPost, adminSalvarPost, adminExcluirPost,
} from "@/lib/api/blog.functions";
import type {
  ContentEntityAdapter, ContentEntityDetail, ContentEntityRecord,
  ContentDraft, StatusValue,
} from "../types";

function mapStatus(s: string): StatusValue {
  return s === "publicado" ? "published" : "draft";
}
function toBackend(s: StatusValue): "rascunho" | "publicado" {
  return s === "published" ? "publicado" : "rascunho";
}

export function usePostAdapter(): ContentEntityAdapter {
  const listarFn = useServerFn(adminListarPosts);
  const obterFn = useServerFn(adminObterPost);
  const salvarFn = useServerFn(adminSalvarPost);
  const excluirFn = useServerFn(adminExcluirPost);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const rows = await listarFn();
    return (rows as Array<{
      id: string; titulo: string; slug: string; status: string;
      publicado_em: string | null; updated_at: string;
      categoria?: { nome?: string } | null;
    }>).map((r) => ({
      id: r.id, titulo: r.titulo, slug: r.slug ?? null,
      status: mapStatus(r.status),
      updated_at: r.updated_at,
      published_at: r.publicado_em,
      extra: { categoria: r.categoria?.nome ?? null },
    }));
  }, [listarFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const row = await obterFn({ data: { id } }) as Record<string, unknown>;
    return {
      id: row.id as string,
      titulo: (row.titulo as string) ?? "",
      slug: (row.slug as string) ?? null,
      status: mapStatus((row.status as string) ?? "rascunho"),
      updated_at: (row.updated_at as string) ?? new Date().toISOString(),
      published_at: (row.publicado_em as string | null) ?? null,
      descricao: (row.resumo as string | null) ?? null,
      seo: {
        meta_title: row.meta_title ?? "",
        meta_description: row.meta_description ?? "",
      },
      blocks: [],
      data: {
        conteudo: (row.conteudo as string) ?? "",
        imagem_capa: (row.imagem_capa as string | null) ?? null,
        categoria_id: (row.categoria_id as string | null) ?? null,
        autor_id: (row.autor_id as string | null) ?? null,
      },
    };
  }, [obterFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft, opts: { publish: boolean }) => {
      const seo = draft.seo as { meta_title?: string; meta_description?: string };
      const data = draft.data as {
        conteudo?: string; imagem_capa?: string | null;
        categoria_id?: string | null; autor_id?: string | null;
      };
      const status: StatusValue = opts.publish ? "published" : draft.status;
      const res = await salvarFn({
        data: {
          id: id ?? undefined,
          titulo: draft.titulo.trim(),
          slug: draft.slug.trim(),
          resumo: draft.descricao || null,
          conteudo: data.conteudo ?? "",
          imagem_capa: data.imagem_capa ?? null,
          categoria_id: data.categoria_id ?? null,
          autor_id: data.autor_id ?? null,
          status: toBackend(status),
          meta_title: seo.meta_title ?? null,
          meta_description: seo.meta_description ?? null,
        },
      });
      return { id: res.id };
    },
    [salvarFn],
  );

  const remove = useCallback(async (id: string) => { await excluirFn({ data: { id } }); }, [excluirFn]);

  return useMemo(
    () => ({
      fetchList, fetchDetail, save, remove,
      publicUrl: (_d, draft) => (draft.slug ? `/blog/${draft.slug}` : null),
    }),
    [fetchList, fetchDetail, save, remove],
  );
}
