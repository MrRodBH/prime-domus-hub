// Regras do formulário de landing page copiadas do RM Prime Imóveis.
export function gerarSlug(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function normalizarSlug(texto: string) {
  return gerarSlug(texto).slice(0, 120);
}

/** Sugestão compacta, sem cortar palavras nem alterar endereços já publicados. */
export function sugerirSlugLandingPage(titulo: string): string {
  const palavras = gerarSlug(titulo.normalize("NFKD")).split("-").filter((palavra) =>
    palavra && !["a", "o", "as", "os", "de", "da", "do", "das", "dos", "em", "com", "e", "para", "venda"].includes(palavra),
  );
  const resultado: string[] = [];
  for (const palavra of palavras) {
    if ([...resultado, palavra].join("-").length > 60) break;
    resultado.push(palavra);
  }
  return resultado.join("-") || gerarSlug(titulo).slice(0, 60).replace(/-+$/g, "");
}

export interface ConteudoLandingPage {
  titulo?: string;
  subtitulo?: string;
  texto?: string;
  cor_destaque?: string;
}
