// Bloco 3.1 — migração: /admin/formularios agora é EntityWorkspace (descriptor: form).
import { createFileRoute } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";

export const Route = createFileRoute("/_authenticated/admin/formularios/")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: FormulariosWorkspaceRoute,
});

function FormulariosWorkspaceRoute() {
  const search = Route.useSearch();
  return <EntityWorkspace descriptor={ENTITIES.form} search={search} />;
}
