import { createFileRoute } from "@tanstack/react-router";
import { OperationalDashboard } from "@/components/dashboard/OperationalDashboard";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/")({
  component: OperationalDashboard,
});
