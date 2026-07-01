/**
 * CMS — Páginas dinâmicas (cms_pages).
 * Admin: CRUD completo. Público: obter por slug (somente published).
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

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
    const { supabase, userId } = context;
    const payload = {
      slug: data.slug,
      titulo: data.titulo,
      descricao: data.descricao ?? null,
      status: data.status,
      seo: data.seo,
      blocks: data.blocks,
      updated_by: userId,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("cms_pages").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("cms_pages").insert({ ...payload, created_by: userId }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const excluirPagina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("cms_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// PÚBLICO — leitura por slug (respeita RLS anon: apenas published)
// ============================================================================

export const obterPaginaPublica = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1), tenant_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const supa = publicClient();
    let q = supa.from("cms_pages").select("id, slug, titulo, descricao, seo, blocks, published_at, tenant_id").eq("slug", data.slug).eq("status", "published");
    if (data.tenant_id) q = q.eq("tenant_id", data.tenant_id);
    const { data: row, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
