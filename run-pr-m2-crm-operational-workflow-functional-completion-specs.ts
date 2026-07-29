import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ACTIVITY_TYPE_KEYS,
  ACTIVITY_TYPE_REGISTRY,
  ASSIGNMENT_STRATEGY_KEYS,
  ASSIGNMENT_STRATEGY_REGISTRY,
  CRM_SCHEMA_VERSION,
  CRM_UI_STATE_KEYS,
  LEAD_STATUS_KEYS,
  LEAD_STATUS_REGISTRY,
  LEAD_TRANSITION_REGISTRY,
  QUALIFICATION_KEYS,
  QUALIFICATION_REGISTRY,
  TASK_STATUS_KEYS,
  TASK_STATUS_REGISTRY,
  TASK_TYPE_KEYS,
  TASK_TYPE_REGISTRY,
  leadAssignmentIntentSchema,
  leadNoteIntentSchema,
  leadTagsIntentSchema,
  leadTaskIntentSchema,
  leadTransitionIntentSchema,
  resolveLeadTransition,
  taskTransitionIntentSchema,
} from "./src/lib/crm/crm-registry";

let assertions = 0;
function ok(value: unknown, message: string): void {
  assert.ok(value, message);
  assertions += 1;
}
function equal(actual: unknown, expected: unknown, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function has(source: string, token: string, message = token): void {
  ok(source.includes(token), `missing ${message}`);
}
function lacks(source: string, token: string, message = token): void {
  ok(!source.includes(token), `prohibited ${message}`);
}

const files = {
  registry: readFileSync("src/lib/crm/crm-registry.ts", "utf8"),
  authority: readFileSync("src/lib/api/tenant-crm-authority.server.ts", "utf8"),
  functions: readFileSync("src/lib/api/tenant-crm.functions.ts", "utf8"),
  management: readFileSync("src/lib/api/tenant-crm-management.functions.ts", "utf8"),
  compatibility: readFileSync("src/lib/api/tenant-crm-compat.functions.ts", "utf8"),
  legacyCompatibility: readFileSync("src/lib/api/leads-crm.functions.ts", "utf8"),
  adminBarrel: readFileSync("src/lib/api/admin.functions.ts", "utf8"),
  migration: readFileSync("supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql", "utf8"),
  pipelineHook: readFileSync("src/components/pipeline/hooks/usePipelineData.ts", "utf8"),
  pipelinePage: readFileSync("src/components/pipeline/PipelinePage.tsx", "utf8"),
  leadDetail: readFileSync("src/components/pipeline/LeadDetail.tsx", "utf8"),
  ptwAuthority: readFileSync("src/lib/public-writers/public-writer-authority.server.ts", "utf8"),
};

// Closed registries.
equal(CRM_SCHEMA_VERSION, 1, "CRM schema version");
equal(LEAD_STATUS_KEYS.length, 7, "lead status count");
equal(TASK_TYPE_KEYS.length, 6, "task type count");
equal(TASK_STATUS_KEYS.length, 4, "task status count");
equal(QUALIFICATION_KEYS.length, 4, "qualification count");
equal(ASSIGNMENT_STRATEGY_KEYS.length, 3, "assignment strategy count");
equal(ACTIVITY_TYPE_KEYS.length, 21, "activity type count");
ok(CRM_UI_STATE_KEYS.length >= 35, "complete CRM UI states");

for (const key of LEAD_STATUS_KEYS) {
  equal(LEAD_STATUS_REGISTRY[key].key, key, `${key}:stable status key`);
  equal(LEAD_STATUS_REGISTRY[key].publicExposure, "none", `${key}:not public`);
  ok(LEAD_STATUS_REGISTRY[key].diagnostics.length > 0, `${key}:diagnostics`);
}
for (const key of TASK_TYPE_KEYS) {
  equal(TASK_TYPE_REGISTRY[key].key, key, `${key}:stable task key`);
  equal(TASK_TYPE_REGISTRY[key].notificationIntent, "internal_only", `${key}:no provider side effect`);
}
for (const key of TASK_STATUS_KEYS) {
  equal(TASK_STATUS_REGISTRY[key].key, key, `${key}:stable task status`);
  ok(Array.isArray(TASK_STATUS_REGISTRY[key].allowedTargets), `${key}:targets`);
}
for (const key of QUALIFICATION_KEYS) {
  equal(QUALIFICATION_REGISTRY[key].key, key, `${key}:stable qualification`);
}
for (const key of ASSIGNMENT_STRATEGY_KEYS) {
  equal(ASSIGNMENT_STRATEGY_REGISTRY[key].key, key, `${key}:stable assignment strategy`);
  equal(ASSIGNMENT_STRATEGY_REGISTRY[key].automation, false, `${key}:no heuristic automation`);
}
for (const key of ACTIVITY_TYPE_KEYS) {
  equal(ACTIVITY_TYPE_REGISTRY[key].key, key, `${key}:stable activity type`);
  equal(ACTIVITY_TYPE_REGISTRY[key].actorAuthority, "server_derived", `${key}:server actor`);
  equal(ACTIVITY_TYPE_REGISTRY[key].appendOnly, true, `${key}:append only`);
}

const validTransitions: Array<[typeof LEAD_STATUS_KEYS[number], typeof LEAD_STATUS_KEYS[number]]> = [
  ["novo", "conversando"], ["novo", "descartado"],
  ["conversando", "visita"], ["conversando", "proposta"], ["conversando", "descartado"],
  ["visita", "conversando"], ["visita", "proposta"], ["visita", "descartado"],
  ["proposta", "conversando"], ["proposta", "ganho"], ["proposta", "perdido"],
  ["perdido", "novo"], ["descartado", "novo"],
];
for (const [from, to] of validTransitions) {
  const definition = resolveLeadTransition(from, to);
  ok(definition !== null, `${from}->${to}:catalogued`);
  if (definition) {
    equal(definition.to, to, `${from}->${to}:target`);
    equal(definition.idempotent, true, `${from}->${to}:idempotent`);
    ok(definition.forbiddenFields.includes("tenant_id"), `${from}->${to}:tenant forbidden`);
    ok(definition.forbiddenFields.includes("actor_user_id"), `${from}->${to}:actor forbidden`);
  }
}
equal(resolveLeadTransition("novo", "ganho"), null, "invalid novo->ganho");
equal(resolveLeadTransition("ganho", "novo"), null, "won terminal");
equal(resolveLeadTransition("perdido", "ganho"), null, "lost terminal");
equal(Object.keys(LEAD_TRANSITION_REGISTRY).length, validTransitions.length, "transition registry cardinality");

const uuid = "11111111-1111-4111-8111-111111111111";
const uuid2 = "22222222-2222-4222-8222-222222222222";
const uuid3 = "33333333-3333-4333-8333-333333333333";
const baseTransition = { leadId: uuid, toStatus: "conversando" as const, expectedVersion: 1, idempotencyKey: "transition-key-1" };
equal(leadTransitionIntentSchema.safeParse(baseTransition).success, true, "valid transition intent");
equal(leadTransitionIntentSchema.safeParse({ ...baseTransition, toStatus: "runtime" }).success, false, "unknown status denied");
equal(leadTransitionIntentSchema.safeParse({ ...baseTransition, tenantId: uuid2 }).success, false, "client tenant denied");
equal(leadTransitionIntentSchema.safeParse({ ...baseTransition, actorUserId: uuid2 }).success, false, "client actor denied");
equal(leadTransitionIntentSchema.safeParse({ ...baseTransition, scope: "global" }).success, false, "client scope denied");
equal(leadTransitionIntentSchema.safeParse({ ...baseTransition, expectedVersion: -1 }).success, false, "negative version denied");
equal(leadTransitionIntentSchema.safeParse({ ...baseTransition, idempotencyKey: "x" }).success, false, "short idempotency key denied");

equal(leadAssignmentIntentSchema.safeParse({ leadId: uuid, expectedVersion: 1, strategy: "manual_member", assigneeUserId: uuid2, reason: "Distribuição manual", idempotencyKey: "assignment-key-1" }).success, true, "member assignment");
equal(leadAssignmentIntentSchema.safeParse({ leadId: uuid, expectedVersion: 1, strategy: "manual_team", teamId: uuid3, reason: "Equipe responsável", idempotencyKey: "assignment-key-2" }).success, true, "team assignment");
equal(leadAssignmentIntentSchema.safeParse({ leadId: uuid, expectedVersion: 1, strategy: "unassigned", reason: "Fila", idempotencyKey: "assignment-key-3" }).success, true, "unassignment");
equal(leadAssignmentIntentSchema.safeParse({ leadId: uuid, expectedVersion: 1, strategy: "manual_member", reason: "missing", idempotencyKey: "assignment-key-4" }).success, false, "member target required");
equal(leadAssignmentIntentSchema.safeParse({ leadId: uuid, expectedVersion: 1, strategy: "manual_team", reason: "missing", idempotencyKey: "assignment-key-5" }).success, false, "team target required");
equal(leadAssignmentIntentSchema.safeParse({ leadId: uuid, expectedVersion: 1, strategy: "unassigned", assigneeUserId: uuid2, reason: "invalid", idempotencyKey: "assignment-key-6" }).success, false, "unassign target forbidden");
equal(leadAssignmentIntentSchema.safeParse({ leadId: uuid, expectedVersion: 1, strategy: "round_robin", reason: "heuristic", idempotencyKey: "assignment-key-7" }).success, false, "unknown assignment denied");

equal(leadTaskIntentSchema.safeParse({ leadId: uuid, type: "follow_up", title: "Retornar", dueAt: "2026-08-01T12:00:00.000Z", idempotencyKey: "task-create-key" }).success, true, "valid task");
equal(leadTaskIntentSchema.safeParse({ leadId: uuid, type: "runtime", title: "x", idempotencyKey: "task-create-key" }).success, false, "unknown task type");
equal(leadTaskIntentSchema.safeParse({ leadId: uuid, type: "call", title: "", idempotencyKey: "task-create-key" }).success, false, "blank task title");
equal(taskTransitionIntentSchema.safeParse({ taskId: uuid, toStatus: "completed", expectedVersion: 1, idempotencyKey: "task-transition-key" }).success, true, "valid task transition");
equal(taskTransitionIntentSchema.safeParse({ taskId: uuid, toStatus: "deleted", expectedVersion: 1, idempotencyKey: "task-transition-key" }).success, false, "unknown task status");
equal(leadNoteIntentSchema.safeParse({ leadId: uuid, note: "Contato realizado.", idempotencyKey: "note-key-1" }).success, true, "valid note");
equal(leadNoteIntentSchema.safeParse({ leadId: uuid, note: "", idempotencyKey: "note-key-1" }).success, false, "blank note");
equal(leadNoteIntentSchema.safeParse({ leadId: uuid, note: "x".repeat(4001), idempotencyKey: "note-key-1" }).success, false, "oversized note");
equal(leadTagsIntentSchema.safeParse({ leadId: uuid, tagIds: [uuid2, uuid3], expectedVersion: 1, idempotencyKey: "tag-key-1" }).success, true, "valid tags");
equal(leadTagsIntentSchema.safeParse({ leadId: uuid, tagIds: ["bad"], expectedVersion: 1, idempotencyKey: "tag-key-1" }).success, false, "invalid tag id");

// Canonical authorization and server wrappers.
for (const token of [
  "resolveEffectiveTenantPermission", "trustedTenantAccessContext", "requireTenantScopedAuthority",
  "CRM_MODULE_CODE", '"proprio"', '"equipe"', '"global"', "super_admin_impersonation",
  "tenant_owner", '"tag.manage"', '"pipeline.manage"',
]) has(files.authority, token);
lacks(files.authority, '.rpc("has_role"', "legacy role RPC");
lacks(files.authority, '.from("user_roles")', "global role table authority");
lacks(files.authority, "ORDER BY", "ordering authority");
lacks(files.authority, "LIMIT 1", "limit-one authority");

for (const token of [
  "middleware([requireTenant])", "authorizeTenantCrmOperation", "trustedTenantCrmContext",
  "list_tenant_crm_leads", "get_tenant_crm_lead_aggregate", "create_tenant_crm_lead",
  "update_tenant_crm_lead", "transition_tenant_crm_lead", "assign_tenant_crm_lead",
  "create_tenant_crm_task", "transition_tenant_crm_task", "add_tenant_crm_note",
  "set_tenant_crm_tags", "find_tenant_crm_duplicates", "get_tenant_crm_diagnostics",
  "CrmLeadDto", "CrmLeadAggregateDto", "CrmTaskDto", "ManualLeadResult",
]) has(files.functions, token);
lacks(files.functions, '.from("leads").update', "direct Lead update");
lacks(files.functions, '.from("leads").insert', "direct Lead insert");
lacks(files.functions, '.rpc("has_role"', "role RPC");
lacks(files.functions, '.from("user_roles")', "global role authority");
lacks(files.functions, "@ts-ignore", "ts-ignore");
lacks(files.functions, "@ts-nocheck", "ts-nocheck");

for (const token of [
  "listTenantCrmTags", "createTenantCrmTag", "setTenantCrmPipelineState",
  "create_tenant_crm_tag", "set_tenant_crm_pipeline_state", "scope !== \"global\"",
]) has(files.management, token);
lacks(files.management, '.from("crm_tags").insert', "direct tag mutation");
lacks(files.management, '.from("crm_pipelines").update', "direct pipeline mutation");

// Narrow compatibility and active barrel cutover.
for (const token of ["canonical Tenant CRM authority", "get_tenant_crm_lead_aggregate", "update_tenant_crm_lead", "create_tenant_crm_lead", "row_version"]) has(files.compatibility, token);
lacks(files.compatibility, '.from("leads").update', "compat direct update");
lacks(files.compatibility, '.from("leads").insert', "compat direct insert");
lacks(files.compatibility, '.rpc("has_role"', "compat role authority");
for (const token of ["transitionTenantLeadForContext", "listTenantLeadsForContext", "compatibilityKey", "Reabertura solicitada pelo usuário autenticado"]) has(files.legacyCompatibility, token);
lacks(files.legacyCompatibility, "LOVABLE_API_URL", "external insight provider");
lacks(files.legacyCompatibility, "generateObject", "generated external insight");
lacks(files.legacyCompatibility, '.from("leads")', "legacy direct Lead table access");
for (const token of ['from "./tenant-crm-compat.functions"', "adminListarLeads", "adminListarLeadAssignees", "adminListarImoveisLite", "adminAtualizarLead", "criarLeadManual"]) has(files.adminBarrel, token);

// Schema, default pipeline binding, OCC, scopes, timeline, idempotency and ACL.
for (const token of [
  "crm_pipelines", "crm_pipeline_stages", "crm_lead_events", "crm_lead_assignments",
  "crm_lead_tasks", "crm_tags", "crm_lead_tags", "crm_idempotency",
  "pipeline_id", "stage_id", "assigned_team_id", "qualification_key", "normalized_email",
  "normalized_phone", "original_attribution", "latest_attribution", "merge_state",
  "ux_crm_pipelines_one_default", "ux_crm_pipeline_stages_status", "ux_crm_pipeline_stages_position",
  "crm_pipeline_backfill_incomplete", "crm_bind_lead_pipeline", "crm_bind_lead_pipeline_trigger",
  "ALTER COLUMN pipeline_id SET NOT NULL", "ALTER COLUMN stage_id SET NOT NULL",
]) has(files.migration, token);
for (const token of [
  "crm_resolve_scope", "crm_scope_allows_lead", "crm_scope_allows_user_target",
  "crm_scope_allows_team_target", "crm_idempotent_response", "pg_advisory_xact_lock",
  "list_tenant_crm_leads", "get_tenant_crm_lead_aggregate", "create_tenant_crm_lead",
  "update_tenant_crm_lead", "transition_tenant_crm_lead", "assign_tenant_crm_lead",
  "create_tenant_crm_task", "transition_tenant_crm_task", "add_tenant_crm_note",
  "set_tenant_crm_tags", "find_tenant_crm_duplicates", "set_tenant_crm_pipeline_state",
  "create_tenant_crm_tag", "get_tenant_crm_diagnostics",
]) has(files.migration, token);
for (const token of [
  "FOR UPDATE", "crm_version_conflict", "crm_idempotency_conflict", "crm_invalid_transition",
  "crm_invalid_task_transition", "crm_scope_denied", "crm_cross_tenant_reference",
  "membership_status = 'active'", "team_members", "assigned_to = _actor_user_id",
  "v_from_user := v_lead.assigned_to", "v_from_team := v_lead.assigned_team_id",
  "from_user_id, to_user_id", "from_team_id, to_team_id",
  "INSERT INTO public.audit_log", "INSERT INTO public.crm_lead_events",
  "crm_append_only_violation", "crm_assignee_required",
]) has(files.migration, token);
for (const token of [
  "ENABLE ROW LEVEL SECURITY", "REVOKE ALL ON TABLE", "FROM PUBLIC, anon, authenticated",
  "TO service_role", "REVOKE ALL ON FUNCTION public.transition_tenant_crm_lead",
  "GRANT EXECUTE ON FUNCTION public.transition_tenant_crm_lead",
  "REVOKE EXECUTE ON FUNCTION public.transition_lead_status",
]) has(files.migration, token);
lacks(files.migration, "http_post", "HTTP in transaction");
lacks(files.migration, "net.http", "network call in transaction");
lacks(files.migration, "CREATE TABLE IF NOT EXISTS public.crm_contacts", "invented contacts domain");
lacks(files.migration, "CREATE TABLE IF NOT EXISTS public.crm_opportunities", "invented opportunities domain");
lacks(files.migration, "merge_tenant_leads", "automatic merge primitive");
lacks(files.migration, "fuzzy", "fuzzy merge authority");
lacks(files.migration, "ORDER BY position LIMIT 1", "first-stage authority");
lacks(files.migration, "ORDER BY created_at LIMIT 1", "first-record authority");
lacks(files.migration, "GRANT EXECUTE ON FUNCTION public.transition_tenant_crm_lead(uuid,uuid,text,uuid,text,bigint,uuid,text,text) TO authenticated", "authenticated mutation grant");
lacks(files.migration, "GRANT EXECUTE ON FUNCTION public.create_tenant_crm_lead(uuid,uuid,text,text,text,text,uuid,text,uuid,text) TO authenticated", "authenticated create grant");

// UI intent surfaces remain OCC-aware and have no direct client DML.
for (const token of ["expectedVersion", "transicionarLead", "onError", "invalidateQueries"]) has(files.pipelineHook, token);
for (const token of ["expectedVersion: lead.version", "transicionarLead", "reabrirLead"]) has(files.leadDetail, token);
for (const token of ["updateStatus.mutate", "expectedVersion: lead.version", "perdido", "descartado"]) has(files.pipelinePage, token);
lacks(files.pipelineHook, '.from("leads")', "client Lead access");
lacks(files.pipelinePage, '.from("leads")', "pipeline direct mutation");
lacks(files.leadDetail, '.from("leads")', "detail direct mutation");

// PTW-01 remains the single public authority; trigger performs exact 1-of-1 binding.
for (const token of ["requirePublicTenantFromRequest", "requirePublicWriterTenantFromRequest", "public_tenant_unresolved", "resource_ambiguous", "resource_foreign_tenant"]) has(files.ptwAuthority, token);
lacks(files.migration, "public_create_tenant_crm_lead", "second public writer");
has(files.migration, "every new PTW-01 lead", "PTW pipeline binding contract");

ok(assertions >= 260, `expected >= 260 assertions, got ${assertions}`);
console.log(`PR_M2_CRM_OPERATIONAL_WORKFLOW_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_CRM_OPERATIONAL_WORKFLOW_SPECS=PASS");
