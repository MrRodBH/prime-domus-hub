import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { authorizeTenantCmsOperation } from "@/lib/api/tenant-cms-authority.server";
import { authorizeTenantCrmOperation } from "@/lib/api/tenant-crm-authority.server";

const propertyInputSchema = z.object({
  titulo: z.string().max(300).optional().default(""),
  tipo: z.string().max(120).optional().default(""),
  finalidade: z.string().max(120).optional().default(""),
  bairro: z.string().max(200).optional().default(""),
  endereco: z.string().max(1000).optional().default(""),
  quartos: z.number().nullable().optional(),
  suites: z.number().nullable().optional(),
  banheiros: z.number().nullable().optional(),
  vagas: z.number().nullable().optional(),
  area_util: z.number().nullable().optional(),
  area_total: z.number().nullable().optional(),
  preco: z.number().nullable().optional(),
  preco_sob_consulta: z.boolean().optional().default(false),
  caracteristicas: z.array(z.string().max(120)).max(100).optional().default([]),
  tom: z.enum(["sofisticado", "objetivo", "acolhedor"]).optional().default("sofisticado"),
}).strict();

function sentence(parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

function deterministicPropertyDraft(data: z.infer<typeof propertyInputSchema>): string {
  const identity = sentence([
    data.titulo || "Imóvel",
    data.tipo && `tipo ${data.tipo}`,
    data.finalidade && `para ${data.finalidade}`,
  ]);
  const dimensions = sentence([
    data.quartos != null && `${data.quartos} quarto(s)`,
    data.suites != null && `${data.suites} suíte(s)`,
    data.banheiros != null && `${data.banheiros} banheiro(s)`,
    data.vagas != null && `${data.vagas} vaga(s)`,
    data.area_util != null && `${data.area_util} m² úteis`,
    data.area_total != null && `${data.area_total} m² totais`,
  ]);
  const location = sentence([data.bairro, data.endereco]);
  const features = data.caracteristicas.length
    ? `Características informadas: ${data.caracteristicas.join(", ")}.`
    : "";
  const price = data.preco_sob_consulta
    ? "Valor sob consulta."
    : data.preco != null
      ? `Valor informado: ${data.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
      : "";
  const opening = data.tom === "objetivo"
    ? `${identity}.`
    : data.tom === "acolhedor"
      ? `${identity}, apresentado com informações objetivas para apoiar sua avaliação.`
      : `${identity}, com ficha técnica consolidada para apresentação comercial.`;
  return [
    opening,
    dimensions ? `Configuração: ${dimensions}.` : "",
    location ? `Localização informada: ${location}.` : "",
    features,
    price,
    "Revise e complemente este rascunho antes da publicação.",
  ].filter(Boolean).join("\n\n");
}

/**
 * Gerador local determinístico. Não executa IA, provider externo ou credencial.
 * O nome histórico do export é preservado somente para compatibilidade de caller.
 */
export const gerarDescricaoImovel = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => propertyInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await authorizeTenantCmsOperation(context, "cms.paginas", "save_draft");
    return {
      descricao: deterministicPropertyDraft(data),
      generationMode: "deterministic_local" as const,
      externalProviderExecuted: false as const,
    };
  });

const seoInputSchema = z.object({
  nome: z.string().trim().min(1).max(300),
  descricao: z.string().max(200000).optional().default(""),
  construtora: z.string().max(300).optional().default(""),
  endereco: z.string().max(1000).optional().default(""),
  quartos: z.number().nullable().optional(),
  suites: z.number().nullable().optional(),
  vagas: z.number().nullable().optional(),
  area_apartamentos: z.number().nullable().optional(),
  entrega: z.string().max(40).optional().default(""),
  amenidades: z.array(z.string().max(120)).max(100).optional().default([]),
}).strict();

export const gerarSeoLancamento = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => seoInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await authorizeTenantCmsOperation(context, "cms.paginas", "save_draft");
    const details = sentence([
      data.construtora && `da ${data.construtora}`,
      data.quartos != null && `${data.quartos} quarto(s)`,
      data.suites != null && `${data.suites} suíte(s)`,
      data.vagas != null && `${data.vagas} vaga(s)`,
      data.area_apartamentos != null && `${data.area_apartamentos} m²`,
      data.endereco,
      data.entrega && `entrega ${data.entrega}`,
    ]);
    return {
      meta_title: `${data.nome} — RM Prime Imóveis`.slice(0, 60),
      meta_description: `${data.nome}${details ? `, ${details}` : ""}. Consulte os dados do empreendimento.`.slice(0, 160),
      generationMode: "deterministic_local" as const,
      externalProviderExecuted: false as const,
    };
  });

const funnelInputSchema = z.object({
  etapas: z.array(z.object({
    id: z.string().max(120),
    label: z.string().max(200),
    total: z.number().int().nonnegative(),
  }).strict()).max(100),
}).strict();

export const gerarInsightsFunil = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => funnelInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await authorizeTenantCrmOperation(context, "lead.read");
    const ordered = [...data.etapas].sort((a, b) => b.total - a.total);
    const total = data.etapas.reduce((sum, item) => sum + item.total, 0);
    const largest = ordered[0];
    const smallest = ordered.at(-1);
    const insight = total === 0
      ? "O funil não possui registros no recorte informado. Revise o período e as fontes de entrada."
      : `Total no funil: ${total}. Maior concentração: ${largest?.label ?? "não identificada"} (${largest?.total ?? 0}). Menor concentração: ${smallest?.label ?? "não identificada"} (${smallest?.total ?? 0}). Valide transições e SLAs antes de definir ações.`;
    return {
      insight,
      generationMode: "deterministic_local" as const,
      externalProviderExecuted: false as const,
    };
  });
