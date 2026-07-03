// Bloco 3.1 — migração: /admin/auditoria agora é ContentWorkspace (descriptor: auditoria).
import { createFileRoute } from "@tanstack/react-router";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { contentSearchSchema } from "@/components/content/search-schema";
import { ENTITIES } from "@/components/content/entity-registry";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  validateSearch: (s) => contentSearchSchema.parse(s),
  component: AuditoriaWorkspaceRoute,
});

function AuditoriaWorkspaceRoute() {
  const search = Route.useSearch();
  return <ContentWorkspace descriptor={ENTITIES.auditoria} search={search} />;
}
