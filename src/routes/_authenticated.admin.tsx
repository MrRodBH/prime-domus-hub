import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { sourMe } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  loader: async () => {
    const me = await sourMe();
    if (!me.isAdmin) {
      throw redirect({ to: "/auth" });
    }
    return me;
  },
  component: AdminShell,
});
