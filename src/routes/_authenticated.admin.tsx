import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { meuAcessoAdmin } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  loader: async () => {
    const ok = await meuAcessoAdmin();
    if (!ok) {
      throw redirect({ to: "/auth" });
    }
    return { ok };
  },
  component: () => <Outlet />,
});
