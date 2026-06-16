import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminObterImovel } from "@/lib/api/admin.functions";
import { ImovelForm } from "@/components/admin/ImovelForm";

export const Route = createFileRoute("/_authenticated/admin/imoveis/$id")({
  component: EditarImovel,
});

function EditarImovel() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "imovel", id],
    queryFn: () => adminObterImovel({ data: { id } }),
  });
  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data) return <p>Imóvel não encontrado.</p>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ImovelForm initial={data as any} />;
}
