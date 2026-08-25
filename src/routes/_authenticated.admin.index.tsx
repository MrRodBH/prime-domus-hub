import { createFileRoute } from "@tanstack/react-router";
import { DashboardInsightsReadOnlyPage } from "@/components/dashboard/DashboardInsightsReadOnlyPage";
import { dashboardInsightsSearchSchema } from "@/components/dashboard/search-schema";
import type { DashboardInsightsSearch } from "@/components/dashboard/search-schema";

export const Route = createFileRoute("/_authenticated/admin/")({
  validateSearch: (search) => dashboardInsightsSearchSchema.parse(search),
  component: DashboardInsightsRoute,
});

function DashboardInsightsRoute() {
  const search = Route.useSearch();
  return <DashboardInsightsReadOnlyPage search={search as DashboardInsightsSearch} />;
}
