import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  campaignSnapshotSchema,
  formSnapshotSchema,
  getCmsRegistrySnapshot,
  pageSnapshotInputSchema,
  validateCmsPageSnapshot,
  type CmsCampaignSnapshot,
  type CmsFormSnapshot,
  type CmsPageSnapshot,
} from "@/lib/cms/cms-registry";
import {
  authorizeTenantCampaignOperation,
  authorizeTenantFormOperation,
  authorizeTenantPageOperation,
  authorizeTenantTemplateOperation,
  safeTenantCmsError,
} from "@/lib/api/tenant-cms-authority.server";

const uuidSchema = z.string().uuid();
const revisionSchema = z.number().int().nonnegative();
const trusted = (context: any) => ({ userId: context.userId as string, tenant: context.tenant });

function toJson(value: unknown): Json {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("cms_non_serializable_value");
  return JSON.parse(serialized) as Json;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`cms_invalid_rpc_response:${label}`);
  }
  return value as Record<string, unknown>;
}

async function executeCmsRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc(name, args);
  if (error) throw safeTenantCmsError(error);
  return data as T;
}

async function fetchExactlyOne(
  table: string,
  tenantId: string,
  id: string,
  select = "*",
): Promise<Record<string, unknown>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from(table)
    .select(select)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .limit(2);
  if (error) throw safeTenantCmsError(error);
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error(data?.length === 0 ? "cms_cross_tenant_reference" : "cms_ambiguous_state");
  }
  return data[0] as Record<string, unknown>;
}

async function assertExactTenantReferenceSet(
  table: string,
  tenantId: string,
  ids: readonly string[],
): Promise<void> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from(table)
    .select("id")
    .eq("tenant_id", tenantId)
    .in("id", uniqueIds);
  if (error) throw safeTenantCmsError(error);
  const accepted = new Set((data ?? []).map((row: { id: string }) => row.id));
  if (accepted.size !== uniqueIds.length || uniqueIds.some((id) => !accepted.has(id))) {
    throw new Error("cms_cross_tenant_reference");
  }
}

async function assertPageReferences(tenantId: string, snapshot: CmsPageSnapshot): Promise<void> {
  await Promise.all([
    assertExactTenantReferenceSet("media_library", tenantId, snapshot.media_references),
    assertExactTenantReferenceSet("cms_forms", tenantId, snapshot.form_references),
    assertExactTenantReferenceSet("cms_campaigns", tenantId, snapshot.campaign_references),
  ]);
}

async function assertCampaignReferences(tenantId: string, snapshot: CmsCampaignSnapshot): Promise<void> {
  await assertExactTenantReferenceSet("cms_pages", tenantId, snapshot.target_page_ids);
  const mediaId = snapshot.conteudo.media_id;
  if (mediaId) await assertExactTenantReferenceSet("media_library", tenantId, [mediaId]);
}

function normalizePageSnapshot(input: unknown): CmsPageSnapshot {
  const result = validateCmsPageSnapshot(input);
  if (!result.valid) {
    throw new Error(`cms_page_validation_failed:${result.issues.map((entry) => `${entry.path}:${entry.code}`).join("|")}`);
  }
  return result.value;
}

function normalizeFormSnapshot(input: unknown): CmsFormSnapshot {
  const parsed = formSnapshotSchema.safeParse(input);
  if (!parsed.success) throw new Error(`cms_form_validation_failed:${parsed.error.message}`);
  const names = new Set<string>();
  const orders = new Set<number>();
  for (const field of parsed.data.fields) {
    if (names.has(field.nome)) throw new Error("cms_form_duplicate_field_name");
    if (orders.has(field.ordem)) throw new Error("cms_form_duplicate_field_order");
    names.add(field.nome);
    orders.add(field.ordem);
  }
  if (parsed.data.config.consent_required && !parsed.data.fields.some((field) => field.consentimento)) {
    throw new Error("cms_form_consent_field_required");
  }
  return parsed.data;
}

function normalizeCampaignSnapshot(input: unknown): CmsCampaignSnapshot {
  const parsed = campaignSnapshotSchema.safeParse(input);
  if (!parsed.success) throw new Error(`cms_campaign_validation_failed:${parsed.error.message}`);
  return parsed.data;
}

export type CmsVersionDto = {
  id: string;
  revision: number;
  status: "draft" | "published" | "archived";
  schemaVersion: number;
  snapshot: Record<string, unknown>;
  contentHash: string;
  basedOnRevision: number | null;
  sourceVersionId: string | null;
  createdBy: string | null;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
};

function versionDto(row: Record<string, any>): CmsVersionDto {
  return {
    id: row.id as string,
    revision: Number(row.revision),
    status: row.status as CmsVersionDto["status"],
    schemaVersion: Number(row.schema_version),
    snapshot: asRecord(row.snapshot, "version_snapshot"),
    contentHash: row.content_hash as string,
    basedOnRevision: row.based_on_revision == null ? null : Number(row.based_on_revision),
    sourceVersionId: row.source_version_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at as string,
    publishedAt: row.published_at ?? null,
    archivedAt: row.archived_at ?? null,
  };
}

async function loadVersionById(
  table: string,
  tenantId: string,
  resourceColumn: string,
  resourceId: string,
  versionId: string,
): Promise<CmsVersionDto> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from(table)
    .select("id, revision, status, schema_version, snapshot, content_hash, based_on_revision, source_version_id, created_by, created_at, published_at, archived_at")
    .eq("tenant_id", tenantId)
    .eq(resourceColumn, resourceId)
    .eq("id", versionId)
    .limit(2);
  if (error) throw safeTenantCmsError(error);
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error(data?.length === 0 ? "cms_version_not_found" : "cms_ambiguous_state");
  }
  return versionDto(data[0]);
}

async function listVersions(
  table: string,
  tenantId: string,
  resourceColumn: string,
  resourceId: string,
): Promise<CmsVersionDto[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from(table)
    .select("id, revision, status, schema_version, snapshot, content_hash, based_on_revision, source_version_id, created_by, created_at, published_at, archived_at")
    .eq("tenant_id", tenantId)
    .eq(resourceColumn, resourceId)
    .order("revision", { ascending: false });
  if (error) throw safeTenantCmsError(error);
  return (data ?? []).map(versionDto);
}

// ---------------------------------------------------------------------------
// Registry and diagnostics
// ---------------------------------------------------------------------------

export const getCmsRegistry = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorizeTenantPageOperation(trusted(context), "read");
    return toJson(getCmsRegistrySnapshot());
  });

export const getPageTypeRegistry = getCmsRegistry;
export const getSectionTypeRegistry = getCmsRegistry;
export const getLayoutTypeRegistry = getCmsRegistry;
export const getTemplateRegistry = getCmsRegistry;
export const getEditorControlRegistry = getCmsRegistry;

export const getTenantCmsDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "diagnostics");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = [
      "cms_pages",
      "cms_page_versions",
      "cms_templates",
      "cms_template_versions",
      "cms_forms",
      "cms_form_versions",
      "cms_campaigns",
      "cms_campaign_versions",
    ] as const;
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const { count, error } = await (supabaseAdmin as any)
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", auth.tenantId);
      if (error) throw safeTenantCmsError(error);
      counts[table] = count ?? 0;
    }
    return {
      tenantId: auth.tenantId,
      authority: "server_only" as const,
      impersonationRequiredForSuperAdmin: true,
      registrySchemaVersion: getCmsRegistrySnapshot().schemaVersion,
      counts,
      publicAuthority: "host_derived_published_pointer" as const,
      directClientMutation: false,
      runtimeUserCode: false,
    };
  });

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export const listTenantPages = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "list");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("cms_pages")
      .select("id, slug, titulo, descricao, status, page_type, layout_type, schema_version, revision, draft_version_id, published_version_id, published_at, unpublished_at, updated_at")
      .eq("tenant_id", auth.tenantId)
      .order("updated_at", { ascending: false });
    if (error) throw safeTenantCmsError(error);
    return (data ?? []).map((row: Record<string, any>) => ({
      id: row.id as string,
      slug: row.slug as string,
      title: row.titulo as string,
      description: row.descricao ?? null,
      status: row.status as string,
      pageType: row.page_type as string,
      layoutType: row.layout_type as string,
      schemaVersion: Number(row.schema_version),
      revision: Number(row.revision),
      draftVersionId: row.draft_version_id ?? null,
      publishedVersionId: row.published_version_id ?? null,
      publishedAt: row.published_at ?? null,
      unpublishedAt: row.unpublished_at ?? null,
      updatedAt: row.updated_at as string,
    }));
  });

export const getTenantPage = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "read");
    const page = await fetchExactlyOne(
      "cms_pages",
      auth.tenantId,
      data.id,
      "id, slug, titulo, descricao, status, page_type, layout_type, schema_version, revision, draft_version_id, published_version_id, published_at, unpublished_at, updated_at",
    );
    const [draft, published] = await Promise.all([
      typeof page.draft_version_id === "string"
        ? loadVersionById("cms_page_versions", auth.tenantId, "page_id", data.id, page.draft_version_id)
        : null,
      typeof page.published_version_id === "string"
        ? loadVersionById("cms_page_versions", auth.tenantId, "page_id", data.id, page.published_version_id)
        : null,
    ]);
    return {
      id: page.id as string,
      slug: page.slug as string,
      title: page.titulo as string,
      description: page.descricao ?? null,
      status: page.status as string,
      pageType: page.page_type as string,
      layoutType: page.layout_type as string,
      schemaVersion: Number(page.schema_version),
      revision: Number(page.revision),
      draft,
      published,
      effectiveSnapshot: draft?.snapshot ?? published?.snapshot ?? null,
      publishedAt: page.published_at ?? null,
      unpublishedAt: page.unpublished_at ?? null,
      updatedAt: page.updated_at as string,
    };
  });

const pageDraftSchema = z
  .object({
    id: uuidSchema.optional(),
    expectedRevision: revisionSchema,
    snapshot: pageSnapshotInputSchema,
  })
  .strict();

async function savePageDraftHandler(context: any, data: z.infer<typeof pageDraftSchema>) {
  const auth = await authorizeTenantPageOperation(
    trusted(context),
    data.id ? "save_draft" : "create_draft",
  );
  const snapshot = normalizePageSnapshot({
    ...data.snapshot,
    ...(data.id ? { page_id: data.id } : {}),
  });
  await assertPageReferences(auth.tenantId, snapshot);
  const result = await executeCmsRpc<Record<string, unknown>>("save_tenant_page_draft", {
    _tenant_id: auth.tenantId,
    _actor_user_id: auth.actorUserId,
    _page_id: data.id ?? null,
    _expected_revision: data.expectedRevision,
    _snapshot: toJson(snapshot),
  });
  return asRecord(result, "save_tenant_page_draft");
}

export const createTenantPageDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(pageDraftSchema)
  .handler(async ({ context, data }) => savePageDraftHandler(context, data));

export const saveTenantPageDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(pageDraftSchema)
  .handler(async ({ context, data }) => savePageDraftHandler(context, data));

export const validateTenantPageDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(
    z
      .object({
        pageId: uuidSchema.optional(),
        snapshot: pageSnapshotInputSchema.optional(),
      })
      .strict()
      .refine((value) => Boolean(value.pageId || value.snapshot), "cms_page_or_snapshot_required"),
  )
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "validate");
    let candidate: unknown = data.snapshot;
    if (!candidate && data.pageId) {
      const page = await fetchExactlyOne("cms_pages", auth.tenantId, data.pageId, "id, draft_version_id");
      if (typeof page.draft_version_id !== "string") throw new Error("cms_page_draft_not_found");
      candidate = (await loadVersionById("cms_page_versions", auth.tenantId, "page_id", data.pageId, page.draft_version_id)).snapshot;
    }
    const result = validateCmsPageSnapshot(candidate);
    if (!result.valid) return { valid: false as const, issues: result.issues, snapshot: null };
    try {
      await assertPageReferences(auth.tenantId, result.value);
      return { valid: true as const, issues: [] as const, snapshot: result.value };
    } catch (error) {
      return {
        valid: false as const,
        issues: [{ code: "cms_reference_invalid", path: "references", message: safeTenantCmsError(error).message }],
        snapshot: null,
      };
    }
  });

export const previewTenantPage = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ pageId: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "preview");
    const page = await fetchExactlyOne("cms_pages", auth.tenantId, data.pageId, "id, revision, draft_version_id, published_version_id");
    const versionId = (page.draft_version_id ?? page.published_version_id) as string | null;
    if (!versionId) throw new Error("cms_page_version_not_found");
    const version = await loadVersionById("cms_page_versions", auth.tenantId, "page_id", data.pageId, versionId);
    const validation = validateCmsPageSnapshot(version.snapshot);
    if (!validation.valid && version.schemaVersion !== 0) {
      return { valid: false as const, issues: validation.issues, source: null, snapshot: null };
    }
    return {
      valid: true as const,
      issues: [] as const,
      source: page.draft_version_id ? "draft" as const : "published" as const,
      revision: Number(page.revision),
      versionId,
      snapshot: version.snapshot,
      legacySnapshot: version.schemaVersion === 0,
    };
  });

export const publishTenantPage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ pageId: uuidSchema, expectedRevision: revisionSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "publish");
    const page = await fetchExactlyOne("cms_pages", auth.tenantId, data.pageId, "id, revision, draft_version_id");
    if (Number(page.revision) !== data.expectedRevision) throw new Error("cms_page_revision_conflict");
    if (typeof page.draft_version_id !== "string") throw new Error("cms_page_draft_not_found");
    const draft = await loadVersionById("cms_page_versions", auth.tenantId, "page_id", data.pageId, page.draft_version_id);
    const snapshot = normalizePageSnapshot(draft.snapshot);
    await assertPageReferences(auth.tenantId, snapshot);
    return executeCmsRpc<Record<string, unknown>>("publish_tenant_page", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _page_id: data.pageId,
      _expected_revision: data.expectedRevision,
    });
  });

export const unpublishTenantPage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ pageId: uuidSchema, expectedRevision: revisionSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "unpublish");
    return executeCmsRpc<Record<string, unknown>>("unpublish_tenant_page", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _page_id: data.pageId,
      _expected_revision: data.expectedRevision,
    });
  });

export const listTenantPageVersions = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ pageId: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "list_versions");
    await fetchExactlyOne("cms_pages", auth.tenantId, data.pageId, "id");
    return listVersions("cms_page_versions", auth.tenantId, "page_id", data.pageId);
  });

export const getTenantPageVersion = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ pageId: uuidSchema, versionId: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "read_version");
    return loadVersionById("cms_page_versions", auth.tenantId, "page_id", data.pageId, data.versionId);
  });

export const rollbackTenantPage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(
    z.object({ pageId: uuidSchema, versionId: uuidSchema, expectedRevision: revisionSchema }).strict(),
  )
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantPageOperation(trusted(context), "rollback");
    await loadVersionById("cms_page_versions", auth.tenantId, "page_id", data.pageId, data.versionId);
    return executeCmsRpc<Record<string, unknown>>("rollback_tenant_page", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _page_id: data.pageId,
      _source_version_id: data.versionId,
      _expected_revision: data.expectedRevision,
    });
  });

// ---------------------------------------------------------------------------
// Tenant templates
// ---------------------------------------------------------------------------

export const listTenantTemplates = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantTemplateOperation(trusted(context), "list");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("cms_templates")
      .select("id, template_key, name, page_type, layout_type, schema_version, revision, current_version_id, created_at, updated_at")
      .eq("tenant_id", auth.tenantId)
      .order("template_key", { ascending: true });
    if (error) throw safeTenantCmsError(error);
    return {
      system: Object.values(getCmsRegistrySnapshot().templates),
      tenant: data ?? [],
    };
  });

export const getTenantTemplate = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTemplateOperation(trusted(context), "read");
    const template = await fetchExactlyOne("cms_templates", auth.tenantId, data.id);
    const versionId = template.current_version_id;
    if (typeof versionId !== "string") throw new Error("cms_template_not_found");
    const version = await fetchExactlyOne("cms_template_versions", auth.tenantId, versionId);
    if (version.template_id !== data.id) throw new Error("cms_cross_tenant_reference");
    return { template, version };
  });

export const createTenantTemplateVersion = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(
    z.object({
      templateId: uuidSchema.optional(),
      templateKey: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(200),
      expectedRevision: revisionSchema,
      snapshot: pageSnapshotInputSchema,
    }).strict(),
  )
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTemplateOperation(trusted(context), "save_draft");
    const snapshot = normalizePageSnapshot(data.snapshot);
    await assertPageReferences(auth.tenantId, snapshot);
    return executeCmsRpc<Record<string, unknown>>("save_tenant_template_version", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _template_id: data.templateId ?? null,
      _template_key: data.templateKey,
      _name: data.name,
      _expected_revision: data.expectedRevision,
      _snapshot: toJson(snapshot),
    });
  });

export const instantiateTenantTemplate = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(
    z.object({
      templateId: uuidSchema,
      templateVersionId: uuidSchema,
      slug: z.string().min(1).max(180).regex(/^[a-z0-9-]+$/),
      title: z.string().min(1).max(300),
    }).strict(),
  )
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTemplateOperation(trusted(context), "create_draft");
    const template = await fetchExactlyOne("cms_templates", auth.tenantId, data.templateId, "id");
    const version = await fetchExactlyOne("cms_template_versions", auth.tenantId, data.templateVersionId, "id, template_id");
    if (version.template_id !== template.id) throw new Error("cms_cross_tenant_reference");
    return executeCmsRpc<Record<string, unknown>>("instantiate_tenant_template", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _template_id: data.templateId,
      _template_version_id: data.templateVersionId,
      _slug: data.slug,
      _title: data.title,
    });
  });

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export const listTenantForms = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantFormOperation(trusted(context), "list");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("cms_forms")
      .select("id, nome, slug, status, schema_version, revision, draft_version_id, published_version_id, published_at, unpublished_at, created_at, updated_at")
      .eq("tenant_id", auth.tenantId)
      .order("updated_at", { ascending: false });
    if (error) throw safeTenantCmsError(error);
    return data ?? [];
  });

export const getTenantForm = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantFormOperation(trusted(context), "read");
    const form = await fetchExactlyOne("cms_forms", auth.tenantId, data.id);
    const [draft, published] = await Promise.all([
      typeof form.draft_version_id === "string"
        ? loadVersionById("cms_form_versions", auth.tenantId, "form_id", data.id, form.draft_version_id)
        : null,
      typeof form.published_version_id === "string"
        ? loadVersionById("cms_form_versions", auth.tenantId, "form_id", data.id, form.published_version_id)
        : null,
    ]);
    return { form, draft, published, effectiveSnapshot: draft?.snapshot ?? published?.snapshot ?? null };
  });

export const saveTenantFormDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(
    z.object({ id: uuidSchema.optional(), expectedRevision: revisionSchema, snapshot: formSnapshotSchema }).strict(),
  )
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantFormOperation(trusted(context), data.id ? "save_draft" : "create_draft");
    const snapshot = normalizeFormSnapshot({ ...data.snapshot, ...(data.id ? { form_id: data.id } : {}) });
    return executeCmsRpc<Record<string, unknown>>("save_tenant_form_definition", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _form_id: data.id ?? null,
      _expected_revision: data.expectedRevision,
      _snapshot: toJson(snapshot),
    });
  });

export const validateTenantForm = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ snapshot: formSnapshotSchema }).strict())
  .handler(async ({ context, data }) => {
    await authorizeTenantFormOperation(trusted(context), "validate");
    try {
      const snapshot = normalizeFormSnapshot(data.snapshot);
      return { valid: true as const, errors: [] as string[], snapshot };
    } catch (error) {
      return { valid: false as const, errors: [safeTenantCmsError(error).message], snapshot: null };
    }
  });

export const publishTenantForm = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ formId: uuidSchema, expectedRevision: revisionSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantFormOperation(trusted(context), "publish");
    const form = await fetchExactlyOne("cms_forms", auth.tenantId, data.formId, "id, revision, draft_version_id");
    if (Number(form.revision) !== data.expectedRevision) throw new Error("cms_form_revision_conflict");
    if (typeof form.draft_version_id !== "string") throw new Error("cms_form_draft_not_found");
    const draft = await loadVersionById("cms_form_versions", auth.tenantId, "form_id", data.formId, form.draft_version_id);
    normalizeFormSnapshot(draft.snapshot);
    return executeCmsRpc<Record<string, unknown>>("publish_tenant_form", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _form_id: data.formId,
      _expected_revision: data.expectedRevision,
    });
  });

export const listTenantFormVersions = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ formId: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantFormOperation(trusted(context), "list_versions");
    await fetchExactlyOne("cms_forms", auth.tenantId, data.formId, "id");
    return listVersions("cms_form_versions", auth.tenantId, "form_id", data.formId);
  });

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export const listTenantCampaigns = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantCampaignOperation(trusted(context), "list");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("cms_campaigns")
      .select("id, nome, tipo, status, prioridade, schema_version, revision, draft_version_id, published_version_id, published_at, unpublished_at, start_at, end_at, created_at, updated_at")
      .eq("tenant_id", auth.tenantId)
      .order("updated_at", { ascending: false });
    if (error) throw safeTenantCmsError(error);
    return data ?? [];
  });

export const getTenantCampaign = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCampaignOperation(trusted(context), "read");
    const campaign = await fetchExactlyOne("cms_campaigns", auth.tenantId, data.id);
    const [draft, published] = await Promise.all([
      typeof campaign.draft_version_id === "string"
        ? loadVersionById("cms_campaign_versions", auth.tenantId, "campaign_id", data.id, campaign.draft_version_id)
        : null,
      typeof campaign.published_version_id === "string"
        ? loadVersionById("cms_campaign_versions", auth.tenantId, "campaign_id", data.id, campaign.published_version_id)
        : null,
    ]);
    return { campaign, draft, published, effectiveSnapshot: draft?.snapshot ?? published?.snapshot ?? null };
  });

export const saveTenantCampaignDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(
    z.object({ id: uuidSchema.optional(), expectedRevision: revisionSchema, snapshot: campaignSnapshotSchema }).strict(),
  )
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCampaignOperation(trusted(context), data.id ? "save_draft" : "create_draft");
    const snapshot = normalizeCampaignSnapshot({ ...data.snapshot, ...(data.id ? { campaign_id: data.id } : {}) });
    await assertCampaignReferences(auth.tenantId, snapshot);
    return executeCmsRpc<Record<string, unknown>>("save_tenant_campaign_definition", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _campaign_id: data.id ?? null,
      _expected_revision: data.expectedRevision,
      _snapshot: toJson(snapshot),
    });
  });

export const validateTenantCampaign = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ snapshot: campaignSnapshotSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCampaignOperation(trusted(context), "validate");
    try {
      const snapshot = normalizeCampaignSnapshot(data.snapshot);
      await assertCampaignReferences(auth.tenantId, snapshot);
      return { valid: true as const, errors: [] as string[], snapshot };
    } catch (error) {
      return { valid: false as const, errors: [safeTenantCmsError(error).message], snapshot: null };
    }
  });

export const publishTenantCampaign = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ campaignId: uuidSchema, expectedRevision: revisionSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCampaignOperation(trusted(context), "publish");
    const campaign = await fetchExactlyOne("cms_campaigns", auth.tenantId, data.campaignId, "id, revision, draft_version_id");
    if (Number(campaign.revision) !== data.expectedRevision) throw new Error("cms_campaign_revision_conflict");
    if (typeof campaign.draft_version_id !== "string") throw new Error("cms_campaign_draft_not_found");
    const draft = await loadVersionById("cms_campaign_versions", auth.tenantId, "campaign_id", data.campaignId, campaign.draft_version_id);
    const snapshot = normalizeCampaignSnapshot(draft.snapshot);
    await assertCampaignReferences(auth.tenantId, snapshot);
    return executeCmsRpc<Record<string, unknown>>("publish_tenant_campaign", {
      _tenant_id: auth.tenantId,
      _actor_user_id: auth.actorUserId,
      _campaign_id: data.campaignId,
      _expected_revision: data.expectedRevision,
    });
  });

export const listTenantCampaignVersions = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ campaignId: uuidSchema }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCampaignOperation(trusted(context), "list_versions");
    await fetchExactlyOne("cms_campaigns", auth.tenantId, data.campaignId, "id");
    return listVersions("cms_campaign_versions", auth.tenantId, "campaign_id", data.campaignId);
  });
