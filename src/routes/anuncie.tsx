import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/anuncie")({
  head: () => ({
    meta: [
      { title: "Anuncie seu imóvel — RM Prime Imóveis" },
      { name: "description", content: "Anuncie seu imóvel de alto padrão com a RM Prime. Avaliação gratuita, marketing personalizado e discrição absoluta." },
      { property: "og:title", content: "Anuncie seu imóvel — RM Prime Imóveis" },
      { property: "og:description", content: "Avaliação e marketing personalizado para imóveis de alto padrão." },
      { property: "og:url", content: "/anuncie" },
    ],
    links: [{ rel: "canonical", href: "/anuncie" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-32 w-full">
        <span className="eyebrow">Anuncie com exclusividade</span>
        <h1 className="font-display text-5xl md:text-6xl mt-4 mb-6">Avaliação do seu imóvel</h1>
        <p className="text-muted-foreground text-lg mb-12">
          Preencha as informações abaixo e um consultor entrará em contato em até 24h.
        </p>

        <form className="grid gap-5" onSubmit={(e) => e.preventDefault()}>
          {[
            { label: "Nome completo", type: "text" },
            { label: "Telefone / WhatsApp", type: "tel" },
            { label: "E-mail", type: "email" },
            { label: "Endereço do imóvel", type: "text" },
            { label: "Valor pretendido", type: "text" },
          ].map((f) => (
            <label key={f.label} className="block">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">{f.label}</span>
              <input type={f.type} className="w-full bg-card border border-foreground/15 rounded px-4 py-3 text-foreground focus:border-gold focus:outline-none transition-colors" />
            </label>
          ))}
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Observações</span>
            <textarea rows={4} className="w-full bg-card border border-foreground/15 rounded px-4 py-3 text-foreground focus:border-gold focus:outline-none transition-colors" />
          </label>
          <label className="flex items-start gap-2 text-xs text-foreground/80 leading-snug cursor-pointer">
            <input type="checkbox" required className="mt-0.5 size-4 accent-petroleum shrink-0" />
            <span>
              Li e concordo com a{" "}
              <Link to="/privacidade" className="text-gold hover:underline" target="_blank">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
          <button className="mt-4 bg-petroleum hover:bg-gold transition-colors text-linen py-4 rounded-full font-medium uppercase tracking-[0.18em] text-sm">
            Solicitar avaliação
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
