import { createServerFn } from "@tanstack/react-start";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  resolveEffectiveTenantPermission,
  trustedTenantAccessContext,
} from "@/lib/api/tenant-access-control-authority.server";

/**
 * UI-only compatibility projection for the preserved pipeline adapter.
 *
 * The returned labels are not persisted roles and never authorize a server
 * operation. They are derived from the canonical Tenant Access Control
 * decisions used by the CRM boundary; every mutation remains independently
 * authorized server-side.
 */
export const meusPapeis = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<Array<"admin" | "corretor">> => {
    const trusted = trustedTenantAccessContext(context);
    const [createDecision, manageDecision] = await Promise.all([
      resolveEffectiveTenantPermission(trusted, "crm", "criar"),
      resolveEffectiveTenantPermission(trusted, "crm", "gerenciar"),
    ]);

    const labels: Array<"admin" | "corretor"> = [];
    if (createDecision.allowed) labels.push("corretor");
    if (manageDecision.allowed && manageDecision.scope === "global") labels.push("admin");
    return labels;
  });
