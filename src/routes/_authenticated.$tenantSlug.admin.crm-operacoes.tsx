import { createFileRoute } from "@tanstack/react-router";
import { OperationsReadOnlyPage } from "@/components/operations/OperationsReadOnlyPage";
import { operationsSearchSchema } from "@/components/operations/search-schema";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/crm-operacoes")({
  validateSearch: (search) => operationsSearchSchema.parse(search),
  component: CrmOperationsPage,
});

function CrmOperationsPage() {
  const search = Route.useSearch();
  return <OperationsReadOnlyPage search={search} />;
}
