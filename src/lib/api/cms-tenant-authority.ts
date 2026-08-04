import type { TenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";

export type CmsTenantAuthority = TenantScopedAuthority;

/**
 * Compatibility wrapper for the CMS boundary.
 * The canonical tenant-scoped authority logic lives in
 * `tenant-scoped-authority.ts` and is shared with other PR-M2 domains.
 */
export function requireCmsTenantAuthority(
  tenant: CmsTenantAuthority | null | undefined,
): string {
  return requireTenantScopedAuthority(tenant, "CMS");
}