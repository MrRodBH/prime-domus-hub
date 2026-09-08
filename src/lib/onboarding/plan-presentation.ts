// Presentation helpers only. Server schema and authorization remain authoritative.
export function formatPlanPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function maskPlanPrice(value: string): string {
  if (!/^\s*(?:R\$\s*)?[\d.,\s]*$/.test(value)) return value;
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits);
  return Number.isSafeInteger(cents) ? formatPlanPrice(cents) : value;
}
export function parsePlanPrice(value: string): number {
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/.test(value)) {
    throw new Error("Informe a mensalidade no formato 1.234,56.");
  }
  const cents = Number(value.replace(/[.,]/g, ""));
  if (!Number.isSafeInteger(cents)) throw new Error("Informe uma mensalidade válida.");
  return cents;
}
export function newPlanCode(id: string): string {
  return `plan_${id.replace(/-/g, "")}`;
}
