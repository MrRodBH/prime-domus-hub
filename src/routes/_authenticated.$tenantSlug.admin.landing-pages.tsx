// Tela de Landing pages aprovada da RM Prime.
import { createFileRoute } from "@tanstack/react-router";
import { LandingPagesPage } from "@/components/painel-rm/LandingPagesPage";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/landing-pages")({
  head: () => ({ meta: [{ title: "Landing pages — Painel da empresa" }, { name: "robots", content: "noindex" }] }),
  component: LandingPagesPage,
});
