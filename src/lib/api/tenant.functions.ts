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

/** Current user's name and role inside the verified tenant (for the company panel footer). */
export const meuPerfilNoTenant = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.auth.getUser();
    const uid = data.user?.id;
    const { data: m } = await context.supabase
      .from("tenant_members")
      .select("display_name, tenant_role")
      .eq("tenant_id", context.tenant.tenantId)
      .eq("user_id", uid ?? "")
      .maybeSingle();
    return { nome: m?.display_name || data.user?.email || "", papel: (m?.tenant_role as string | undefined) ?? null };
  });
