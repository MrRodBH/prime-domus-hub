// Campanha — Adapter (Bloco 3.1).
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listarCampanhas, obterCampanha, salvarCampanha, excluirCampanha,
} from "@/lib/api/campaigns.functions";
import type {
  ContentEntityAdapter, ContentEntityDetail, ContentEntityRecord,
  ContentDraft, StatusValue,
} from "../types";

export function useCampaignAdapter(): ContentEntityAdapter {
  const listarFn = useServerFn(listarCampanhas);
  const obterFn = useServerFn(obterCampanha);
  const salvarFn = useServerFn(salvarCampanha);
  const excluirFn = useServerFn(excluirCampanha);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const rows = await listarFn();
    return (rows as Array<{
      id: string; nome: string; tipo: string; status: string;
      prioridade: number; start_at: string | null; end_at: string | null; updated_at: string;
    }>).map((r) => ({
      id: r.id, titulo: r.nome, slug: null,
      status: r.status as StatusValue,
      updated_at: r.updated_at,
      published_at: r.start_at,
      extra: { tipo: r.tipo, prioridade: r.prioridade, start_at: r.start_at, end_at: r.end_at },
    }));
  }, [listarFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const row = await obterFn({ data: { id } });
    return {
      id: row.id, titulo: row.nome, slug: null,
      status: row.status as StatusValue,
      updated_at: row.updated_at,
      published_at: row.start_at,
      descricao: null,
      seo: {},
      blocks: [],
      data: {
        tipo: row.tipo,
        prioridade: row.prioridade,
        conteudo: row.conteudo,
        segmentacao: row.segmentacao,
        frequencia: row.frequencia,
        start_at: row.start_at,
        end_at: row.end_at,
      },
    };
  }, [obterFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft, opts: { publish: boolean }) => {
      const d = draft.data as Record<string, unknown>;
      const status: StatusValue = opts.publish ? "active" : draft.status;
      const res = await salvarFn({
        data: {
          id: id ?? undefined,
          nome: draft.titulo.trim() || "Nova campanha",
          tipo: (d.tipo as never) ?? "banner_top",
          status: (status === "published" ? "active" : status) as never,
          prioridade: (d.prioridade as number) ?? 0,
          conteudo: (d.conteudo as never) ?? {},
          segmentacao: (d.segmentacao as never) ?? { rotas_incluir: [], rotas_excluir: [], dispositivo: "all" },
          frequencia: (d.frequencia as never) ?? { max_por_sessao: 1, cooldown_horas: 24 },
          start_at: (d.start_at as string | null) ?? null,
          end_at: (d.end_at as string | null) ?? null,
        },
      });
      return { id: res.id };
    },
    [salvarFn],
  );

  const remove = useCallback(async (id: string) => { await excluirFn({ data: { id } }); }, [excluirFn]);

  return useMemo(() => ({ fetchList, fetchDetail, save, remove }), [fetchList, fetchDetail, save, remove]);
}
