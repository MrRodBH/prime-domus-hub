import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { meuAcessoAdmin } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  loader: async () => {
    const ok = await meuAcessoAdmin();
    if (!ok) {
      throw redirect({ to: "/auth" });
    }
    return { ok };
  },
  component: AdminShell,
});
