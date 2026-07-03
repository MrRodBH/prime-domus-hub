// Bloco 3.1 — migração: /admin/blog agora é EntityWorkspace (descriptor: post).
import { createFileRoute } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";

export const Route = createFileRoute("/_authenticated/admin/blog/")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: BlogWorkspaceRoute,
});

function BlogWorkspaceRoute() {
  const search = Route.useSearch();
  return <EntityWorkspace descriptor={ENTITIES.post} search={search} />;
}
