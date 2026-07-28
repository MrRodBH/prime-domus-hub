import type { TenantContext } from "@/integrations/supabase/tenant-middleware";

export type CmsTenantAuthority = Pick<
  TenantContext,
  "tenantId" | "isSuperAdmin" | "impersonation" | "origin"
>;

/**
 * Fail-closed CMS tenant authority guard.
 *
 * CMS mutations and tenant-scoped reads must run only after `requireTenant`.
 * A Super Admin is accepted exclusively through explicit impersonation; a
 * regular user can never present an impersonation origin.
 */
export function requireCmsTenantAuthority(
  tenant: CmsTenantAuthority | null | undefined,
): string {
  if (!tenant?.tenantId) {
    throw new Error("CMS tenant authority unresolved.");
  }

  if (tenant.isSuperAdmin) {
    if (!tenant.impersonation || tenant.origin !== "impersonation") {
      throw new Error("CMS Super Admin access requires explicit impersonation.");
    }
    return tenant.tenantId;
  }

  if (tenant.impersonation || tenant.origin === "impersonation") {
    throw new Error("CMS tenant authority origin is inconsistent.");
  }

  if (tenant.origin !== "selection" && tenant.origin !== "single-membership") {
    throw new Error("CMS tenant authority origin is invalid.");
  }

  return tenant.tenantId;
}
