// F3.5.1 — Decisão pura do TenantSelectionGate, extraída para permitir
// testes determinísticos sem runner React. NÃO consulta rede: recebe o
// estado (query + seleção + flags) e decide o que renderizar.

export type GateDecision =
  | { kind: "skip" } // Super Admin ou impersonação — fora do escopo
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "no-tenants" }
  | { kind: "require-selection" }
  | { kind: "allow" };

export function resolveGateDecision(input: {
  isSuper: boolean;
  impersonating: string | null | undefined;
  queryStatus: "pending" | "error" | "success";
  activeIds: string[];
  selectedId: string | null;
}): GateDecision {
  if (input.impersonating || input.isSuper) return { kind: "skip" };
  if (input.queryStatus === "pending") return { kind: "loading" };
  if (input.queryStatus === "error") return { kind: "error" };
  if (input.activeIds.length === 0) return { kind: "no-tenants" };
  const hasValid = !!input.selectedId && input.activeIds.includes(input.selectedId);
  if (input.activeIds.length > 1 && !hasValid) return { kind: "require-selection" };
  return { kind: "allow" };
}
