// Tela de Taxas / Simulação SFH aprovada da RM Prime.
import { createFileRoute } from "@tanstack/react-router";
import { TaxasPage } from "@/components/painel-rm/TaxasPage";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/taxas")({
  head: () => ({ meta: [{ title: "Simulação SFH — Painel da empresa" }, { name: "robots", content: "noindex" }] }),
  component: TaxasPage,
});
