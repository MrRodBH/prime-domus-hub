import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MapPin, Phone, Mail } from "lucide-react";
import { metaTrack, metaEventId } from "@/lib/meta-pixel";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — RM Prime Imóveis" },
      { name: "description", content: "Fale com a equipe RM Prime Imóveis em Belo Horizonte. WhatsApp, telefone e e-mail para atendimento a clientes de alto padrão." },
      { property: "og:title", content: "Contato — RM Prime Imóveis" },
      { property: "og:description", content: "Atendimento consultivo para imóveis de alto padrão em Belo Horizonte." },
      { property: "og:url", content: "/contato" },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <span className="eyebrow">Fale Conosco</span>
            <h1 className="font-display text-5xl md:text-6xl mt-4 mb-10 leading-[1.05]">
              Estamos prontos para atender você.
            </h1>
            <div className="space-y-7">
              <ContactLine icon={MapPin} label="Endereço" value="Rua Sergipe, 1234 · Lourdes · Belo Horizonte / MG" />
              <ContactLine icon={Phone} label="Telefone" value="(31) 99999-9999" />
              <ContactLine icon={Mail} label="E-mail" value="contato@rmprime.com.br" />
            </div>
          </div>
          <form className="bg-card border border-foreground/5 p-8 md:p-10 rounded shadow-soft grid gap-5" onSubmit={(e) => e.preventDefault()}>
            {[
              { label: "Nome", type: "text" },
              { label: "E-mail", type: "email" },
              { label: "Telefone", type: "tel" },
            ].map((f) => (
              <label key={f.label}>
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">{f.label}</span>
                <input type={f.type} className="w-full bg-background border border-foreground/15 rounded px-4 py-3 focus:border-gold focus:outline-none" />
              </label>
            ))}
            <label>
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Mensagem</span>
              <textarea rows={5} className="w-full bg-background border border-foreground/15 rounded px-4 py-3 focus:border-gold focus:outline-none" />
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
            <button className="bg-petroleum hover:bg-gold text-linen py-4 rounded-full text-sm uppercase tracking-[0.18em] font-medium transition-colors">
              Enviar mensagem
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ContactLine({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="size-11 rounded-full bg-secondary grid place-items-center text-gold shrink-0">
        <Icon className="size-4" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</p>
        <p className="text-base">{value}</p>
      </div>
    </div>
  );
}
