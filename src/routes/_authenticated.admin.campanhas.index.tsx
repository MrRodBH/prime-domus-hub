// Bloco 3.1 — migração: /admin/campanhas agora é EntityWorkspace (descriptor: campanha).
import { createFileRoute } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";

export const Route = createFileRoute("/_authenticated/admin/campanhas/")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: CampanhasWorkspaceRoute,
});

function CampanhasWorkspaceRoute() {
  const search = Route.useSearch();
  return <EntityWorkspace descriptor={ENTITIES.campanha} search={search} />;
}
