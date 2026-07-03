// Bloco 3.1 — migração: /admin/formularios agora é ContentWorkspace (descriptor: form).
import { createFileRoute } from "@tanstack/react-router";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { contentSearchSchema } from "@/components/content/search-schema";
import { ENTITIES } from "@/components/content/entity-registry";

export const Route = createFileRoute("/_authenticated/admin/formularios/")({
  validateSearch: (s) => contentSearchSchema.parse(s),
  component: FormulariosWorkspaceRoute,
});

function FormulariosWorkspaceRoute() {
  const search = Route.useSearch();
  return <ContentWorkspace descriptor={ENTITIES.form} search={search} />;
}
