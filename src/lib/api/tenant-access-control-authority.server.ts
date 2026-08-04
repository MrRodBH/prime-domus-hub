import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import type { TenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";

export const RBAC_ACTIONS = [
  "visualizar",
  "criar",
  "editar",
  "excluir",
  "exportar",
  "importar",
  "aprovar",
  "gerenciar",
  "publicar",
] as const;

export const RBAC_SCOPES = ["proprio", "equipe", "global"] as const;

export type RbacAction = (typeof RBAC_ACTIONS)[number];
export type RbacScope = (typeof RBAC_SCOPES)[number];

export type TenantPermissionDecision = {
  allowed: boolean;
  scope: RbacScope | null;
  source: "super_admin_impersonation" | "tenant_owner" | "assigned_profiles" | "membership_denied" | "permission_absent";
};

export type TrustedTenantAccessContext = {
  userId: string;
  tenant: TenantScopedAuthority;
};

export function trustedTenantAccessContext(context: {
  userId: string;
  tenant: TenantContext;
}): TrustedTenantAccessContext {
  return {
    userId: context.userId,
    tenant: {
      tenantId: context.tenant.tenantId,
      isSuperAdmin: context.tenant.isSuperAdmin,
      impersonation: context.tenant.impersonation,
      origin: context.tenant.origin,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDecision(raw: unknown): TenantPermissionDecision {
  if (!isRecord(raw) || typeof raw.allowed !== "boolean") {
    throw new Error("tenant_access_invalid_permission_response");
  }
  const scope = raw.scope;
  if (scope !== null && scope !== "proprio" && scope !== "equipe" && scope !== "global") {
    throw new Error("tenant_access_invalid_permission_scope");
  }
  const source = raw.source;
  if (
    source !== "super_admin_impersonation" &&
    source !== "tenant_owner" &&
    source !== "assigned_profiles" &&
    source !== "membership_denied" &&
    source !== "permission_absent"
  ) {
    throw new Error("tenant_access_invalid_permission_source");
  }
  return { allowed: raw.allowed, scope, source };
}

export async function resolveEffectiveTenantPermission(
  context: TrustedTenantAccessContext,
  moduleCode: string,
  action: RbacAction,
): Promise<TenantPermissionDecision> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Access Control");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc(
    "resolve_tenant_permission" as never,
    {
      _actor_user_id: context.userId,
      _tenant_id: tenantId,
      _tenant_origin: context.tenant.origin,
      _module_code: moduleCode,
      _action: action,
    } as never,
  );
  if (error) throw safeTenantAccessError(error);
  return parseDecision(data);
}

export async function authorizeTenantAccessControlOperation(
  context: TrustedTenantAccessContext,
): Promise<{ tenantId: string; actorKind: "owner" | "super_admin" | "delegated" }> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Access Control");
  const decision = await resolveEffectiveTenantPermission(context, "access_control", "gerenciar");
  if (!decision.allowed || decision.scope !== "global") {
    throw new Error("Acesso negado à gestão de perfis, permissões e equipes.");
  }
  const actorKind =
    decision.source === "super_admin_impersonation"
      ? "super_admin"
      : decision.source === "tenant_owner"
        ? "owner"
        : "delegated";
  return { tenantId, actorKind };
}

export function safeTenantAccessError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "tenant_access_failed";
  const known: Array<[string, string]> = [
    ["super_admin_requires_impersonation", "Super Admin precisa de impersonação explícita para operar recursos do tenant."],
    ["tenant_access_manager_required", "O usuário não possui permissão global para gerenciar acessos."],
    ["tenant_profile_not_found", "O perfil não existe neste tenant."],
    ["tenant_profile_in_use", "O perfil está associado a membros e não pode ser excluído."],
    ["delegated_manager_cannot_change_own_profile", "Gestor delegado não pode alterar o próprio perfil."],
    ["delegated_manager_cannot_change_own_profiles", "Gestor delegado não pode alterar os próprios perfis."],
    ["owner_required_for_access_control_grant", "Somente o owner pode conceder gestão de controle de acesso."],
    ["permission_escalation_denied", "A operação concederia permissão que o ator não possui."],
    ["permission_scope_escalation_denied", "A operação concederia escopo superior ao do ator."],
    ["profile_assignment_escalation_denied", "A associação concederia privilégios superiores aos do ator."],
    ["cross_tenant_or_unknown_profile", "Perfil inexistente ou pertencente a outro tenant."],
    ["target_membership_invalid", "O usuário alvo não possui membership válida neste tenant."],
    ["owner_profiles_are_not_mutable", "Os perfis RBAC do owner não são mutáveis por esta operação."],
    ["cross_tenant_or_inactive_team_member", "Líder ou membro da equipe não pertence ativamente ao tenant."],
    ["tenant_team_not_found", "A equipe não existe neste tenant."],
    ["tenant_not_found", "Tenant não encontrado."],
  ];
  for (const [token, safe] of known) {
    if (message.includes(token)) return new Error(safe);
  }
  return new Error("Falha segura no controle de acesso do tenant.");
}
