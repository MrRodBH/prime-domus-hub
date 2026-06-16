import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — RM Prime Imóveis" },
      { name: "description", content: "Conheça a RM Prime Imóveis: história, missão e valores." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-32 w-full">
        <span className="eyebrow">Nossa história</span>
        <h1 className="font-display text-5xl md:text-7xl mt-4 mb-10 leading-[1.05] text-balance">
          Uma boutique imobiliária dedicada ao alto padrão.
        </h1>
        <div className="prose prose-lg text-muted-foreground max-w-none space-y-6">
          <p>
            A RM Prime Imóveis nasceu da convicção de que comprar ou vender um imóvel de alto padrão exige
            mais do que técnica: exige sensibilidade, discrição e profundo conhecimento das regiões mais
            valorizadas de Belo Horizonte.
          </p>
          <p>
            Atuamos como curadores — não como intermediários. Selecionamos cada propriedade do nosso portfólio
            com o mesmo rigor com que orientamos nossos clientes a tomar decisões patrimoniais relevantes.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
