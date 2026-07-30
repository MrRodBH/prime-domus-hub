import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCmsOperation,
  trustedTenantCmsContext,
  safeTenantCmsError,
} from "@/lib/api/tenant-cms-authority.server";
import {
  CMS_FUNCTIONAL_COMPONENT_KEYS,
  CMS_FUNCTIONAL_COMPONENT_REGISTRY,
  CMS_FUNCTIONAL_COMPONENT_SCHEMAS,
  CMS_FUNCTIONAL_EXTENSION_CONTRACT,
  type CmsFunctionalComponentKey,
} from "@/lib/cms/cms-functional-inventory";

const uuid = z.string().uuid();
const trusted = (context: any) => trustedTenantCmsContext(context);
async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const getTenantCmsFunctionalInventory = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorizeTenantCmsOperation(trusted(context), "read", "cms.paginas");
    return {
      ...CMS_FUNCTIONAL_EXTENSION_CONTRACT,
      componentKeys: [...CMS_FUNCTIONAL_COMPONENT_KEYS],
      components: CMS_FUNCTIONAL_COMPONENT_KEYS.map((key) => CMS_FUNCTIONAL_COMPONENT_REGISTRY[key]),
    };
  });

export const validateTenantCmsFunctionalComponent = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ key: z.enum(CMS_FUNCTIONAL_COMPONENT_KEYS), value: z.unknown() }).strict().parse(input))
  .handler(async ({ context, data }) => {
    const definition = CMS_FUNCTIONAL_COMPONENT_REGISTRY[data.key];
    await authorizeTenantCmsOperation(trusted(context), "edit", definition.permissionContract.module);
    const parsed = CMS_FUNCTIONAL_COMPONENT_SCHEMAS[data.key].parse(data.value);
    await validateReferences(context, data.key, parsed);
    return { valid: true, key: data.key, schemaVersion: definition.schemaVersion, value: parsed };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validateReferences(context: any, key: CmsFunctionalComponentKey, value: any) {
  const tenantId = context.tenant.tenantId as string;
  const admin = await adminClient();
  const checks: Array<{ table: string; ids: string[] }> = [];
  if (key === "property_listing") checks.push({ table: "imoveis", ids: value.propertyIds });
  if (key === "launch_listing") checks.push({ table: "launch_projects", ids: value.launchIds });
  if (key === "team_listing") checks.push({ table: "corretores", ids: value.brokerIds });
  if (key === "testimonials") checks.push({ table: "cms_testimonials", ids: value.itemIds });
  if (key === "reusable_block") checks.push({ table: "cms_reusable_blocks", ids: [value.blockId] });
  if (key === "cards") checks.push({ table: "media_library", ids: value.cards.map((card: any) => card.mediaId).filter(Boolean) });
  for (const check of checks) {
    const ids = [...new Set(check.ids)];
    if (ids.length === 0) continue;
    const { data, error } = await admin.from(check.table).select("id").eq("tenant_id", tenantId).in("id", ids);
    if (error || (data ?? []).length !== ids.length) throw new Error("cms_functional_cross_tenant_reference");
  }
}

const testimonialSchema = z.object({
  id: uuid.optional(),
  authorName: z.string().trim().min(1).max(200),
  authorRole: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().min(1).max(4000),
  mediaId: uuid.optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  active: z.boolean().default(true),
  expectedVersion: z.number().int().positive().optional(),
}).strict();

export const listTenantCmsTestimonials = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantCmsOperation(trusted(context), "read", "cms.paginas");
    const admin = await adminClient();
    const { data, error } = await admin.from("cms_testimonials").select("*").eq("tenant_id", auth.tenantId).order("updated_at", { ascending: false });
    if (error) throw safeTenantCmsError(error);
    return data ?? [];
  });

export const saveTenantCmsTestimonial = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => testimonialSchema.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCmsOperation(trusted(context), "edit", "cms.paginas");
    const admin = await adminClient();
    if (data.mediaId) {
      const { data: media, error } = await admin.from("media_library").select("id").eq("tenant_id", auth.tenantId).eq("id", data.mediaId).limit(2);
      if (error || (media ?? []).length !== 1) throw new Error("cms_functional_cross_tenant_reference");
    }
    const payload = { author_name: data.authorName, author_role: data.authorRole ?? null, content: data.content, media_id: data.mediaId ?? null, rating: data.rating ?? null, active: data.active, updated_at: new Date().toISOString() };
    if (data.id) {
      const { data: rows, error } = await admin.from("cms_testimonials").select("row_version").eq("tenant_id", auth.tenantId).eq("id", data.id).limit(2);
      if (error || (rows ?? []).length !== 1) throw new Error("cms_testimonial_not_found");
      if (data.expectedVersion !== undefined && Number(rows[0].row_version) !== data.expectedVersion) throw new Error("cms_version_conflict");
      const { data: row, error: updateError } = await admin.from("cms_testimonials").update({ ...payload, row_version: Number(rows[0].row_version) + 1 }).eq("tenant_id", auth.tenantId).eq("id", data.id).eq("row_version", rows[0].row_version).select("id, row_version").maybeSingle();
      if (updateError || !row) throw new Error("cms_version_conflict");
      return row;
    }
    const { data: row, error } = await admin.from("cms_testimonials").insert({ tenant_id: auth.tenantId, created_by: auth.actorUserId, ...payload }).select("id, row_version").single();
    if (error) throw safeTenantCmsError(error);
    return row;
  });

const reusableBlockSchema = z.object({
  blockKey: z.string().regex(/^[a-z][a-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(200),
  revision: z.number().int().positive(),
  status: z.enum(["draft", "published", "archived"]),
  content: z.record(z.string(), z.unknown()),
}).strict();

export const listTenantCmsReusableBlocks = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantCmsOperation(trusted(context), "read", "cms.paginas");
    const admin = await adminClient();
    const { data, error } = await admin.from("cms_reusable_blocks").select("id, block_key, name, revision, status, schema_version, content_hash, created_at, updated_at").eq("tenant_id", auth.tenantId).order("block_key").order("revision", { ascending: false });
    if (error) throw safeTenantCmsError(error);
    return data ?? [];
  });

export const saveTenantCmsReusableBlock = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => reusableBlockSchema.parse(input))
  .handler(async ({ context, data }) => {
    const operation = data.status === "published" ? "publish" : "edit";
    const auth = await authorizeTenantCmsOperation(trusted(context), operation, "cms.paginas");
    const content = JSON.stringify(data.content);
    if (content.length > 1_000_000 || /<script|javascript:|eval\(|new function/i.test(content)) throw new Error("cms_runtime_code_prohibited");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
    const contentHash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
    const admin = await adminClient();
    const { data: row, error } = await admin.from("cms_reusable_blocks").insert({
      tenant_id: auth.tenantId,
      block_key: data.blockKey,
      name: data.name,
      schema_version: 2,
      revision: data.revision,
      status: data.status,
      content: data.content,
      content_hash: contentHash,
      created_by: auth.actorUserId,
    }).select("id, revision, status, content_hash").single();
    if (error) throw safeTenantCmsError(error);
    return row;
  });

export const listTenantCmsPublicationSchedules = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantCmsOperation(trusted(context), "read", "cms.paginas");
    const admin = await adminClient();
    const { data, error } = await admin.from("cms_publication_schedules").select("id, page_id, version_id, revision, publish_at, timezone, state, created_at, updated_at").eq("tenant_id", auth.tenantId).order("publish_at", { ascending: true });
    if (error) throw safeTenantCmsError(error);
    return data ?? [];
  });

export const scheduleTenantCmsPublication = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ pageId: uuid, versionId: uuid, revision: z.number().int().positive(), publishAt: z.string().datetime(), timezone: z.literal("America/Sao_Paulo"), idempotencyKey: z.string().min(8).max(200) }).strict().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCmsOperation(trusted(context), "publish", "cms.paginas");
    const admin = await adminClient();
    const { data: raw, error } = await admin.rpc("schedule_tenant_cms_publication", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _page_id: data.pageId,
      _version_id: data.versionId,
      _revision: data.revision,
      _publish_at: data.publishAt,
      _timezone: data.timezone,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw safeTenantCmsError(error);
    return raw;
  });

export const cancelTenantCmsPublicationSchedule = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ scheduleId: uuid }).strict().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCmsOperation(trusted(context), "publish", "cms.paginas");
    const admin = await adminClient();
    const { data: raw, error } = await admin.rpc("cancel_tenant_cms_publication_schedule", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _schedule_id: data.scheduleId,
    });
    if (error) throw safeTenantCmsError(error);
    return raw;
  });
