/** Máscaras de digitação para campos brasileiros (telefone, CEP, CPF, CNPJ, moeda). */

export type TipoMascara = "telefone" | "cep" | "cpf" | "cnpj" | "cpfCnpj" | "numeros" | "moeda";

function digitos(valor: string, maximo: number): string {
  return valor.replace(/\D/g, "").slice(0, maximo);
}

/** (31) 98700-8880 ou (31) 3333-4444 */
export function mascaraTelefone(valor: string): string {
  const d = digitos(valor, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 30535-640 */
export function mascaraCep(valor: string): string {
  const d = digitos(valor, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** 123.456.789-00 */
export function mascaraCpf(valor: string): string {
  const d = digitos(valor, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** 12.345.678/0001-90 */
export function mascaraCnpj(valor: string): string {
  const d = digitos(valor, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function aplicarMascara(tipo: TipoMascara, valor: string): string {
  switch (tipo) {
    case "telefone":
      return mascaraTelefone(valor);
    case "cep":
      return mascaraCep(valor);
    case "cpf":
      return mascaraCpf(valor);
    case "cnpj":
      return mascaraCnpj(valor);
    case "cpfCnpj":
      return valor.replace(/\D/g, "").length > 11 ? mascaraCnpj(valor) : mascaraCpf(valor);
    case "numeros":
      return digitos(valor, 20);
    case "moeda":
      return mascaraMoeda(valor);
    default:
      return valor;
  }
}

/** 600.000,00 — os dígitos digitados são lidos como centavos. */
export function mascaraMoeda(valor: string): string {
  const d = digitos(valor, 13);
  if (!d) return "";
  const centavos = Number(d) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos);
}

/** Validação simples de CPF (dígitos verificadores). */
export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i += 1) soma += Number(d[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Validação simples de CNPJ (dígitos verificadores). */
export function cnpjValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (ate: number) => {
    let peso = ate - 7;
    let soma = 0;
    for (let i = 0; i < ate; i += 1) {
      soma += Number(d[i]) * peso;
      peso -= 1;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}
