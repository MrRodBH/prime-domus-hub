// Conversões entre o formulário aprovado da RM Prime e o cadastro de imóveis do SaaS.
const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function formatarPreco(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return MOEDA.format(valor);
}

export function gerarSlug(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const TIPOS_IMOVEL = [
  ["apartamento", "Apartamento"], ["cobertura", "Cobertura"], ["casa", "Casa"],
  ["casa_condominio", "Casa em condomínio"], ["garden", "Garden"], ["terreno", "Terreno"], ["comercial", "Comercial"],
] as const;

/** RM Prime usa "ativo | inativo | vendido"; o SaaS também guarda rascunho/reservado. */
export type StatusPainel = "ativo" | "inativo" | "vendido";
export function statusPainel(status: string): StatusPainel {
  if (status === "ativo" || status === "vendido") return status;
  return "inativo";
}

/** O endereço textual do SaaS guarda "Logradouro, número - Bairro"; o bairro é a parte após o último " - ". */
export function bairroDoEndereco(endereco: string | null | undefined): string {
  if (!endereco) return "";
  const i = endereco.lastIndexOf(" - ");
  return i >= 0 ? endereco.slice(i + 3).trim() : "";
}

export function montarEndereco(p: { logradouro: string; numero: string; bairro: string }): string | null {
  const base = [p.logradouro, p.numero].filter(Boolean).join(", ");
  const texto = [base, p.bairro].filter(Boolean).join(" - ");
  return texto || null;
}
