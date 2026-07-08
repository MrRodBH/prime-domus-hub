// F3.5 — Tenant Switcher UX — cardinality resolution (pure logic).
//
// Deriva o comportamento do Tenant Switcher a partir EXCLUSIVAMENTE
// da lista `active-only` retornada por `listSelectableTenants` e da
// seleção persistida (já reconciliada).
//
// PROIBIÇÕES (Hard Gate §3, §4.3):
//   • sem is_default, is_owner, tenant_role;
//   • sem ORDER BY / LIMIT 1;
//   • sem fallback / tenant default;
//   • sem "escolher o primeiro" quando N>1;
//   • cardinalidade é a ÚNICA heurística admitida.
//
// Estados:
//   • "none"              → 0 tenants ativos — estado controlado, nada anexado;
//   • "auto-select"       → 1 tenant ativo e sem seleção válida — permitido
//                           auto-selecionar (deriva de cardinalidade server-side);
//   • "keep"              → seleção persistida ainda é válida (1 ou N);
//   • "require-selection" → N>1 tenants ativos e sem seleção válida — exige
//                           escolha explícita do usuário.

export type CardinalityAction =
  | { kind: "none" }
  | { kind: "auto-select"; tenantId: string }
  | { kind: "keep"; tenantId: string }
  | { kind: "require-selection" };

/**
 * @param activeTenantIds lista active-only vinda do server (ordem irrelevante)
 * @param currentSelection seleção persistida APÓS reconcileSelection
 */
export function resolveCardinalityAction(
  activeTenantIds: readonly string[],
  currentSelection: string | null,
): CardinalityAction {
  if (activeTenantIds.length === 0) {
    return { kind: "none" };
  }
  if (currentSelection && activeTenantIds.includes(currentSelection)) {
    return { kind: "keep", tenantId: currentSelection };
  }
  if (activeTenantIds.length === 1) {
    // Cardinalidade === 1: única fonte permitida de auto-seleção.
    return { kind: "auto-select", tenantId: activeTenantIds[0] };
  }
  return { kind: "require-selection" };
}
