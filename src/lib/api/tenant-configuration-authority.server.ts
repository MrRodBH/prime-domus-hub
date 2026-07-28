import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import { resolveEffectiveTenantPermission } from "@/lib/api/tenant-access-control-authority.server";
import {
  CONFIGURATION_MEDIA_KEYS,
  normalizeConfigurationSnapshot,
  publicConfigurationSnapshot,
  type ConfigurationSnapshot,
} from "@/lib/api/configuration-registry";

export type TrustedTenantConfigurationContext = {
  userId: string;
  tenant: TenantContext;
};

export type ConfigurationAuthorityAction = "visualizar" | "editar" | "publicar";

export type TenantConfigurationVersionDto = {
  id: string;
  tenantId: string;
  revision: number;
  basedOnRevision: number | null;
  status: "draft" | "published" | "archived";
  snapshot: ConfigurationSnapshot;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  publishedAt: string | null;
  contentHash: string | null;
};

export type TenantConfigurationState = {
  tenantId: string;
  published: TenantConfigurationVersionDto | null;
  draft: TenantConfigurationVersionDto | null;
  effectiveSnapshot: ConfigurationSnapshot;
  expectedRevision: number;
};

function trustedPermissionContext(context: TrustedTenantConfigurationContext) {
  return { userId: context.userId, tenant: context.tenant };
}

export async function authorizeTenantConfigurationOperation(
  context: TrustedTenantConfigurationContext,
  action: ConfigurationAuthorityAction,
): Promise<{ tenantId: string; source: string }> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Configuration");
  const moduleCode = action === "publicar" ? "cms.versoes" : "cms.configuracoes";
  const decision = await resolveEffectiveTenantPermission(
    trustedPermissionContext(context),
    moduleCode,
    action,
  );
  if (!decision.allowed || decision.scope !== "global") {
    throw new Error(`tenant_configuration_${action}_denied`);
  }
  return { tenantId, source: decision.source };
}

function parseVersionRow(row: any): TenantConfigurationVersionDto {
  const revision = Number(row.revision);
  if (!row.id || !row.tenant_id || !Number.isSafeInteger(revision) || revision < 1) {
    throw new Error("tenant_configuration_invalid_version_row");
  }
  if (row.status !== "draft" && row.status !== "published" && row.status !== "archived") {
    throw new Error("tenant_configuration_invalid_version_status");
  }
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    revision,
    basedOnRevision: row.based_on_revision == null ? null : Number(row.based_on_revision),
    status: row.status,
    snapshot: normalizeConfigurationSnapshot(row.value),
    notes: row.notes ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at as string,
    publishedAt: row.published_at ?? null,
    contentHash: row.content_hash ?? null,
  };
}

async function querySingleConfigurationVersion(
  tenantId: string,
  status: "draft" | "published",
): Promise<TenantConfigurationVersionDto | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("site_settings_versions")
    .select("id, tenant_id, revision, based_on_revision, status, value, notes, created_by, created_at, published_at, content_hash")
    .eq("tenant_id", tenantId)
    .eq("key", "configuration")
    .eq("status", status)
    .maybeSingle();
  if (error) throw safeTenantConfigurationError(error);
  return data ? parseVersionRow(data) : null;
}

export async function loadTenantConfigurationState(
  context: TrustedTenantConfigurationContext,
  action: ConfigurationAuthorityAction = "visualizar",
): Promise<TenantConfigurationState> {
  const { tenantId } = await authorizeTenantConfigurationOperation(context, action);
  const [published, draft] = await Promise.all([
    querySingleConfigurationVersion(tenantId, "published"),
    querySingleConfigurationVersion(tenantId, "draft"),
  ]);
  const effectiveSnapshot = draft?.snapshot ?? published?.snapshot ?? normalizeConfigurationSnapshot({});
  return {
    tenantId,
    published,
    draft,
    effectiveSnapshot,
    expectedRevision: published?.revision ?? 0,
  };
}

export async function loadPublishedConfigurationForTenant(tenantId: string) {
  if (!tenantId) throw new Error("tenant_configuration_tenant_required");
  const published = await querySingleConfigurationVersion(tenantId, "published");
  if (!published) throw new Error("tenant_configuration_published_missing");
  if (published.tenantId !== tenantId) throw new Error("tenant_configuration_cross_tenant_result");
  return {
    id: published.id,
    revision: published.revision,
    publishedAt: published.publishedAt,
    snapshot: published.snapshot,
    publicSnapshot: publicConfigurationSnapshot(published.snapshot),
  };
}

export async function assertConfigurationMediaReferences(
  tenantId: string,
  snapshotInput: unknown,
): Promise<void> {
  const snapshot = normalizeConfigurationSnapshot(snapshotInput);
  const ids = [...new Set(
    CONFIGURATION_MEDIA_KEYS
      .map((key) => snapshot[key])
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  )];
  if (ids.length === 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("media_library")
    .select("id, tenant_id")
    .eq("tenant_id", tenantId)
    .in("id", ids);
  if (error) throw new Error("tenant_configuration_media_validation_failed");
  const valid = new Set((data ?? []).map((row: any) => row.id as string));
  if (valid.size !== ids.length || ids.some((id) => !valid.has(id))) {
    throw new Error("tenant_configuration_media_cross_tenant_or_missing");
  }
}

export async function executeTenantConfigurationRpc<T>(
  name:
    | "save_tenant_configuration_draft"
    | "discard_tenant_configuration_draft"
    | "publish_tenant_configuration"
    | "rollback_tenant_configuration",
  args: Record<string, unknown>,
): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc(name, args);
  if (error) throw safeTenantConfigurationError(error);
  return data as T;
}

export function safeTenantConfigurationError(error: unknown): Error {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  const known: Array<[string, string]> = [
    ["tenant_configuration_visualizar_denied", "Acesso negado à configuração do tenant."],
    ["tenant_configuration_editar_denied", "O usuário não possui permissão global para editar a configuração."],
    ["tenant_configuration_publicar_denied", "O usuário não possui permissão global para publicar a configuração."],
    ["super_admin_requires_impersonation", "Super Admin precisa de impersonação explícita para operar a configuração do tenant."],
    ["configuration_revision_conflict", "A configuração foi alterada por outra operação. Recarregue antes de continuar."],
    ["configuration_draft_not_found", "Nenhum rascunho válido foi encontrado."],
    ["configuration_version_not_found", "A versão selecionada não pertence ao tenant."],
    ["configuration_key_not_cataloged", "A configuração contém uma chave não catalogada."],
    ["configuration_secret_key_prohibited", "A configuração não permite credenciais, tokens ou secrets inline."],
    ["configuration_media_cross_tenant_or_missing", "Uma referência de mídia não pertence ao tenant ou não existe."],
    ["configuration_snapshot_invalid", "O snapshot de configuração é inválido."],
    ["tenant_configuration_published_missing", "O tenant ainda não possui configuração publicada."],
  ];
  for (const [token, safe] of known) {
    if (message.includes(token)) return new Error(safe);
  }
  return new Error("Falha segura no Configuration Center.");
}
