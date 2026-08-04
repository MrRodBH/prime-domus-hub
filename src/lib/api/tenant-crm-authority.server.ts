import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import {
  resolveEffectiveTenantPermission,
  trustedTenantAccessContext,
  type RbacAction,
  type RbacScope,
  type TrustedTenantAccessContext,
} from "@/lib/api/tenant-access-control-authority.server";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";

export const CRM_MODULE_CODE = "crm" as const;

export const CRM_OPERATIONS = [
  "lead.list",
  "lead.read",
  "lead.create",
  "lead.update",
  "lead.transition",
  "lead.assign",
  "lead.qualify",
  "lead.tag",
  "lead.note",
  "lead.duplicates",
  "task.list",
  "task.create",
  "task.transition",
  "pipeline.list",
  "pipeline.manage",
  "tag.list",
  "tag.manage",
  "crm.diagnostics",
] as const;

export type TenantCrmOperation = (typeof CRM_OPERATIONS)[number];
export type TenantCrmScope = "own" | "team" | "global";

export type TenantCrmAuthorization = {
  tenantId: string;
  actorUserId: string;
  operation: TenantCrmOperation;
  action: RbacAction;
  scope: TenantCrmScope;
  actorKind: "owner" | "super_admin" | "delegated";
};

const OPERATION_ACTION = {
  "lead.list": "visualizar",
  "lead.read": "visualizar",
  "lead.create": "criar",
  "lead.update": "editar",
  "lead.transition": "editar",
  "lead.assign": "gerenciar",
  "lead.qualify": "editar",
  "lead.tag": "editar",
  "lead.note": "editar",
  "lead.duplicates": "visualizar",
  "task.list": "visualizar",
  "task.create": "criar",
  "task.transition": "editar",
  "pipeline.list": "visualizar",
  "pipeline.manage": "gerenciar",
  "tag.list": "visualizar",
  "tag.manage": "gerenciar",
  "crm.diagnostics": "gerenciar",
} satisfies Record<TenantCrmOperation, RbacAction>;

function normalizeScope(scope: RbacScope | null): TenantCrmScope {
  if (scope === "global") return "global";
  if (scope === "equipe") return "team";
  if (scope === "proprio") return "own";
  throw new Error("tenant_crm_permission_scope_missing");
}

export function trustedTenantCrmContext(context: {
  userId: string;
  tenant: TenantContext;
}): TrustedTenantAccessContext {
  return trustedTenantAccessContext(context);
}

export async function authorizeTenantCrmOperation(
  context: TrustedTenantAccessContext,
  operation: TenantCrmOperation,
): Promise<TenantCrmAuthorization> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant CRM");
  const action = OPERATION_ACTION[operation];
  const decision = await resolveEffectiveTenantPermission(context, CRM_MODULE_CODE, action);
  if (!decision.allowed) throw new Error("tenant_crm_permission_denied");

  const actorKind =
    decision.source === "super_admin_impersonation"
      ? "super_admin"
      : decision.source === "tenant_owner"
        ? "owner"
        : "delegated";

  return {
    tenantId,
    actorUserId: context.userId,
    operation,
    action,
    scope: normalizeScope(decision.scope),
    actorKind,
  };
}

export function safeTenantCrmError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "tenant_crm_failed";
  const known: Array<[string, string]> = [
    ["super_admin_requires_impersonation", "Super Admin precisa de impersonação explícita para operar o CRM do tenant."],
    ["tenant_crm_permission_denied", "Acesso negado à operação CRM."],
    ["tenant_crm_permission_scope_missing", "O perfil não possui escopo CRM válido."],
    ["crm_scope_denied", "O recurso está fora do escopo CRM efetivo do usuário."],
    ["crm_cross_tenant_reference", "Referência CRM inexistente ou pertencente a outro tenant."],
    ["crm_lead_not_found", "Lead não encontrado."],
    ["crm_task_not_found", "Tarefa não encontrada."],
    ["crm_version_conflict", "O recurso foi alterado por outra operação."],
    ["crm_invalid_transition", "Transição CRM inválida."],
    ["crm_invalid_task_transition", "Transição de tarefa inválida."],
    ["crm_reason_required", "A operação exige um motivo válido."],
    ["crm_invalid_reason", "Motivo inexistente ou inativo neste tenant."],
    ["crm_assignee_required", "O escopo efetivo exige um responsável elegível."],
    ["crm_assignee_invalid", "Responsável inexistente ou fora do escopo CRM efetivo."],
    ["crm_team_invalid", "Equipe inexistente, inativa ou fora do escopo CRM efetivo."],
    ["crm_idempotency_conflict", "A chave de idempotência já foi usada com outro payload."],
    ["crm_ambiguous_state", "O estado CRM está ambíguo e a operação foi interrompida."],
    ["crm_default_pipeline_deactivation_forbidden", "O pipeline default ativo não pode ser desativado."],
    ["crm_pipeline_has_active_leads", "O pipeline possui leads ativos e não pode ser desativado."],
    ["crm_tag_invalid", "A tag CRM é inválida."],
    ["crm_merge_review_required", "A consolidação de duplicados exige revisão explícita e não foi executada."],
  ];
  for (const [token, safe] of known) {
    if (message.includes(token)) return new Error(safe);
  }
  return new Error("Falha segura na operação CRM.");
}
