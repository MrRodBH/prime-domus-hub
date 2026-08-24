import { ArrowLeft } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PropertyInventoryReadOnlyDetail } from "@/components/properties/PropertyInventoryReadOnlyDetail";
import { usePropertyDetailReadModel } from "@/components/properties/hooks/usePropertyInventoryReadModel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/imoveis/$id")({
  component: PropertyInventoryDetailRoute,
});

function PropertyInventoryDetailRoute() {
  const { id } = Route.useParams();
  const detail = usePropertyDetailReadModel(id);
  const state = detail.query.isPending
    ? "loading"
    : detail.query.isError
      ? (detail.errorKind ?? "error")
      : "idle";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4" data-property-route-mode="read-only">
      <Button asChild variant="ghost" className="w-fit">
        <Link to="/admin/imoveis">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao inventário
        </Link>
      </Button>
      <PropertyInventoryReadOnlyDetail
        property={detail.property}
        state={state}
        onRetry={() => detail.query.refetch()}
      />
    </div>
  );
}
