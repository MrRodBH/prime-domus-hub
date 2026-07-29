import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  resolveEffectiveTenantPermission,
  type RbacAction,
} from "@/lib/api/tenant-access-control-authority.server";
import {
  parsePortalHybridConfig,
  sanitizePortalConnector,
  type PortalConnectorRow,
  type PortalConnectorView,
} from "@/lib/portals/portal-connector-registry";

export type TrustedTenantPortalContext = {
  userId: string;
  tenant: TenantContext;
};

export type TenantPortalActorKind = "owner" | "super_admin" | "delegated";
export type TenantPortalOperation =
  | "view"
  | "configure"
  | "credential"
  | "publish"
  | "export"
  | "retry"
  | "reconcile";

const ACTION_BY_OPERATION: Record<TenantPortalOperation, RbacAction> = {
  view: "visualizar",
  configure: "gerenciar",
  credential: "gerenciar",
  publish: "publicar",
  export: "exportar",
  retry: "publicar",
  reconcile: "publicar",
};

export async function authorizeTenantPortalOperation(
  context: TrustedTenantPortalContext,
  operation: TenantPortalOperation,
): Promise<{
  tenantId: string;
  actorUserId: string;
  actorKind: TenantPortalActorKind;
  permissionSource: string;
}> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Portal");
  const decision = await resolveEffectiveTenantPermission(
    { userId: context.userId, tenant: context.tenant },
    "portals",
    ACTION_BY_OPERATION[operation],
  );

  if (!decision.allowed || decision.scope !== "global") {
    throw new Error(`tenant_portal_${operation}_denied`);
  }

  const actorKind: TenantPortalActorKind =
    decision.source === "super_admin_impersonation"
      ? "super_admin"
      : decision.source === "tenant_owner"
        ? "owner"
        : "delegated";

  return {
    tenantId,
    actorUserId: context.userId,
    actorKind,
    permissionSource: decision.source,
  };
}

export function authorizeTenantPortalCredentialOperation(
  context: TrustedTenantPortalContext,
) {
  return authorizeTenantPortalOperation(context, "credential");
}

export function authorizeTenantPortalPublicationOperation(
  context: TrustedTenantPortalContext,
) {
  return authorizeTenantPortalOperation(context, "publish");
}

export async function loadTenantPortalConnector(
  tenantId: string,
  connectorId: string,
): Promise<PortalConnectorView> {
  if (!tenantId || !connectorId) throw new Error("tenant_portal_connector_identity_required");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("portal_connectors")
    .select(
      "id, tenant_id, portal_nome, portal_slug, ativo, status, feed_url, webhook_url, config, ultimo_sync_at, ultimo_erro, created_at, updated_at, credential_version, credential_state, last_rotated_at, rotation_required, row_version",
    )
    .eq("tenant_id", tenantId)
    .eq("id", connectorId)
    .maybeSingle();
  if (error) throw safeTenantPortalError(error);
  if (!data) throw new Error("tenant_portal_connector_not_found");
  if (data.tenant_id !== tenantId) throw new Error("tenant_portal_cross_tenant_connector");
  return sanitizePortalConnector(data as PortalConnectorRow);
}

export async function listTenantPortalConnectorRows(
  tenantId: string,
): Promise<PortalConnectorView[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("portal_connectors")
    .select(
      "id, tenant_id, portal_nome, portal_slug, ativo, status, feed_url, webhook_url, config, ultimo_sync_at, ultimo_erro, created_at, updated_at, credential_version, credential_state, last_rotated_at, rotation_required, row_version",
    )
    .eq("tenant_id", tenantId)
    .order("portal_nome", { ascending: true });
  if (error) throw safeTenantPortalError(error);
  return (data ?? []).map((row: PortalConnectorRow) => {
    if (row.tenant_id !== tenantId) throw new Error("tenant_portal_cross_tenant_connector");
    return sanitizePortalConnector(row);
  });
}

export async function assertTenantPortalConnectorReadyForOperation(
  tenantId: string,
  connectorId: string,
  operation: "publish" | "unpublish" | "export",
): Promise<PortalConnectorView> {
  const connector = await loadTenantPortalConnector(tenantId, connectorId);
  if (!connector.hybridConfig) throw new Error("tenant_portal_configuration_required");
  parsePortalHybridConfig(connector.hybridConfig);

  if (operation !== "export") {
    if (!connector.active) throw new Error("tenant_portal_connector_disabled");
    if (connector.credentialState === "credential_provisioning_required") {
      throw new Error("tenant_portal_credential_provisioning_required");
    }
    if (connector.credentialState === "rotation_required") {
      throw new Error("tenant_portal_credential_rotation_required");
    }
  }
  return connector;
}

export async function executeTenantPortalRpc<T>(
  name:
    | "save_tenant_portal_connector"
    | "set_tenant_portal_connector_state"
    | "save_tenant_portal_mapping"
    | "rotate_tenant_portal_credential_reference"
    | "enqueue_tenant_portal_publication"
    | "claim_tenant_portal_job"
    | "record_tenant_portal_attempt"
    | "complete_tenant_portal_job"
    | "schedule_tenant_portal_retry"
    | "cancel_tenant_portal_job"
    | "reconcile_tenant_portal_state"
    | "record_tenant_portal_export",
  args: Record<string, unknown>,
): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc(name, args);
  if (error) throw safeTenantPortalError(error);
  return data as T;
}

export function safeTenantPortalError(error: unknown): Error {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  const known: Array<[string, string]> = [
    ["Super Admin access requires explicit impersonation", "Super Admin precisa de impersonação explícita para operar portais do tenant."],
    ["tenant_portal_view_denied", "Acesso negado aos portais do tenant."],
    ["tenant_portal_configure_denied", "O usuário não possui permissão global para configurar portais."],
    ["tenant_portal_credential_denied", "O usuário não possui permissão para gerenciar referências de credenciais."],
    ["tenant_portal_publish_denied", "O usuário não possui permissão global para publicar em portais."],
    ["tenant_portal_export_denied", "O usuário não possui permissão para exportar imóveis para portais."],
    ["tenant_portal_connector_not_found", "Connector inexistente ou pertencente a outro tenant."],
    ["tenant_portal_cross_tenant", "A operação cross-tenant foi negada."],
    ["tenant_portal_configuration_required", "A configuração HYBRID do connector está incompleta."],
    ["tenant_portal_credential_provisioning_required", "O connector requer provisionamento seguro de credencial."],
    ["tenant_portal_credential_rotation_required", "A referência de credencial precisa ser rotacionada."],
    ["tenant_portal_connector_disabled", "O connector está desativado."],
    ["tenant_portal_property_ineligible", "O imóvel não está elegível para publicação."],
    ["tenant_portal_job_not_found", "Job inexistente ou pertencente a outro tenant."],
    ["tenant_portal_job_transition_invalid", "A transição do job foi negada."],
    ["tenant_portal_idempotency_conflict", "A idempotency key já pertence a outra operação."],
    ["tenant_portal_revision_conflict", "O recurso foi alterado por outra operação. Recarregue antes de continuar."],
    ["adapter_not_implemented", "O adapter automatizado ainda não está implementado. Utilize exportação manual."],
  ];

  for (const [token, safe] of known) {
    if (message.includes(token)) return new Error(safe);
  }
  return new Error("Falha segura no domínio de portais.");
}
