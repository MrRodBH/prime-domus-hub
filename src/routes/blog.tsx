import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — RM Prime Imóveis" },
      { name: "description", content: "Artigos sobre mercado imobiliário de alto padrão, investimentos, arquitetura e decoração em Belo Horizonte." },
      { property: "og:title", content: "Blog — RM Prime Imóveis" },
      { property: "og:description", content: "Análises de mercado, arquitetura e investimentos em imóveis de luxo." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-32 w-full">
        <span className="eyebrow">Editorial</span>
        <h1 className="font-display text-5xl md:text-6xl mt-4 mb-6">Blog RM Prime</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Análises de mercado, tendências de arquitetura e guias para investidores de imóveis de alto padrão.
        </p>
      </main>
      <Footer />
    </div>
  );
}
