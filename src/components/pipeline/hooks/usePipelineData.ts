// Hook central de dados do Pipeline (Bloco 2).
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListarLeads, adminListarCorretores } from "@/lib/api/admin.functions";
import { adminContarDescartes } from "@/lib/api/historico.functions";
import { adminAtualizarLead } from "@/lib/api/admin.functions";
import type { Lead, Status, CorretorLite } from "@/adapters/pipeline-legacy";
import type { PipelineSearch } from "../search-schema";
import { toast } from "sonner";

export function usePipelineData(search: PipelineSearch) {
  const qc = useQueryClient();
  const { data: leads } = useQuery({ queryKey: ["admin", "leads"], queryFn: () => adminListarLeads() });
  const { data: corretores } = useQuery({ queryKey: ["admin", "corretores", "lite"], queryFn: () => adminListarCorretores(), staleTime: 60_000 });
  const { data: descartes } = useQuery({ queryKey: ["admin", "descartes-count"], queryFn: () => adminContarDescartes(), staleTime: 30_000 });

  const filtered = useMemo(() => {
    let list = ((leads ?? []) as Lead[]);
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
    const map: Record<Status, Lead[]> = { novo: [], conversando: [], visita: [], proposta: [], ganho: [], perdido: [], descartado: [] };
    const known: Status[] = ["novo", "conversando", "visita", "proposta", "ganho", "perdido"];
    for (const l of filtered) {
      const s = (known.includes(l.status as Status) ? l.status : "novo") as Status;
      map[s].push(l);
    }
    return map;
  }, [filtered]);

  const updateStatus = useMutation({
    mutationFn: (p: { id: string; status: Status }) => adminAtualizarLead({ data: p }),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ["admin", "leads"] });
      const prev = qc.getQueryData<Lead[]>(["admin", "leads"]);
      qc.setQueryData<Lead[]>(["admin", "leads"], (old) => old?.map((l) => (l.id === p.id ? { ...l, status: p.status } : l)) ?? []);
      return { prev };
    },
    onError: (e: Error, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "leads"], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads"] }),
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
