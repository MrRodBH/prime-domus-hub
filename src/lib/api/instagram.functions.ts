import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado: requer permissão de administrador.");
}

const GerarInput = z.object({
  imovel_id: z.string().uuid().optional(),
  launch_project_id: z.string().uuid().optional(),
  tom: z.enum(["sofisticado", "objetivo", "acolhedor"]).optional().default("sofisticado"),
  formato: z.enum(["feed", "story", "reels"]).optional().default("feed"),
}).refine((v) => !!v.imovel_id !== !!v.launch_project_id, {
  message: "Informe imovel_id OU launch_project_id (apenas um).",
});

async function buildFicha(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  imovel_id?: string,
  launch_project_id?: string,
): Promise<string> {
  if (imovel_id) {
    const { data: imv, error } = await context.supabase
      .from("imoveis")
      .select("titulo, tipo, finalidade, descricao, preco, preco_sob_consulta, quartos, suites, banheiros, vagas, area_util, area_total, caracteristicas, endereco, bairro:bairros(nome), badge")
      .eq("id", imovel_id)
      .single();
    if (error || !imv) throw new Error("Imóvel não encontrado.");
    return [
      imv.titulo && `Título: ${imv.titulo}`,
      imv.tipo && `Tipo: ${imv.tipo}`,
      imv.finalidade && `Finalidade: ${imv.finalidade}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imv.bairro as any)?.nome && `Bairro: ${(imv.bairro as any).nome}`,
      imv.endereco && `Endereço: ${imv.endereco}`,
      imv.quartos != null && `${imv.quartos} quartos`,
      imv.suites != null && `${imv.suites} suítes`,
      imv.banheiros != null && `${imv.banheiros} banheiros`,
      imv.vagas != null && `${imv.vagas} vagas`,
      imv.area_util != null && `${imv.area_util} m² úteis`,
      imv.area_total != null && `${imv.area_total} m² totais`,
      imv.preco_sob_consulta
        ? "Valor sob consulta"
        : imv.preco != null && `Preço: R$ ${Number(imv.preco).toLocaleString("pt-BR")}`,
      Array.isArray(imv.caracteristicas) && imv.caracteristicas.length > 0 &&
        `Características: ${imv.caracteristicas.join(", ")}`,
      imv.descricao && `Descrição do anúncio:\n${imv.descricao}`,
    ].filter(Boolean).join("\n");
  }
  // Lançamento
  const { data: lp, error } = await context.supabase
    .from("launch_projects")
    .select("nome, descricao, construtora, entrega, endereco, arquitetura, quartos, suites, vagas, area_apartamentos, numero_unidades, numero_torres, numero_andares, status:launch_statuses(nome)")
    .eq("id", launch_project_id)
    .single();
  if (error || !lp) throw new Error("Lançamento não encontrado.");
  const { data: amen } = await context.supabase
    .from("launch_project_amenities")
    .select("amenity:launch_amenities(nome)")
    .eq("project_id", launch_project_id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lazer = (amen ?? []).map((r: any) => r.amenity?.nome).filter(Boolean);
  const { data: units } = await context.supabase
    .from("launch_units")
    .select("valor")
    .eq("project_id", launch_project_id)
    .not("valor", "is", null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valores = (units ?? []).map((u: any) => Number(u.valor)).filter((n: number) => Number.isFinite(n) && n > 0);
  const valorMin = valores.length ? Math.min(...valores) : null;
  return [
    lp.nome && `Empreendimento: ${lp.nome}`,
    "Tipo: Lançamento",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lp.status as any)?.nome && `Status: ${(lp.status as any).nome}`,
    lp.construtora && `Construtora: ${lp.construtora}`,
    lp.arquitetura && `Arquitetura: ${lp.arquitetura}`,
    lp.entrega && `Entrega: ${String(lp.entrega).slice(0, 7)}`,
    lp.endereco && `Endereço: ${lp.endereco}`,
    lp.quartos != null && `${lp.quartos} quartos`,
    lp.suites != null && `${lp.suites} suítes`,
    lp.vagas != null && `${lp.vagas} vagas`,
    lp.area_apartamentos != null && `Área: ${lp.area_apartamentos} m²`,
    lp.numero_unidades != null && `${lp.numero_unidades} unidades`,
    lp.numero_torres != null && `${lp.numero_torres} torres`,
    lp.numero_andares != null && `${lp.numero_andares} andares`,
    valorMin && `A partir de R$ ${valorMin.toLocaleString("pt-BR")}`,
    lazer.length > 0 && `Lazer: ${lazer.join(", ")}`,
    lp.descricao && `Descrição:\n${String(lp.descricao).replace(/<[^>]+>/g, " ").slice(0, 1200)}`,
  ].filter(Boolean).join("\n");
}

export const igGerarPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GerarInput.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const ficha = await buildFicha(context, data.imovel_id, data.launch_project_id);

    const tomDesc: Record<string, string> = {
      sofisticado: "tom sofisticado, alto padrão, elegante",
      objetivo: "tom direto, informativo, sem floreios",
      acolhedor: "tom caloroso e convidativo",
    };
    const formatoDesc: Record<string, string> = {
      feed: "post de feed (carrossel até 10 fotos)",
      story: "story (texto curto, frases de impacto)",
      reels: "Reels (gancho forte na 1ª linha, ritmo)",
    };

    const system =
      "Você é redator de social media especializado em imóveis de alto padrão no Brasil. " +
      "Escreve em português do Brasil, sem clichês, sem emojis excessivos (máximo 2-3 bem colocados), " +
      "sem inventar atributos. Use apenas as informações fornecidas.";

    const user = `Gere um ${formatoDesc[data.formato]} para Instagram com ${tomDesc[data.tom]}.

Informações:
${ficha}

Saída em JSON estrito, no formato:
{
  "legenda": "texto da legenda, com quebras de linha, 4 a 8 linhas, terminando com chamada para ação (DM, link na bio ou WhatsApp). NÃO inclua hashtags aqui.",
  "hashtags": "string com 12 a 18 hashtags separadas por espaço, começando com # — misture marca (#RMPrimeImoveis), localidade (bairro/cidade), nicho (#imovelaltopadrao, #lancamentoimobiliario, etc.) e tipo"
}

Responda APENAS o JSON, sem markdown, sem comentários.`;

    const modelo = "google/gemini-3-flash-preview";
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Falha na IA (${resp.status}): ${t.slice(0, 200)}`);
    }
    const j = await resp.json();
    const raw: string = j?.choices?.[0]?.message?.content ?? "";
    let legenda = "";
    let hashtags = "";
    try {
      const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      legenda = String(parsed.legenda ?? "").trim();
      hashtags = String(parsed.hashtags ?? "").trim();
    } catch {
      throw new Error("A IA retornou um formato inesperado. Tente novamente.");
    }
    if (!legenda) throw new Error("A IA não gerou legenda.");

    return { legenda, hashtags, modelo };
  });

const SalvarInput = z.object({
  id: z.string().uuid().optional(),
  imovel_id: z.string().uuid().optional(),
  launch_project_id: z.string().uuid().optional(),
  legenda: z.string(),
  hashtags: z.string(),
  imagem_ids: z.array(z.string().uuid()).default([]),
  status: z.enum(["rascunho", "aprovado", "publicado"]).default("rascunho"),
  modelo_ia: z.string().optional().nullable(),
}).refine((v) => v.id || !!v.imovel_id !== !!v.launch_project_id, {
  message: "Informe imovel_id OU launch_project_id (apenas um).",
});

export const igSalvarPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SalvarInput.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.id) {
      const { error } = await context.supabase
        .from("instagram_posts")
        .update({
          legenda: data.legenda,
          hashtags: data.hashtags,
          imagem_ids: data.imagem_ids,
          status: data.status,
          modelo_ia: data.modelo_ia ?? null,
          publicado_em: data.status === "publicado" ? new Date().toISOString() : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("instagram_posts")
      .insert({
        imovel_id: data.imovel_id ?? null,
        launch_project_id: data.launch_project_id ?? null,
        legenda: data.legenda,
        hashtags: data.hashtags,
        imagem_ids: data.imagem_ids,
        status: data.status,
        modelo_ia: data.modelo_ia ?? null,
        created_by: context.userId,
        publicado_em: data.status === "publicado" ? new Date().toISOString() : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

const ListarInput = z.object({
  imovel_id: z.string().uuid().optional(),
  launch_project_id: z.string().uuid().optional(),
}).refine((v) => !!v.imovel_id !== !!v.launch_project_id, {
  message: "Informe imovel_id OU launch_project_id.",
});

export const igListarPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListarInput.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase.from("instagram_posts").select("*").order("created_at", { ascending: false });
    if (data.imovel_id) q = q.eq("imovel_id", data.imovel_id);
    else q = q.eq("launch_project_id", data.launch_project_id!);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const igExcluirPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("instagram_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
