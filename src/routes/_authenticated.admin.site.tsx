// Bloco 3.1 — migração: /admin/site agora é EntityWorkspace (descriptor: site).
import { createFileRoute } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";

export const Route = createFileRoute("/_authenticated/admin/site")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: SiteWorkspaceRoute,
});

function SiteWorkspaceRoute() {
  const search = Route.useSearch();
  return <EntityWorkspace descriptor={ENTITIES.site} search={search} />;
}
