// F3.6 — Membership Roles & Status Validation
//
// Helpers PUROS e determinísticos para validação de `membership_status`
// e `tenant_role`. Sem dependência de Supabase, sem I/O, sem fallback,
// sem coerção silenciosa.
//
// Contrato:
//   • rejeitar `null`;
//   • rejeitar `undefined`;
//   • rejeitar strings desconhecidas;
//   • NÃO converter valor inválido para `'active'`;
//   • NÃO converter role inválida para `'member'` / `'viewer'`;
//   • NÃO promover automaticamente para `'admin'`.
//
// IMPORTANTE (F3.6 Scope Guard):
//   Os helpers `isTenantAdminRole` / `isTenantOwnerRole` NÃO devem ser
//   usados nesta etapa como autorização real para operações sensíveis.
//   Servem apenas como base para futura Role Reconciliation.

import {
  ACTIVE_MEMBERSHIP_STATUS,
  MEMBERSHIP_STATUSES,
  TENANT_ROLES,
  type MembershipStatus,
  type TenantRole,
} from "@/integrations/supabase/membership-types";

// ---------- membership_status ----------

export function isMembershipStatus(value: unknown): value is MembershipStatus {
  return (
    typeof value === "string" &&
    (MEMBERSHIP_STATUSES as readonly string[]).includes(value)
  );
}

export function isActiveMembershipStatus(value: unknown): boolean {
  return value === ACTIVE_MEMBERSHIP_STATUS;
}

export function assertMembershipStatus(value: unknown): MembershipStatus {
  if (!isMembershipStatus(value)) {
    throw new Error(
      `Invalid membership_status: expected one of [${MEMBERSHIP_STATUSES.join(
        ", ",
      )}]`,
    );
  }
  return value;
}

// ---------- tenant_role ----------

export function isTenantRole(value: unknown): value is TenantRole {
  return (
    typeof value === "string" &&
    (TENANT_ROLES as readonly string[]).includes(value)
  );
}

export function assertTenantRole(value: unknown): TenantRole {
  if (!isTenantRole(value)) {
    throw new Error(
      `Invalid tenant_role: expected one of [${TENANT_ROLES.join(", ")}]`,
    );
  }
  return value;
}

/**
 * BASE FUTURA — não use como autorização ampla nesta etapa (F3.6).
 * Depende de Role Reconciliation dedicada para lidar com o overgrant
 * histórico de `tenant_role = 'admin'` (backfill da F3.1).
 */
export function isTenantAdminRole(value: unknown): boolean {
  return value === "admin";
}

/**
 * BASE FUTURA — não use como autorização ampla nesta etapa (F3.6).
 */
export function isTenantOwnerRole(value: unknown): boolean {
  return value === "owner";
}
