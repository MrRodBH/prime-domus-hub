import { createFileRoute, redirect } from "@tanstack/react-router";
import { meuTenantWorkspace } from "@/lib/api/tenant.functions";

export const Route = createFileRoute("/_authenticated/admin/$")({
  loader: async ({ params }) => {
    const tenant = await meuTenantWorkspace();
    const suffix = params._splat ? `/${params._splat}` : "";
    throw redirect({
      href: `/${tenant.slug}/admin${suffix}`,
      replace: true,
    });
  },
});
