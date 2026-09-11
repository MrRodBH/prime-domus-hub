import { createFileRoute } from "@tanstack/react-router";
import { LancamentoForm } from "@/components/admin/LancamentoForm";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/lancamentos/novo")({
  component: () => <LancamentoForm />,
});
