/**
 * Máscara e validação de telefone brasileiro.
 * Formatos aceitos:
 *  - Fixo: (11) 1234-5678
 *  - Celular: (11) 91234-5678
 */
export function maskPhoneBR(input: string): string {
  const d = (input ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhoneBR(input: string): boolean {
  const d = (input ?? "").replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  // Celular precisa começar com 9
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

export function digitsOnly(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}
