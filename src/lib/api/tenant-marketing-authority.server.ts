import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  resolveEffectiveTenantPermission,
  type RbacAction,
} from "@/lib/api/tenant-access-control-authority.server";
import {
  MARKETING_AVAILABILITY_STATES,
  getMarketingChannelDefinition,
  parseMarketingConnectorConfig,
  type MarketingAvailabilityState,
  type MarketingChannelKey,
  type MarketingConnectorConfig,
} from "@/lib/marketing/marketing-channel-registry";

export type TrustedTenantMarketingContext = {
  userId: string;
  tenant: TenantContext;
};

export type TenantMarketingOperation =
  | "view"
  | "configure"
  | "credential"
  | "mapping"
  | "import"
  | "retry"
  | "diagnostics";

const ACTION_BY_OPERATION: Record<TenantMarketingOperation, RbacAction> = {
  view: "visualizar",
  configure: "gerenciar",
  credential: "gerenciar",
  mapping: "gerenciar",
  import: "criar",
  retry: "gerenciar",
  diagnostics: "gerenciar",
};

export type TenantMarketingAuthorization = {
  tenantId: string;
  actorUserId: string;
  actorKind: "owner" | "super_admin" | "delegated";
  permissionSource: string;
  scope: "global";
};

export async function authorizeTenantMarketingOperation(
  context: TrustedTenantMarketingContext,
  operation: TenantMarketingOperation,
): Promise<TenantMarketingAuthorization> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Marketing");
  const decision = await resolveEffectiveTenantPermission(
    { userId: context.userId, tenant: context.tenant },
    "crm",
    ACTION_BY_OPERATION[operation],
  );
  if (!decision.allowed || decision.scope !== "global") {
    throw new Error(`tenant_marketing_${operation}_denied`);
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

export type MarketingConnectorRow = {
  id: string;
  tenant_id: string;
  channel_key: MarketingChannelKey;
  provider_account_reference: string | null;
  provider_form_reference: string | null;
  credential_reference: string | null;
  credential_version: number;
  credential_state: string;
  configuration_version: number;
  mapping_version: number;
  verification_state: string;
  availability_state: string;
  active: boolean;
  config: unknown;
  row_version: number;
  last_rotated_at: string | null;
  last_verified_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingConnectorView = {
  id: string;
  tenantId: string;
  channelKey: MarketingChannelKey;
  displayName: string;
  providerKey: string;
  operationMode: "HYBRID";
  providerAccountReference: string | null;
  providerFormReference: string | null;
  credentialReferenceConfigured: boolean;
  credentialVersion: number;
  credentialState: "not_required" | "credential_required" | "verification_pending" | "verified" | "rotation_required";
  configurationVersion: number;
  mappingVersion: number;
  verificationState: string;
  availabilityState: MarketingAvailabilityState;
  adapterAvailability: "automated_ready" | "adapter_not_implemented" | "manual_ready";
  active: boolean;
  config: MarketingConnectorConfig | null;
  rowVersion: number;
  lastRotatedAt: string | null;
  lastVerifiedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

function safeAvailability(value: string, fallback: MarketingAvailabilityState): MarketingAvailabilityState {
  return MARKETING_AVAILABILITY_STATES.includes(value as MarketingAvailabilityState)
    ? value as MarketingAvailabilityState
    : fallback;
}

export function sanitizeMarketingConnector(row: MarketingConnectorRow): MarketingConnectorView {
  if (!row.tenant_id || !row.id) throw new Error("tenant_marketing_connector_identity_required");
  const definition = getMarketingChannelDefinition(row.channel_key);
  let config: MarketingConnectorConfig | null = null;
  try {
    config = parseMarketingConnectorConfig(row.config);
    if (config.channelKey !== row.channel_key) throw new Error("tenant_marketing_config_channel_mismatch");
  } catch {
    config = null;
  }

  const credentialState = definition.credentialContract === "not_required"
    ? "not_required"
    : row.credential_state === "rotation_required"
      ? "rotation_required"
      : !row.credential_reference
        ? "credential_required"
        : row.verification_state === "verified"
          ? "verified"
          : "verification_pending";

  const adapterAvailability = definition.availabilityState === "adapter_not_implemented"
    ? "adapter_not_implemented"
    : definition.availabilityState === "manual_ready"
      ? "manual_ready"
      : "automated_ready";

  const fallback = config
    ? definition.availabilityState
    : definition.credentialContract === "reference_only_no_inline_secret" && !row.credential_reference
      ? "credential_required"
      : "mapping_required";

  return {
    id: row.id,
    tenantId: row.tenant_id,
    channelKey: row.channel_key,
    displayName: definition.displayName,
    providerKey: definition.providerKey,
    operationMode: "HYBRID",
    providerAccountReference: row.provider_account_reference,
    providerFormReference: row.provider_form_reference,
    credentialReferenceConfigured: Boolean(row.credential_reference),
    credentialVersion: Math.max(0, Number(row.credential_version ?? 0)),
    credentialState,
    configurationVersion: Math.max(1, Number(row.configuration_version ?? 1)),
    mappingVersion: Math.max(1, Number(row.mapping_version ?? 1)),
    verificationState: row.verification_state,
    availabilityState: safeAvailability(row.availability_state, fallback),
    adapterAvailability,
    active: row.active === true,
    config,
    rowVersion: Math.max(1, Number(row.row_version ?? 1)),
    lastRotatedAt: row.last_rotated_at,
    lastVerifiedAt: row.last_verified_at,
    lastErrorCode: row.last_error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const connectorSelect = [
  "id", "tenant_id", "channel_key", "provider_account_reference", "provider_form_reference",
  "credential_reference", "credential_version", "credential_state", "configuration_version",
  "mapping_version", "verification_state", "availability_state", "active", "config",
  "row_version", "last_rotated_at", "last_verified_at", "last_error_code", "created_at", "updated_at",
].join(", ");

export async function listTenantMarketingConnectorRows(tenantId: string): Promise<MarketingConnectorView[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_marketing_connectors")
    .select(connectorSelect)
    .eq("tenant_id", tenantId)
    .order("channel_key", { ascending: true });
  if (result.error) throw safeTenantMarketingError(result.error);
  return (result.data ?? []).map((row: MarketingConnectorRow) => {
    if (row.tenant_id !== tenantId) throw new Error("tenant_marketing_cross_tenant_connector");
    return sanitizeMarketingConnector(row);
  });
}

export async function loadTenantMarketingConnector(
  tenantId: string,
  connectorId: string,
): Promise<MarketingConnectorView> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_marketing_connectors")
    .select(connectorSelect)
    .eq("tenant_id", tenantId)
    .eq("id", connectorId)
    .maybeSingle();
  if (result.error) throw safeTenantMarketingError(result.error);
  if (!result.data) throw new Error("tenant_marketing_connector_not_found");
  if (result.data.tenant_id !== tenantId) throw new Error("tenant_marketing_cross_tenant_connector");
  return sanitizeMarketingConnector(result.data as MarketingConnectorRow);
}

export async function executeTenantMarketingRpc<T>(
  name:
    | "save_tenant_marketing_connector"
    | "publish_tenant_marketing_connector"
    | "set_tenant_marketing_credential_reference"
    | "save_tenant_marketing_mapping"
    | "create_tenant_marketing_manual_import"
    | "execute_tenant_marketing_manual_import"
    | "retry_tenant_marketing_ingestion",
  args: Record<string, unknown>,
): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any).rpc(name, args);
  if (result.error) throw safeTenantMarketingError(result.error);
  return result.data as T;
}

export function safeTenantMarketingError(error: unknown): Error {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  const known: Array<[string, string]> = [
    ["super_admin_requires_impersonation", "Super Admin precisa de impersonação explícita para operar marketing do tenant."],
    ["tenant_marketing_view_denied", "Acesso negado ao domínio de marketing."],
    ["tenant_marketing_configure_denied", "Permissão global necessária para configurar canais."],
    ["tenant_marketing_credential_denied", "Permissão global necessária para referências de credencial."],
    ["tenant_marketing_mapping_denied", "Permissão global necessária para mappings."],
    ["tenant_marketing_import_denied", "Permissão global necessária para importar leads."],
    ["tenant_marketing_connector_not_found", "Connector inexistente ou pertencente a outro tenant."],
    ["tenant_marketing_cross_tenant", "Referência cross-tenant negada."],
    ["marketing_channel_not_cataloged", "Canal de marketing não catalogado."],
    ["marketing_inline_secret_prohibited", "Secrets inline são proibidos; utilize somente referência de credencial."],
    ["marketing_adapter_not_implemented", "O adapter automatizado não está implementado."],
    ["marketing_mapping_required", "Mapping versionado obrigatório."],
    ["marketing_payload_idempotency_conflict", "Payload ID já utilizado com conteúdo diferente."],
    ["marketing_duplicate_detected", "Candidato duplicado detectado; revisão explícita obrigatória."],
    ["marketing_revision_conflict", "O recurso foi alterado; recarregue antes de continuar."],
    ["marketing_import", "A importação contém dados inválidos ou excede os limites."],
  ];
  for (const [token, safe] of known) {
    if (message.includes(token)) return new Error(safe);
  }
  return new Error("Falha segura no domínio de marketing.");
}
