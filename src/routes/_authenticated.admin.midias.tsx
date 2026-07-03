// Bloco 3.1 — migração: /admin/midias agora é ContentWorkspace (descriptor: midia).
import { createFileRoute } from "@tanstack/react-router";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { contentSearchSchema } from "@/components/content/search-schema";
import { ENTITIES } from "@/components/content/entity-registry";

export const Route = createFileRoute("/_authenticated/admin/midias")({
  validateSearch: (s) => contentSearchSchema.parse(s),
  component: MidiasWorkspaceRoute,
});

function MidiasWorkspaceRoute() {
  const search = Route.useSearch();
  return <ContentWorkspace descriptor={ENTITIES.midia} search={search} />;
}
