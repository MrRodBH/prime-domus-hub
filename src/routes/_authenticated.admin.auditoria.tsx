// Bloco 3.1 — migração: /admin/auditoria agora é EntityWorkspace (descriptor: auditoria).
import { createFileRoute } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: AuditoriaWorkspaceRoute,
});

function AuditoriaWorkspaceRoute() {
  const search = Route.useSearch();
  return <EntityWorkspace descriptor={ENTITIES.auditoria} search={search} />;
}
