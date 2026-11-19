const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const MOEDA_CENTAVOS = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarPreco(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return MOEDA.format(valor);
}

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return MOEDA_CENTAVOS.format(valor);
}

export function formatarData(valor: string | null | undefined): string {
  if (!valor) return "—";
  return new Date(valor).toLocaleDateString("pt-BR");
}

export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatarArea(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return `${new Intl.NumberFormat("pt-BR").format(valor)} m²`;
}

export function apenasNumeros(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Converte um título em endereço de página (mesma regra usada no banco). */
export function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
