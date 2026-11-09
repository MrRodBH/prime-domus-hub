import { createFileRoute } from "@tanstack/react-router";
import { CampanhasPage } from "@/components/painel-rm/CampanhasPage";
import { campanhasQueryOptions } from "@/lib/rm-marketing/campaign-query";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/campanhas/")({
  head: () => ({ meta: [
    { title: "Campanhas sociais | RealOne — Painel da empresa" },
    { name: "description", content: "Campanhas imobiliárias, criativos e textos para redes sociais da sua empresa." },
    { property: "og:title", content: "Campanhas sociais | RealOne" },
    { property: "og:description", content: "Produção e revisão das campanhas imobiliárias da empresa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(campanhasQueryOptions()),
  component: CampanhasPage,
});
