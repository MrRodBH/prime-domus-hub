import { createFileRoute } from "@tanstack/react-router";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { contentSearchSchema } from "@/components/content/search-schema";
import { ENTITIES } from "@/components/content/entity-registry";

// Bloco 3: /admin/paginas passa a ser um WORKSPACE (list+editor split), não uma tabela.
// Rota /admin/paginas/$id foi removida — seleção agora é via ?item=<id>.
export const Route = createFileRoute("/_authenticated/admin/paginas/")({
  validateSearch: (s) => contentSearchSchema.parse(s),
  component: PaginasWorkspaceRoute,
});

function PaginasWorkspaceRoute() {
  const search = Route.useSearch();
  return <ContentWorkspace descriptor={ENTITIES.pagina} search={search} />;
}
