// Bloco 3.1 — migração: /admin/site agora é EntityWorkspace (descriptor: site).
import { createFileRoute } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";
import { WebsiteSetupWizard } from "@/components/site-builder/WebsiteSetupWizard";

export const Route = createFileRoute("/_authenticated/admin/site")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: SiteWorkspaceRoute,
});

function SiteWorkspaceRoute() {
  const search = Route.useSearch();
  return <div className="flex h-full min-h-0 flex-col gap-4">
    {!search.item && <WebsiteSetupWizard />}
    {search.item ? <div className="min-h-0 flex-1"><EntityWorkspace descriptor={ENTITIES.site} search={search} /></div> : null}
  </div>;
}
