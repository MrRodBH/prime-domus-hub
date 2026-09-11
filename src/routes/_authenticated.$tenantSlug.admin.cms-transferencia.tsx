// Bloco 3.1 — redirect legado: /admin/cms-transferencia → /admin/auditoria.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/cms-transferencia")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/auditoria", replace: true });
  },
  component: () => null,
});
