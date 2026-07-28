import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import {
  CONFIGURATION_DOMAINS,
  CONFIGURATION_REGISTRY,
  normalizeConfigurationSnapshot,
  publicConfigurationSnapshot,
  validateConfigurationSnapshot,
  type ConfigurationSnapshot,
} from "@/lib/api/configuration-registry";
import {
  assertConfigurationMediaReferences,
  authorizeTenantConfigurationOperation,
  executeTenantConfigurationRpc,
  loadPublishedConfigurationForTenant,
  loadTenantConfigurationState,
  safeTenantConfigurationError,
  type TenantConfigurationVersionDto,
} from "@/lib/api/tenant-configuration-authority.server";

const snapshotSchema = z.record(z.string(), z.unknown());
const revisionSchema = z.number().int().nonnegative();
const trusted = (context: any) => ({ userId: context.userId as string, tenant: context.tenant });

export type ConfigurationStateDto = {
  tenantId: string;
  published: TenantConfigurationVersionDto | null;
  draft: TenantConfigurationVersionDto | null;
  snapshot: ConfigurationSnapshot;
  expectedRevision: number;
  status: "empty" | "published" | "draft";
};

function stateDto(state: Awaited<ReturnType<typeof loadTenantConfigurationState>>): ConfigurationStateDto {
  return {
    tenantId: state.tenantId,
    published: state.published,
    draft: state.draft,
    snapshot: state.effectiveSnapshot,
    expectedRevision: state.expectedRevision,
    status: state.draft ? "draft" : state.published ? "published" : "empty",
  };
}

export const getConfigurationRegistry = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorizeTenantConfigurationOperation(trusted(context), "visualizar");
    return {
      domains: [...CONFIGURATION_DOMAINS],
      definitions: CONFIGURATION_REGISTRY.map((definition) => ({
        ...definition,
        options: definition.options ? [...definition.options] : undefined,
        defaultValue: structuredClone(definition.defaultValue),
      })),
    };
  });

export const getPublishedTenantConfiguration = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const { tenantId } = await authorizeTenantConfigurationOperation(trusted(context), "visualizar");
    const published = await loadPublishedConfigurationForTenant(tenantId);
    return {
      id: published.id,
      revision: published.revision,
      publishedAt: published.publishedAt,
      snapshot: published.snapshot,
    };
  });

export const getPublishedPublicConfiguration = createServerFn({ method: "GET" })
  .handler(async () => {
    const tenant = await requirePublicTenantFromRequest();
    const published = await loadPublishedConfigurationForTenant(tenant.id);
    return {
      revision: published.revision,
      publishedAt: published.publishedAt,
      configuration: published.publicSnapshot,
    };
  });

export const getTenantConfigurationDraft = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => stateDto(await loadTenantConfigurationState(trusted(context), "visualizar")));

export const saveTenantConfigurationDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    snapshot: snapshotSchema,
    expectedRevision: revisionSchema,
    notes: z.string().trim().max(1000).optional().nullable(),
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantConfigurationOperation(trusted(context), "editar");
    const snapshot = normalizeConfigurationSnapshot(data.snapshot);
    await assertConfigurationMediaReferences(auth.tenantId, snapshot);
    const result = await executeTenantConfigurationRpc<{
      id: string;
      revision: number;
      based_on_revision: number;
      status: "draft";
      content_hash: string;
    }>("save_tenant_configuration_draft", {
      _actor_user_id: context.userId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _snapshot: snapshot,
      _expected_revision: data.expectedRevision,
      _notes: data.notes ?? null,
    });
    return {
      id: result.id,
      revision: Number(result.revision),
      basedOnRevision: Number(result.based_on_revision),
      status: result.status,
      contentHash: result.content_hash,
    };
  });

export const discardTenantConfigurationDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ expectedRevision: revisionSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantConfigurationOperation(trusted(context), "editar");
    return executeTenantConfigurationRpc<{ discarded: boolean }>("discard_tenant_configuration_draft", {
      _actor_user_id: context.userId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _expected_revision: data.expectedRevision,
    });
  });

export const validateTenantConfigurationDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ snapshot: snapshotSchema.optional() }).strict())
  .handler(async ({ context, data }) => {
    const state = await loadTenantConfigurationState(trusted(context), "visualizar");
    const validation = validateConfigurationSnapshot(data.snapshot ?? state.effectiveSnapshot);
    if (!validation.valid) return validation;
    try {
      await assertConfigurationMediaReferences(state.tenantId, validation.snapshot);
      return { valid: true as const, errors: [] as string[], snapshot: validation.snapshot };
    } catch (error) {
      return { valid: false as const, errors: [safeTenantConfigurationError(error).message] };
    }
  });

export const previewTenantConfiguration = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const state = await loadTenantConfigurationState(trusted(context), "visualizar");
    const validation = validateConfigurationSnapshot(state.effectiveSnapshot);
    if (!validation.valid) return { valid: false as const, errors: validation.errors, configuration: null };
    await assertConfigurationMediaReferences(state.tenantId, validation.snapshot);
    return {
      valid: true as const,
      errors: [] as string[],
      source: state.draft ? "draft" as const : state.published ? "published" as const : "defaults" as const,
      expectedRevision: state.expectedRevision,
      configuration: publicConfigurationSnapshot(validation.snapshot),
    };
  });

export const publishTenantConfiguration = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ expectedRevision: revisionSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantConfigurationOperation(trusted(context), "publicar");
    const state = await loadTenantConfigurationState(trusted(context), "visualizar");
    if (!state.draft) throw new Error("configuration_draft_not_found");
    await assertConfigurationMediaReferences(auth.tenantId, state.draft.snapshot);
    return executeTenantConfigurationRpc<{
      id: string;
      revision: number;
      status: "published";
      published_at: string;
      content_hash: string;
    }>("publish_tenant_configuration", {
      _actor_user_id: context.userId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _expected_revision: data.expectedRevision,
    });
  });

export const listTenantConfigurationVersions = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<TenantConfigurationVersionDto[]> => {
    const { tenantId } = await authorizeTenantConfigurationOperation(trusted(context), "visualizar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("site_settings_versions")
      .select("id, tenant_id, revision, based_on_revision, status, value, notes, created_by, created_at, published_at, content_hash")
      .eq("tenant_id", tenantId)
      .eq("key", "configuration")
      .in("status", ["published", "archived"])
      .order("revision", { ascending: false });
    if (error) throw safeTenantConfigurationError(error);
    return (data ?? []).map((row: any) => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      revision: Number(row.revision),
      basedOnRevision: row.based_on_revision == null ? null : Number(row.based_on_revision),
      status: row.status as "published" | "archived",
      snapshot: normalizeConfigurationSnapshot(row.value),
      notes: row.notes ?? null,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at as string,
      publishedAt: row.published_at ?? null,
      contentHash: row.content_hash ?? null,
    }));
  });

export const getTenantConfigurationVersion = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: z.string().uuid() }).strict())
  .handler(async ({ context, data }) => {
    const { tenantId } = await authorizeTenantConfigurationOperation(trusted(context), "visualizar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("site_settings_versions")
      .select("id, tenant_id, revision, based_on_revision, status, value, notes, created_by, created_at, published_at, content_hash")
      .eq("tenant_id", tenantId)
      .eq("key", "configuration")
      .eq("id", data.id)
      .maybeSingle();
    if (result.error) throw safeTenantConfigurationError(result.error);
    if (!result.data) throw new Error("configuration_version_not_found");
    return {
      id: result.data.id as string,
      tenantId: result.data.tenant_id as string,
      revision: Number(result.data.revision),
      basedOnRevision: result.data.based_on_revision == null ? null : Number(result.data.based_on_revision),
      status: result.data.status as "draft" | "published" | "archived",
      snapshot: normalizeConfigurationSnapshot(result.data.value),
      notes: result.data.notes ?? null,
      createdBy: result.data.created_by ?? null,
      createdAt: result.data.created_at as string,
      publishedAt: result.data.published_at ?? null,
      contentHash: result.data.content_hash ?? null,
    };
  });

export const rollbackTenantConfiguration = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    versionId: z.string().uuid(),
    expectedRevision: revisionSchema,
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantConfigurationOperation(trusted(context), "publicar");
    return executeTenantConfigurationRpc<{
      id: string;
      revision: number;
      based_on_revision: number;
      status: "draft";
      rollback_source_revision: number;
    }>("rollback_tenant_configuration", {
      _actor_user_id: context.userId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _source_version_id: data.versionId,
      _expected_revision: data.expectedRevision,
    });
  });

export const getTenantConfigurationDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const state = await loadTenantConfigurationState(trusted(context), "visualizar");
    const validation = validateConfigurationSnapshot(state.effectiveSnapshot);
    const errors = validation.valid ? [] : validation.errors;
    if (validation.valid) {
      try {
        await assertConfigurationMediaReferences(state.tenantId, validation.snapshot);
      } catch (error) {
        errors.push(safeTenantConfigurationError(error).message);
      }
    }
    return {
      tenantId: state.tenantId,
      registryKeyCount: CONFIGURATION_REGISTRY.length,
      draftPresent: !!state.draft,
      publishedPresent: !!state.published,
      publishedRevision: state.published?.revision ?? 0,
      draftBasedOnRevision: state.draft?.basedOnRevision ?? null,
      valid: errors.length === 0,
      errors,
      secretsAccepted: false,
      clientTenantAuthority: false,
      clientStoragePathAuthority: false,
      domainActivation: "pending_DCA01" as const,
      cloudflareMode: "HYBRID_pending_DCA01" as const,
      billingActivation: "pending_BCA01" as const,
      finalVisualRefinement: "pending_PRM3" as const,
    };
  });
