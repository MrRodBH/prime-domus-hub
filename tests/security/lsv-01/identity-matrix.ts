// LSV-01 · Lote A — Identity matrix contract.
// Enumerates the identities, their expected tenant scoping, and their
// expected functional role. Structural only: no DB writes here.

import type { LsvIdentity } from "./fixture-types";

export type LsvTenantSlot = "tenantA" | "tenantB" | "none";

export interface LsvIdentitySpec {
  readonly identity: LsvIdentity;
  readonly tenantSlot: LsvTenantSlot;
  readonly functionalRole: string | null;
  readonly membershipStatus: "active" | "suspended" | "removed" | "none";
  readonly isSuperAdmin: boolean;
  readonly authenticated: boolean;
}

export const IDENTITY_MATRIX: ReadonlyArray<LsvIdentitySpec> = [
  { identity: "tenant_a_admin", tenantSlot: "tenantA", functionalRole: "admin", membershipStatus: "active", isSuperAdmin: false, authenticated: true },
  { identity: "tenant_a_corretor_assigned", tenantSlot: "tenantA", functionalRole: "corretor", membershipStatus: "active", isSuperAdmin: false, authenticated: true },
  { identity: "tenant_a_corretor_unassigned", tenantSlot: "tenantA", functionalRole: "corretor", membershipStatus: "active", isSuperAdmin: false, authenticated: true },
  { identity: "tenant_a_unauthorized_role", tenantSlot: "tenantA", functionalRole: "secretaria", membershipStatus: "active", isSuperAdmin: false, authenticated: true },
  { identity: "tenant_b_admin", tenantSlot: "tenantB", functionalRole: "admin", membershipStatus: "active", isSuperAdmin: false, authenticated: true },
  { identity: "tenant_b_corretor", tenantSlot: "tenantB", functionalRole: "corretor", membershipStatus: "active", isSuperAdmin: false, authenticated: true },
  { identity: "suspended_member", tenantSlot: "tenantA", functionalRole: "corretor", membershipStatus: "suspended", isSuperAdmin: false, authenticated: true },
  { identity: "removed_or_no_membership_user", tenantSlot: "none", functionalRole: null, membershipStatus: "none", isSuperAdmin: false, authenticated: true },
  { identity: "super_admin", tenantSlot: "none", functionalRole: null, membershipStatus: "none", isSuperAdmin: true, authenticated: true },
  { identity: "anonymous", tenantSlot: "none", functionalRole: null, membershipStatus: "none", isSuperAdmin: false, authenticated: false },
];

export function findSpec(identity: LsvIdentity): LsvIdentitySpec {
  const s = IDENTITY_MATRIX.find((x) => x.identity === identity);
  if (!s) throw new Error(`Unknown LSV identity: ${identity}`);
  return s;
}
