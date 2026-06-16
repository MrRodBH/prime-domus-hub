import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/imoveis")({
  head: () => ({
    meta: [
      { title: "Imóveis à venda — RM Prime Imóveis" },
      { name: "description", content: "Catálogo de imóveis de alto padrão em Belo Horizonte: coberturas, apartamentos, casas em condomínio e mais." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-32 w-full">
        <span className="eyebrow">Catálogo</span>
        <h1 className="font-display text-5xl md:text-6xl mt-4 mb-6">Imóveis em curadoria</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Em breve, busca completa com filtros, mapa e visualização em grid. Estamos finalizando a integração
          com o catálogo e o painel administrativo.
        </p>
      </main>
      <Footer />
    </div>
  );
}
