import { createFileRoute } from "@tanstack/react-router";
import { PropertyInventoryReadOnlyPage } from "@/components/properties/PropertyInventoryReadOnlyPage";
import { propertyInventorySearchSchema } from "@/components/properties/search-schema";

export const Route = createFileRoute("/_authenticated/admin/imoveis/")({
  validateSearch: (search) => propertyInventorySearchSchema.parse(search),
  component: PropertyInventoryRoute,
});

function PropertyInventoryRoute() {
  return <PropertyInventoryReadOnlyPage search={Route.useSearch()} />;
}
