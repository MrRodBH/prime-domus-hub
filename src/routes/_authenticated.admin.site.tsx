// Bloco 3.1 — migração: /admin/site agora é ContentWorkspace (descriptor: site).
import { createFileRoute } from "@tanstack/react-router";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { contentSearchSchema } from "@/components/content/search-schema";
import { ENTITIES } from "@/components/content/entity-registry";

export const Route = createFileRoute("/_authenticated/admin/site")({
  validateSearch: (s) => contentSearchSchema.parse(s),
  component: SiteWorkspaceRoute,
});

function SiteWorkspaceRoute() {
  const search = Route.useSearch();
  return <ContentWorkspace descriptor={ENTITIES.site} search={search} />;
}
