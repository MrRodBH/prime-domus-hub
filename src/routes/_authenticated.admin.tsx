import { createFileRoute, redirect } from "@tanstack/react-router";
import { meuTenantWorkspace } from "@/lib/api/tenant.functions";
import { tenantReturnPath } from '@/lib/auth/tenant-login-navigation';

export const Route = createFileRoute("/_authenticated/admin")({
  loader: async ({ location }) => {
    const tenant = await meuTenantWorkspace();
    throw redirect({
      to: tenantReturnPath(tenant.slug, `/${tenant.slug}${location.pathname}${location.searchStr}`),
      replace: true,
    });
  },
});
