// Tela de Imóveis aprovada da RM Prime (lista em cartões, cadastro em janela, fotos ordenáveis).
import { createFileRoute } from "@tanstack/react-router";
import { ImoveisPage } from "@/components/painel-rm/ImoveisPage";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/imoveis/")({
  head: () => ({ meta: [{ title: "Imóveis — Painel da empresa" }, { name: "robots", content: "noindex" }] }),
  component: ImoveisPage,
});
