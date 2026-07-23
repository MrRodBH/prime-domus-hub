import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { obterSiteSettings } from "@/lib/api/site.functions";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — RM Prime Imóveis" },
      { name: "description", content: "Conheça a RM Prime Imóveis: boutique imobiliária de alto padrão em Belo Horizonte." },
      { property: "og:title", content: "Sobre — RM Prime Imóveis" },
      { property: "og:description", content: "Boutique imobiliária dedicada ao alto padrão em Belo Horizonte." },
      { property: "og:url", content: "https://rmprimeimoveis.com.br/sobre" },
    ],
    links: [{ rel: "canonical", href: "https://rmprimeimoveis.com.br/sobre" }],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings() });
  },
  component: Page,
});

function Page() {
  const { data: site } = useQuery({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings(), staleTime: 5 * 60 * 1000 });
  const s = site?.pagina_sobre ?? {};
  const blocos = s.blocos ?? [];
  const stats = s.stats ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-32 w-full">
        {s.hero_eyebrow && <span className="eyebrow">{s.hero_eyebrow}</span>}
        <h1 className="font-display text-5xl md:text-7xl mt-4 mb-10 leading-[1.05] text-balance">
          {s.hero_titulo ?? "Uma boutique imobiliária dedicada ao alto padrão."}
        </h1>
        {s.hero_subtitle && <p className="text-xl text-muted-foreground mb-10 leading-relaxed">{s.hero_subtitle}</p>}
        {s.hero_image_url && (
          <img src={s.hero_image_url} alt="" className="w-full h-[400px] object-cover rounded mb-12" />
        )}

        <div className="prose prose-lg text-muted-foreground max-w-none space-y-8">
          {blocos.map((b, i) => (
            <div key={i}>
              {b.titulo && <h2 className="font-display text-3xl text-foreground mb-3">{b.titulo}</h2>}
              <p className="whitespace-pre-line">{b.texto}</p>
            </div>
          ))}
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-12 border-t border-foreground/10">
            {stats.map((st, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-4xl text-gold">{st.valor}</div>
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground mt-2">{st.label}</div>
              </div>
            ))}
          </div>
        )}

        {(s.cta_titulo || s.cta_texto) && (
          <div className="mt-20 p-10 bg-secondary/40 rounded text-center">
            {s.cta_titulo && <h3 className="font-display text-3xl mb-3">{s.cta_titulo}</h3>}
            {s.cta_texto && <p className="text-muted-foreground mb-6">{s.cta_texto}</p>}
            {s.cta_label && (
              s.cta_url?.startsWith("https://") ? (
                <a
                  href={s.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-petroleum hover:bg-gold text-linen px-8 py-4 rounded-full text-sm uppercase tracking-[0.18em] font-medium transition-colors"
                >
                  {s.cta_label}
                </a>
              ) : (
                <Link
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={(s.cta_url ?? "/contato") as any}
                  className="inline-block bg-petroleum hover:bg-gold text-linen px-8 py-4 rounded-full text-sm uppercase tracking-[0.18em] font-medium transition-colors"
                >
                  {s.cta_label}
                </Link>
              )
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
