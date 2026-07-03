// Formulário — Adapter (Bloco 3.1).
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listarFormulariosAdmin, obterFormularioAdmin, salvarFormulario,
  salvarCampos, excluirFormulario,
} from "@/lib/api/forms.functions";
import type {
  ContentEntityAdapter, ContentEntityDetail, ContentEntityRecord,
  ContentDraft, StatusValue,
} from "../types";

export function useFormAdapter(): ContentEntityAdapter {
  const listarFn = useServerFn(listarFormulariosAdmin);
  const obterFn = useServerFn(obterFormularioAdmin);
  const salvarFn = useServerFn(salvarFormulario);
  const salvarCamposFn = useServerFn(salvarCampos);
  const excluirFn = useServerFn(excluirFormulario);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const rows = await listarFn();
    return (rows as Array<{
      id: string; nome: string; slug: string; status: string;
      created_at: string; updated_at: string;
    }>).map((r) => ({
      id: r.id, titulo: r.nome, slug: r.slug,
      status: r.status as StatusValue,
      updated_at: r.updated_at,
    }));
  }, [listarFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const res = await obterFn({ data: { id } });
    const form = res.form as Record<string, unknown>;
    return {
      id: form.id as string,
      titulo: (form.nome as string) ?? "",
      slug: (form.slug as string) ?? "",
      status: (form.status as StatusValue) ?? "draft",
      updated_at: (form.updated_at as string) ?? new Date().toISOString(),
      descricao: (form.descricao as string | null) ?? null,
      seo: {},
      blocks: [],
      data: {
        config: form.config ?? {},
        fields: res.fields ?? [],
      },
    };
  }, [obterFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft, opts: { publish: boolean }) => {
      const d = draft.data as { config?: Record<string, unknown>; fields?: unknown[] };
      const status: StatusValue = opts.publish ? "published" : draft.status;
      const res = await salvarFn({
        data: {
          id: id ?? undefined,
          nome: draft.titulo.trim() || "Novo formulário",
          slug: draft.slug.trim(),
          status: (status === "active" || status === "paused" ? "draft" : status) as never,
          descricao: draft.descricao || null,
          config: (d.config as never) ?? {},
        },
      });
      // Salvar campos se houver payload
      if (d.fields && Array.isArray(d.fields) && d.fields.length >= 0) {
        try {
          await salvarCamposFn({ data: { form_id: res.id, fields: d.fields as never } });
        } catch { /* campos são salvos separadamente; tolerar erro parcial */ }
      }
      return { id: res.id };
    },
    [salvarFn, salvarCamposFn],
  );

  const remove = useCallback(async (id: string) => { await excluirFn({ data: { id } }); }, [excluirFn]);

  return useMemo(
    () => ({
      fetchList, fetchDetail, save, remove,
      publicUrl: (_d, draft) => (draft.slug ? `/f/${draft.slug}` : null),
    }),
    [fetchList, fetchDetail, save, remove],
  );
}
