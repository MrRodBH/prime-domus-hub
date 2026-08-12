// BCR-01 — dedicated billing-management authorization boundary.
//
// This boundary intentionally does not depend on the broader delegated RBAC
// resolver while the Same-Backend lacks the canonical PR-M2 tenant-RBAC
// migration. It does NOT create a second generic RBAC system. Billing is kept
// narrower: active tenant owner only, or Super Admin under explicit trusted
// impersonation. Delegated profile permissions are denied fail-closed.

import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import type {
  BillingAuthorizationContext,
  BillingOperation,
} from "@/lib/billing/billing-contracts";

export class BillingAuthorizationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BillingAuthorizationError";
    this.code = code;
  }
}

export type TrustedBillingContext = {
  readonly userId: string;
  readonly tenant: TenantContext;
};

export async function authorizeTenantBillingOperation(
  context: TrustedBillingContext,
  operation: BillingOperation,
): Promise<BillingAuthorizationContext> {
  const tenantId = requireTenantScopedAuthority(
    context.tenant,
    "Tenant Billing",
  );

  if (context.tenant.userId !== context.userId) {
    throw new BillingAuthorizationError("bcr01_billing_actor_context_mismatch");
  }

  if (context.tenant.isSuperAdmin) {
    if (
      !context.tenant.impersonation ||
      context.tenant.origin !== "impersonation"
    ) {
      throw new BillingAuthorizationError(
        "bcr01_billing_super_admin_requires_impersonation",
      );
    }

    return {
      tenantId,
      actorUserId: context.userId,
      actorKind: "super_admin",
      operation,
      authority: "explicit_super_admin_impersonation",
    };
  }

  // Tenant resolution has already proven an active membership. Billing adds a
  // stricter, independent commercial-management predicate: the exact persisted
  // membership must be both role=owner AND is_owner=true. Role alone is never
  // sufficient. No assigned profile is promoted to billing authority here.
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const { data, error } = await supabaseAdmin
    .from("tenant_members")
    .select("tenant_id, user_id, membership_status, tenant_role, is_owner")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) {
    throw new BillingAuthorizationError("bcr01_billing_membership_read_failed");
  }

  if (
    !data ||
    data.tenant_id !== tenantId ||
    data.user_id !== context.userId ||
    data.membership_status !== "active" ||
    data.tenant_role !== "owner" ||
    data.is_owner !== true
  ) {
    throw new BillingAuthorizationError("bcr01_billing_owner_authority_required");
  }

  return {
    tenantId,
    actorUserId: context.userId,
    actorKind: "owner",
    operation,
    authority: "active_tenant_owner",
  };
}
