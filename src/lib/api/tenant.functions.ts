import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";

export const meuTenantId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_current_tenant_id");
    if (error) throw new Error(error.message);
    return data as string | null;
  });

export const meuTenantWorkspace = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tenants")
      .select("id, nome, slug")
      .eq("id", context.tenant.tenantId)
      .single();
    if (error || !data) throw new Error("Tenant workspace unavailable.");
    return { id: data.id, name: data.nome, slug: data.slug };
  });
