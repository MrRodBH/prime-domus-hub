import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { meuAcessoSuperAdmin } from "@/lib/api/super.functions";

export const Route = createFileRoute("/_authenticated/super")({
  loader: async () => {
    const ok = await meuAcessoSuperAdmin();
    if (!ok) throw redirect({ to: "/admin" });
    return { ok };
  },
  component: () => <Outlet />,
});
