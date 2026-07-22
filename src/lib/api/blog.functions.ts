import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertTenantScopedRows, withoutTenantId } from "@/lib/public-tenant-read-guards";
import { normalizePublicMediaUrl } from "@/lib/public-content-security";
import { sanitizePublicHtml } from "@/lib/public-html-sanitizer.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado.");
}

type PublicNestedTenant = { tenant_id: string } & Record<string, any>;
type PublicBlogRow = { tenant_id: string } & Record<string, any>;

function oneNested(value: unknown): PublicNestedTenant | null {
  if (Array.isArray(value)) return (value[0] as PublicNestedTenant | undefined) ?? null;
  return value && typeof value === "object" ? (value as PublicNestedTenant) : null;
}

function safeNested(tenantId: string, value: unknown, label: string): Record<string, any> | null {
  const nested = oneNested(value);
  if (!nested) return null;
  if (nested.tenant_id !== tenantId) throw new Error(`public_resource_foreign_tenant:${label}`);
  return withoutTenantId(nested);
}

function toPublicBlogDto(tenantId: string, row: PublicBlogRow, includeContent: boolean) {
  const dto = withoutTenantId(row) as Record<string, any>;
  dto.categoria = safeNested(tenantId, dto.categoria, "blog_category");
  if ("autor" in dto) dto.autor = safeNested(tenantId, dto.autor, "blog_author");
  if (typeof dto.imagem_capa === "string") dto.imagem_capa = normalizePublicMediaUrl(dto.imagem_capa);
  if (includeContent) dto.conteudo = sanitizePublicHtml(typeof dto.conteudo === "string" ? dto.conteudo : "");
  const autor = dto.autor as Record<string, any> | null;
  if (autor && typeof autor.foto_url === "string") autor.foto_url = normalizePublicMediaUrl(autor.foto_url);
  return dto;
}

// ============ PUBLIC ============

export const listarPostsPublicos = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      categoria: z.string().min(1).optional(),
      limite: z.number().int().min(1).max(50).optional(),
    }).optional().default({}),
  )
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("blog_posts")
      .select(
        "tenant_id, id, titulo, slug, resumo, imagem_capa, publicado_em, categoria:blog_categorias(tenant_id,nome,slug)",
      )
      .eq("tenant_id", tenant.id)
      .eq("status", "publicado")
      .order("publicado_em", { ascending: false, nullsFirst: false })
      .limit(data.limite ?? 24);
    if (data.categoria) query = query.eq("categoria.slug", data.categoria);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return assertTenantScopedRows(tenant.id, rows as unknown as PublicBlogRow[] | null)
      .map((row) => toPublicBlogDto(tenant.id, row, false));
  });

export const obterPostPublico = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1) }).strict())
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("blog_posts")
      .select(
        "tenant_id, id, titulo, slug, resumo, conteudo, imagem_capa, publicado_em, meta_title, meta_description, categoria:blog_categorias(tenant_id,nome,slug), autor:corretores(tenant_id,nome,sobrenome,foto_url,slug)",
      )
      .eq("tenant_id", tenant.id)
      .eq("slug", data.slug)
      .eq("status", "publicado")
      .limit(2);
    if (error) throw new Error(error.message);
    const accepted = assertTenantScopedRows(tenant.id, rows as unknown as PublicBlogRow[] | null);
    if (accepted.length === 0) return null;
    if (accepted.length > 1) throw new Error("public_resource_ambiguous");
    return toPublicBlogDto(tenant.id, accepted[0], true);
  });

export const listarCategoriasPublicas = createServerFn({ method: "GET" }).handler(async () => {
  const tenant = await requirePublicTenantFromRequest();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("blog_categorias")
    .select("tenant_id, id, nome, slug")
    .eq("tenant_id", tenant.id)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return assertTenantScopedRows(tenant.id, data as unknown as PublicBlogRow[] | null)
    .map(withoutTenantId);
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

export const adminGerarSeoPost = createServerFn({ method: "POST" })
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
          { role: "system", content: "Você é um especialista em SEO para sites de imóveis de alto padrão no Brasil. Escreve em português do Brasil, sem emojis e sem markdown. Responde APENAS em JSON válido." },
          { role: "user", content: `Gere meta tags otimizadas para SEO do post abaixo.\n\nRegras:\n- meta_title: até 60 caracteres, com palavra-chave principal no início.\n- meta_description: até 155 caracteres, persuasivo, com chamada para ação sutil.\n- Sem aspas dentro dos valores.\n\nResponda APENAS com um JSON no formato exato: {"meta_title":"...","meta_description":"..."}\n\nTítulo: ${data.titulo}\n\nConteúdo:\n${texto}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (!resp.ok) throw new Error(`Falha na IA (${resp.status})`);

    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed: { meta_title?: string; meta_description?: string } = {};
    try { parsed = JSON.parse(raw); } catch { throw new Error("A IA retornou um formato inválido."); }
    const meta_title = (parsed.meta_title ?? "").slice(0, 60);
    const meta_description = (parsed.meta_description ?? "").slice(0, 160);
    if (!meta_title || !meta_description) throw new Error("A IA não retornou meta tags completas.");
    return { meta_title, meta_description };
  });

// ============ IA: Importar PDF -> HTML ============

export const adminImportarPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      pdfBase64: z.string().min(100),
      nomeArquivo: z.string().optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const { extractText, getDocumentProxy } = await import("unpdf");
    const bin = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
    const pdf = await getDocumentProxy(bin);
    const { text } = await extractText(pdf, { mergePages: false });
    const textoBruto = Array.isArray(text)
      ? text.map((p, i) => `\n\n===== PÁGINA ${i + 1} =====\n\n${p}`).join("")
      : String(text ?? "");

    if (!textoBruto.trim()) throw new Error("Não foi possível extrair texto deste PDF.");
    const textoLimitado = textoBruto.slice(0, 40000);

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
          {
            role: "system",
            content:
              "Você converte texto extraído de PDFs em HTML semântico para um editor de blog. NÃO reescreva, NÃO resuma, NÃO adicione informações: apenas estruture o texto recebido. Sempre em português do Brasil. Responda APENAS com JSON válido.",
          },
          {
            role: "user",
            content: `Você receberá o texto bruto de um PDF (com marcadores "===== PÁGINA N =====" que devem ser removidos). Converta-o em HTML mantendo o conteúdo original na íntegra.

Regras:
- Use <h2> e <h3> para seções e subseções. NÃO inclua o título principal dentro de "conteudo" (ele vai apenas no campo "titulo").
- Parágrafos em <p>.
- Listas em <ul>/<ol>/<li> quando houver marcadores ou itens numerados.
- Se identificar tabelas (linhas com colunas), reconstrua usando <table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>.
- Citações/notas destacadas em <blockquote>.
- Palavras-chave importantes em <strong>.
- Remova rodapés repetidos, números de página soltos e marcadores "===== PÁGINA =====".
- NÃO use markdown. NÃO inclua <html>/<head>/<body>.

Responda APENAS com JSON neste formato exato:
{"titulo":"...","resumo":"...","meta_title":"...","meta_description":"...","conteudo":"<h2>...</h2><p>...</p>..."}

Texto extraído do PDF "${data.nomeArquivo}":
${textoLimitado}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (!resp.ok) throw new Error(`Falha na IA (${resp.status})`);

    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed: {
      titulo?: string;
      resumo?: string;
      meta_title?: string;
      meta_description?: string;
      conteudo?: string;
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("A IA retornou um formato inválido.");
    }
    if (!parsed.conteudo || !parsed.titulo) throw new Error("A IA não retornou conteúdo estruturado.");

    return {
      titulo: parsed.titulo.trim(),
      resumo: (parsed.resumo ?? "").trim().slice(0, 280),
      meta_title: (parsed.meta_title ?? "").slice(0, 60),
      meta_description: (parsed.meta_description ?? "").slice(0, 160),
      conteudo: parsed.conteudo,
    };
  });



