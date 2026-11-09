import { z } from "zod";
import { buscarFormato } from "./campanhas";

export const socialCampaignSchema = z.object({
  id: z.string().uuid().optional(),
  expectedRevision: z.number().int().positive().optional(),
  imovel_id: z.string().uuid(),
  destino: z.enum(["instagram", "facebook", "google", "tiktok", "linkedin"]),
  formato: z.string(),
  fotos: z.array(z.string().min(1)).min(1).max(10),
  prompt: z.string().trim().max(2000).nullable(),
  finalidade: z.enum(["anuncio_pago", "post_organico"]),
}).strict().superRefine((value, ctx) => {
  const formato = buscarFormato(value.destino, value.formato);
  if (!formato || value.fotos.length > formato.maxFotos) ctx.addIssue({ code: "custom", message: "Formato ou quantidade de fotos inválidos." });
  if (new Set(value.fotos).size !== value.fotos.length) ctx.addIssue({ code: "custom", message: "Não repita fotos." });
  if (value.id && !value.expectedRevision) ctx.addIssue({ code: "custom", message: "Reabra a campanha antes de salvar." });
});
export type SocialCampaignInput = z.infer<typeof socialCampaignSchema>;

export function estruturaMudou(old: { destino: string; formato: string; fotos: string[] }, next: { destino: string; formato: string; fotos: string[] }) {
  return old.destino !== next.destino || old.formato !== next.formato || JSON.stringify(old.fotos) !== JSON.stringify(next.fotos);
}

export interface CardRoteiro { ordem: number; foto: string; texto: string }
export function montarRoteiroValidado(fotos: string[], textos: string[]): CardRoteiro[] {
  if (fotos.length > 10) throw new Error("O carrossel aceita no máximo 10 fotos.");
  if (textos.length !== fotos.length) throw new Error(`Preencha os ${fotos.length} textos esperados.`);
  const vistos = new Set<string>();
  return textos.map((valor, ordem) => {
    const texto = valor.replace(/\s+/g, " ").trim().slice(0, 90);
    if (!texto || /\b(card|slide)\s*\d+\b|saiba\s+mais|clique\s+aqui|arraste\s+para|agende\s+sua\s+visita/i.test(texto)) throw new Error("A chamada deve ficar fora da arte.");
    const chave = texto.toLocaleLowerCase("pt-BR");
    if (vistos.has(chave)) throw new Error("O roteiro repetiu um texto.");
    vistos.add(chave);
    return { ordem, foto: fotos[ordem] ?? "", texto };
  });
}