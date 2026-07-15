// Lead — Adapter (LSH-01 · Content Workspace mutation surface removed).
//
// A superfície de mutation deste adapter foi removida pela LSO-01 e
// preservada pela LSH-01: nenhuma rota do produto monta
// `<ContentWorkspace kind="lead">`. O CRM canônico é `/admin/pipeline`.
//
// REGRAS observadas (LSH-01):
//   - Toda mutation de Lead ocorre no pipeline (server-side, boundary
//     único), NÃO via adapter/workspace.
//   - `runAction` falha explicitamente para qualquer actionId — não é
//     autoridade de nada.
//   - `fetchList`/`fetchDetail` permanecem apenas como leitores auxiliares
//     usados por consumidores de conteúdo (não de operação).
//   - `fetchFilterOptions` serve os filtros com optionsFrom: "adapter"
//     (corretor). Nenhum outro caminho de resolução é permitido.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  adminListarLeads,
  adminListarCorretores,
} from "@/lib/api/admin.functions";
import type {
  ContentEntityAdapter,
  ContentEntityDetail,
  ContentEntityRecord,
  ListParams,
} from "../types";

type LeadRow = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  origem: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at?: string;
  assigned_to: string | null;
  valor_estimado: number | null;
  imovel: { titulo?: string; slug?: string } | null;
};

export function useLeadAdapter(): ContentEntityAdapter {
  const listarFn = useServerFn(adminListarLeads);
  const listarCorretoresFn = useServerFn(adminListarCorretores);

  // Cache de corretores — usado por fetchFilterOptions("corretor").
  const { data: corretores } = useQuery({
    queryKey: ["admin", "corretores", "lite"],
    queryFn: () => listarCorretoresFn(),
    staleTime: 60_000,
  });

  const fetchList = useCallback(
    async (params: ListParams): Promise<ContentEntityRecord[]> => {
      const rows = (await listarFn()) as LeadRow[];
      const scope = params.scope ?? "ativos";
      const filters = (params.filters ?? {}) as Record<string, string | undefined>;

      let list = rows;
      // scopeTabs → recorte declarativo.
      if (scope === "ativos") list = list.filter((l) => l.status !== "descartado");
      else if (scope === "descartados") list = list.filter((l) => l.status === "descartado");

      if (filters.corretor && filters.corretor !== "__all__") {
        if (filters.corretor === "__none__") list = list.filter((l) => !l.assigned_to);
        else list = list.filter((l) => l.assigned_to === filters.corretor);
      }
      if (filters.origem) {
        const o = filters.origem.toLowerCase();
        list = list.filter((l) => (l.origem ?? "").toLowerCase() === o);
      }
      if (params.q) {
        const q = params.q.toLowerCase();
        list = list.filter((l) =>
          `${l.nome} ${l.email ?? ""} ${l.telefone ?? ""}`.toLowerCase().includes(q),
        );
      }
      if (params.status) {
        list = list.filter((l) => l.status === params.status);
      }

      return list.map<ContentEntityRecord>((l) => ({
        id: l.id,
        titulo: l.nome,
        slug: null,
        // Mapeamento de status: o vocabulário do descriptor usa StatusValue,
        // e "active/paused" cobrem o par operacional (ativo/descartado).
        status: l.status === "descartado" ? "paused" : "active",
        updated_at: l.updated_at ?? l.created_at,
        extra: {
          origem: l.origem,
          leadStatus: l.status,           // usado pelo groupBy do kanban
          assigned_to: l.assigned_to,
          valor_estimado: l.valor_estimado,
          email: l.email,
          telefone: l.telefone,
          imovel: l.imovel?.titulo ?? null,
        },
      }));
    },
    [listarFn],
  );

  const fetchDetail = useCallback(
    async (id: string): Promise<ContentEntityDetail> => {
      const rows = (await listarFn()) as LeadRow[];
      const l = rows.find((r) => r.id === id);
      if (!l) throw new Error(`Lead não encontrado: ${id}`);
      return {
        id: l.id,
        titulo: l.nome,
        slug: null,
        status: l.status === "descartado" ? "paused" : "active",
        updated_at: l.updated_at ?? l.created_at,
        descricao: l.mensagem ?? null,
        seo: {},
        blocks: [],
        data: {
          nome: l.nome,
          email: l.email ?? "",
          telefone: l.telefone ?? "",
          origem: l.origem ?? "",
          leadStatus: l.status,
          valor_estimado: l.valor_estimado ?? "",
          imovel: l.imovel?.titulo ?? "",
          mensagem: l.mensagem ?? "",
        },
      };
    },
    [listarFn],
  );

  // Lead não é criado via workspace (origem = formulário público).
  // save é usado apenas para autosave de campos livres (mensagem/notas).
  const save = useCallback(async () => {
    // Etapa 4.1.c: no-op controlado — evita quebra do autosave do shell.
    // Edição de valor/atribuição ocorre via runAction declarativo.
    return { id: "noop" };
  }, []);

  const remove = useCallback(async () => {
    throw new Error("Lead não suporta exclusão direta — use descartar.");
  }, []);

  // LSO-01 — Workspace Runtime Reachability = NO.
  // Nenhuma rota do produto monta `<ContentWorkspace kind="lead">`; o CRM
  // canônico é `/admin/pipeline`. Manter runAction como uma segunda autoridade
  // introduziria OCC divergente sobre versão não observada. A superfície de
  // mutation é removida aqui: qualquer chamada legada falha explicitamente,
  // sem tentar recarregar a versão do banco nem retomar a transição.
  const runAction = useCallback(
    async (actionId: string, _id: string | null, _payload?: unknown) => {
      throw new Error(
        `Ação "${actionId}" indisponível no Content Workspace. ` +
          "Use o pipeline (/admin/pipeline) — autoridade única do CRM.",
      );
    },
    [],
  );

  const fetchFilterOptions = useCallback(
    async (filterId: string) => {
      if (filterId === "corretor") {
        const list = corretores ?? (await listarCorretoresFn());
        const base = [
          { value: "__all__", label: "Todos" },
          { value: "__none__", label: "Sem corretor" },
        ];
        return base.concat(
          (list as Array<{ user_id: string | null; nome: string; sobrenome: string | null }>)
            .filter((c) => !!c.user_id)
            .map((c) => ({
              value: c.user_id as string,
              label: `${c.nome}${c.sobrenome ? " " + c.sobrenome : ""}`,
            })),
        );
      }
      if (filterId === "origem") {
        const rows = (await listarFn()) as LeadRow[];
        const uniq = Array.from(new Set(rows.map((r) => r.origem).filter(Boolean))) as string[];
        return uniq.map((o) => ({ value: o, label: o }));
      }
      return [];
    },
    [corretores, listarCorretoresFn, listarFn],
  );

  return useMemo(
    () => ({ fetchList, fetchDetail, save, remove, runAction, fetchFilterOptions }),
    [fetchList, fetchDetail, save, remove, runAction, fetchFilterOptions],
  );
}
