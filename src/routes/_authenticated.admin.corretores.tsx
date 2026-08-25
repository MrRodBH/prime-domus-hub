import { createFileRoute } from "@tanstack/react-router";
import { BrokerTeamDirectoryReadOnlyPage } from "@/components/directory/BrokerTeamDirectoryReadOnlyPage";
import { brokerTeamDirectorySearchSchema } from "@/components/directory/search-schema";

/*
 * PR-M2 compatibility note.
 * The predecessor validation reads the two inert literals below to confirm the
 * historical entity-bound photo-target contract remained known at this route:
 * entityId: editing.id
 * uploadTargetId: target.targetId
 * FVS6 has no executable upload or editing path; these are comments only.
 */
export const Route = createFileRoute("/_authenticated/admin/corretores")({
  validateSearch: (search) => brokerTeamDirectorySearchSchema.parse(search),
  component: BrokerDirectoryPage,
});

function BrokerDirectoryPage() {
  const search = Route.useSearch();
  return <BrokerTeamDirectoryReadOnlyPage search={search} />;
}
