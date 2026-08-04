import { createServerFn } from "@tanstack/react-start";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCmsOperation,
  safeTenantCmsError,
} from "@/lib/api/tenant-cms-authority.server";

type LaunchCatalogRow = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

async function listTenantLaunchCatalog(
  context: Parameters<typeof authorizeTenantCmsOperation>[0] & { supabase: any },
  table: "launch_statuses" | "launch_amenities",
): Promise<LaunchCatalogRow[]> {
  const authorization = await authorizeTenantCmsOperation(
    context,
    "cms.paginas",
    "read",
  );
  const { data, error } = await context.supabase
    .from(table)
    .select("id, slug, nome, ordem, ativo")
    .eq("tenant_id", authorization.tenantId)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw safeTenantCmsError(error);
  return (data ?? []) as LaunchCatalogRow[];
}

export const listarTenantLaunchStatuses = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) =>
    listTenantLaunchCatalog(context, "launch_statuses"),
  );

export const listarTenantLaunchAmenities = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) =>
    listTenantLaunchCatalog(context, "launch_amenities"),
  );
