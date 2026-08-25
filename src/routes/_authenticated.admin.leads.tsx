// Rota legada — mantém links antigos funcionando sem transportar comandos ou
// parâmetros de apresentação incompatíveis para o pipeline read-only.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { migrateLegacyLeadsSearch } from "@/components/pipeline/search-schema";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/pipeline",
      search: migrateLegacyLeadsSearch(search),
    });
  },
  component: () => null,
});
