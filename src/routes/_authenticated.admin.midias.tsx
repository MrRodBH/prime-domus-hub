// Bloco 3.1 — migração: /admin/midias agora é EntityWorkspace (descriptor: midia).
import { createFileRoute } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";

export const Route = createFileRoute("/_authenticated/admin/midias")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: MidiasWorkspaceRoute,
});

function MidiasWorkspaceRoute() {
  const search = Route.useSearch();
  return <EntityWorkspace descriptor={ENTITIES.midia} search={search} />;
}
