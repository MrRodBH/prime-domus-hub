import { createFileRoute } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";

// Bloco 3: /admin/paginas passa a ser um WORKSPACE (list+editor split), não uma tabela.
// Rota /admin/paginas/$id foi removida — seleção agora é via ?item=<id>.
export const Route = createFileRoute("/_authenticated/admin/paginas/")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: PaginasWorkspaceRoute,
});

function PaginasWorkspaceRoute() {
  const search = Route.useSearch();
  return <EntityWorkspace descriptor={ENTITIES.pagina} search={search} />;
}
