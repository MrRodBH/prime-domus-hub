import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  resolveEffectiveTenantPermission,
  type RbacAction,
} from "@/lib/api/tenant-access-control-authority.server";
import {
  TRACKING_AVAILABILITY_STATES,
  getTrackingProviderDefinition,
  validateTrackingIdentifier,
  type TrackingAvailabilityState,
  type TrackingConsentCategory,
  type TrackingEventKey,
  type TrackingProviderKey,
} from "@/lib/tracking/tracking-registry";

export type TrustedTenantTrackingContext = {
  userId: string;
  tenant: TenantContext;
};

export type TenantTrackingOperation = "view" | "configure" | "publish" | "diagnostics";

const ACTION_BY_OPERATION: Record<TenantTrackingOperation, RbacAction> = {
  view: "visualizar",
  configure: "editar",
  publish: "publicar",
  diagnostics: "visualizar",
};

export type TenantTrackingAuthorization = {
  tenantId: string;
  actorUserId: string;
  actorKind: "owner" | "super_admin" | "delegated";
  permissionSource: string;
  scope: "global";
};

export async function authorizeTenantTrackingOperation(
  context: TrustedTenantTrackingContext,
  operation: TenantTrackingOperation,
): Promise<TenantTrackingAuthorization> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Tracking");
  const moduleCode = operation === "publish" ? "cms.versoes" : "cms.configuracoes";
  const decision = await resolveEffectiveTenantPermission(
    { userId: context.userId, tenant: context.tenant },
    moduleCode,
    ACTION_BY_OPERATION[operation],
  );
  if (!decision.allowed || decision.scope !== "global") {
    throw new Error(`tenant_tracking_${operation}_denied`);
  }
  return {
    tenantId,
    actorUserId: context.userId,
    actorKind: decision.source === "super_admin_impersonation"
      ? "super_admin"
      : decision.source === "tenant_owner"
        ? "owner"
        : "delegated",
    permissionSource: decision.source,
    scope: "global",
  };
}

export type TrackingConnectorRow = {
  id: string;
  tenant_id: string;
  provider_key: TrackingProviderKey;
  provider_identifier: string | null;
  schema_version: number;
  enabled: boolean;
  consent_category: TrackingConsentCategory;
  configuration_version: number;
  event_binding_version: number;
  availability_state: string;
  row_version: number;
  last_diagnostic_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type TrackingConnectorView = {
  id: string;
  tenantId: string;
  providerKey: TrackingProviderKey;
  displayName: string;
  capabilityClass: "required" | "extensible";
  providerIdentifier: string | null;
  identifierType: string;
  schemaVersion: 1;
  enabled: boolean;
  consentCategory: TrackingConsentCategory;
  configurationVersion: number;
  eventBindingVersion: number;
  availabilityState: TrackingAvailabilityState;
  rowVersion: number;
  lastDiagnosticAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

function safeAvailability(value: string): TrackingAvailabilityState {
  return TRACKING_AVAILABILITY_STATES.includes(value as TrackingAvailabilityState)
    ? value as TrackingAvailabilityState
    : "failed";
}

export function sanitizeTrackingConnector(row: TrackingConnectorRow): TrackingConnectorView {
  if (!row.id || !row.tenant_id) throw new Error("tenant_tracking_connector_identity_required");
  const definition = getTrackingProviderDefinition(row.provider_key);
  const providerIdentifier = row.provider_identifier
    ? validateTrackingIdentifier(row.provider_key, row.provider_identifier)
    : null;
  if (row.consent_category !== definition.consentCategory) {
    throw new Error("tracking_consent_category_mismatch");
  }
  const registryBlocked = definition.availabilityState === "csp_blocked";
  return {
    id: row.id,
    tenantId: row.tenant_id,
    providerKey: row.provider_key,
    displayName: definition.displayName,
    capabilityClass: definition.capabilityClass,
    providerIdentifier,
    identifierType: definition.identifierType,
    schemaVersion: 1,
    enabled: registryBlocked ? false : row.enabled === true,
    consentCategory: row.consent_category,
    configurationVersion: Math.max(1, Number(row.configuration_version ?? 1)),
    eventBindingVersion: Math.max(1, Number(row.event_binding_version ?? 1)),
    availabilityState: registryBlocked ? "csp_blocked" : safeAvailability(row.availability_state),
    rowVersion: Math.max(1, Number(row.row_version ?? 1)),
    lastDiagnosticAt: row.last_diagnostic_at,
    lastErrorCode: registryBlocked ? "tracking_csp_blocked" : row.last_error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const connectorSelect = [
  "id", "tenant_id", "provider_key", "provider_identifier", "schema_version", "enabled",
  "consent_category", "configuration_version", "event_binding_version", "availability_state",
  "row_version", "last_diagnostic_at", "last_error_code", "created_at", "updated_at",
].join(", ");

export async function listTenantTrackingConnectorRows(tenantId: string): Promise<TrackingConnectorView[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_tracking_connectors")
    .select(connectorSelect)
    .eq("tenant_id", tenantId)
    .order("provider_key", { ascending: true });
  if (result.error) throw safeTenantTrackingError(result.error);
  return (result.data ?? []).map((row: TrackingConnectorRow) => {
    if (row.tenant_id !== tenantId) throw new Error("tenant_tracking_cross_tenant_connector");
    return sanitizeTrackingConnector(row);
  });
}

export async function loadTenantTrackingConnector(
  tenantId: string,
  connectorId: string,
): Promise<TrackingConnectorView> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_tracking_connectors")
    .select(connectorSelect)
    .eq("tenant_id", tenantId)
    .eq("id", connectorId)
    .maybeSingle();
  if (result.error) throw safeTenantTrackingError(result.error);
  if (!result.data) throw new Error("tenant_tracking_connector_not_found");
  if (result.data.tenant_id !== tenantId) throw new Error("tenant_tracking_cross_tenant_connector");
  return sanitizeTrackingConnector(result.data as TrackingConnectorRow);
}

export async function listTenantTrackingBindings(
  tenantId: string,
  connectorId: string,
): Promise<Array<{ eventKey: TrackingEventKey; enabled: boolean; bindingVersion: number; updatedAt: string }>> {
  await loadTenantTrackingConnector(tenantId, connectorId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_tracking_event_bindings")
    .select("tenant_id, connector_id, event_key, enabled, binding_version, updated_at")
    .eq("tenant_id", tenantId)
    .eq("connector_id", connectorId)
    .order("event_key", { ascending: true });
  if (result.error) throw safeTenantTrackingError(result.error);
  return (result.data ?? []).map((row: any) => {
    if (row.tenant_id !== tenantId || row.connector_id !== connectorId) {
      throw new Error("tenant_tracking_cross_tenant_binding");
    }
    return {
      eventKey: row.event_key as TrackingEventKey,
      enabled: row.enabled === true,
      bindingVersion: Number(row.binding_version),
      updatedAt: String(row.updated_at),
    };
  });
}

export async function loadTenantTrackingConsentConfiguration(tenantId: string): Promise<{
  tenantId: string;
  schemaVersion: 1;
  noticeEnabled: boolean;
  analyticsMode: "opt_in";
  marketingMode: "opt_in";
  policyRevision: number;
  rowVersion: number;
  updatedAt: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_tracking_consent_configuration")
    .select("tenant_id, schema_version, notice_enabled, analytics_mode, marketing_mode, policy_revision, row_version, updated_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (result.error) throw safeTenantTrackingError(result.error);
  if (!result.data) throw new Error("tenant_tracking_consent_configuration_not_found");
  if (result.data.tenant_id !== tenantId) throw new Error("tenant_tracking_cross_tenant_consent");
  if (result.data.schema_version !== 1 || result.data.analytics_mode !== "opt_in" || result.data.marketing_mode !== "opt_in") {
    throw new Error("tenant_tracking_consent_configuration_invalid");
  }
  return {
    tenantId,
    schemaVersion: 1,
    noticeEnabled: result.data.notice_enabled === true,
    analyticsMode: "opt_in",
    marketingMode: "opt_in",
    policyRevision: Number(result.data.policy_revision),
    rowVersion: Number(result.data.row_version),
    updatedAt: String(result.data.updated_at),
  };
}

export async function executeTenantTrackingRpc<T>(
  name:
    | "save_tenant_tracking_connector"
    | "save_tenant_tracking_event_bindings"
    | "save_tenant_tracking_consent_configuration",
  args: Record<string, unknown>,
): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any).rpc(name, args);
  if (result.error) throw safeTenantTrackingError(result.error);
  return result.data as T;
}

export function safeTenantTrackingError(error: unknown): Error {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  const known: Array<[string, string]> = [
    ["super_admin_requires_impersonation", "Super Admin precisa de impersonação explícita para operar tracking do tenant."],
    ["tenant_tracking_view_denied", "Acesso negado ao domínio de tracking."],
    ["tenant_tracking_configure_denied", "Permissão global necessária para configurar tracking."],
    ["tenant_tracking_publish_denied", "Permissão global necessária para ativar tracking."],
    ["tenant_tracking_connector_not_found", "Connector de tracking inexistente ou pertencente a outro tenant."],
    ["tenant_tracking_cross_tenant", "Referência cross-tenant de tracking negada."],
    ["tracking_provider_not_cataloged", "Provider de tracking não catalogado."],
    ["tracking_event_not_cataloged", "Evento de conversão não catalogado."],
    ["tracking_provider_identifier_invalid", "Identificador do provider inválido."],
    ["tracking_provider_identifier_required", "Identificador válido obrigatório para ativação."],
    ["tracking_csp_blocked", "Provider bloqueado pelo contrato CSP e pela governança de tags."],
    ["tracking_revision_conflict", "O connector foi alterado; recarregue antes de continuar."],
    ["tracking_binding_revision_conflict", "Os event bindings foram alterados; recarregue antes de continuar."],
    ["tracking_consent_revision_conflict", "A configuração de consentimento foi alterada; recarregue."],
    ["tracking_arbitrary_code_prohibited", "JavaScript, HTML, endpoint ou script arbitrário é proibido."],
    ["tracking_event_binding", "O conjunto de event bindings é inválido."],
  ];
  for (const [token, safe] of known) {
    if (message.includes(token)) return new Error(safe);
  }
  return new Error("Falha segura no domínio de tracking.");
}
