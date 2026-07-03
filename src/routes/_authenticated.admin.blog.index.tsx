// Bloco 3.1 — migração: /admin/blog agora é ContentWorkspace (descriptor: post).
import { createFileRoute } from "@tanstack/react-router";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { contentSearchSchema } from "@/components/content/search-schema";
import { ENTITIES } from "@/components/content/entity-registry";

export const Route = createFileRoute("/_authenticated/admin/blog/")({
  validateSearch: (s) => contentSearchSchema.parse(s),
  component: BlogWorkspaceRoute,
});

function BlogWorkspaceRoute() {
  const search = Route.useSearch();
  return <ContentWorkspace descriptor={ENTITIES.post} search={search} />;
}
