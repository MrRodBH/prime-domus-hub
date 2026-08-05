import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import type { DomainCommandAuthority } from "./domain-contracts";
import { DomainError, toSafeDomainError } from "./domain-errors";

export type TenantDomainPermission = "read" | "request" | "operate" | "remove";

interface TrustedTenantContext {
  userId: string;
  tenant: TenantContext;
}

const MUTATING_ROLES = new Set(["owner", "admin"]);
const READ_ROLES = new Set(["owner", "admin", "agent", "guest"]);

export async function authorizeTenantDomainOperation(
  context: TrustedTenantContext,
  permission: TenantDomainPermission,
): Promise<DomainCommandAuthority> {
  const tenant = context.tenant;
  if (!tenant?.tenantId || tenant.userId !== context.userId) {
    throw new DomainError("domain_authority_denied", "Tenant authority context is invalid");
  }
  if (tenant.isSuperAdmin) {
    if (!tenant.impersonation || tenant.origin !== "impersonation") {
      throw new DomainError("domain_authority_denied", "Super Admin requires explicit tenant impersonation");
    }
    return {
      userId: context.userId,
      tenantId: tenant.tenantId,
      origin: "impersonation",
      isSuperAdmin: true,
    };
  }

  const { data, error } = await (supabaseAdmin as any)
    .from("tenant_members")
    .select("tenant_role, status")
    .eq("tenant_id", tenant.tenantId)
    .eq("user_id", context.userId)
    .eq("status", "active");
  if (error) throw toSafeDomainError(error);
  if (!data || data.length !== 1) {
    throw new DomainError("domain_authority_denied", "Active tenant membership cardinality must be exactly one");
  }
  const role = String(data[0].tenant_role ?? "");
  const permitted = permission === "read" ? READ_ROLES.has(role) : MUTATING_ROLES.has(role);
  if (!permitted) {
    throw new DomainError("domain_authority_denied", `Tenant role cannot perform domain ${permission}`);
  }
  return {
    userId: context.userId,
    tenantId: tenant.tenantId,
    origin: tenant.origin,
    isSuperAdmin: false,
  };
}

export async function assertGlobalSuperAdmin(context: { userId: string; supabase: any }): Promise<DomainCommandAuthority> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "super_admin");
  if (error) throw toSafeDomainError(error);
  if (!data || data.length !== 1) {
    throw new DomainError("domain_authority_denied", "Global domain operation requires super_admin");
  }
  return {
    userId: context.userId,
    tenantId: "00000000-0000-0000-0000-000000000000",
    origin: "platform",
    isSuperAdmin: true,
  };
}

export function impersonatedAuthorityForTenant(
  platformAuthority: DomainCommandAuthority,
  tenant: TenantContext,
): DomainCommandAuthority {
  if (!platformAuthority.isSuperAdmin || platformAuthority.origin !== "platform") {
    throw new DomainError("domain_authority_denied", "Platform authority is required");
  }
  if (!tenant.isSuperAdmin || !tenant.impersonation || tenant.origin !== "impersonation") {
    throw new DomainError("domain_authority_denied", "Explicit tenant impersonation is required");
  }
  return {
    userId: platformAuthority.userId,
    tenantId: tenant.tenantId,
    origin: "impersonation",
    isSuperAdmin: true,
  };
}
