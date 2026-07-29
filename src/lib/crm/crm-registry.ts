import { z } from "zod";

/**
 * PR-M2 — closed build-time CRM operational registry.
 *
 * Tenant data may reference catalogued keys and tenant-owned records, but it
 * cannot supply executable transitions, authorization rules, side effects,
 * validators or runtime imports.
 */
export const CRM_SCHEMA_VERSION = 1 as const;

export const LEAD_STATUS_KEYS = [
  "novo",
  "conversando",
  "visita",
  "proposta",
  "ganho",
  "perdido",
  "descartado",
] as const;
export type LeadStatusKey = (typeof LEAD_STATUS_KEYS)[number];

export const QUALIFICATION_KEYS = [
  "nao_qualificado",
  "contatado",
  "qualificado",
  "desqualificado",
] as const;
export type QualificationKey = (typeof QUALIFICATION_KEYS)[number];

export const TASK_TYPE_KEYS = ["follow_up", "call", "meeting", "visit", "proposal_review", "other"] as const;
export type TaskTypeKey = (typeof TASK_TYPE_KEYS)[number];

export const TASK_STATUS_KEYS = ["open", "in_progress", "completed", "cancelled"] as const;
export type TaskStatusKey = (typeof TASK_STATUS_KEYS)[number];

export const ACTIVITY_TYPE_KEYS = [
  "lead_created",
  "lead_updated",
  "lead_assigned",
  "lead_reassigned",
  "lead_unassigned",
  "stage_changed",
  "status_changed",
  "qualification_changed",
  "task_created",
  "task_started",
  "task_completed",
  "task_cancelled",
  "task_reopened",
  "note_added",
  "contact_attempt_recorded",
  "tags_changed",
  "source_corrected",
  "won",
  "lost",
  "reopened",
  "archived",
] as const;
export type ActivityTypeKey = (typeof ACTIVITY_TYPE_KEYS)[number];

export const ASSIGNMENT_STRATEGY_KEYS = ["manual_member", "manual_team", "unassigned"] as const;
export type AssignmentStrategyKey = (typeof ASSIGNMENT_STRATEGY_KEYS)[number];

export const CRM_UI_STATE_KEYS = [
  "loading", "empty", "ready", "dirty", "saving", "saved", "save_failed",
  "assigning", "assigned", "assignment_failed", "moving", "moved", "transition_invalid",
  "qualifying", "qualified", "task_creating", "task_open", "task_overdue",
  "task_completing", "task_completed", "task_cancelled", "winning", "won", "losing",
  "lost", "reopening", "reopened", "archiving", "archived", "duplicate_candidate",
  "merge_review_required", "permission_denied", "scope_denied", "cross_tenant_reference",
  "conflict", "error", "retry_available",
] as const;
export type CrmUiStateKey = (typeof CRM_UI_STATE_KEYS)[number];

export type LeadStatusDefinition = {
  readonly key: LeadStatusKey;
  readonly label: string;
  readonly terminal: boolean;
  readonly publicExposure: "none";
  readonly diagnostics: readonly string[];
};

export const LEAD_STATUS_REGISTRY = {
  novo: { key: "novo", label: "Novo", terminal: false, publicExposure: "none", diagnostics: ["unassigned", "first_contact"] },
  conversando: { key: "conversando", label: "Conversando", terminal: false, publicExposure: "none", diagnostics: ["follow_up"] },
  visita: { key: "visita", label: "Visita", terminal: false, publicExposure: "none", diagnostics: ["visit_feedback"] },
  proposta: { key: "proposta", label: "Proposta", terminal: false, publicExposure: "none", diagnostics: ["proposal_age"] },
  ganho: { key: "ganho", label: "Ganho", terminal: true, publicExposure: "none", diagnostics: ["closed_won"] },
  perdido: { key: "perdido", label: "Perdido", terminal: true, publicExposure: "none", diagnostics: ["loss_reason"] },
  descartado: { key: "descartado", label: "Descartado", terminal: true, publicExposure: "none", diagnostics: ["discard_reason"] },
} satisfies Record<LeadStatusKey, LeadStatusDefinition>;

export type LeadTransitionDefinition = {
  readonly key: string;
  readonly from: readonly LeadStatusKey[];
  readonly to: LeadStatusKey;
  readonly requiredAction: "editar" | "gerenciar";
  readonly requiredFields: readonly ("reason_id" | "note")[];
  readonly forbiddenFields: readonly string[];
  readonly historyEvent: ActivityTypeKey;
  readonly auditAction: string;
  readonly idempotent: true;
  readonly terminalBehavior: "none" | "close" | "reopen";
};

const transition = (
  key: string,
  from: readonly LeadStatusKey[],
  to: LeadStatusKey,
  historyEvent: ActivityTypeKey,
  options: Partial<Pick<LeadTransitionDefinition, "requiredAction" | "requiredFields" | "terminalBehavior">> = {},
): LeadTransitionDefinition => ({
  key,
  from,
  to,
  requiredAction: options.requiredAction ?? "editar",
  requiredFields: options.requiredFields ?? [],
  forbiddenFields: ["tenant_id", "actor_user_id", "scope", "assigned_to", "pipeline_id", "stage_id"],
  historyEvent,
  auditAction: `crm.${key}`,
  idempotent: true,
  terminalBehavior: options.terminalBehavior ?? "none",
});

export const LEAD_TRANSITION_REGISTRY = {
  novo_para_conversando: transition("novo_para_conversando", ["novo"], "conversando", "status_changed"),
  novo_para_descartado: transition("novo_para_descartado", ["novo"], "descartado", "archived", { requiredFields: ["reason_id"], terminalBehavior: "close" }),
  conversando_para_visita: transition("conversando_para_visita", ["conversando"], "visita", "stage_changed"),
  conversando_para_proposta: transition("conversando_para_proposta", ["conversando"], "proposta", "stage_changed"),
  conversando_para_descartado: transition("conversando_para_descartado", ["conversando"], "descartado", "archived", { requiredFields: ["reason_id"], terminalBehavior: "close" }),
  visita_para_conversando: transition("visita_para_conversando", ["visita"], "conversando", "stage_changed"),
  visita_para_proposta: transition("visita_para_proposta", ["visita"], "proposta", "stage_changed"),
  visita_para_descartado: transition("visita_para_descartado", ["visita"], "descartado", "archived", { requiredFields: ["reason_id"], terminalBehavior: "close" }),
  proposta_para_conversando: transition("proposta_para_conversando", ["proposta"], "conversando", "stage_changed"),
  proposta_para_ganho: transition("proposta_para_ganho", ["proposta"], "ganho", "won", { requiredAction: "gerenciar", terminalBehavior: "close" }),
  proposta_para_perdido: transition("proposta_para_perdido", ["proposta"], "perdido", "lost", { requiredFields: ["reason_id"], terminalBehavior: "close" }),
  perdido_para_novo: transition("perdido_para_novo", ["perdido"], "novo", "reopened", { requiredFields: ["note"], terminalBehavior: "reopen" }),
  descartado_para_novo: transition("descartado_para_novo", ["descartado"], "novo", "reopened", { requiredFields: ["note"], terminalBehavior: "reopen" }),
} satisfies Record<string, LeadTransitionDefinition>;

export function resolveLeadTransition(from: LeadStatusKey, to: LeadStatusKey): LeadTransitionDefinition | null {
  const matches = Object.values(LEAD_TRANSITION_REGISTRY).filter((definition) => definition.to === to && definition.from.includes(from));
  if (matches.length !== 1) return null;
  return matches[0];
}

export type TaskTypeDefinition = {
  readonly key: TaskTypeKey;
  readonly label: string;
  readonly requiresDueAt: boolean;
  readonly notificationIntent: "internal_only";
};

export const TASK_TYPE_REGISTRY = {
  follow_up: { key: "follow_up", label: "Follow-up", requiresDueAt: true, notificationIntent: "internal_only" },
  call: { key: "call", label: "Ligação", requiresDueAt: true, notificationIntent: "internal_only" },
  meeting: { key: "meeting", label: "Reunião", requiresDueAt: true, notificationIntent: "internal_only" },
  visit: { key: "visit", label: "Visita", requiresDueAt: true, notificationIntent: "internal_only" },
  proposal_review: { key: "proposal_review", label: "Revisão de proposta", requiresDueAt: true, notificationIntent: "internal_only" },
  other: { key: "other", label: "Outra", requiresDueAt: false, notificationIntent: "internal_only" },
} satisfies Record<TaskTypeKey, TaskTypeDefinition>;

export type TaskStatusDefinition = {
  readonly key: TaskStatusKey;
  readonly terminal: boolean;
  readonly allowedTargets: readonly TaskStatusKey[];
};

export const TASK_STATUS_REGISTRY = {
  open: { key: "open", terminal: false, allowedTargets: ["in_progress", "completed", "cancelled"] },
  in_progress: { key: "in_progress", terminal: false, allowedTargets: ["completed", "cancelled"] },
  completed: { key: "completed", terminal: true, allowedTargets: ["open"] },
  cancelled: { key: "cancelled", terminal: true, allowedTargets: ["open"] },
} satisfies Record<TaskStatusKey, TaskStatusDefinition>;

export const QUALIFICATION_REGISTRY = {
  nao_qualificado: { key: "nao_qualificado", terminal: false },
  contatado: { key: "contatado", terminal: false },
  qualificado: { key: "qualificado", terminal: false },
  desqualificado: { key: "desqualificado", terminal: true },
} satisfies Record<QualificationKey, { key: QualificationKey; terminal: boolean }>;

export const ASSIGNMENT_STRATEGY_REGISTRY = {
  manual_member: { key: "manual_member", target: "active_tenant_member", automation: false },
  manual_team: { key: "manual_team", target: "active_tenant_team", automation: false },
  unassigned: { key: "unassigned", target: "none", automation: false },
} satisfies Record<AssignmentStrategyKey, { key: AssignmentStrategyKey; target: string; automation: false }>;

export const LOSS_REASON_REGISTRY = {
  tenant_catalog_reference: {
    key: "tenant_catalog_reference",
    table: "deal_lost_reasons",
    validation: "active_same_tenant_exact_id",
    fallback: false,
  },
} as const;

export const ACTIVITY_TYPE_REGISTRY = Object.fromEntries(
  ACTIVITY_TYPE_KEYS.map((key) => [key, { key, actorAuthority: "server_derived", appendOnly: true, publicExposure: "none" as const }]),
) as Record<ActivityTypeKey, { key: ActivityTypeKey; actorAuthority: "server_derived"; appendOnly: true; publicExposure: "none" }>;

const uuid = z.string().uuid();
export const leadTransitionIntentSchema = z.object({
  leadId: uuid,
  toStatus: z.enum(LEAD_STATUS_KEYS),
  expectedVersion: z.number().int().nonnegative(),
  reasonId: uuid.nullish(),
  note: z.string().trim().min(1).max(2_000).nullish(),
  idempotencyKey: z.string().min(8).max(200),
}).strict();

export const leadAssignmentIntentSchema = z.object({
  leadId: uuid,
  expectedVersion: z.number().int().nonnegative(),
  strategy: z.enum(ASSIGNMENT_STRATEGY_KEYS),
  assigneeUserId: uuid.nullish(),
  teamId: uuid.nullish(),
  reason: z.string().trim().min(1).max(1_000),
  idempotencyKey: z.string().min(8).max(200),
}).strict().superRefine((value, context) => {
  if (value.strategy === "manual_member" && !value.assigneeUserId) context.addIssue({ code: z.ZodIssueCode.custom, path: ["assigneeUserId"], message: "crm_assignee_required" });
  if (value.strategy === "manual_team" && !value.teamId) context.addIssue({ code: z.ZodIssueCode.custom, path: ["teamId"], message: "crm_team_required" });
  if (value.strategy === "unassigned" && (value.assigneeUserId || value.teamId)) context.addIssue({ code: z.ZodIssueCode.custom, message: "crm_unassign_target_forbidden" });
});

export const leadTaskIntentSchema = z.object({
  leadId: uuid,
  type: z.enum(TASK_TYPE_KEYS),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4_000).nullish(),
  dueAt: z.string().datetime().nullish(),
  assigneeUserId: uuid.nullish(),
  idempotencyKey: z.string().min(8).max(200),
}).strict();

export const taskTransitionIntentSchema = z.object({
  taskId: uuid,
  toStatus: z.enum(TASK_STATUS_KEYS),
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).max(1_000).nullish(),
  idempotencyKey: z.string().min(8).max(200),
}).strict();

export const leadNoteIntentSchema = z.object({
  leadId: uuid,
  note: z.string().trim().min(1).max(4_000),
  idempotencyKey: z.string().min(8).max(200),
}).strict();

export const leadTagsIntentSchema = z.object({
  leadId: uuid,
  tagIds: z.array(uuid).max(50),
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(8).max(200),
}).strict();

export function getCrmRegistrySnapshot() {
  return {
    schemaVersion: CRM_SCHEMA_VERSION,
    statuses: LEAD_STATUS_REGISTRY,
    transitions: LEAD_TRANSITION_REGISTRY,
    qualifications: QUALIFICATION_REGISTRY,
    taskTypes: TASK_TYPE_REGISTRY,
    taskStatuses: TASK_STATUS_REGISTRY,
    activityTypes: ACTIVITY_TYPE_REGISTRY,
    assignmentStrategies: ASSIGNMENT_STRATEGY_REGISTRY,
    lossReasons: LOSS_REASON_REGISTRY,
    uiStates: CRM_UI_STATE_KEYS,
  } as const;
}
