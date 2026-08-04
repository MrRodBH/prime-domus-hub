import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCmsOperation,
  safeTenantCmsError,
} from "@/lib/api/tenant-cms-authority.server";

const uuid = z.string().uuid();
const PREVIEW_TTL_SECONDS = 15 * 60;

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function assertTenantPath(path: string, tenantId: string, prefix: string) {
  if (
    !path.startsWith(`${tenantId}/${prefix}`) ||
    path.includes("..") ||
    path.startsWith("/") ||
    path.includes("\\")
  ) {
    throw new Error("content_media_persisted_path_invalid");
  }
  return path;
}

async function signPersistedPath(input: {
  bucket: "site" | "lancamentos";
  path: string;
  width?: number;
  quality?: number;
}) {
  const admin = await adminClient();
  const options = input.width
    ? {
        transform: {
          width: input.width,
          quality: input.quality ?? 80,
          resize: "contain" as const,
        },
      }
    : undefined;
  const { data, error } = await admin.storage
    .from(input.bucket)
    .createSignedUrl(input.path, PREVIEW_TTL_SECONDS, options);
  if (error || !data?.signedUrl) throw new Error("content_media_sign_failed");
  return data.signedUrl as string;
}

const blogSaveSchema = z.object({
  id: uuid.optional(),
  titulo: z.string().trim().min(2).max(300),
  slug: z.string().trim().min(2).max(200),
  resumo: z.string().max(2000).optional().nullable(),
  conteudo: z.string().max(200000).default(""),
  coverUploadTargetId: uuid.optional().nullable(),
  categoria_id: uuid.optional().nullable(),
  autor_id: uuid.optional().nullable(),
  status: z.enum(["rascunho", "publicado"]).default("rascunho"),
  meta_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
}).strict();

export const saveTenantBlogPost = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => blogSaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const operation = data.status === "publicado"
      ? "publish"
      : data.id
        ? "save_draft"
        : "create_draft";
    await authorizeTenantCmsOperation(context, "cms.paginas", operation);
    const admin = await adminClient();
    const { data: raw, error } = await admin.rpc("save_tenant_blog_post", {
      _actor_user_id: context.userId,
      _tenant_id: context.tenant.tenantId,
      _tenant_origin: context.tenant.origin,
      _post_id: data.id ?? null,
      _title: data.titulo,
      _slug: data.slug,
      _summary: data.resumo ?? null,
      _content: data.conteudo,
      _cover_upload_target_id: data.coverUploadTargetId ?? null,
      _category_id: data.categoria_id ?? null,
      _author_id: data.autor_id ?? null,
      _status: data.status,
      _meta_title: data.meta_title ?? null,
      _meta_description: data.meta_description ?? null,
    });
    if (error) throw safeTenantCmsError(error);
    return z.object({
      id: uuid,
      coverPath: z.string().nullable(),
      coverTargetConsumed: z.boolean(),
    }).strict().parse(raw);
  });

export const signTenantBlogCover = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ postId: uuid }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const auth = await authorizeTenantCmsOperation(context, "cms.paginas", "read");
    const admin = await adminClient();
    const { data: rows, error } = await admin
      .from("blog_posts")
      .select("imagem_capa")
      .eq("tenant_id", auth.tenantId)
      .eq("id", data.postId)
      .limit(2);
    if (error) throw safeTenantCmsError(error);
    if ((rows ?? []).length !== 1) throw new Error("blog_post_cross_tenant_or_missing");
    const path = rows[0].imagem_capa as string | null;
    if (!path) return { url: null };
    assertTenantPath(path, auth.tenantId, "blog/");
    return { url: await signPersistedPath({ bucket: "site", path, width: 1600 }) };
  });

const launchProjectSchema = z.object({
  id: uuid.optional(),
  slug: z.string().trim().min(2).max(200),
  nome: z.string().trim().min(2).max(300),
  descricao: z.string().max(200000).nullable().optional(),
  status_id: uuid.nullable().optional(),
  quartos: z.number().int().nullable().optional(),
  suites: z.number().int().nullable().optional(),
  vagas: z.number().int().nullable().optional(),
  area_apartamentos: z.number().nullable().optional(),
  construtora: z.string().max(300).nullable().optional(),
  entrega: z.string().nullable().optional(),
  endereco: z.string().max(1000).nullable().optional(),
  cidade_id: uuid.nullable().optional(),
  bairro_id: uuid.nullable().optional(),
  arquitetura: z.string().max(300).nullable().optional(),
  numero_unidades: z.number().int().nullable().optional(),
  numero_torres: z.number().int().nullable().optional(),
  unidades_por_andar: z.number().int().nullable().optional(),
  numero_andares: z.number().int().nullable().optional(),
  elevadores: z.number().int().nullable().optional(),
  corretor_id: uuid.nullable().optional(),
  video_url: z.string().max(1000).nullable().optional(),
  publicado: z.boolean().default(false),
  destaque: z.boolean().default(false),
  meta_title: z.string().max(60).nullable().optional(),
  meta_description: z.string().max(160).nullable().optional(),
  amenity_ids: z.array(uuid).max(100).default([]),
}).strict();

export const saveTenantLaunchProject = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => launchProjectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const operation = data.publicado
      ? "publish"
      : data.id
        ? "save_draft"
        : "create_draft";
    await authorizeTenantCmsOperation(context, "cms.paginas", operation);
    const { id, amenity_ids, ...project } = data;
    const admin = await adminClient();
    const { data: raw, error } = await admin.rpc("save_tenant_launch_project", {
      _actor_user_id: context.userId,
      _tenant_id: context.tenant.tenantId,
      _tenant_origin: context.tenant.origin,
      _project_id: id ?? null,
      _project: JSON.parse(JSON.stringify(project)),
      _amenity_ids: amenity_ids,
    });
    if (error) throw safeTenantCmsError(error);
    return z.object({
      id: uuid,
      ok: z.literal(true),
      amenityCount: z.number().int().nonnegative(),
      transactional: z.literal(true),
    }).strict().parse(raw);
  });

const launchConsumerResult = z.object({
  resourceId: uuid,
  projectId: uuid,
  operation: z.enum(["cover", "gallery", "pdf"]),
  path: z.string().min(3).max(512),
  status: z.literal("consumed"),
}).strict();

async function consumeLaunchTarget(
  context: any,
  input: {
    targetId: string;
    projectId: string;
    operation: "cover" | "gallery" | "pdf";
    kind?: "tabela_precos" | "manual" | null;
    title?: string | null;
    legend?: string | null;
    order?: number;
  },
) {
  await authorizeTenantCmsOperation(context, "cms.midias", "save_draft");
  const admin = await adminClient();
  const { data, error } = await admin.rpc("consume_tenant_launch_upload_target", {
    _actor_user_id: context.userId,
    _tenant_id: context.tenant.tenantId,
    _tenant_origin: context.tenant.origin,
    _target_id: input.targetId,
    _project_id: input.projectId,
    _operation: input.operation,
    _kind: input.kind ?? null,
    _title: input.title ?? null,
    _legend: input.legend ?? null,
    _order: input.order ?? 0,
  });
  if (error) throw safeTenantCmsError(error);
  return launchConsumerResult.parse(data);
}

export const consumeTenantLaunchCover = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ projectId: uuid, targetId: uuid }).strict().parse(input),
  )
  .handler(async ({ data, context }) =>
    consumeLaunchTarget(context, {
      projectId: data.projectId,
      targetId: data.targetId,
      operation: "cover",
    }),
  );

export const consumeTenantLaunchGalleryImage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: uuid,
      targetId: uuid,
      legend: z.string().max(500).optional().nullable(),
      order: z.number().int().min(0).default(0),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) =>
    consumeLaunchTarget(context, {
      projectId: data.projectId,
      targetId: data.targetId,
      operation: "gallery",
      legend: data.legend,
      order: data.order,
    }),
  );

export const consumeTenantLaunchPdf = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: uuid,
      targetId: uuid,
      kind: z.enum(["tabela_precos", "manual"]),
      title: z.string().max(300).optional().nullable(),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) =>
    consumeLaunchTarget(context, {
      projectId: data.projectId,
      targetId: data.targetId,
      operation: "pdf",
      kind: data.kind,
      title: data.title,
    }),
  );

export const setTenantLaunchCoverFromImage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ projectId: uuid, imageId: uuid }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const auth = await authorizeTenantCmsOperation(context, "cms.midias", "save_draft");
    const admin = await adminClient();
    const { data: rows, error } = await admin
      .from("launch_project_imagens")
      .select("storage_path")
      .eq("tenant_id", auth.tenantId)
      .eq("project_id", data.projectId)
      .eq("id", data.imageId)
      .limit(2);
    if (error) throw safeTenantCmsError(error);
    if ((rows ?? []).length !== 1) throw new Error("launch_image_cross_tenant_or_missing");
    const path = assertTenantPath(rows[0].storage_path, auth.tenantId, "");
    const { data: updated, error: updateError } = await admin
      .from("launch_projects")
      .update({ imagem_capa: path, updated_at: new Date().toISOString() })
      .eq("tenant_id", auth.tenantId)
      .eq("id", data.projectId)
      .select("id")
      .maybeSingle();
    if (updateError) throw safeTenantCmsError(updateError);
    if (!updated) throw new Error("launch_project_cross_tenant_or_missing");
    return { ok: true, path };
  });

export const signTenantLaunchMedia = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: uuid,
      resource: z.enum(["cover", "gallery", "pdf"]),
      resourceId: uuid.optional(),
      width: z.number().int().min(100).max(2400).optional(),
      quality: z.number().int().min(40).max(100).optional(),
    }).strict().superRefine((data, context) => {
      if (data.resource !== "cover" && !data.resourceId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["resourceId"], message: "resourceId obrigatório" });
      }
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const auth = await authorizeTenantCmsOperation(context, "cms.midias", "read");
    const admin = await adminClient();
    let path: string | null = null;
    if (data.resource === "cover") {
      const { data: rows, error } = await admin
        .from("launch_projects")
        .select("imagem_capa")
        .eq("tenant_id", auth.tenantId)
        .eq("id", data.projectId)
        .limit(2);
      if (error) throw safeTenantCmsError(error);
      if ((rows ?? []).length !== 1) throw new Error("launch_project_cross_tenant_or_missing");
      path = rows[0].imagem_capa;
    } else {
      const table = data.resource === "gallery" ? "launch_project_imagens" : "launch_pdfs";
      const { data: rows, error } = await admin
        .from(table)
        .select("storage_path")
        .eq("tenant_id", auth.tenantId)
        .eq("project_id", data.projectId)
        .eq("id", data.resourceId)
        .limit(2);
      if (error) throw safeTenantCmsError(error);
      if ((rows ?? []).length !== 1) throw new Error("launch_media_cross_tenant_or_missing");
      path = rows[0].storage_path;
    }
    if (!path) return { url: null };
    assertTenantPath(path, auth.tenantId, "");
    return {
      url: await signPersistedPath({
        bucket: "lancamentos",
        path,
        width: data.resource === "pdf" ? undefined : data.width,
        quality: data.quality,
      }),
    };
  });
