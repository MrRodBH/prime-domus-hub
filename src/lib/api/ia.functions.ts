import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  titulo: z.string().optional().default(""),
  tipo: z.string().optional().default(""),
  finalidade: z.string().optional().default(""),
  bairro: z.string().optional().default(""),
  endereco: z.string().optional().default(""),
  quartos: z.number().nullable().optional(),
  suites: z.number().nullable().optional(),
  banheiros: z.number().nullable().optional(),
  vagas: z.number().nullable().optional(),
  area_util: z.number().nullable().optional(),
  area_total: z.number().nullable().optional(),
  preco: z.number().nullable().optional(),
  preco_sob_consulta: z.boolean().optional().default(false),
  caracteristicas: z.array(z.string()).optional().default([]),
  tom: z.enum(["sofisticado", "objetivo", "acolhedor"]).optional().default("sofisticado"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado: requer permissão de administrador.");
}

export const gerarDescricaoImovel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const ficha = [
      data.titulo && `Título de referência: ${data.titulo}`,
      data.tipo && `Tipo: ${data.tipo}`,
      data.finalidade && `Finalidade: ${data.finalidade}`,
      data.bairro && `Bairro: ${data.bairro}`,
      data.endereco && `Endereço: ${data.endereco}`,
      data.quartos != null && `${data.quartos} quartos`,
      data.suites != null && `${data.suites} suítes`,
      data.banheiros != null && `${data.banheiros} banheiros`,
      data.vagas != null && `${data.vagas} vagas`,
      data.area_util != null && `${data.area_util} m² úteis`,
      data.area_total != null && `${data.area_total} m² totais`,
      data.preco_sob_consulta
        ? "Valor sob consulta"
        : data.preco != null &&
          `Preço: R$ ${data.preco.toLocaleString("pt-BR")}`,
      data.caracteristicas.length > 0 &&
        `Características: ${data.caracteristicas.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const tomDesc: Record<string, string> = {
      sofisticado: "tom sofisticado, refinado, alinhado a alto padrão imobiliário",
      objetivo: "tom direto, claro e informativo, sem floreios",
      acolhedor: "tom caloroso, humano e convidativo",
    };

    const system =
      "Você é um redator publicitário sênior especializado em imóveis de alto padrão no Brasil. " +
      "Escreve descrições em português do Brasil, sem clichês baratos, sem inventar características " +
      "que não foram fornecidas, sem prometer rentabilidade. Nunca use emojis.";

    const user = `Gere uma descrição de imóvel com ${tomDesc[data.tom]}.

Use apenas as informações abaixo (não invente nada que não esteja aqui):
${ficha}

Formato de saída (texto puro, sem markdown):
- 1 parágrafo de abertura com 2 a 3 frases destacando o diferencial principal.
- 1 parágrafo descrevendo a planta e os ambientes.
- 1 parágrafo sobre localização e estilo de vida (se houver bairro/endereço).
- Encerre com uma frase de convite à visita.

Limite: 900 a 1300 caracteres no total. Não use listas, títulos ou markdown.`;

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
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (resp.status === 429) {
      throw new Error("Limite de uso da IA atingido. Tente novamente em alguns instantes.");
    }
    if (resp.status === 402) {
      throw new Error("Créditos de IA esgotados. Adicione créditos no workspace para continuar.");
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Falha na IA (${resp.status}): ${text.slice(0, 200)}`);
    }

    const json = await resp.json();
    const descricao: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!descricao) throw new Error("A IA não retornou descrição.");

    return { descricao };
  });

const SeoInputSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().default(""),
  construtora: z.string().optional().default(""),
  endereco: z.string().optional().default(""),
  quartos: z.number().nullable().optional(),
  suites: z.number().nullable().optional(),
  vagas: z.number().nullable().optional(),
  area_apartamentos: z.number().nullable().optional(),
  entrega: z.string().optional().default(""),
  amenidades: z.array(z.string()).optional().default([]),
});

function fallbackSeo(data: z.infer<typeof SeoInputSchema>) {
  const meta_title = `${data.nome} — RM Prime Imóveis`.slice(0, 60);
  const detalhes = [
    data.quartos != null && `${data.quartos} quartos`,
    data.suites != null && `${data.suites} suítes`,
    data.vagas != null && `${data.vagas} vagas`,
    data.area_apartamentos != null && `${data.area_apartamentos} m²`,
    data.endereco,
  ].filter(Boolean).join(", ");
  const meta_description = `${data.nome}${data.construtora ? `, da ${data.construtora}` : ""}. ${detalhes || "Empreendimento exclusivo"}. Conheça este lançamento com a RM Prime Imóveis.`.slice(0, 160);
  return { meta_title, meta_description };
}

export const gerarSeoLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SeoInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return fallbackSeo(data);

    const ficha = [
      `Nome: ${data.nome}`,
      data.construtora && `Construtora: ${data.construtora}`,
      data.endereco && `Endereço: ${data.endereco}`,
      data.quartos != null && `${data.quartos} quartos`,
      data.suites != null && `${data.suites} suítes`,
      data.vagas != null && `${data.vagas} vagas`,
      data.area_apartamentos != null && `${data.area_apartamentos} m²`,
      data.entrega && `Entrega: ${data.entrega}`,
      data.amenidades.length > 0 && `Lazer: ${data.amenidades.join(", ")}`,
      data.descricao && `Descrição: ${data.descricao.replace(/<[^>]*>/g, " ").slice(0, 800)}`,
    ].filter(Boolean).join("\n");

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
          { role: "system", content: "Você é especialista em SEO imobiliário no Brasil. Responda somente JSON válido, sem markdown." },
          { role: "user", content: `Gere SEO para a página de detalhe deste lançamento imobiliário.\n\nRegras:\n- meta_title com até 60 caracteres.\n- meta_description com até 155 caracteres.\n- Português do Brasil.\n- Sem aspas internas, emojis ou promessas de rentabilidade.\n\nResponda APENAS neste formato JSON: {"meta_title":"...","meta_description":"..."}\n\n${ficha}` },
        ],
      }),
    });

    if (!resp.ok) return fallbackSeo(data);
    const json = await resp.json();
    const content: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    try {
      const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```$/i, "")) as { meta_title?: string; meta_description?: string };
      const meta_title = (parsed.meta_title ?? "").trim().slice(0, 60);
      const meta_description = (parsed.meta_description ?? "").trim().slice(0, 160);
      if (meta_title && meta_description) return { meta_title, meta_description };
    } catch {
      // usa fallback abaixo
    }
    return fallbackSeo(data);
  });

const FunilInput = z.object({
  etapas: z.array(z.object({
    id: z.string(),
    label: z.string(),
    total: z.number(),
  })),
});

export const gerarInsightsFunil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FunilInput.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const ficha = data.etapas.map((e) => `${e.label}: ${e.total}`).join(" | ");
    const system =
      "Você é um especialista em vendas imobiliárias de alto padrão. " +
      "Analisa funis de vendas e gera insights curtos, práticos e acionáveis em português do Brasil. Nunca use emojis ou markdown.";
    const user = `Analise o momento atual deste funil de vendas (quantidade de leads por etapa):
${ficha}

Gere uma análise objetiva em 3 a 4 frases curtas, identificando gargalos, oportunidades e uma recomendação prática para o corretor. Máximo 500 caracteres. Texto corrido, sem listas.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Falha na IA (${resp.status}): ${t.slice(0, 200)}`);
    }
    const json = await resp.json();
    const insight: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    return { insight };
  });
