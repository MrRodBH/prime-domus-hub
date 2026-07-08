// F3.6 — Membership Roles & Status Validation
//
// Domínio tipado de `membership_status` e `tenant_role`, refletindo
// EXATAMENTE os enums existentes no banco (confirmado via inspeção do
// schema em F3.6 preflight):
//
//   type membership_status = 'active' | 'invited' | 'suspended' | 'revoked'
//   type tenant_role       = 'owner' | 'admin' | 'manager' | 'broker'
//                          | 'captador' | 'secretaria' | 'viewer'
//
// Regras arquiteturais preservadas (F3.2 → F3.5):
//   • `membership_status` decide se a membership é OPERACIONAL.
//   • Somente `'active'` participa de resolução de tenant e de operação
//     tenant-scoped. `invited` / `suspended` / `revoked` NÃO são
//     memberships operacionais.
//   • `tenant_role` NÃO é usado como resolvedor de tenant e NÃO deve ser
//     usado, nesta etapa, como autorização ampla — o backfill histórico
//     `tenant_role = 'admin'` (F3.1) representa risco de overgrant que
//     exige Role Reconciliation dedicada em etapa futura.
//   • `is_owner` e `is_default` continuam ignorados como resolvedores.

export const MEMBERSHIP_STATUSES = [
  "active",
  "invited",
  "suspended",
  "revoked",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/**
 * Único status considerado OPERACIONAL. Toda resolução de tenant e toda
 * operação tenant-scoped exige explicitamente este valor.
 */
export const ACTIVE_MEMBERSHIP_STATUS: MembershipStatus = "active";

/**
 * Domínio real de `tenant_role` neste projeto. Preservado do estado
 * atual do banco — não inventar / não substituir.
 */
export const TENANT_ROLES = [
  "owner",
  "admin",
  "manager",
  "broker",
  "captador",
  "secretaria",
  "viewer",
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];
