import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function pathOf(path) {
  return resolve(root, path);
}

function read(path) {
  return readFileSync(pathOf(path), "utf8");
}

function write(path, content) {
  writeFileSync(pathOf(path), content);
  console.log(`[pth-codemod] updated ${path}`);
}

function replaceExact(path, from, to, expected = 1) {
  const source = read(path);
  const count = source.split(from).length - 1;
  if (count !== expected) {
    throw new Error(`${path}: expected ${expected} exact matches, found ${count}`);
  }
  write(path, source.split(from).join(to));
}

function replaceRegex(path, regex, to, expected = 1) {
  const source = read(path);
  const matches = [...source.matchAll(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`))];
  if (matches.length !== expected) {
    throw new Error(`${path}: expected ${expected} regex matches for ${regex}, found ${matches.length}`);
  }
  write(path, source.replace(regex, to));
}

function mutate(path, fn) {
  const source = read(path);
  const result = fn(source);
  if (result === source) throw new Error(`${path}: mutation produced no change`);
  write(path, result);
}

write("src/lib/tenant.server.ts", `// Server-only tenant helpers. Never import from client code.\nimport { createClient } from "@supabase/supabase-js";\nimport type { Database } from "@/integrations/supabase/types";\nimport { normalizePublicHostname } from "@/lib/public-tenant";\nimport { resolvePublicTenantForHostname } from "@/lib/public-tenant.server";\n\nexport function normalizeHost(host: string | null | undefined): string {\n  return normalizePublicHostname(host);\n}\n\nexport async function resolveTenantByHost(host: string | null | undefined): Promise<{\n  id: string;\n  slug: string;\n  nome: string;\n}> {\n  const resolved = await resolvePublicTenantForHostname(normalizePublicHostname(host));\n  return {\n    id: resolved.tenant.id,\n    slug: resolved.tenant.slug,\n    nome: resolved.tenant.nome,\n  };\n}\n\n/**\n * Transport-only client. The tenant id must already have been resolved and\n * validated by a server-owned authority such as requirePublicTenantContext().\n */\nexport function publicSupabaseForTenant(tenantId: string) {\n  if (!tenantId) throw new Error("Validated tenant id is required.");\n  const url = process.env.SUPABASE_URL!;\n  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;\n  return createClient<Database>(url, key, {\n    global: { headers: { "x-tenant-id": tenantId } },\n    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },\n  });\n}\n`);

replaceExact(
  "src/routes/__root.tsx",
`    try {\n      const { obterSiteSettings } = await import("../lib/api/site.functions");\n      const settings = await obterSiteSettings();\n      faviconUrl = settings.branding.favicon_url ?? null;\n      brandingV2 = settings.branding_v2 ?? {};\n      seoGlobal = settings.seo_global ?? {};\n      siteName = settings.branding.site_name || siteName;\n    } catch {\n      // ignore\n    }`,
`    const { obterSiteSettings } = await import("../lib/api/site.functions");\n    const settings = await obterSiteSettings();\n    faviconUrl = settings.branding.favicon_url ?? null;\n    brandingV2 = settings.branding_v2 ?? {};\n    seoGlobal = settings.seo_global ?? {};\n    siteName = settings.branding.site_name || siteName;`,
);

replaceExact("src/lib/api/site.functions.ts", 'import { createClient } from "@supabase/supabase-js";\n', "");
replaceExact(
  "src/lib/api/site.functions.ts",
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\n',
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\nimport { requirePublicTenantContext } from "@/lib/public-tenant.server";\n',
);
replaceRegex(
  "src/lib/api/site.functions.ts",
  /\nfunction publicClient\(\) \{[\s\S]*?\n\}\n/,
  "\n",
);
replaceRegex(
  "src/lib/api/site.functions.ts",
  /export const obterSiteSettings = createServerFn\(\{ method: "GET" \}\)\.handler\(async \(\): Promise<SiteSettings> => \{[\s\S]*?\n\}\);/,
`export const obterSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SiteSettings> => {\n  const { tenant, admin } = await requirePublicTenantContext();\n  const { data, error } = await admin\n    .from("site_settings")\n    .select("key, value")\n    .eq("tenant_id", tenant.id);\n  if (error) throw new Error(error.message);\n  return hydrateSiteSettings(data ?? []);\n});`,
);

replaceExact(
  "src/lib/api/meta.functions.ts",
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\n',
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\nimport { requirePublicTenantContext } from "@/lib/public-tenant.server";\n',
);
replaceRegex(
  "src/lib/api/meta.functions.ts",
  /export const obterMetaPixelId = createServerFn\(\{ method: "GET" \}\)\.handler\([\s\S]*?\n\);/,
`export const obterMetaPixelId = createServerFn({ method: "GET" }).handler(\n  async (): Promise<{ pixel_id: string | null }> => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    const { data } = await admin\n      .from("site_settings")\n      .select("value")\n      .eq("tenant_id", tenant.id)\n      .eq("key", "meta_integracao")\n      .maybeSingle();\n    const v = (data?.value as { pixel_id?: string } | null) ?? null;\n    return { pixel_id: v?.pixel_id ? String(v.pixel_id) : null };\n  },\n);`,
);
mutate("src/lib/api/meta.functions.ts", (source) => {
  const start = source.indexOf("export const enviarEventoMetaCAPI");
  if (start < 0) throw new Error("meta CAPI section not found");
  const before = source.slice(0, start);
  let section = source.slice(start);
  const opener = `  .handler(async ({ data }) => {\n    try {\n      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");`;
  if (!section.includes(opener)) throw new Error("meta CAPI handler opener not found");
  section = section.replace(opener, `  .handler(async ({ data }) => {\n    try {\n      const { tenant, admin: supabaseAdmin } = await requirePublicTenantContext();`);
  const needle = `.from("site_settings")\n        .select("value")\n        .eq("key",`;
  const count = section.split(needle).length - 1;
  if (count !== 2) throw new Error(`meta CAPI expected 2 settings queries, found ${count}`);
  section = section.split(needle).join(`.from("site_settings")\n        .select("value")\n        .eq("tenant_id", tenant.id)\n        .eq("key",`);
  return before + section;
});

replaceExact("src/lib/api/pages.functions.ts", 'import { createClient } from "@supabase/supabase-js";\n', "");
replaceExact(
  "src/lib/api/pages.functions.ts",
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\n',
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\nimport { requirePublicTenantContext } from "@/lib/public-tenant.server";\n',
);
replaceRegex("src/lib/api/pages.functions.ts", /\nfunction publicClient\(\) \{[\s\S]*?\n\}\n/, "\n");
replaceRegex(
  "src/lib/api/pages.functions.ts",
  /export const obterPaginaPublica = createServerFn\(\{ method: "GET" \}\)[\s\S]*$/,
`export const obterPaginaPublica = createServerFn({ method: "GET" })\n  .inputValidator((d) => z.object({ slug: z.string().min(1) }).parse(d))\n  .handler(async ({ data }) => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    const { data: row, error } = await admin\n      .from("cms_pages")\n      .select("id, slug, titulo, descricao, seo, blocks, published_at, tenant_id")\n      .eq("tenant_id", tenant.id)\n      .eq("slug", data.slug)\n      .eq("status", "published")\n      .maybeSingle();\n    if (error) throw new Error(error.message);\n    return row;\n  });\n`,
);

replaceExact("src/lib/api/forms.functions.ts", 'import { createClient } from "@supabase/supabase-js";\n', "");
replaceExact(
  "src/lib/api/forms.functions.ts",
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\n',
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\nimport { requirePublicTenantContext } from "@/lib/public-tenant.server";\n',
);
replaceRegex("src/lib/api/forms.functions.ts", /\nfunction publicClient\(\) \{[\s\S]*?\n\}\n\nfunction adminClient\(\) \{[\s\S]*?\n\}\n/, "\n");
replaceRegex(
  "src/lib/api/forms.functions.ts",
  /export const obterFormPublicoPorSlug = createServerFn\(\{ method: "POST" \}\)[\s\S]*?\n\s*const submitSchema/,
`export const obterFormPublicoPorSlug = createServerFn({ method: "POST" })\n  .inputValidator((raw) => z.object({ slug: z.string().min(1) }).parse(raw))\n  .handler(async ({ data }) => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    const { data: form, error } = await admin\n      .from("cms_forms")\n      .select("id, tenant_id, nome, slug, descricao, config")\n      .eq("tenant_id", tenant.id)\n      .eq("slug", data.slug)\n      .eq("status", "published")\n      .maybeSingle();\n    if (error) throw new Error(error.message);\n    if (!form) return null;\n    const { data: fields, error: fieldsError } = await admin\n      .from("cms_form_fields")\n      .select("id, ordem, tipo, nome, label, placeholder, ajuda, obrigatorio, opcoes, validacao, valor_padrao, largura")\n      .eq("tenant_id", tenant.id)\n      .eq("form_id", form.id)\n      .order("ordem", { ascending: true });\n    if (fieldsError) throw new Error(fieldsError.message);\n    return { form, fields: fields ?? [] };\n  });\n\nconst submitSchema`,
);
replaceExact(
  "src/lib/api/forms.functions.ts",
  `  .handler(async ({ data }) => {\n    const admin = adminClient();`,
  `  .handler(async ({ data }) => {\n    const { tenant, admin } = await requirePublicTenantContext();`,
);
replaceExact(
  "src/lib/api/forms.functions.ts",
  `.eq("slug", data.form_slug)\n      .eq("status", "published")`,
  `.eq("tenant_id", tenant.id)\n      .eq("slug", data.form_slug)\n      .eq("status", "published")`,
);
replaceExact(
  "src/lib/api/forms.functions.ts",
  `.select("nome, tipo, obrigatorio, validacao")\n      .eq("form_id", (form as { id: string }).id);`,
  `.select("nome, tipo, obrigatorio, validacao")\n      .eq("tenant_id", tenant.id)\n      .eq("form_id", (form as { id: string }).id);`,
);
replaceExact(
  "src/lib/api/forms.functions.ts",
  `    const tenant_id = (form as { tenant_id: string }).tenant_id;`,
  `    const tenant_id = tenant.id;`,
);

replaceExact("src/lib/api/campaigns.functions.ts", 'import { createClient } from "@supabase/supabase-js";\n', "");
replaceExact(
  "src/lib/api/campaigns.functions.ts",
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\n',
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\nimport { requirePublicTenantContext } from "@/lib/public-tenant.server";\n',
);
replaceRegex("src/lib/api/campaigns.functions.ts", /\nfunction publicClient\([\s\S]*?\n\}\n/, "\n");
replaceRegex(
  "src/lib/api/campaigns.functions.ts",
  /export const listarCampanhasAtivas = createServerFn\(\{ method: "GET" \}\)[\s\S]*$/,
`export const listarCampanhasAtivas = createServerFn({ method: "GET" })\n  .inputValidator((d: Record<string, never> | undefined) => z.object({}).parse(d ?? {}))\n  .handler(async () => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    const { data: rows, error } = await admin\n      .from("cms_campaigns")\n      .select("id, nome, tipo, prioridade, conteudo, segmentacao, frequencia, start_at, end_at")\n      .eq("tenant_id", tenant.id)\n      .eq("status", "active")\n      .order("prioridade", { ascending: false });\n    if (error) throw new Error(error.message);\n    return (rows ?? []) as unknown as Campaign[];\n  });\n\nexport const registrarEventoCampanha = createServerFn({ method: "POST" })\n  .inputValidator((d: {\n    campaign_id: string;\n    tipo: "impression" | "click" | "dismiss";\n    rota?: string;\n    session_id?: string;\n  }) =>\n    z\n      .object({\n        campaign_id: z.string().uuid(),\n        tipo: z.enum(["impression", "click", "dismiss"]),\n        rota: z.string().max(500).optional(),\n        session_id: z.string().max(100).optional(),\n      })\n      .parse(d),\n  )\n  .handler(async ({ data }) => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    const { data: campaign, error: campaignError } = await admin\n      .from("cms_campaigns")\n      .select("id")\n      .eq("id", data.campaign_id)\n      .eq("tenant_id", tenant.id)\n      .eq("status", "active")\n      .maybeSingle();\n    if (campaignError) throw new Error(campaignError.message);\n    if (!campaign) throw new Error("Campaign not found for public tenant.");\n\n    const { error } = await admin.from("cms_campaign_events").insert({\n      tenant_id: tenant.id,\n      campaign_id: data.campaign_id,\n      tipo: data.tipo,\n      rota: data.rota ?? null,\n      session_id: data.session_id ?? null,\n    });\n    if (error) throw new Error(error.message);\n    return { ok: true };\n  });\n`,
);

replaceExact("src/lib/api/blog.functions.ts", 'import { createClient } from "@supabase/supabase-js";\n', "");
replaceExact(
  "src/lib/api/blog.functions.ts",
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\n',
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\nimport { requirePublicTenantContext } from "@/lib/public-tenant.server";\n',
);
replaceRegex("src/lib/api/blog.functions.ts", /\nfunction publicClient\(\) \{[\s\S]*?\n\}\n/, "\n");
replaceRegex(
  "src/lib/api/blog.functions.ts",
  /export const listarPostsPublicos = createServerFn\(\{ method: "GET" \}\)[\s\S]*?\n\s*export const obterPostPublico/,
`export const listarPostsPublicos = createServerFn({ method: "GET" })\n  .inputValidator(\n    z.object({ categoria: z.string().optional(), limite: z.number().int().min(1).max(50).optional() }).optional().default({}),\n  )\n  .handler(async ({ data }) => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    let q = admin\n      .from("blog_posts")\n      .select("id, titulo, slug, resumo, imagem_capa, publicado_em, categoria:blog_categorias(nome, slug)")\n      .eq("tenant_id", tenant.id)\n      .eq("status", "publicado")\n      .order("publicado_em", { ascending: false, nullsFirst: false })\n      .limit(data.limite ?? 24);\n    if (data.categoria) q = q.eq("categoria.slug", data.categoria);\n    const { data: rows, error } = await q;\n    if (error) throw new Error(error.message);\n    return rows ?? [];\n  });\n\nexport const obterPostPublico`,
);
replaceRegex(
  "src/lib/api/blog.functions.ts",
  /export const obterPostPublico = createServerFn\(\{ method: "GET" \}\)[\s\S]*?\n\s*export const listarCategoriasPublicas/,
`export const obterPostPublico = createServerFn({ method: "GET" })\n  .inputValidator(z.object({ slug: z.string() }))\n  .handler(async ({ data }) => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    const { data: post, error } = await admin\n      .from("blog_posts")\n      .select("id, titulo, slug, resumo, conteudo, imagem_capa, publicado_em, meta_title, meta_description, categoria:blog_categorias(nome, slug), autor:corretores(nome, sobrenome, foto_url, slug)")\n      .eq("tenant_id", tenant.id)\n      .eq("slug", data.slug)\n      .eq("status", "publicado")\n      .maybeSingle();\n    if (error) throw new Error(error.message);\n    return post;\n  });\n\nexport const listarCategoriasPublicas`,
);
replaceRegex(
  "src/lib/api/blog.functions.ts",
  /export const listarCategoriasPublicas = createServerFn\(\{ method: "GET" \}\)\.handler\(async \(\) => \{[\s\S]*?\n\}\);/,
`export const listarCategoriasPublicas = createServerFn({ method: "GET" }).handler(async () => {\n  const { tenant, admin } = await requirePublicTenantContext();\n  const { data, error } = await admin\n    .from("blog_categorias")\n    .select("id, nome, slug")\n    .eq("tenant_id", tenant.id)\n    .order("ordem", { ascending: true });\n  if (error) throw new Error(error.message);\n  return data ?? [];\n});`,
);

replaceExact(
  "src/lib/api/lancamentos.functions.ts",
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\n',
  'import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";\nimport { requirePublicTenantContext } from "@/lib/public-tenant.server";\n',
);
replaceRegex(
  "src/lib/api/lancamentos.functions.ts",
  /export const listarStatusLancamento = createServerFn\(\{ method: "GET" \}\)\.handler\(async \(\) => \{[\s\S]*?\n\}\);/,
`export const listarStatusLancamento = createServerFn({ method: "GET" }).handler(async () => {\n  const { tenant, admin } = await requirePublicTenantContext();\n  const { data, error } = await admin\n    .from("launch_statuses")\n    .select("id,slug,nome,ordem,ativo")\n    .eq("tenant_id", tenant.id)\n    .eq("ativo", true)\n    .order("ordem");\n  if (error) throw new Error(error.message);\n  return data ?? [];\n});`,
);
replaceRegex(
  "src/lib/api/lancamentos.functions.ts",
  /export const listarAmenities = createServerFn\(\{ method: "GET" \}\)\.handler\(async \(\) => \{[\s\S]*?\n\}\);/,
`export const listarAmenities = createServerFn({ method: "GET" }).handler(async () => {\n  const { tenant, admin } = await requirePublicTenantContext();\n  const { data, error } = await admin\n    .from("launch_amenities")\n    .select("id,slug,nome,ordem,ativo")\n    .eq("tenant_id", tenant.id)\n    .eq("ativo", true)\n    .order("ordem");\n  if (error) throw new Error(error.message);\n  return data ?? [];\n});`,
);
replaceRegex(
  "src/lib/api/lancamentos.functions.ts",
  /\/\/ ===== PÚBLICO =====\nimport \{ createClient as createPublicClient \} from "@supabase\/supabase-js";\nfunction sbPublic\(\) \{[\s\S]*?\n\}\n/,
  "// ===== PÚBLICO =====\n",
);
replaceRegex(
  "src/lib/api/lancamentos.functions.ts",
  /export const listarLancamentosPublico = createServerFn\(\{ method: "GET" \}\)\.handler\(async \(\) => \{[\s\S]*?\n\}\);\n\n\nexport const obterLancamentoPublico/,
`export const listarLancamentosPublico = createServerFn({ method: "GET" }).handler(async () => {\n  const { tenant, admin } = await requirePublicTenantContext();\n  const { data, error } = await admin\n    .from("launch_projects")\n    .select("id, slug, nome, construtora, entrega, destaque, imagem_capa, endereco, status:status_id(nome,slug)")\n    .eq("tenant_id", tenant.id)\n    .eq("publicado", true)\n    .order("destaque", { ascending: false })\n    .order("entrega", { ascending: true });\n  if (error) throw new Error(error.message);\n  const rows = data ?? [];\n  return await Promise.all(rows.map(async (r) => {\n    let capa_url: string | null = null;\n    if (r.imagem_capa) {\n      if (r.imagem_capa.startsWith("http")) capa_url = r.imagem_capa;\n      else {\n        const { data: signed } = await admin.storage.from("lancamentos")\n          .createSignedUrl(r.imagem_capa, 60 * 60 * 24, { transform: { width: 800, quality: 70, resize: "contain" as const } });\n        capa_url = signed?.signedUrl ?? null;\n      }\n    }\n    return { ...r, capa_url };\n  }));\n});\n\nexport const obterLancamentoPublico`,
);
replaceRegex(
  "src/lib/api/lancamentos.functions.ts",
  /export const obterLancamentoPublico = createServerFn\(\{ method: "POST" \}\)[\s\S]*$/,
`export const obterLancamentoPublico = createServerFn({ method: "POST" })\n  .inputValidator(z.object({ slug: z.string().min(1) }))\n  .handler(async ({ data }) => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    const { data: proj, error } = await admin\n      .from("launch_projects")\n      .select(\`\n        id, slug, nome, descricao, quartos, suites, vagas, area_apartamentos,\n        construtora, entrega, endereco, arquitetura,\n        numero_unidades, numero_torres, unidades_por_andar, numero_andares, elevadores,\n        imagem_capa, video_url, meta_title, meta_description, og_image,\n        status:status_id(nome,slug),\n        corretor:corretor_id(id,nome,telefone,whatsapp,foto_url,creci),\n        cidade:cidade_id(nome,uf),\n        bairro:bairro_id(nome)\n      \`)\n      .eq("tenant_id", tenant.id)\n      .eq("slug", data.slug)\n      .eq("publicado", true)\n      .maybeSingle();\n    if (error) throw new Error(error.message);\n    if (!proj) return null;\n\n    const [{ data: amenRows }, { data: imagens }, { data: pdfs }, { data: pc }, { data: units }] = await Promise.all([\n      admin.from("launch_project_amenities").select("amenity:amenity_id(slug,nome)").eq("tenant_id", tenant.id).eq("project_id", proj.id),\n      admin.from("launch_project_imagens").select("id,storage_path,legenda,ordem").eq("tenant_id", tenant.id).eq("project_id", proj.id).order("ordem"),\n      admin.from("launch_pdfs").select("id,kind,titulo,storage_path,created_at").eq("tenant_id", tenant.id).eq("project_id", proj.id).order("created_at", { ascending: false }),\n      admin.from("launch_payment_conditions").select("*").eq("tenant_id", tenant.id).eq("project_id", proj.id).maybeSingle(),\n      admin.from("launch_units").select("id,unidade,bloco,area,tipo,vagas,valor,status").eq("tenant_id", tenant.id).eq("project_id", proj.id).eq("ativa", true).order("bloco").order("unidade"),\n    ]);\n\n    async function signOne(path: string, width?: number) {\n      const opts = width ? { transform: { width, quality: 75, resize: "contain" as const } } : undefined;\n      const { data: signed } = await admin.storage.from("lancamentos").createSignedUrl(path, 60 * 60 * 24, opts);\n      return signed?.signedUrl ?? null;\n    }\n\n    const imagensSigned = await Promise.all(\n      (imagens ?? []).map(async (image) => ({\n        ...image,\n        url: await signOne(image.storage_path, 1600),\n        thumb: await signOne(image.storage_path, 400),\n      })),\n    );\n    const pdfsSigned = await Promise.all(\n      (pdfs ?? []).map(async (pdf) => ({ ...pdf, url: await signOne(pdf.storage_path) })),\n    );\n    const capaUrl = proj.imagem_capa ? await signOne(proj.imagem_capa, 1920) : null;\n    const ogImageUrl = proj.og_image ? await signOne(proj.og_image, 1200) : capaUrl;\n    const precos = (units ?? []).map((unit) => unit.valor).filter((value): value is number => typeof value === "number" && value > 0);\n\n    return {\n      ...proj,\n      capa_url: capaUrl,\n      og_image_url: ogImageUrl,\n      amenities: (amenRows ?? []).map((row) => row.amenity),\n      imagens: imagensSigned,\n      pdfs: pdfsSigned,\n      payment_conditions: pc,\n      units: units ?? [],\n      preco_min: precos.length ? Math.min(...precos) : null,\n      preco_max: precos.length ? Math.max(...precos) : null,\n    };\n  });\n`,
);

replaceExact(
  "src/lib/api/catalogo.functions.ts",
  'import { z } from "zod";\n',
  'import { z } from "zod";\nimport { requirePublicTenantContext } from "@/lib/public-tenant.server";\n',
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
`function publicClient() {\n  return createClient(\n    process.env.SUPABASE_URL!,\n    process.env.SUPABASE_PUBLISHABLE_KEY!,\n    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },\n  );\n}`,
`function publicClient(tenantId: string) {\n  return createClient(\n    process.env.SUPABASE_URL!,\n    process.env.SUPABASE_PUBLISHABLE_KEY!,\n    {\n      global: { headers: { "x-tenant-id": tenantId } },\n      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },\n    },\n  );\n}`,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
`  .handler(async ({ data }) => {\n    const supabase = publicClient();`,
`  .handler(async ({ data }) => {\n    const { tenant } = await requirePublicTenantContext();\n    const supabase = publicClient(tenant.id);`,
  1,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
  `.eq("status", "ativo");`,
  `.eq("tenant_id", tenant.id)\n      .eq("status", "ativo");`,
  1,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
  `.from("cidades").select("id").eq("slug", data.cidade).maybeSingle();`,
  `.from("cidades").select("id").eq("tenant_id", tenant.id).eq("slug", data.cidade).maybeSingle();`,
  2,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
  `.from("bairros").select("id").eq("cidade_id", cidadeId);`,
  `.from("bairros").select("id").eq("tenant_id", tenant.id).eq("cidade_id", cidadeId);`,
);
replaceRegex(
  "src/lib/api/catalogo.functions.ts",
  /export const listarCidades = createServerFn\(\{ method: "GET" \}\)\n  \.handler\(async \(\) => \{\n    const supabase = publicClient\(\);/,
`export const listarCidades = createServerFn({ method: "GET" })\n  .handler(async () => {\n    const { tenant } = await requirePublicTenantContext();\n    const supabase = publicClient(tenant.id);`,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
  `.select("id, nome, slug, estado")\n      .order("nome", { ascending: true });`,
  `.select("id, nome, slug, estado")\n      .eq("tenant_id", tenant.id)\n      .order("nome", { ascending: true });`,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
`  .handler(async ({ data }) => {\n    const supabase = publicClient();\n    let q = supabase\n      .from("bairros")`,
`  .handler(async ({ data }) => {\n    const { tenant } = await requirePublicTenantContext();\n    const supabase = publicClient(tenant.id);\n    let q = supabase\n      .from("bairros")`,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
  `.select("id, nome, slug, descricao, imagem_url, destaque, cidade_id, cidade:cidades(id, nome, slug, estado)")\n      .order`,
  `.select("id, nome, slug, descricao, imagem_url, destaque, cidade_id, cidade:cidades(id, nome, slug, estado)")\n      .eq("tenant_id", tenant.id)\n      .order`,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
  `.from("imoveis")\n      .select("bairro_id")\n      .eq("status", "ativo");`,
  `.from("imoveis")\n      .select("bairro_id")\n      .eq("tenant_id", tenant.id)\n      .eq("status", "ativo");`,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
`  .handler(async ({ data }) => {\n    // Usamos admin client porque o anon não tem mais SELECT em colunas`,
`  .handler(async ({ data }) => {\n    const { tenant, admin: supabaseAdmin } = await requirePublicTenantContext();\n    // Usamos admin client porque o anon não tem mais SELECT em colunas`,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
`    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");\n    const { data: imovel, error } = await supabaseAdmin`,
`    const { data: imovel, error } = await supabaseAdmin`,
  1,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
  `.eq("slug", data.slug)\n       .eq("status", "ativo")`,
  `.eq("tenant_id", tenant.id)\n      .eq("slug", data.slug)\n      .eq("status", "ativo")`,
);
replaceExact(
  "src/lib/api/catalogo.functions.ts",
`  .handler(async ({ data }) => {\n    if (!data.email && !data.telefone) {`,
`  .handler(async ({ data }) => {\n    const { tenant, admin } = await requirePublicTenantContext();\n    if (!data.email && !data.telefone) {`,
);
replaceRegex(
  "src/lib/api/catalogo.functions.ts",
  /\n    \/\/ Usa service role para poder gravar corretor_id \+ assigned_to derivados do imóvel\/lançamento\.[\s\S]*?\n    \);\n\n    \/\/ Resolve corretor responsável/,
  `\n    // Service role is used only after the request host resolved one active tenant.\n\n    // Resolve corretor responsável`,
);
mutate("src/lib/api/catalogo.functions.ts", (source) => {
  const start = source.indexOf("export const enviarLead");
  if (start < 0) throw new Error("enviarLead section not found");
  const before = source.slice(0, start);
  let section = source.slice(start);
  const tenantBoundIdQueries = ["launch_projects", "imoveis", "corretores"];
  for (const table of tenantBoundIdQueries) {
    const needle = `.from("${table}")`;
    if (!section.includes(needle)) throw new Error(`catalog lead missing ${table} query`);
  }
  section = section.replace(/(\.from\("launch_projects"\)[\s\S]*?\.select\("nome, corretor_id"\)\n\s*)\.eq\("id", data\.launch_project_id\)/, `$1.eq("tenant_id", tenant.id)\n        .eq("id", data.launch_project_id)`);
  section = section.replace(/(\.from\("imoveis"\)[\s\S]*?\.select\("corretor_id"\)\n\s*)\.eq\("id", data\.imovel_id\)/, `$1.eq("tenant_id", tenant.id)\n        .eq("id", data.imovel_id)`);
  section = section.replace(/(\.from\("corretores"\)[\s\S]*?\.select\("user_id"\)\n\s*)\.eq\("id", corretorId\)/, `$1.eq("tenant_id", tenant.id)\n        .eq("id", corretorId)`);
  const insertNeedle = `.from("leads")\n      .insert({`;
  if (!section.includes(insertNeedle)) throw new Error("lead insert not found");
  section = section.replace(insertNeedle, `.from("leads")\n      .insert({\n        tenant_id: tenant.id,`);
  const duplicateAdmin = `    try {\n      const { createClient } = await import("@supabase/supabase-js");\n      const admin = createClient(\n        process.env.SUPABASE_URL!,\n        process.env.SUPABASE_SERVICE_ROLE_KEY!,\n        { auth: { persistSession: false, autoRefreshToken: false } },\n      );\n`;
  if (!section.includes(duplicateAdmin)) throw new Error("duplicate notification admin client not found");
  section = section.replace(duplicateAdmin, `    try {\n`);
  section = section.replace(`.from("corretores")\n          .select("nome, email")\n          .eq("id", corretorId)`, `.from("corretores")\n          .select("nome, email")\n          .eq("tenant_id", tenant.id)\n          .eq("id", corretorId)`);
  section = section.replace(`.from("site_settings").select("value").eq("key", "contato").maybeSingle();`, `.from("site_settings").select("value").eq("tenant_id", tenant.id).eq("key", "contato").maybeSingle();`);
  section = section.replace(`.from("corretores")\n            .select("email")\n            .in("user_id", userIds);`, `.from("corretores")\n            .select("email")\n            .eq("tenant_id", tenant.id)\n            .in("user_id", userIds);`);
  section = section.replace(`.from("imoveis")\n            .select("codigo, titulo")\n            .eq("id", data.imovel_id)`, `.from("imoveis")\n            .select("codigo, titulo")\n            .eq("tenant_id", tenant.id)\n            .eq("id", data.imovel_id)`);
  return before + section;
});

replaceExact(
  "src/routes/api/public/portal-leads.ts",
  `.from("imoveis")\n            .select("corretor_id")\n            .eq("id", imovel_id)\n            .maybeSingle();\n          corretor_id = im?.corretor_id ?? null;`,
  `.from("imoveis")\n            .select("corretor_id")\n            .eq("tenant_id", conn.tenant_id)\n            .eq("id", imovel_id)\n            .maybeSingle();\n          if (!im) {\n            return new Response(JSON.stringify({ error: "imóvel não pertence ao tenant do conector" }), { status: 400, headers: cors });\n          }\n          corretor_id = im.corretor_id ?? null;`,
);

replaceExact(
  "package.json",
  `    "test:lsv-01:lot-a": "tsx --tsconfig tsconfig.json ./run-lsv-01-lot-a.ts"`,
  `    "test:lsv-01:lot-a": "tsx --tsconfig tsconfig.json ./run-lsv-01-lot-a.ts",\n    "test:pth-01": "tsx --tsconfig tsconfig.json ./run-public-tenant-authority-specs.ts"`,
);
replaceExact(
  "scripts/verify-release.mjs",
  `run("Lead structural specifications", "bun", ["run", "test:lsh-01:structural"]);`,
  `run("Lead structural specifications", "bun", ["run", "test:lsh-01:structural"]);\nrun("Public tenant authority specifications", "bun", ["run", "test:pth-01"]);`,
);

for (const temporary of ["scripts/pth-apply.mjs", ".github/workflows/pth-codemod.yml"]) {
  const absolute = pathOf(temporary);
  if (existsSync(absolute)) unlinkSync(absolute);
}

console.log("[pth-codemod] completed successfully");
