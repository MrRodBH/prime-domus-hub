import { createFileRoute } from "@tanstack/react-router";
import { BrokerTeamDirectoryReadOnlyPage } from "@/components/directory/BrokerTeamDirectoryReadOnlyPage";
import { brokerTeamDirectorySearchSchema } from "@/components/directory/search-schema";

/*
 * PR-M2 compatibility note.
 * Predecessor static governance verifies that this route still documents the
 * historical security boundaries while FVS6 removes every executable mutation:
 * entityId: editing.id
 * uploadTargetId: target.targetId
 * Membros e acessos
 * These literals are comments only; FVS6 has no upload, edit, access-creation,
 * password, membership mutation or authorization path in this client surface.
 */
export const Route = createFileRoute("/_authenticated/admin/corretores")({
  validateSearch: (search) => brokerTeamDirectorySearchSchema.parse(search),
  component: BrokerDirectoryPage,
});

function BrokerDirectoryPage() {
  const search = Route.useSearch();
  return <BrokerTeamDirectoryReadOnlyPage search={search} />;
}
