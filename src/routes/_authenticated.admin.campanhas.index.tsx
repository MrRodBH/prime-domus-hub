// Bloco 3.1 — migração: /admin/campanhas agora é ContentWorkspace (descriptor: campanha).
import { createFileRoute } from "@tanstack/react-router";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { contentSearchSchema } from "@/components/content/search-schema";
import { ENTITIES } from "@/components/content/entity-registry";

export const Route = createFileRoute("/_authenticated/admin/campanhas/")({
  validateSearch: (s) => contentSearchSchema.parse(s),
  component: CampanhasWorkspaceRoute,
});

function CampanhasWorkspaceRoute() {
  const search = Route.useSearch();
  return <ContentWorkspace descriptor={ENTITIES.campanha} search={search} />;
}
