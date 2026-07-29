import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import {
  resolveEffectiveTenantPermission,
  trustedTenantAccessContext,
  type RbacAction,
  type TenantPermissionDecision,
} from "@/lib/api/tenant-access-control-authority.server";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";

export const TENANT_CMS_MODULES = [
  "cms.paginas",
  "cms.formularios",
  "cms.campanhas",
  "cms.midias",
  "cms.menu",
  "cms.branding",
  "cms.versoes",
  "cms.configuracoes",
] as const;

export type TenantCmsModule = (typeof TENANT_CMS_MODULES)[number];
export type TenantCmsOperation =
  | "list"
  | "read"
  | "create_draft"
  | "save_draft"
  | "validate"
  | "preview"
  | "publish"
  | "unpublish"
  | "list_versions"
  | "read_version"
  | "rollback"
  | "delete"
  | "diagnostics";

export type TrustedTenantCmsContext = {
  readonly userId: string;
  readonly tenant: TenantContext;
};

export type TenantCmsAuthorization = {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly actorKind: "owner" | "super_admin" | "delegated";
  readonly module: TenantCmsModule;
  readonly operation: TenantCmsOperation;
  readonly action: RbacAction;
  readonly decision: TenantPermissionDecision;
};

const ACTION_BY_OPERATION: Record<TenantCmsOperation, RbacAction> = {
  list: "visualizar",
  read: "visualizar",
  create_draft: "criar",
  save_draft: "editar",
  validate: "editar",
  preview: "visualizar",
  publish: "publicar",
  unpublish: "publicar",
  list_versions: "visualizar",
  read_version: "visualizar",
  rollback: "editar",
  delete: "excluir",
  diagnostics: "visualizar",
};

const GLOBAL_OPERATIONS = new Set<TenantCmsOperation>([
  "list",
  "create_draft",
  "save_draft",
  "validate",
  "preview",
  "publish",
  "unpublish",
  "list_versions",
  "read_version",
  "rollback",
  "delete",
  "diagnostics",
]);

function actorKindFromDecision(decision: TenantPermissionDecision): TenantCmsAuthorization["actorKind"] {
  if (decision.source === "super_admin_impersonation") return "super_admin";
  if (decision.source === "tenant_owner") return "owner";
  return "delegated";
}

export async function authorizeTenantCmsOperation(
  context: TrustedTenantCmsContext,
  module: TenantCmsModule,
  operation: TenantCmsOperation,
): Promise<TenantCmsAuthorization> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "CMS Workflow");
  const action = ACTION_BY_OPERATION[operation];
  const decision = await resolveEffectiveTenantPermission(
    trustedTenantAccessContext(context),
    module,
    action,
  );

  if (!decision.allowed) {
    throw new Error("tenant_cms_permission_denied");
  }
  if (GLOBAL_OPERATIONS.has(operation) && decision.scope !== "global") {
    throw new Error("tenant_cms_global_scope_required");
  }

  return {
    tenantId,
    actorUserId: context.userId,
    actorKind: actorKindFromDecision(decision),
    module,
    operation,
    action,
    decision,
  };
}

export function authorizeTenantPageOperation(
  context: TrustedTenantCmsContext,
  operation: TenantCmsOperation,
) {
  return authorizeTenantCmsOperation(context, "cms.paginas", operation);
}

export function authorizeTenantFormOperation(
  context: TrustedTenantCmsContext,
  operation: TenantCmsOperation,
) {
  return authorizeTenantCmsOperation(context, "cms.formularios", operation);
}

export function authorizeTenantCampaignOperation(
  context: TrustedTenantCmsContext,
  operation: TenantCmsOperation,
) {
  return authorizeTenantCmsOperation(context, "cms.campanhas", operation);
}

export function authorizeTenantTemplateOperation(
  context: TrustedTenantCmsContext,
  operation: TenantCmsOperation,
) {
  return authorizeTenantCmsOperation(context, "cms.paginas", operation);
}

export function safeTenantCmsError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "tenant_cms_failed";
  const known: Array<[string, string]> = [
    ["super_admin_requires_impersonation", "Super Admin precisa de impersonação explícita para operar o CMS do tenant."],
    ["tenant_cms_permission_denied", "Acesso negado ao CMS do tenant."],
    ["tenant_cms_global_scope_required", "A operação CMS exige permissão com escopo global."],
    ["cms_page_not_found", "Página não encontrada."],
    ["cms_page_revision_conflict", "A página foi alterada por outra sessão."],
    ["cms_page_draft_not_found", "Rascunho de página não encontrado."],
    ["cms_page_validation_failed", "O snapshot da página é inválido."],
    ["cms_page_slug_conflict", "Já existe uma página com este slug no tenant."],
    ["cms_template_not_found", "Template não encontrado."],
    ["cms_form_not_found", "Formulário não encontrado."],
    ["cms_form_revision_conflict", "O formulário foi alterado por outra sessão."],
    ["cms_campaign_not_found", "Campanha não encontrada."],
    ["cms_campaign_revision_conflict", "A campanha foi alterada por outra sessão."],
    ["cms_cross_tenant_reference", "Referência CMS inexistente ou pertencente a outro tenant."],
    ["cms_media_reference_invalid", "Referência de mídia inválida para o tenant."],
    ["cms_ambiguous_state", "Estado CMS ambíguo; operação interrompida."],
  ];
  for (const [token, safe] of known) {
    if (message.includes(token)) return new Error(safe);
  }
  return new Error("Falha segura no CMS do tenant.");
}
