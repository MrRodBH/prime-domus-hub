import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertTenantScopedRows } from "@/lib/public-tenant-read-guards";
import { normalizePublicMediaUrl } from "@/lib/public-content-security";
import { sanitizePublicHtml } from "@/lib/public-html-sanitizer.server";
import {
  authorizeTenantCmsOperation,
  safeTenantCmsError,
} from "@/lib/api/tenant-cms-authority.server";

type PublicBlogCategoryDto = {
  nome: string | null;
  slug: string | null;
};

type PublicBlogAuthorDto = {
  nome: string | null;
  sobrenome: string | null;
  foto_url: string | null;
  slug: string | null;
};

export type PublicBlogListDto = {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  imagem_capa: string | null;
  publicado_em: string | null;
  categoria: PublicBlogCategoryDto | null;
};

export type PublicBlogDetailDto = PublicBlogListDto & {
  conteudo: string;
  meta_title: string | null;
  meta_description: string | null;
  autor: PublicBlogAuthorDto | null;
};

export type PublicBlogCategoryListDto = {
  id: string;
  nome: string;
  slug: string;
};

type PublicNestedTenantRow = {
  tenant_id: string;
  nome?: string | null;
  sobrenome?: string | null;
  foto_url?: string | null;
  slug?: string | null;
};

type PublicBlogDatabaseRow = {
  tenant_id: string;
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  conteudo?: string | null;
  imagem_capa: string | null;
  publicado_em: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  categoria: PublicNestedTenantRow | PublicNestedTenantRow[] | null;
  autor?: PublicNestedTenantRow | PublicNestedTenantRow[] | null;
};

function oneNested(value: PublicNestedTenantRow | PublicNestedTenantRow[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function categoryDto(tenantId: string, value: PublicBlogDatabaseRow["categoria"]): PublicBlogCategoryDto | null {
  const nested = oneNested(value);
  if (!nested) return null;
  if (nested.tenant_id !== tenantId) throw new Error("public_resource_foreign_tenant:blog_category");
  return { nome: nested.nome ?? null, slug: nested.slug ?? null };
}

function authorDto(tenantId: string, value: PublicBlogDatabaseRow["autor"]): PublicBlogAuthorDto | null {
  const nested = oneNested(value);
  if (!nested) return null;
  if (nested.tenant_id !== tenantId) throw new Error("public_resource_foreign_tenant:blog_author");
  return {
    nome: nested.nome ?? null,
    sobrenome: nested.sobrenome ?? null,
    foto_url: normalizePublicMediaUrl(nested.foto_url ?? null),
    slug: nested.slug ?? null,
  };
}

function toPublicBlogListDto(tenantId: string, row: PublicBlogDatabaseRow): PublicBlogListDto {
  return {
    id: row.id,
    titulo: row.titulo,
    slug: row.slug,
    resumo: row.resumo,
    imagem_capa: normalizePublicMediaUrl(row.imagem_capa),
    publicado_em: row.publicado_em,
    categoria: categoryDto(tenantId, row.categoria),
  };
}

function toPublicBlogDetailDto(tenantId: string, row: PublicBlogDatabaseRow): PublicBlogDetailDto {
  return {
    ...toPublicBlogListDto(tenantId, row),
    conteudo: sanitizePublicHtml(row.conteudo ?? ""),
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    autor: authorDto(tenantId, row.autor),
  };
}

export const listarPostsPublicos = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({
      categoria: z.string().min(1).optional(),
      limite: z.number().int().min(1).max(50).optional(),
    }).strict().optional().default({}).parse(input),
  )
  .handler(async ({ data }): Promise<PublicBlogListDto[]> => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("blog_posts")
      .select("tenant_id, id, titulo, slug, resumo, imagem_capa, publicado_em, categoria:blog_categorias(tenant_id,nome,slug)")
      .eq("tenant_id", tenant.id)
      .eq("status", "publicado")
      .order("publicado_em", { ascending: false, nullsFirst: false })
      .limit(data.limite ?? 24);
    if (data.categoria) query = query.eq("categoria.slug", data.categoria);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const accepted = assertTenantScopedRows(
      tenant.id,
      rows as unknown as PublicBlogDatabaseRow[] | null,
    );
    return accepted.map((row) => toPublicBlogListDto(tenant.id, row));
  });

export const obterPostPublico = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).strict().parse(input))
  .handler(async ({ data }): Promise<PublicBlogDetailDto | null> => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("blog_posts")
      .select("tenant_id, id, titulo, slug, resumo, conteudo, imagem_capa, publicado_em, meta_title, meta_description, categoria:blog_categorias(tenant_id,nome,slug), autor:corretores(tenant_id,nome,sobrenome,foto_url,slug)")
      .eq("tenant_id", tenant.id)
      .eq("slug", data.slug)
      .eq("status", "publicado")
      .limit(2);
    if (error) throw new Error(error.message);
    const accepted = assertTenantScopedRows(
      tenant.id,
      rows as unknown as PublicBlogDatabaseRow[] | null,
    );
    if (accepted.length === 0) return null;
    if (accepted.length !== 1) throw new Error("public_resource_ambiguous");
    return toPublicBlogDetailDto(tenant.id, accepted[0]);
  });

export const listarCategoriasPublicas = createServerFn({ method: "GET" })
  .handler(async (): Promise<PublicBlogCategoryListDto[]> => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("blog_categorias")
      .select("tenant_id, id, nome, slug")
      .eq("tenant_id", tenant.id)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    const accepted = assertTenantScopedRows(
      tenant.id,
      data as unknown as Array<{ tenant_id: string; id: string; nome: string; slug: string }> | null,
    );
    return accepted.map((row) => ({ id: row.id, nome: row.nome, slug: row.slug }));
  });

async function authorizeBlog(
  context: Parameters<typeof authorizeTenantCmsOperation>[0],
  operation: "list" | "read" | "create_draft" | "save_draft" | "publish" | "delete",
) {
  return authorizeTenantCmsOperation(context, "cms.paginas", operation);
}

async function requireTenantReference(
  context: any,
  tenantId: string,
  table: "blog_categorias" | "corretores",
  id: string | null | undefined,
) {
  if (!id) return null;
  const { data, error } = await context.supabase
    .from(table)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .limit(2);
  if (error) throw safeTenantCmsError(error);
  if ((data ?? []).length !== 1) throw new Error("cms_cross_tenant_reference");
  return id;
}

const categoriaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(160),
  descricao: z.string().max(1000).optional().nullable(),
  ordem: z.number().int().default(0),
}).strict();

export const adminListarCategorias = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const authorization = await authorizeBlog(context, "list");
    const { data, error } = await context.supabase
      .from("blog_categorias")
      .select("id, nome, slug, descricao, ordem, created_at, updated_at")
      .eq("tenant_id", authorization.tenantId)
      .order("ordem", { ascending: true });
    if (error) throw safeTenantCmsError(error);
    return data ?? [];
  });

export const adminSalvarCategoria = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => categoriaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeBlog(context, data.id ? "save_draft" : "create_draft");
    const { id, ...fields } = data;
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("blog_categorias")
        .update(fields as never)
        .eq("tenant_id", authorization.tenantId)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw safeTenantCmsError(error);
      if (!updated) throw new Error("cms_cross_tenant_reference");
      return { ok: true, id };
    }
    const { data: inserted, error } = await context.supabase
      .from("blog_categorias")
      .insert({ ...fields, tenant_id: authorization.tenantId } as never)
      .select("id")
      .single();
    if (error) throw safeTenantCmsError(error);
    return { ok: true, id: inserted.id };
  });

export const adminExcluirCategoria = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeBlog(context, "delete");
    const { data: deleted, error } = await context.supabase
      .from("blog_categorias")
      .delete()
      .eq("tenant_id", authorization.tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw safeTenantCmsError(error);
    if (!deleted) throw new Error("cms_cross_tenant_reference");
    return { ok: true };
  });

const postSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().trim().min(2).max(300),
  slug: z.string().trim().min(2).max(200),
  resumo: z.string().max(2000).optional().nullable(),
  conteudo: z.string().max(200000).default(""),
  categoria_id: z.string().uuid().optional().nullable(),
  autor_id: z.string().uuid().optional().nullable(),
  status: z.enum(["rascunho", "publicado"]).default("rascunho"),
  meta_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
}).strict();

export const adminListarPosts = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const authorization = await authorizeBlog(context, "list");
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("id, titulo, slug, status, publicado_em, updated_at, categoria:blog_categorias(tenant_id,nome)")
      .eq("tenant_id", authorization.tenantId)
      .order("updated_at", { ascending: false });
    if (error) throw safeTenantCmsError(error);
    return (data ?? []).map((row) => {
      const categoria = Array.isArray(row.categoria) ? row.categoria[0] ?? null : row.categoria;
      if (categoria && categoria.tenant_id !== authorization.tenantId) {
        throw new Error("cms_cross_tenant_reference");
      }
      return { ...row, categoria: categoria ? { nome: categoria.nome } : null };
    });
  });

export const adminObterPost = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeBlog(context, "read");
    const { data: rows, error } = await context.supabase
      .from("blog_posts")
      .select("*")
      .eq("tenant_id", authorization.tenantId)
      .eq("id", data.id)
      .limit(2);
    if (error) throw safeTenantCmsError(error);
    if ((rows ?? []).length === 0) return null;
    if ((rows ?? []).length !== 1) throw new Error("cms_ambiguous_state");
    return rows![0];
  });

export const adminSalvarPost = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => postSchema.parse(input))
  .handler(async ({ data, context }) => {
    const operation = data.status === "publicado"
      ? "publish"
      : data.id
        ? "save_draft"
        : "create_draft";
    const authorization = await authorizeBlog(context, operation);
    await Promise.all([
      requireTenantReference(context, authorization.tenantId, "blog_categorias", data.categoria_id),
      requireTenantReference(context, authorization.tenantId, "corretores", data.autor_id),
    ]);
    const { id, ...fields } = data;
    const payload = {
      ...fields,
      publicado_em: data.status === "publicado" ? new Date().toISOString() : null,
    };
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("blog_posts")
        .update(payload as never)
        .eq("tenant_id", authorization.tenantId)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw safeTenantCmsError(error);
      if (!updated) throw new Error("cms_cross_tenant_reference");
      return { ok: true, id };
    }
    const { data: inserted, error } = await context.supabase
      .from("blog_posts")
      .insert({ ...payload, tenant_id: authorization.tenantId } as never)
      .select("id")
      .single();
    if (error) throw safeTenantCmsError(error);
    return { ok: true, id: inserted.id };
  });

export const adminExcluirPost = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeBlog(context, "delete");
    const { data: deleted, error } = await context.supabase
      .from("blog_posts")
      .delete()
      .eq("tenant_id", authorization.tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw safeTenantCmsError(error);
    if (!deleted) throw new Error("cms_cross_tenant_reference");
    return { ok: true };
  });

const aiInput = z.object({
  conteudo: z.string().min(20),
  titulo: z.string().optional().default(""),
}).strict();

type BlogSummaryResult = { resumo: string };
type BlogSeoResult = { meta_title: string; meta_description: string };
type BlogPdfImportResult = {
  titulo: string;
  resumo: string;
  meta_title: string;
  meta_description: string;
  conteudo: string;
};

export const adminGerarResumoPost = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => aiInput.parse(input))
  .handler(async ({ context }): Promise<BlogSummaryResult> => {
    await authorizeBlog(context, "save_draft");
    throw new Error("blog_ai_summary_adapter_not_implemented");
  });

export const adminGerarSeoPost = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => aiInput.parse(input))
  .handler(async ({ context }): Promise<BlogSeoResult> => {
    await authorizeBlog(context, "save_draft");
    throw new Error("blog_ai_seo_adapter_not_implemented");
  });

export const adminImportarPdf = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      pdfBase64: z.string().min(100),
      nomeArquivo: z.string().max(300).optional().default(""),
    }).strict().parse(input),
  )
  .handler(async ({ context }): Promise<BlogPdfImportResult> => {
    await authorizeBlog(context, "create_draft");
    throw new Error("blog_pdf_import_adapter_not_implemented");
  });
