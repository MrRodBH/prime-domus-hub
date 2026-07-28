import type { TenantContext } from "@/integrations/supabase/tenant-middleware";

export type TenantScopedAuthority = Pick<
  TenantContext,
  "tenantId" | "isSuperAdmin" | "impersonation" | "origin"
>;

/**
 * Autoridade fail-closed reutilizável para qualquer boundary tenant-scoped.
 *
 * Deve receber exclusivamente o contexto produzido por `requireTenant`.
 * Super Admin somente é aceito por impersonação explícita; usuários comuns
 * nunca podem apresentar origem de impersonação.
 */
export function requireTenantScopedAuthority(
  tenant: TenantScopedAuthority | null | undefined,
  boundary: string,
): string {
  if (!tenant?.tenantId) {
    throw new Error(`${boundary} tenant authority unresolved.`);
  }

  if (tenant.isSuperAdmin) {
    if (!tenant.impersonation || tenant.origin !== "impersonation") {
      throw new Error(`${boundary} Super Admin access requires explicit impersonation.`);
    }
    return tenant.tenantId;
  }

  if (tenant.impersonation || tenant.origin === "impersonation") {
    throw new Error(`${boundary} tenant authority origin is inconsistent.`);
  }

  if (tenant.origin !== "selection" && tenant.origin !== "single-membership") {
    throw new Error(`${boundary} tenant authority origin is invalid.`);
  }

  return tenant.tenantId;
}