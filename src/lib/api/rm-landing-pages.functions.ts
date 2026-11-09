// Landing pages da RM Prime adaptadas ao tenant: escrita só por Admin ativo do tenant (RLS is_active_tenant_admin).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import type { ConteudoLandingPage } from "@/lib/rm-marketing/landing-page-form";

type Ctx = { tenantId: string; supabase: any };
const ctxDe = (context: unknown): Ctx => {
  const c = context as { tenant: { tenantId: string }; supabase: any };
  return { tenantId: c.tenant.tenantId, supabase: c.supabase };
};

async function exigirAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("is_active_tenant_admin", { _tenant_id: context.tenantId });
  if (error || !data) throw new Error("Apenas administradores da empresa podem alterar landing pages.");
}

export interface LandingPageAdmin {
  id: string;
  slug: string;
  imovel_id: string;
  publicada: boolean;
  conteudo: ConteudoLandingPage;
  imovel: { titulo: string; status: string } | null;
}

export const listarLandingPagesAdmin = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<LandingPageAdmin[]> => {
    const ctx = ctxDe(context);
    await exigirAdmin(ctx);
    const { data, error } = await ctx.supabase
      .from("tenant_landing_pages")
      .select("id, slug, imovel_id, publicada, conteudo, imovel:imoveis(tenant_id, titulo, status)")
      .eq("tenant_id", ctx.tenantId)
      .order("criado_em", { ascending: false });
    if (error) throw new Error("Não foi possível carregar as landing pages.");
    return (data ?? []).map((row: any) => {
      const im = Array.isArray(row.imovel) ? row.imovel[0] : row.imovel;
      if (im && im.tenant_id !== ctx.tenantId) throw new Error("Imóvel fora da empresa.");
      return { ...row, imovel: im ? { titulo: im.titulo, status: im.status } : null };
    });
  });

const lpSchema = z.object({
  id: z.string().uuid().optional(),
  imovel_id: z.string().uuid("Selecione o imóvel"),
  slug: z.string().trim().min(2, "Informe o endereço (slug)").max(120).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  titulo: z.string().trim().min(3, "Informe o título").max(180),
  subtitulo: z.string().trim().max(300).optional(),
  texto: z.string().trim().max(5000).optional(),
  cor_destaque: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").optional().or(z.literal("")),
  publicada: z.boolean(),
});
export type DadosLandingPage = z.infer<typeof lpSchema>;

export const salvarLandingPage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((entrada: DadosLandingPage) => lpSchema.parse(entrada))
  .handler(async ({ data, context }) => {
    const ctx = ctxDe(context);
    await exigirAdmin(ctx);
    const { id, ...c } = data;
    const payload = {
      tenant_id: ctx.tenantId,
      imovel_id: c.imovel_id,
      slug: c.slug,
      publicada: c.publicada,
      conteudo: { titulo: c.titulo, subtitulo: c.subtitulo || "", texto: c.texto || "", cor_destaque: c.cor_destaque || "" },
    };
    const r = id
      ? await ctx.supabase.from("tenant_landing_pages").update(payload).eq("id", id).eq("tenant_id", ctx.tenantId).select("id").single()
      : await ctx.supabase.from("tenant_landing_pages").insert(payload).select("id").single();
    if (r.error) {
      throw new Error(r.error.code === "23505" ? "Já existe uma landing page com este endereço (slug)." : "Não foi possível salvar a landing page.");
    }
    return { id: r.data.id as string };
  });

export const excluirLandingPage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((entrada: { id: string }) => z.object({ id: z.string().uuid() }).parse(entrada))
  .handler(async ({ data, context }) => {
    const ctx = ctxDe(context);
    await exigirAdmin(ctx);
    const { error } = await ctx.supabase.from("tenant_landing_pages").delete().eq("id", data.id).eq("tenant_id", ctx.tenantId);
    if (error) throw new Error("Não foi possível excluir a landing page.");
    return { ok: true as const };
  });

/** Sugestão editável gerada por IA a partir do imóvel; nada é publicado automaticamente. */
export const gerarDescricaoLandingPage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((e: { imovel_id: string; texto_base?: string }) =>
    z.object({ imovel_id: z.string().uuid(), texto_base: z.string().trim().max(5000).optional() }).parse(e))
  .handler(async ({ data, context }): Promise<{ texto: string }> => {
    const ctx = ctxDe(context);
    await exigirAdmin(ctx);
    const { data: im, error } = await ctx.supabase
      .from("imoveis")
      .select("titulo, descricao, tipo, preco, condominio, cidade, estado, quartos, banheiros, vagas, area_util, caracteristicas, bairro:bairros(nome)")
      .eq("id", data.imovel_id).eq("tenant_id", ctx.tenantId).maybeSingle();
    if (error || !im) throw new Error("Não foi possível carregar os dados do imóvel.");
    const chave = process.env.LOVABLE_API_KEY;
    if (!chave) throw new Error("A geração por IA não está disponível no momento.");
    const bairro = (Array.isArray(im.bairro) ? im.bairro[0] : im.bairro)?.nome ?? "—";
    const ficha = [
      `Título: ${im.titulo}`, `Tipo: ${im.tipo}`,
      im.preco ? `Preço: R$ ${Number(im.preco).toLocaleString("pt-BR")}` : null,
      im.condominio ? `Condomínio: R$ ${Number(im.condominio).toLocaleString("pt-BR")}` : null,
      `Bairro/cidade: ${bairro}, ${im.cidade ?? "—"} ${im.estado ?? ""}`.trim(),
      `Quartos: ${im.quartos ?? "—"} | Banheiros: ${im.banheiros ?? "—"} | Vagas: ${im.vagas ?? "—"} | Área: ${im.area_util ?? "—"} m²`,
      Array.isArray(im.caracteristicas) && im.caracteristicas.length ? `Características: ${im.caracteristicas.join(", ")}` : null,
      im.descricao ? `Descrição atual: ${im.descricao}` : null,
      data.texto_base ? `Texto base do corretor: ${data.texto_base}` : null,
    ].filter(Boolean).join("\n");
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você escreve textos de landing page de imóveis no Brasil, em português do Brasil. Regras: use no máximo 3 parágrafos curtos e no total no máximo 1200 caracteres; nunca invente fatos, medidas, nomes de comércios, escolas ou distâncias; fale do bairro apenas em termos gerais (conveniência, mobilidade, perfil da região); tom elegante e acolhedor, sem exageros, sem emojis, sem CAIXA ALTA e sem promessas de valorização." },
          { role: "user", content: `Escreva a descrição da landing page deste imóvel:\n\n${ficha}` },
        ],
      }),
    });
    if (resp.status === 429) throw new Error("Muitas gerações seguidas. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Os créditos de IA acabaram. Recarregue para continuar usando.");
    if (!resp.ok) throw new Error("A IA não respondeu agora. Tente novamente.");
    const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const texto = json.choices?.[0]?.message?.content?.trim();
    if (!texto) throw new Error("A IA não retornou texto. Tente novamente.");
    return { texto: texto.slice(0, 5000) };
  });

/** Leitura pública: só páginas publicadas da empresa do domínio, com imóvel ativo. */
export const obterLandingPagePublica = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().regex(/^[a-z0-9-]{2,120}$/) }).strict())
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lp, error } = await supabaseAdmin
      .from("tenant_landing_pages")
      .select("slug, conteudo, imovel:imoveis(tenant_id, slug, status)")
      .eq("tenant_id", tenant.id).eq("slug", data.slug).eq("publicada", true).maybeSingle();
    if (error) throw new Error("Não foi possível carregar a página.");
    if (!lp) return null;
    const im = (Array.isArray(lp.imovel) ? lp.imovel[0] : lp.imovel) as { tenant_id: string; slug: string; status: string } | null;
    if (!im || im.tenant_id !== tenant.id || im.status !== "ativo") return null;
    return { slug: lp.slug, conteudo: (lp.conteudo ?? {}) as ConteudoLandingPage, imovelSlug: im.slug };
  });
