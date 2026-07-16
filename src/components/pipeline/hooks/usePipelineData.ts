// Hook central de dados do Pipeline (Bloco 2).
// PR-M1 — Kanban OCC: drag-and-drop com optimistic update, snapshot rollback,
// refetch e propagação da nova versão devolvida pela RPC.
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListarLeads, adminListarLeadAssignees } from "@/lib/api/admin.functions";
import { adminContarDescartes } from "@/lib/api/historico.functions";
import { transicionarLead } from "@/lib/api/leads-crm.functions";
import type { Lead, Status, CorretorLite } from "@/adapters/pipeline-legacy";
import type { PipelineSearch } from "../search-schema";
import { toast } from "sonner";
import { LEAD_TRANSITION_ERROR_CODES } from "@/lib/leads/lead-transition.server";

const KNOWN_CODES = new Set<string>(LEAD_TRANSITION_ERROR_CODES);

const ERROR_MESSAGES: Record<string, string> = {
  version_conflict: "Este lead foi alterado por outra operação — dados atualizados.",
  invalid_transition: "Transição inválida a partir do status atual.",
  noop_transition: "O lead já está neste status.",
  forbidden: "Você não tem permissão para essa transição.",
  tenant_unresolved: "Contexto de workspace indisponível.",
  tenant_boundary_violation: "Operação bloqueada por isolamento de workspace.",
  no_active_membership: "Sua conta não possui participação ativa neste workspace.",
  discard_reason_required: "Selecione um motivo de descarte.",
  invalid_discard_reason: "Motivo de descarte inválido.",
  lost_reason_required: "Selecione um motivo de perda.",
  invalid_lost_reason: "Motivo de perda inválido.",
  reason_id_not_allowed_for_transition: "Motivo não é aplicável a esta transição.",
  lead_not_found: "Lead não encontrado.",
  rpc_contract_violation: "Falha na resposta do servidor. Tente novamente.",
  unauthenticated: "Sessão expirada. Faça login novamente.",
  unknown_error: "Não foi possível concluir a transição.",
};

function mapTransitionErrorMessage(err: Error): string {
  const raw = err.message ?? "";
  const head = raw.split(":")[0]?.trim() ?? raw;
  if (KNOWN_CODES.has(head)) return ERROR_MESSAGES[head] ?? head;
  return ERROR_MESSAGES.unknown_error;
}

export function usePipelineData(search: PipelineSearch) {
  const qc = useQueryClient();
  const { data: leads } = useQuery({ queryKey: ["admin", "leads"], queryFn: () => adminListarLeads() });
  const { data: corretores } = useQuery({ queryKey: ["admin", "lead-assignees", "lite"], queryFn: () => adminListarLeadAssignees(), staleTime: 60_000 });
  const { data: descartes } = useQuery({ queryKey: ["admin", "descartes-count"], queryFn: () => adminContarDescartes(), staleTime: 30_000 });

  const filtered = useMemo(() => {
    let list = ((leads ?? []) as Lead[]);

    // PR-M1: `tab` filters the active view.
    //  - ativos      → all statuses except `descartado`
    //  - descartados → only `descartado`
    //  - analise     → same base as ativos (analytics render their own scopes)
    const tab = search.tab ?? "ativos";
    if (tab === "descartados") {
      list = list.filter((l) => l.status === "descartado");
    } else {
      list = list.filter((l) => l.status !== "descartado");
    }

    if (search.corretor === "__none__") list = list.filter((l) => !l.assigned_to);
    else if (search.corretor && search.corretor !== "__all__") list = list.filter((l) => l.assigned_to === search.corretor);
    if (search.status) {
      const statuses = search.status.split(",");
      list = list.filter((l) => statuses.includes(l.status));
    }
    if (search.origem) {
      const origem = search.origem.toLowerCase();
      list = list.filter((l) => (l.origem ?? "").toLowerCase() === origem);
    }
    if (search.inicio) {
      const ini = new Date(search.inicio).getTime();
      list = list.filter((l) => new Date(l.created_at).getTime() >= ini);
    }
    if (search.fim) {
      const fim = new Date(search.fim).getTime() + 86_400_000;
      list = list.filter((l) => new Date(l.created_at).getTime() <= fim);
    }
    if (search.alerta) {
      const now = Date.now(); const day = 86_400_000;
      const updatedAt = (l: Lead & { updated_at?: string }) => new Date(l.updated_at ?? l.created_at).getTime();
      if (search.alerta === "sem_atendimento") list = list.filter((l) => l.status === "novo" && now - new Date(l.created_at).getTime() > day);
      else if (search.alerta === "sem_followup") list = list.filter((l) => ["conversando", "visita", "proposta"].includes(l.status) && now - updatedAt(l) > 3 * day);
      else if (search.alerta === "visitas_sem_feedback") list = list.filter((l) => l.status === "visita" && now - updatedAt(l) > 3 * day);
      else if (search.alerta === "propostas_paradas") list = list.filter((l) => l.status === "proposta" && now - updatedAt(l) > 5 * day);
    }
    return list;
  }, [leads, search]);

  const byStatus = useMemo(() => {
    // PR-M1: canonical 7-state domain. No fallback: an unexpected status is
    // dropped with a diagnostic instead of being silently coerced into `novo`.
    const map: Record<Status, Lead[]> = {
      novo: [], conversando: [], visita: [], proposta: [],
      ganho: [], perdido: [], descartado: [],
    };
    const known: readonly Status[] = ["novo", "conversando", "visita", "proposta", "ganho", "perdido", "descartado"] as const;
    for (const l of filtered) {
      if (known.includes(l.status)) {
        map[l.status].push(l);
      } else if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[pipeline] dropping lead with unknown status", { id: l.id, status: l.status });
      }
    }
    return map;
  }, [filtered]);

  // PR-M1: OCC-aware mutation. `expectedVersion` is the version observed by
  // the user BEFORE the mutation; on success the new version is written back
  // into the cache; on error the snapshot is fully restored and a refetch is
  // triggered so the user reconciles with the latest server state.
  const updateStatus = useMutation({
    mutationFn: (p: { id: string; status: Status; expectedVersion: number }) =>
      transicionarLead({
        data: {
          leadId: p.id,
          toStatus: p.status,
          expectedVersion: p.expectedVersion,
          metadata: { source: "pipeline_advance" },
        },
      }),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ["admin", "leads"] });
      const prev = qc.getQueryData<Lead[]>(["admin", "leads"]);
      qc.setQueryData<Lead[]>(["admin", "leads"], (old) =>
        old?.map((l) => (l.id === p.id ? { ...l, status: p.status } : l)) ?? [],
      );
      return { prev };
    },
    onError: (e: Error, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "leads"], ctx.prev);
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.error(mapTransitionErrorMessage(e));
    },
    onSuccess: (result, p) => {
      // Grava localmente a nova versão retornada para viabilizar a próxima
      // transição sem esperar refetch.
      qc.setQueryData<Lead[]>(["admin", "leads"], (old) =>
        old?.map((l) =>
          l.id === p.id ? { ...l, status: result.toStatus, version: result.version } : l,
        ) ?? [],
      );
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
  });

  return {
    leads: (leads ?? []) as Lead[],
    corretores: (corretores ?? []) as CorretorLite[],
    descartesTotal: descartes?.total ?? 0,
    filtered,
    byStatus,
    updateStatus,
  };
}
