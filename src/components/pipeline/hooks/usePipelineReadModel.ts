import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminListarLeads } from "@/lib/api/admin.functions";
import {
  classifyPipelineReadError,
  filterPipelineLeadReadModels,
  summarizePipelineLeadReadModels,
  toPipelineLeadReadModels,
} from "../pipeline-read-model";
import type { PipelineReadOnlySearch } from "../search-schema";

export function usePipelineReadModel(search: PipelineReadOnlySearch) {
  const query = useQuery({
    queryKey: ["admin", "pipeline", "read-only"],
    queryFn: () => adminListarLeads(),
    staleTime: 30_000,
  });

  const leads = useMemo(() => toPipelineLeadReadModels(query.data ?? []), [query.data]);
  const filtered = useMemo(() => filterPipelineLeadReadModels(leads, search), [leads, search]);
  const summary = useMemo(() => summarizePipelineLeadReadModels(leads), [leads]);
  const origins = useMemo(
    () =>
      [...new Set(leads.map((lead) => lead.origem).filter(Boolean) as string[])].sort(
        (left, right) => left.localeCompare(right, "pt-BR"),
      ),
    [leads],
  );

  return {
    query,
    leads,
    filtered,
    summary,
    origins,
    errorKind: query.isError ? classifyPipelineReadError(query.error) : null,
  };
}
