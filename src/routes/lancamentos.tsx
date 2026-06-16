import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/lancamentos")({
  head: () => ({
    meta: [
      { title: "Lançamentos — RM Prime Imóveis" },
      { name: "description", content: "Acesso antecipado aos principais lançamentos de alto padrão em Belo Horizonte e Nova Lima." },
      { property: "og:title", content: "Lançamentos — RM Prime Imóveis" },
      { property: "og:description", content: "Empreendimentos exclusivos com acesso antecipado em BH e Nova Lima." },
      { property: "og:url", content: "/lancamentos" },
    ],
    links: [{ rel: "canonical", href: "/lancamentos" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-32 w-full">
        <span className="eyebrow">Lançamentos</span>
        <h1 className="font-display text-5xl md:text-6xl mt-4 mb-6">Empreendimentos exclusivos</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Acesso antecipado aos principais lançamentos de alto padrão em Belo Horizonte e Nova Lima.
        </p>
      </main>
      <Footer />
    </div>
  );
}
