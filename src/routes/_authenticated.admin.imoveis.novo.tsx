import { ImovelForm } from "@/components/admin/ImovelForm";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/imoveis/novo")({
  component: () => <ImovelForm />,
});
