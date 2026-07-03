// Bloco 3.1 — redirect legado: /admin/cms-auditoria → /admin/auditoria.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/cms-auditoria")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/auditoria", replace: true });
  },
  component: () => null,
});
