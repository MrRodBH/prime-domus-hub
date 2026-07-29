import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireTenant, type TenantContext } from "@/integrations/supabase/tenant-middleware";
import {
  ASSIGNMENT_STRATEGY_KEYS,
  LEAD_STATUS_KEYS,
  QUALIFICATION_KEYS,
  TASK_STATUS_KEYS,
  TASK_TYPE_KEYS,
  getCrmRegistrySnapshot,
  leadAssignmentIntentSchema,
  leadNoteIntentSchema,
  leadTagsIntentSchema,
  leadTaskIntentSchema,
  leadTransitionIntentSchema,
  taskTransitionIntentSchema,
  type LeadStatusKey,
  type QualificationKey,
  type TaskStatusKey,
  type TaskTypeKey,
} from "@/lib/crm/crm-registry";
import {
  authorizeTenantCrmOperation,
  safeTenantCrmError,
  trustedTenantCrmContext,
  type TenantCrmAuthorization,
  type TenantCrmOperation,
} from "@/lib/api/tenant-crm-authority.server";

type JsonObject = { [key: string]: Json | undefined };
type RuntimeCrmContext = { userId: string; tenant: TenantContext };

export type CrmPropertyDto = {
  id: string;
  codigo: string;
  titulo: string;
  corretor_id: string | null;
};

export type CrmAssigneeDto = {
  id: string;
  user_id: string;
  nome: string | null;
  sobrenome: string | null;
  ativo: boolean;
  team_id: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  foto_url: string | null;
  status: string | null;
  creci: string | null;
  cpf: string | null;
  slug: string | null;
  bio: string | null;
};

export type CrmLeadDto = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  status: LeadStatusKey;
  version: number;
  assigned_to: string | null;
  assigned_team_id: string | null;
  pipeline_id: string;
  stage_id: string;
  qualification_key: QualificationKey;
  origem: string | null;
  original_attribution: JsonObject;
  latest_attribution: JsonObject;
  valor_estimado: number | null;
  imovel_id: string | null;
  created_at: string;
  updated_at: string;
  imovel: {
    titulo: string | null;
    slug: string | null;
    preco: number | null;
    preco_sob_consulta: boolean | null;
  } | null;
};

export type CrmTaskDto = {
  id: string;
  lead_id: string;
  task_type: TaskTypeKey;
  status: TaskStatusKey;
  title: string;
  description: string | null;
  due_at: string | null;
  assigned_to: string | null;
  row_version: number;
  created_by: string;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmLeadAggregateDto = {
  lead: CrmLeadDto;
  pipeline: JsonObject;
  stage: JsonObject;
  tasks: CrmTaskDto[];
  tags: JsonObject[];
  activities: JsonObject[];
  rowVersion: number;
};

export type CrmMutationResultDto = {
  ok: true;
  id?: string;
  leadId?: string;
  taskId?: string;
  eventId?: string;
  status?: string;
  fromStatus?: LeadStatusKey;
  toStatus?: LeadStatusKey;
  reasonType?: "advance" | "discard" | "lost" | "reopen";
  version?: number;
  assignedTo?: string | null;
  assignedTeamId?: string | null;
  qualificationKey?: QualificationKey;
  tagIds?: string[];
};

export type ManualLeadResult = {
  id: string;
  tenantId: string;
  status: "novo";
  version: number;
  assignedTo: string | null;
  corretorId: string | null;
  imovelId: string | null;
  createdAt: string;
};

const uuid = z.string().uuid();
const idempotencyKey = z.string().min(8).max(200);

function isObject(value: Json | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObject(value: unknown, label: string): JsonObject {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error(`crm_non_serializable:${label}`);
  const parsed = JSON.parse(serialized) as Json;
  if (!isObject(parsed)) throw new Error(`crm_invalid_object:${label}`);
  return parsed;
}

function asArray(value: Json | undefined, label: string): Json[] {
  if (!Array.isArray(value)) throw new Error(`crm_invalid_array:${label}`);
  return value;
}

function stringValue(value: Json | undefined, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`crm_invalid_string:${label}`);
  return value;
}

function nullableString(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: Json | undefined, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`crm_invalid_number:${label}`);
  return value;
}

function nullableNumber(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: Json | undefined): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseLeadStatus(value: Json | undefined): LeadStatusKey {
  if (typeof value !== "string" || !LEAD_STATUS_KEYS.includes(value as LeadStatusKey)) {
    throw new Error("crm_unknown_status");
  }
  return value as LeadStatusKey;
}

function parseQualification(value: Json | undefined): QualificationKey {
  if (typeof value !== "string" || !QUALIFICATION_KEYS.includes(value as QualificationKey)) {
    throw new Error("crm_unknown_qualification");
  }
  return value as QualificationKey;
}

function leadDto(value: Json, label: string): CrmLeadDto {
  if (!isObject(value)) throw new Error(`crm_invalid_lead:${label}`);
  const property = value.imovel;
  let imovel: CrmLeadDto["imovel"] = null;
  if (isObject(property) && property.titulo !== null && property.titulo !== undefined) {
    imovel = {
      titulo: nullableString(property.titulo),
      slug: nullableString(property.slug),
      preco: nullableNumber(property.preco),
      preco_sob_consulta: booleanValue(property.preco_sob_consulta),
    };
  }
  return {
    id: stringValue(value.id, `${label}.id`),
    nome: stringValue(value.nome, `${label}.nome`),
    email: nullableString(value.email),
    telefone: nullableString(value.telefone),
    mensagem: nullableString(value.mensagem),
    status: parseLeadStatus(value.status),
    version: numberValue(value.version, `${label}.version`),
    assigned_to: nullableString(value.assigned_to),
    assigned_team_id: nullableString(value.assigned_team_id),
    pipeline_id: stringValue(value.pipeline_id, `${label}.pipeline_id`),
    stage_id: stringValue(value.stage_id, `${label}.stage_id`),
    qualification_key: parseQualification(value.qualification_key),
    origem: nullableString(value.origem),
    original_attribution: isObject(value.original_attribution) ? value.original_attribution : {},
    latest_attribution: isObject(value.latest_attribution) ? value.latest_attribution : {},
    valor_estimado: nullableNumber(value.valor_estimado),
    imovel_id: nullableString(value.imovel_id),
    created_at: stringValue(value.created_at, `${label}.created_at`),
    updated_at: stringValue(value.updated_at, `${label}.updated_at`),
    imovel,
  };
}

function taskDto(value: Json, label: string): CrmTaskDto {
  if (!isObject(value)) throw new Error(`crm_invalid_task:${label}`);
  const taskType = stringValue(value.task_type, `${label}.task_type`);
  const status = stringValue(value.status, `${label}.status`);
  if (!TASK_TYPE_KEYS.includes(taskType as TaskTypeKey)) throw new Error("crm_unknown_task_type");
  if (!TASK_STATUS_KEYS.includes(status as TaskStatusKey)) throw new Error("crm_unknown_task_status");
  return {
    id: stringValue(value.id, `${label}.id`),
    lead_id: stringValue(value.lead_id, `${label}.lead_id`),
    task_type: taskType as TaskTypeKey,
    status: status as TaskStatusKey,
    title: stringValue(value.title, `${label}.title`),
    description: nullableString(value.description),
    due_at: nullableString(value.due_at),
    assigned_to: nullableString(value.assigned_to),
    row_version: numberValue(value.row_version, `${label}.row_version`),
    created_by: stringValue(value.created_by, `${label}.created_by`),
    completed_at: nullableString(value.completed_at),
    cancelled_at: nullableString(value.cancelled_at),
    created_at: stringValue(value.created_at, `${label}.created_at`),
    updated_at: stringValue(value.updated_at, `${label}.updated_at`),
  };
}

async function authorize(context: RuntimeCrmContext, operation: TenantCrmOperation): Promise<TenantCrmAuthorization> {
  return authorizeTenantCrmOperation(trustedTenantCrmContext(context), operation);
}

async function executeRpc(
  context: RuntimeCrmContext,
  operation: TenantCrmOperation,
  rpcName: string,
  args: JsonObject,
): Promise<JsonObject> {
  const decision = await authorize(context, operation);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc(rpcName, {
    _actor_user_id: decision.actorUserId,
    _tenant_id: decision.tenantId,
    _tenant_origin: context.tenant.origin,
    ...args,
  });
  if (error) throw safeTenantCrmError(error);
  return asObject(data, rpcName);
}

async function executeRpcArray(
  context: RuntimeCrmContext,
  operation: TenantCrmOperation,
  rpcName: string,
  args: JsonObject,
): Promise<Json[]> {
  const decision = await authorize(context, operation);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc(rpcName, {
    _actor_user_id: decision.actorUserId,
    _tenant_id: decision.tenantId,
    _tenant_origin: context.tenant.origin,
    ...args,
  });
  if (error) throw safeTenantCrmError(error);
  const serialized = JSON.stringify(data);
  if (serialized === undefined) throw new Error(`crm_non_serializable:${rpcName}`);
  return asArray(JSON.parse(serialized) as Json, rpcName);
}

function mutationResult(raw: JsonObject): CrmMutationResultDto {
  if (raw.ok !== true) throw new Error("crm_invalid_mutation_result");
  const fromStatus = raw.fromStatus === undefined ? undefined : parseLeadStatus(raw.fromStatus);
  const toStatus = raw.toStatus === undefined ? undefined : parseLeadStatus(raw.toStatus);
  const reasonType = raw.reasonType;
  if (reasonType !== undefined && reasonType !== "advance" && reasonType !== "discard" && reasonType !== "lost" && reasonType !== "reopen") {
    throw new Error("crm_invalid_reason_type");
  }
  return {
    ok: true,
    id: nullableString(raw.id) ?? undefined,
    leadId: nullableString(raw.leadId) ?? undefined,
    taskId: nullableString(raw.taskId) ?? undefined,
    eventId: nullableString(raw.eventId) ?? undefined,
    status: nullableString(raw.status) ?? undefined,
    fromStatus,
    toStatus,
    reasonType: reasonType as CrmMutationResultDto["reasonType"],
    version: typeof raw.version === "number" ? raw.version : undefined,
    assignedTo: raw.assignedTo === null ? null : nullableString(raw.assignedTo),
    assignedTeamId: raw.assignedTeamId === null ? null : nullableString(raw.assignedTeamId),
    qualificationKey: raw.qualificationKey === undefined ? undefined : parseQualification(raw.qualificationKey),
    tagIds: Array.isArray(raw.tagIds) ? raw.tagIds.filter((entry): entry is string => typeof entry === "string") : undefined,
  };
}

export async function listTenantLeadsForContext(
  context: RuntimeCrmContext,
  input: { status?: LeadStatusKey; limit?: number; offset?: number } = {},
): Promise<CrmLeadDto[]> {
  const rows = await executeRpcArray(context, "lead.list", "list_tenant_crm_leads", {
    _status: input.status ?? null,
    _limit: input.limit ?? 200,
    _offset: input.offset ?? 0,
  });
  return rows.map((row, index) => leadDto(row, `leads.${index}`));
}

export async function getTenantLeadAggregateForContext(
  context: RuntimeCrmContext,
  leadId: string,
): Promise<CrmLeadAggregateDto> {
  const raw = await executeRpc(context, "lead.read", "get_tenant_crm_lead_aggregate", { _lead_id: leadId });
  const tasks = asArray(raw.tasks, "aggregate.tasks").map((row, index) => taskDto(row, `tasks.${index}`));
  return {
    lead: leadDto(raw.lead as Json, "aggregate.lead"),
    pipeline: asObject(raw.pipeline, "aggregate.pipeline"),
    stage: asObject(raw.stage, "aggregate.stage"),
    tasks,
    tags: asArray(raw.tags, "aggregate.tags").map((row, index) => asObject(row, `tags.${index}`)),
    activities: asArray(raw.activities, "aggregate.activities").map((row, index) => asObject(row, `activities.${index}`)),
    rowVersion: numberValue(raw.row_version, "aggregate.row_version"),
  };
}

export async function transitionTenantLeadForContext(
  context: RuntimeCrmContext,
  input: z.infer<typeof leadTransitionIntentSchema>,
): Promise<CrmMutationResultDto> {
  const parsed = leadTransitionIntentSchema.parse(input);
  const raw = await executeRpc(context, "lead.transition", "transition_tenant_crm_lead", {
    _lead_id: parsed.leadId,
    _to_status: parsed.toStatus,
    _expected_version: parsed.expectedVersion,
    _reason_id: parsed.reasonId ?? null,
    _note: parsed.note ?? null,
    _idempotency_key: parsed.idempotencyKey,
  });
  return mutationResult(raw);
}

export const getTenantCrmRegistry = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorize(context, "crm.diagnostics");
    return getCrmRegistrySnapshot();
  });

export const listTenantLeads = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ status: z.enum(LEAD_STATUS_KEYS).optional(), limit: z.number().int().min(1).max(500).default(200), offset: z.number().int().nonnegative().default(0) }).strict().parse(input ?? {}))
  .handler(async ({ data, context }): Promise<CrmLeadDto[]> => listTenantLeadsForContext(context, data));

export const getTenantLeadAggregate = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ leadId: uuid }).strict().parse(input))
  .handler(async ({ data, context }): Promise<CrmLeadAggregateDto> => getTenantLeadAggregateForContext(context, data.leadId));

export const createTenantLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({
    nome: z.string().trim().min(2).max(200),
    email: z.string().email().max(254).nullish(),
    telefone: z.string().max(40).nullish(),
    imovel_id: uuid.nullish(),
    observacoes: z.string().max(4000).nullish(),
    assigned_to: uuid.nullish(),
    idempotencyKey,
  }).strict().parse(input))
  .handler(async ({ data, context }): Promise<ManualLeadResult> => {
    const raw = await executeRpc(context, "lead.create", "create_tenant_crm_lead", {
      _nome: data.nome,
      _email: data.email ?? null,
      _telefone: data.telefone ?? null,
      _imovel_id: data.imovel_id ?? null,
      _mensagem: data.observacoes ?? null,
      _assigned_to: data.assigned_to ?? null,
      _idempotency_key: data.idempotencyKey,
    });
    return {
      id: stringValue(raw.id, "create.id"),
      tenantId: stringValue(raw.tenantId, "create.tenantId"),
      status: "novo",
      version: numberValue(raw.version, "create.version"),
      assignedTo: nullableString(raw.assignedTo),
      corretorId: nullableString(raw.corretorId),
      imovelId: nullableString(raw.imovelId),
      createdAt: stringValue(raw.createdAt, "create.createdAt"),
    };
  });

export const updateTenantLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({
    id: uuid,
    expected_version: z.number().int().nonnegative(),
    observacoes: z.string().max(4000).optional(),
    valor_estimado: z.number().nonnegative().nullable().optional(),
    nome: z.string().trim().min(2).max(200).optional(),
    email: z.string().email().max(254).nullable().optional(),
    telefone: z.string().max(40).nullable().optional(),
    qualification_key: z.enum(QUALIFICATION_KEYS).optional(),
    origem: z.string().trim().min(1).max(200).optional(),
    idempotencyKey,
  }).strict().parse(input))
  .handler(async ({ data, context }): Promise<CrmMutationResultDto> => {
    const patch: JsonObject = {};
    if (data.observacoes !== undefined) patch.mensagem = data.observacoes;
    if (data.valor_estimado !== undefined) patch.valor_estimado = data.valor_estimado;
    if (data.nome !== undefined) patch.nome = data.nome;
    if (data.email !== undefined) patch.email = data.email;
    if (data.telefone !== undefined) patch.telefone = data.telefone;
    if (data.qualification_key !== undefined) patch.qualification_key = data.qualification_key;
    if (data.origem !== undefined) patch.origem = data.origem;
    const raw = await executeRpc(context, data.qualification_key === undefined ? "lead.update" : "lead.qualify", "update_tenant_crm_lead", {
      _lead_id: data.id,
      _expected_version: data.expected_version,
      _patch: patch,
      _idempotency_key: data.idempotencyKey,
    });
    return mutationResult(raw);
  });

export const transitionTenantLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => leadTransitionIntentSchema.parse(input))
  .handler(async ({ data, context }): Promise<CrmMutationResultDto> => transitionTenantLeadForContext(context, data));

export const assignTenantLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => leadAssignmentIntentSchema.parse(input))
  .handler(async ({ data, context }): Promise<CrmMutationResultDto> => {
    const raw = await executeRpc(context, "lead.assign", "assign_tenant_crm_lead", {
      _lead_id: data.leadId,
      _expected_version: data.expectedVersion,
      _strategy: data.strategy,
      _assignee_user_id: data.assigneeUserId ?? null,
      _team_id: data.teamId ?? null,
      _reason: data.reason,
      _idempotency_key: data.idempotencyKey,
    });
    return mutationResult(raw);
  });

export const createTenantLeadTask = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => leadTaskIntentSchema.parse(input))
  .handler(async ({ data, context }): Promise<CrmMutationResultDto> => {
    const raw = await executeRpc(context, "task.create", "create_tenant_crm_task", {
      _lead_id: data.leadId,
      _task_type: data.type,
      _title: data.title,
      _description: data.description ?? null,
      _due_at: data.dueAt ?? null,
      _assignee_user_id: data.assigneeUserId ?? null,
      _idempotency_key: data.idempotencyKey,
    });
    return mutationResult(raw);
  });

export const transitionTenantLeadTask = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => taskTransitionIntentSchema.parse(input))
  .handler(async ({ data, context }): Promise<CrmMutationResultDto> => {
    const raw = await executeRpc(context, "task.transition", "transition_tenant_crm_task", {
      _task_id: data.taskId,
      _to_status: data.toStatus,
      _expected_version: data.expectedVersion,
      _reason: data.reason ?? null,
      _idempotency_key: data.idempotencyKey,
    });
    return mutationResult(raw);
  });

export const addTenantLeadNote = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => leadNoteIntentSchema.parse(input))
  .handler(async ({ data, context }): Promise<CrmMutationResultDto> => {
    const raw = await executeRpc(context, "lead.note", "add_tenant_crm_note", {
      _lead_id: data.leadId,
      _note: data.note,
      _idempotency_key: data.idempotencyKey,
    });
    return mutationResult(raw);
  });

export const setTenantLeadTags = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => leadTagsIntentSchema.parse(input))
  .handler(async ({ data, context }): Promise<CrmMutationResultDto> => {
    const raw = await executeRpc(context, "lead.tag", "set_tenant_crm_tags", {
      _lead_id: data.leadId,
      _tag_ids: data.tagIds,
      _expected_version: data.expectedVersion,
      _idempotency_key: data.idempotencyKey,
    });
    return mutationResult(raw);
  });

export const findTenantLeadDuplicateCandidates = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ leadId: uuid }).strict().parse(input))
  .handler(async ({ data, context }): Promise<{ leadId: string; mergeState: "merge_review_required"; automaticMerge: false; candidates: JsonObject[] }> => {
    const raw = await executeRpc(context, "lead.duplicates", "find_tenant_crm_duplicates", { _lead_id: data.leadId });
    return {
      leadId: stringValue(raw.leadId, "duplicates.leadId"),
      mergeState: "merge_review_required",
      automaticMerge: false,
      candidates: asArray(raw.candidates, "duplicates.candidates").map((row, index) => asObject(row, `duplicates.${index}`)),
    };
  });

export const getTenantCrmDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<JsonObject> => executeRpc(context, "crm.diagnostics", "get_tenant_crm_diagnostics", {}));

export const listTenantPipelines = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<Array<{ id: string; pipelineKey: string; name: string; active: boolean; isDefault: boolean; rowVersion: number; stages: JsonObject[] }>> => {
    const decision = await authorize(context, "pipeline.list");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("crm_pipelines")
      .select("id, pipeline_key, nome, ativo, is_default, row_version, stages:crm_pipeline_stages(id, status_key, nome, position, ativo, terminal, row_version)")
      .eq("tenant_id", decision.tenantId)
      .order("created_at", { ascending: true });
    if (error) throw safeTenantCrmError(error);
    return (Array.isArray(data) ? data : []).map((row: unknown, index: number) => {
      const value = asObject(row, `pipelines.${index}`);
      return {
        id: stringValue(value.id, `pipelines.${index}.id`),
        pipelineKey: stringValue(value.pipeline_key, `pipelines.${index}.pipeline_key`),
        name: stringValue(value.nome, `pipelines.${index}.nome`),
        active: value.ativo === true,
        isDefault: value.is_default === true,
        rowVersion: numberValue(value.row_version, `pipelines.${index}.row_version`),
        stages: asArray(value.stages, `pipelines.${index}.stages`).map((stage, stageIndex) => asObject(stage, `pipelines.${index}.stages.${stageIndex}`)),
      };
    });
  });

export const listTenantLeadAssignees = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<CrmAssigneeDto[]> => {
    const decision = await authorize(context, "lead.assign");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userIds: string[] = [];
    if (decision.scope === "own") {
      userIds = [decision.actorUserId];
    } else if (decision.scope === "team") {
      const { data: actorTeams, error: actorTeamsError } = await (supabaseAdmin as any)
        .from("team_members").select("team_id").eq("tenant_id", decision.tenantId).eq("user_id", decision.actorUserId);
      if (actorTeamsError) throw safeTenantCrmError(actorTeamsError);
      const teamIds = (Array.isArray(actorTeams) ? actorTeams : []).map((row: { team_id?: unknown }) => row.team_id).filter((value: unknown): value is string => typeof value === "string");
      if (teamIds.length === 0) return [];
      const { data: members, error: membersError } = await (supabaseAdmin as any)
        .from("team_members").select("user_id").eq("tenant_id", decision.tenantId).in("team_id", teamIds);
      if (membersError) throw safeTenantCrmError(membersError);
      userIds = [...new Set((Array.isArray(members) ? members : []).map((row: { user_id?: unknown }) => row.user_id).filter((value: unknown): value is string => typeof value === "string"))];
    } else {
      const { data: members, error: membersError } = await (supabaseAdmin as any)
        .from("tenant_members").select("user_id").eq("tenant_id", decision.tenantId).eq("membership_status", "active");
      if (membersError) throw safeTenantCrmError(membersError);
      userIds = [...new Set((Array.isArray(members) ? members : []).map((row: { user_id?: unknown }) => row.user_id).filter((value: unknown): value is string => typeof value === "string"))];
    }
    if (userIds.length === 0) return [];
    const { data, error } = await (supabaseAdmin as any)
      .from("corretores")
      .select("id, user_id, nome, sobrenome, ativo, team_id, cargo, email, telefone, whatsapp, foto_url, status, creci, cpf, slug, bio")
      .eq("tenant_id", decision.tenantId)
      .eq("ativo", true)
      .in("user_id", userIds)
      .order("nome", { ascending: true });
    if (error) throw safeTenantCrmError(error);
    return (Array.isArray(data) ? data : []).map((row: unknown, index: number) => {
      const value = asObject(row, `assignees.${index}`);
      return {
        id: stringValue(value.id, `assignees.${index}.id`),
        user_id: stringValue(value.user_id, `assignees.${index}.user_id`),
        nome: nullableString(value.nome),
        sobrenome: nullableString(value.sobrenome),
        ativo: value.ativo === true,
        team_id: nullableString(value.team_id),
        cargo: nullableString(value.cargo),
        email: nullableString(value.email),
        telefone: nullableString(value.telefone),
        whatsapp: nullableString(value.whatsapp),
        foto_url: nullableString(value.foto_url),
        status: nullableString(value.status),
        creci: nullableString(value.creci),
        cpf: nullableString(value.cpf),
        slug: nullableString(value.slug),
        bio: nullableString(value.bio),
      };
    });
  });

export const listTenantLeadProperties = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<CrmPropertyDto[]> => {
    const decision = await authorize(context, "lead.create");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("imoveis")
      .select("id, codigo, titulo, corretor_id")
      .eq("tenant_id", decision.tenantId)
      .eq("status", "ativo")
      .order("titulo", { ascending: true });
    if (error) throw safeTenantCrmError(error);
    return (Array.isArray(data) ? data : []).map((row: unknown, index: number) => {
      const value = asObject(row, `properties.${index}`);
      return {
        id: stringValue(value.id, `properties.${index}.id`),
        codigo: stringValue(value.codigo, `properties.${index}.codigo`),
        titulo: stringValue(value.titulo, `properties.${index}.titulo`),
        corretor_id: nullableString(value.corretor_id),
      };
    });
  });
