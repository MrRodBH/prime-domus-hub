import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requiresPublicTenantPreflight } from "@/lib/public-tenant";
import { requirePublicTenantContext } from "@/lib/public-tenant.server";

export const preflightPublicTenant = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const pathname = new URL(request.url).pathname;

  if (!requiresPublicTenantPreflight(pathname)) {
    return { required: false as const };
  }

  await requirePublicTenantContext();
  return { required: true as const };
});
