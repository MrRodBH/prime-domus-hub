export type Mask = "cnpj" | "cpf" | "phone" | "cep";
export const digits = (value: string) => value.replace(/\D/g, "");
export const normalizeCnpj = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
function group(value: string, sizes: number[], separators: string[]) {
  let offset = 0;
  return sizes
    .map((size, index) => {
      const part = value.slice(offset, offset + size);
      offset += size;
      return part ? (index ? separators[index - 1] : "") + part : "";
    })
    .join("");
}
export function formatInput(value: string, mask?: Mask): string {
  if (!mask) return value;
  if (mask === "cnpj") {
    const raw = normalizeCnpj(value);
    const accepted = raw.slice(0, 12) + raw.slice(12).replace(/\D/g, "").slice(0, 2);
    return group(accepted, [2, 3, 3, 4, 2], [".", ".", "/", "-"]);
  }
  if (mask === "cpf") return group(digits(value).slice(0, 11), [3, 3, 3, 2], [".", ".", "-"]);
  if (mask === "cep") return group(digits(value).slice(0, 8), [5, 3], ["-"]);
  let raw = digits(value);
  if (raw.startsWith("55") && raw.length > 11) raw = raw.slice(2);
  raw = raw.slice(0, 11);
  if (!raw) return "";
  if (raw.length <= 2) return "(" + raw;
  return (
    "(" + raw.slice(0, 2) + ") " + group(raw.slice(2), raw.length > 10 ? [5, 4] : [4, 4], ["-"])
  );
}
export function maskFor(key: string): Mask | undefined {
  if (key === "cnpj") return "cnpj";
  if (key === "cpf") return "cpf";
  if (key === "zip" || key === "billingZip") return "cep";
  if (key === "whatsapp" || key === "phone") return "phone";
  return undefined;
}
export const planFeatures = [
  "Website",
  "Domínio próprio",
  "CMS",
  "CRM",
  "Cadastro de imóveis",
  "Landing pages",
  "Portais imobiliários",
  "Insights e KPIs com IA",
  "Gestão de leads",
  "Agenda e atividades",
  "Campanhas e integrações de anúncios",
] as const;
