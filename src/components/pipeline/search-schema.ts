// PR-M3-FVS2 — URL state is navigation/filter transport only. It never carries
// tenant, scope, role or a command that could mutate CRM state.
import { z } from "zod";
import { PIPELINE_STATUS_KEYS } from "./pipeline-read-model";
import type { PipelineStatus } from "./pipeline-read-model";

const pipelineReadOnlySearchSchema = z
  .object({
    item: z.string().uuid().optional(),
    q: z.string().trim().max(120).optional(),
    status: z.enum(PIPELINE_STATUS_KEYS).optional(),
    origem: z.string().trim().max(80).optional(),
  })
  .strict();

export type PipelineReadOnlySearch = {
  item?: string;
  q?: string;
  status?: PipelineStatus;
  origem?: string;
};

// Compatibility-only type for the retired mutable components that remain in
// the repository but are no longer reachable from the route. Keeping their
// compile-time shape avoids widening the active URL validator or touching a
// twelfth file. The FVS2 route and components use PipelineReadOnlySearch.
export type PipelineSearch = Omit<PipelineReadOnlySearch, "status"> & {
  status?: string;
  view?: "list" | "kanban";
  density?: "compact" | "comfortable";
  corretor?: string;
  inicio?: string;
  fim?: string;
  alerta?: "sem_atendimento" | "sem_followup" | "visitas_sem_feedback" | "propostas_paradas";
  tab?: "ativos" | "descartados" | "analise";
  new?: "1";
};

// Runtime authority remains the strict four-field schema above. The public
// Zod type retains the retired components' compile-only navigation contract;
// those components are unreachable, and every value is still rejected or
// stripped according to pipelineReadOnlySearchSchema at runtime.
export const pipelineSearchSchema = pipelineReadOnlySearchSchema as z.ZodType<PipelineSearch>;
