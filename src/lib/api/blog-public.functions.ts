import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertTenantScopedRows } from "@/lib/public-tenant-read-guards";
import { normalizePublicMediaUrl } from "@/lib/public-content-security";
import { sanitizePublicHtml } from "@/lib/public-html-sanitizer.server";

type NestedTenantRow = {
  tenant_id: string;
  nome?: string | null;
  sobrenome?: string | null;
  foto_url?: string | null;
  slug?: string | null;
};

type BlogRow = {
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
  categoria: NestedTenantRow | NestedTenantRow[] | null;
  autor?: NestedTenantRow | NestedTenantRow[] | null;
};

export type PublicBlogListDto = {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  imagem_capa: string | null;
  publicado_em: string | null;
  categoria: { nome: string | null; slug: string | null } | null;
};

export type PublicBlogDetailDto = PublicBlogListDto & {
  conteudo: string;
  meta_title: string | null;
  meta_description: string | null;
  autor: {
    nome: string | null;
    sobrenome: string | null;
    foto_url: string | null;
    slug: string | null;
  } | null;
};

function oneNested(value: NestedTenantRow | NestedTenantRow[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function categoryDto(tenantId: string, value: BlogRow["categoria"]) {
  const row = oneNested(value);
  if (!row) return null;
  if (row.tenant_id !== tenantId) throw new Error("public_resource_foreign_tenant:blog_category");
  return { nome: row.nome ?? null, slug: row.slug ?? null };
}

function authorDto(tenantId: string, value: BlogRow["autor"]) {
  const row = oneNested(value);
  if (!row) return null;
  if (row.tenant_id !== tenantId) throw new Error("public_resource_foreign_tenant:blog_author");
  return {
    nome: row.nome ?? null,
    sobrenome: row.sobrenome ?? null,
    foto_url: normalizePublicMediaUrl(row.foto_url ?? null),
    slug: row.slug ?? null,
  };
}

async function signedBlogCover(
  tenantId: string,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const publicUrl = normalizePublicMediaUrl(path);
  if (publicUrl) return publicUrl;
  if (
    !path.startsWith(`${tenantId}/blog/`) ||
    path.includes("..") ||
    path.includes("\\") ||
    path.startsWith("/")
  ) {
    throw new Error("public_blog_cover_path_invalid");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("site")
    .createSignedUrl(path, 60 * 60, {
      transform: { width: 1600, quality: 80, resize: "contain" },
    });
  if (error || !data?.signedUrl) throw new Error("public_blog_cover_sign_failed");
  return normalizePublicMediaUrl(data.signedUrl) ?? data.signedUrl;
}

async function listDto(tenantId: string, row: BlogRow): Promise<PublicBlogListDto> {
  return {
    id: row.id,
    titulo: row.titulo,
    slug: row.slug,
    resumo: row.resumo,
    imagem_capa: await signedBlogCover(tenantId, row.imagem_capa),
    publicado_em: row.publicado_em,
    categoria: categoryDto(tenantId, row.categoria),
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
    const accepted = assertTenantScopedRows(tenant.id, rows as unknown as BlogRow[] | null);
    return Promise.all(accepted.map((row) => listDto(tenant.id, row)));
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
    const accepted = assertTenantScopedRows(tenant.id, rows as unknown as BlogRow[] | null);
    if (accepted.length === 0) return null;
    if (accepted.length !== 1) throw new Error("public_resource_ambiguous");
    const row = accepted[0];
    return {
      ...(await listDto(tenant.id, row)),
      conteudo: sanitizePublicHtml(row.conteudo ?? ""),
      meta_title: row.meta_title ?? null,
      meta_description: row.meta_description ?? null,
      autor: authorDto(tenant.id, row.autor),
    };
  });

export const listarCategoriasPublicas = createServerFn({ method: "GET" })
  .handler(async (): Promise<Array<{ id: string; nome: string; slug: string }>> => {
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
    return accepted.map(({ id, nome, slug }) => ({ id, nome, slug }));
  });
