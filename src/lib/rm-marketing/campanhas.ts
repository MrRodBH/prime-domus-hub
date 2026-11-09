export type DestinoCampanha = "instagram" | "facebook" | "google" | "tiktok" | "linkedin";

export interface FormatoCampanha {
  id: string;
  rotulo: string;
  largura: number;
  altura: number;
  /** Quantidade máxima de fotos/peças do criativo. */
  maxFotos: number;
  video?: boolean;
}

export const ROTULOS_DESTINO: Record<DestinoCampanha, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};

const META: FormatoCampanha[] = [
  { id: "feed_1x1", rotulo: "Feed estático 1:1", largura: 1080, altura: 1080, maxFotos: 1 },
  { id: "feed_4x5", rotulo: "Feed estático 4:5", largura: 1080, altura: 1350, maxFotos: 1 },
  { id: "carrossel", rotulo: "Feed carrossel (até 10)", largura: 1080, altura: 1080, maxFotos: 10 },
  { id: "stories", rotulo: "Stories 9:16", largura: 1080, altura: 1920, maxFotos: 1 },
  { id: "reels", rotulo: "Reels vídeo 9:16", largura: 1080, altura: 1920, maxFotos: 10, video: true },
];

export const FORMATOS_POR_DESTINO: Record<DestinoCampanha, FormatoCampanha[]> = {
  instagram: META,
  facebook: META,
  tiktok: [{ id: "video_9x16", rotulo: "Vídeo 9:16", largura: 1080, altura: 1920, maxFotos: 10, video: true }],
  linkedin: [
    { id: "feed_1x1", rotulo: "Feed 1:1", largura: 1080, altura: 1080, maxFotos: 1 },
    { id: "feed_191x1", rotulo: "Feed 1,91:1", largura: 1200, altura: 628, maxFotos: 1 },
    { id: "carrossel", rotulo: "Carrossel (até 10)", largura: 1080, altura: 1080, maxFotos: 10 },
  ],
  google: [
    { id: "display_1x1", rotulo: "Display 1:1", largura: 1200, altura: 1200, maxFotos: 1 },
    { id: "display_191x1", rotulo: "Display 1,91:1", largura: 1200, altura: 628, maxFotos: 1 },
    { id: "display_4x5", rotulo: "Display 4:5", largura: 960, altura: 1200, maxFotos: 1 },
  ],
};

export function buscarFormato(destino: string, formato: string): FormatoCampanha | undefined {
  return FORMATOS_POR_DESTINO[destino as DestinoCampanha]?.find((f) => f.id === formato);
}

/** Campanha só pode ser editada ou gerada com o imóvel ativo. */
export function campanhaEditavel(statusImovel: string): boolean {
  return statusImovel === "ativo";
}

/** Tamanho pedido à IA (múltiplos de 16, mesma proporção do formato). */
export function tamanhoGeracao(formato: FormatoCampanha): { largura: number; altura: number } {
  const proporcao = formato.largura / formato.altura;
  if (proporcao > 1.5) return { largura: 1536, altura: 800 };
  if (proporcao < 0.6) return { largura: 1024, altura: 1824 };
  if (proporcao < 0.9) return { largura: 1024, altura: 1280 };
  return { largura: 1024, altura: 1024 };
}

/** Limites de texto usados na geração da copy por destino. */
export const LIMITES_COPY: Record<DestinoCampanha, { copy: number; legenda: number; cta: number; hashtags: number }> = {
  instagram: { copy: 125, legenda: 2200, cta: 30, hashtags: 15 },
  facebook: { copy: 125, legenda: 2000, cta: 30, hashtags: 5 },
  google: { copy: 30, legenda: 90, cta: 15, hashtags: 0 },
  tiktok: { copy: 100, legenda: 2200, cta: 30, hashtags: 8 },
  linkedin: { copy: 150, legenda: 3000, cta: 30, hashtags: 5 },
};

/** Ajusta a copy aos limites do destino (corta textos e quantidade de hashtags). */
export function ajustarCopy(
  destino: DestinoCampanha,
  copy: { copy_principal: string; legenda: string; cta: string; hashtags: string[] },
) {
  const l = LIMITES_COPY[destino];
  const tags = copy.hashtags
    .map((h) => h.trim().replace(/^#*/, "").replace(/\s+/g, ""))
    .filter(Boolean)
    .slice(0, l.hashtags)
    .map((h) => `#${h}`);
  return {
    copy_principal: copy.copy_principal.trim().slice(0, l.copy),
    legenda: copy.legenda.trim().slice(0, l.legenda),
    cta: copy.cta.trim().slice(0, l.cta),
    hashtags: tags.join(" "),
  };
}

/** Conteúdo do arquivo .txt baixado com a campanha. */
export function textoCopyTxt(c: {
  codigo: string;
  destino: string;
  formato: string;
  copy_principal: string | null;
  legenda: string | null;
  cta: string | null;
  hashtags: string | null;
  url_lp?: string | null;
}) {
  return [
    `Campanha ${c.codigo} — ${ROTULOS_DESTINO[c.destino as DestinoCampanha] ?? c.destino} — ${buscarFormato(c.destino, c.formato)?.rotulo ?? c.formato}`,
    "",
    "COPY PRINCIPAL",
    c.copy_principal ?? "",
    "",
    "LEGENDA",
    c.legenda ?? "",
    "",
    "CHAMADA (CTA)",
    c.cta ?? "",
    "",
    "HASHTAGS",
    c.hashtags ?? "",
    ...(c.url_lp ? ["", "LINK", c.url_lp] : []),
    "",
  ].join("\n");
}

/** Vídeos de campanha: limite de 50 MB. */
export const LIMITE_VIDEO_BYTES = 50 * 1024 * 1024;

/** Extensão do arquivo para os tipos de vídeo aceitos; null quando não aceito. */
export function extensaoVideo(mime: string): string | null {
  const tipos: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
  return tipos[mime] ?? null;
}

/** Duração do slideshow: 2,5 s por foto + 2 s do cartão final, limitado a 60 s. */
export function duracaoSlideshow(fotos: number): number {
  return Math.min(60, fotos * 2.5 + 2);
}

/** Vídeo com IA: um clipe de 8 s, vertical, a partir de uma foto real. */
export const SEGUNDOS_VIDEO_IA = 8;

export function montarPromptVideoIa(o: { titulo: string; tipo: string | null; pedido: string | null }): string {
  return [
    `Real estate social media video of the property "${o.titulo}" based on <FIRST_FRAME>, the real photo of the property.`,
    "Slow, smooth cinematic camera movement (gentle dolly-in or pan) in a single continuous shot, no scene cuts.",
    "Keep the architecture, rooms, furniture and layout exactly as in the photo; do not invent rooms, people or objects.",
    "Warm natural light, premium and inviting mood. Soft elegant instrumental music, no dialogue, no voice-over.",
    "No on-screen text, no logos, no watermarks.",
    o.pedido ? `Creative direction from the campaign manager (Portuguese): ${o.pedido}` : "",
    "Consider micro-detail and timing.",
  ].filter(Boolean).join(" ");
}
