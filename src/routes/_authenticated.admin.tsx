import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { meusPapeis } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  loader: async () => {
    const papeis = await meusPapeis();
    if (papeis.length === 0) {
      throw redirect({ to: "/auth" });
    }
    return { papeis };
  },
  component: AdminShell,
});
