// PR-M3-FVS2 / PR-M3-UX-01 — URL state is navigation/filter transport only.
// It never carries tenant, scope, role or a command that could mutate CRM state.
import { z } from "zod";
import { PIPELINE_STATUS_KEYS } from "./pipeline-read-model";
import type { PipelineStatus } from "./pipeline-read-model";

const pipelineReadOnlySearchSchema = z.object({
  item: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  status: z.enum(PIPELINE_STATUS_KEYS).optional(),
  origem: z.string().trim().max(80).optional(),
});

const pipelineItemSchema = z.string().uuid();
const pipelineQuerySchema = z.string().trim().min(1).max(120);
const pipelineStatusSchema = z.enum(PIPELINE_STATUS_KEYS);
const pipelineOriginSchema = z.string().trim().min(1).max(80);

const PIPELINE_AUTHORITY_SEARCH_KEYS = [
  "tenant",
  "tenant_id",
  "tenantId",
  "role",
  "scope",
  "command",
  "action",
  "user_id",
  "userId",
  "membership_id",
  "membershipId",
  "impersonate",
  "impersonation",
] as const;

function toSearchRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function addValidString<T extends string>(
  output: Record<string, string>,
  key: string,
  value: unknown,
  schema: z.ZodType<T>,
) {
  const parsed = schema.safeParse(value);
  if (parsed.success) output[key] = parsed.data;
}

const pipelineNavigationSearchSchema = z
  .record(z.unknown())
  .superRefine((source, context) => {
    for (const key of PIPELINE_AUTHORITY_SEARCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `unrecognized client authority key: ${key}`,
        });
      }
    }
  })
  .transform((source): PipelineReadOnlySearch => {
    const canonical: Record<string, string> = {};
    addValidString(canonical, "item", source.item, pipelineItemSchema);
    addValidString(canonical, "q", source.q, pipelineQuerySchema);
    addValidString(canonical, "status", source.status, pipelineStatusSchema);
    addValidString(canonical, "origem", source.origem, pipelineOriginSchema);
    return pipelineReadOnlySearchSchema.parse(canonical);
  });

export type PipelineReadOnlySearch = {
  item?: string;
  q?: string;
  status?: PipelineStatus;
  origem?: string;
};

export function migrateLegacyLeadsSearch(input: unknown): PipelineReadOnlySearch {
  const source = toSearchRecord(input);
  const migrated: Record<string, unknown> = { ...source };

  if (migrated.status === undefined && source.tab === "descartados") {
    migrated.status = "descartado";
  }

  return pipelineNavigationSearchSchema.parse(migrated);
}

// Compatibility-only type for retired mutable components that remain in the
// repository but are no longer reachable from the route. Keeping their
// compile-time shape avoids reactivating legacy controls or mutation commands.
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

// Runtime authority remains the canonical four-field output. Benign legacy or
// unknown presentation parameters are discarded; authority-bearing query keys
// are rejected fail-closed before the route is entered.
export const pipelineSearchSchema = pipelineNavigationSearchSchema as z.ZodType<PipelineSearch>;
