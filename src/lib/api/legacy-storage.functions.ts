// Historical M3.3 compatibility boundary.
// M3 is closed. No physical copy, metadata rewrite or rollback mutation remains
// available through application runtime. A future explicitly authorized
// maintenance gate must provide a dedicated, auditable operational boundary.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";

function requireImpersonatedSuperAdmin(context: {
  tenant: {
    tenantId: string | null;
    isSuperAdmin: boolean;
    impersonation: boolean;
    origin: string;
  };
}) {
  const tenantId = requireTenantScopedAuthority(context.tenant as never, "Legacy Storage Maintenance");
  if (
    !context.tenant.isSuperAdmin ||
    !context.tenant.impersonation ||
    context.tenant.origin !== "impersonation"
  ) {
    throw new Error("legacy_storage_requires_super_admin_impersonation");
  }
  return tenantId;
}

export const inventariarLegacyStorage = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ persistSnapshot: z.literal(false).optional().default(false) }).strict().parse(input ?? {}),
  )
  .handler(async ({ context }) => {
    const tenantId = requireImpersonatedSuperAdmin(context);
    throw new Error(`legacy_storage_inventory_retired_closed_m3:${tenantId}`);
  });

export const marcarRollbackLote = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ batchId: z.string().uuid(), reason: z.string().trim().min(1).max(500) }).strict().parse(input),
  )
  .handler(async ({ context }) => {
    requireImpersonatedSuperAdmin(context);
    throw new Error("legacy_storage_rollback_retired_closed_m3");
  });
