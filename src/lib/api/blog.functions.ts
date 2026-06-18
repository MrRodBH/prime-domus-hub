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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado.");
}

// ============ PUBLIC ============

export const listarPostsPublicos = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        categoria: z.string().optional(),
        limite: z.number().int().min(1).max(50).optional(),
      })
      .optional()
      .default({}),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    let q = supabase
      .from("blog_posts")
      .select(
        "id, titulo, slug, resumo, imagem_capa, publicado_em, categoria:blog_categorias(nome, slug)",
      )
      .eq("status", "publicado")
      .order("publicado_em", { ascending: false, nullsFirst: false })
      .limit(data.limite ?? 24);
    if (data.categoria) q = q.eq("categoria.slug", data.categoria);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const obterPostPublico = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: post, error } = await supabase
      .from("blog_posts")
      .select(
        "id, titulo, slug, resumo, conteudo, imagem_capa, publicado_em, meta_title, meta_description, categoria:blog_categorias(nome, slug), autor:corretores(nome, foto_url, slug)",
      )
      .eq("slug", data.slug)
      .eq("status", "publicado")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return post;
  });

export const listarCategoriasPublicas = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("blog_categorias")
    .select("id, nome, slug")
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ============ ADMIN ============

const categoriaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2),
  slug: z.string().min(2),
  descricao: z.string().optional().nullable(),
  ordem: z.number().int().default(0),
});

export const adminListarCategorias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("blog_categorias")
      .select("*")
      .order("ordem");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSalvarCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(categoriaSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.id) {
      const { error } = await context.supabase
        .from("blog_categorias")
        .update(data as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("blog_categorias").insert(data as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminExcluirCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("blog_categorias")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const postSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(2),
  slug: z.string().min(2),
  resumo: z.string().optional().nullable(),
  conteudo: z.string().default(""),
  imagem_capa: z.string().optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
  autor_id: z.string().uuid().optional().nullable(),
  status: z.enum(["rascunho", "publicado"]).default("rascunho"),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
});

export const adminListarPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select(
        "id, titulo, slug, status, publicado_em, updated_at, categoria:blog_categorias(nome)",
      )
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminObterPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: post, error } = await context.supabase
      .from("blog_posts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return post;
  });

export const adminSalvarPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(postSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const payload = {
      ...data,
      publicado_em:
        data.status === "publicado" ? new Date().toISOString() : null,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("blog_posts")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    } else {
      const { data: inserted, error } = await context.supabase
        .from("blog_posts")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: (inserted as { id: string }).id };
    }
  });

export const adminExcluirPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("blog_posts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ IA: Resumo ============

export const adminGerarResumoPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ conteudo: z.string().min(20), titulo: z.string().optional().default("") }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const texto = data.conteudo.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "raw-fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um editor de conteúdo imobiliário. Escreve resumos curtos em português do Brasil, com tom profissional e claro, sem emojis e sem markdown." },
          { role: "user", content: `Gere um resumo de 2 a 3 frases (máximo 280 caracteres) para o post a seguir. Apenas o texto do resumo, sem aspas.\n\nTítulo: ${data.titulo}\n\nConteúdo:\n${texto}` },
        ],
      }),
    });

    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (!resp.ok) throw new Error(`Falha na IA (${resp.status})`);

    const json = await resp.json();
    const resumo: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!resumo) throw new Error("A IA não retornou resumo.");
    return { resumo };
  });

