import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server function genérica de IA para o componente <AiActions />.
 * Cobre múltiplas entidades/campos sem exigir uma fn dedicada por caso.
 *
 * Modelo padrão: google/gemini-3-flash-preview (Lovable AI Gateway).
 */

const AiActionInput = z.object({
  // Contexto semântico
  entity: z.enum([
    "imovel", "lancamento", "blog_post", "cms_page", "cms_campaign",
    "cms_form", "lead", "seo", "descricao", "generico",
  ]),
  field: z.enum([
    "titulo", "descricao", "resumo", "meta_title", "meta_description",
    "cta", "assunto", "copy", "traducao", "melhoria",
  ]),
  action: z.enum(["gerar", "melhorar", "resumir", "traduzir", "encurtar", "expandir"]).default("gerar"),
  language: z.enum(["pt-BR", "en", "es"]).default("pt-BR"),
  tone: z.enum(["sofisticado", "objetivo", "acolhedor", "vendedor", "editorial"]).default("sofisticado"),
  // Payload livre — o consumidor descreve o contexto que a IA deve usar
  context: z.record(z.string(), z.unknown()).default({}),
  // Texto de base (para melhorar/resumir/traduzir)
  base: z.string().optional().default(""),
  // Limite indicativo de caracteres na resposta
  maxChars: z.number().int().positive().optional(),
});

export type AiActionInputT = z.infer<typeof AiActionInput>;

const TONE_MAP: Record<AiActionInputT["tone"], string> = {
  sofisticado: "tom sofisticado, refinado, alto padrão",
  objetivo: "tom direto e claro, sem floreios",
  acolhedor: "tom caloroso e convidativo",
  vendedor: "tom persuasivo e comercial, focado em conversão",
  editorial: "tom editorial, jornalístico, com fluidez narrativa",
};

const ACTION_MAP: Record<AiActionInputT["action"], string> = {
  gerar: "Gere",
  melhorar: "Reescreva melhorando clareza e fluência",
  resumir: "Resuma preservando pontos-chave",
  traduzir: "Traduza",
  encurtar: "Reescreva de forma mais concisa",
  expandir: "Reescreva com mais detalhes e riqueza descritiva",
};

const LANG_MAP: Record<AiActionInputT["language"], string> = {
  "pt-BR": "português do Brasil",
  en: "English",
  es: "español",
};

function buildPrompt(input: AiActionInputT) {
  const ctxLines = Object.entries(input.context)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join("\n");

  const constraints = [
    `Idioma: ${LANG_MAP[input.language]}.`,
    `Estilo: ${TONE_MAP[input.tone]}.`,
    input.maxChars ? `Limite: até ${input.maxChars} caracteres.` : null,
    "Sem markdown, sem emojis, sem clichês, sem inventar dados não fornecidos.",
  ].filter(Boolean).join(" ");

  const target = `${ACTION_MAP[input.action]} conteúdo para o campo "${input.field}" da entidade "${input.entity}".`;

  const baseBlock = input.base ? `\n\nTexto base:\n"""\n${input.base}\n"""` : "";
  const ctxBlock = ctxLines ? `\n\nContexto disponível:\n${ctxLines}` : "";

  return `${target}\n\n${constraints}${ctxBlock}${baseBlock}\n\nResponda somente com o texto final, sem preâmbulo.`;
}

export const executarAiAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AiActionInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const system =
      "Você é um redator sênior especializado em conteúdo de alto padrão para o mercado imobiliário. " +
      "Nunca invente características, valores, prazos ou dados que não estejam explicitamente no contexto. " +
      "Nunca use emojis, markdown, listas ou títulos, salvo instrução explícita.";

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
          { role: "user", content: buildPrompt(data) },
        ],
      }),
    });

    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Falha na IA (${resp.status}): ${t.slice(0, 200)}`);
    }

    const json = await resp.json();
    const output: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!output) throw new Error("A IA não retornou conteúdo.");
    return { output };
  });
