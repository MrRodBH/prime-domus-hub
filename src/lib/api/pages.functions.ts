/**
 * CMS — Páginas dinâmicas (cms_pages).
 * Admin: CRUD completo. Público: obter por slug (somente published).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";

export type CmsBlock =
  | { id: string; type: "hero"; data: { eyebrow?: string; titulo: string; subtitulo?: string; imagem_url?: string; cta_label?: string; cta_href?: string; altura?: "sm" | "md" | "lg" } }
  | { id: string; type: "richtext"; data: { html: string; align?: "left" | "center" } }
  | { id: string; type: "image"; data: { url: string; alt?: string; legenda?: string } }
  | { id: string; type: "gallery"; data: { imagens: Array<{ url: string; alt?: string }>; colunas?: 2 | 3 | 4 } }
  | { id: string; type: "video"; data: { embed_url: string; titulo?: string } }
  | { id: string; type: "cta"; data: { titulo: string; descricao?: string; botao_label: string; botao_href: string; variante?: "default" | "outline" } }
  | { id: string; type: "form"; data: { form_slug: string; titulo?: string } }
  | { id: string; type: "features"; data: { titulo?: string; itens: Array<{ titulo: string; descricao?: string; icone?: string }> } }
  | { id: string; type: "faq"; data: { titulo?: string; itens: Array<{ pergunta: string; resposta: string }> } }
  | { id: string; type: "spacer"; data: { altura: "sm" | "md" | "lg" | "xl" } };

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["hero", "richtext", "image", "gallery", "video", "cta", "form", "features", "faq", "spacer"]),
  data: z.record(z.string(), z.any()),
});

const seoSchema = z.object({
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_image: z.string().optional(),
  canonical: z.string().optional(),
  noindex: z.boolean().optional(),
}).partial();

// ============================================================================
// ADMIN
// ============================================================================

export const listarPaginas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cms_pages")
      .select("id, slug, titulo, status, updated_at, published_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const obterPaginaAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("cms_pages")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Página não encontrada");
    return row;
  });

const salvarSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  titulo: z.string().min(1),
  descricao: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seo: seoSchema.default({}),
  blocks: z.array(blockSchema).default([]),
});

export const salvarPagina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => salvarSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    const { supabase, userId } = context;
    const wantsPublish = data.status === "published";
    await assertCmsPermission(context, "cms.paginas", data.id ? "editar" : "criar");
    if (wantsPublish) await assertCmsPermission(context, "cms.paginas", "publicar");
    const payload = {
      slug: data.slug,
      titulo: data.titulo,
      descricao: data.descricao ?? null,
      status: data.status,
      seo: data.seo,
      blocks: data.blocks,
      updated_by: userId,
      published_at: wantsPublish ? new Date().toISOString() : null,
    };
    if (data.id) {
      const { data: before } = await supabase.from("cms_pages").select("*").eq("id", data.id).maybeSingle();
      const { data: row, error } = await supabase
        .from("cms_pages").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      await logCmsAudit(context, "cms_pages", wantsPublish ? "cms.pagina.publicar" : "cms.pagina.editar", data.id, before, row);
      return row;
    }
    const { data: row, error } = await supabase
      .from("cms_pages").insert({ ...payload, created_by: userId }).select().maybeSingle();
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "cms_pages", "cms.pagina.criar", row?.id ?? null, null, row);
    return row;
  });

export const excluirPagina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.paginas", "excluir");
    const { data: before } = await context.supabase.from("cms_pages").select("*").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("cms_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "cms_pages", "cms.pagina.excluir", data.id, before, null);
    return { ok: true };
  });

// ============================================================================
// PÚBLICO — tenant resolvido por Host no servidor; slug é apenas identificador.
// ============================================================================

export const obterPaginaPublica = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1) }).strict().parse(d))
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("cms_pages")
      .select("id, slug, titulo, descricao, seo, blocks, published_at, tenant_id")
      .eq("tenant_id", tenant.id)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
