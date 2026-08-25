import { createFileRoute } from "@tanstack/react-router";
import { BrokerTeamDirectoryReadOnlyPage } from "@/components/directory/BrokerTeamDirectoryReadOnlyPage";
import { brokerTeamDirectorySearchSchema } from "@/components/directory/search-schema";

export const Route = createFileRoute("/_authenticated/admin/corretores")({
  validateSearch: (search) => brokerTeamDirectorySearchSchema.parse(search),
  component: BrokerDirectoryPage,
});

function BrokerDirectoryPage() {
  const search = Route.useSearch();
  return <BrokerTeamDirectoryReadOnlyPage search={search} />;
}
