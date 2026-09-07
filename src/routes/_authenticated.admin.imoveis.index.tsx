import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PropertyInventoryReadOnlyPage } from "@/components/properties/PropertyInventoryReadOnlyPage";
import { propertyInventorySearchSchema } from "@/components/properties/search-schema";

export const Route = createFileRoute("/_authenticated/admin/imoveis/")({
  validateSearch: (search) => propertyInventorySearchSchema.parse(search),
  component: PropertyInventoryRoute,
});

function PropertyInventoryRoute() {
  return <div className="space-y-4"><Button asChild><Link to="/admin/imoveis/novo">Cadastrar imóvel</Link></Button><PropertyInventoryReadOnlyPage search={Route.useSearch()} /></div>;
}
