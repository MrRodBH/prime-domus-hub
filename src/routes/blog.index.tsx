import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { listarPostsPublicos, listarCategoriasPublicas } from "@/lib/api/blog.functions";

export const Route = createFileRoute("/blog/")({
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
  const { data: posts } = useQuery({ queryKey: ["blog", "posts"], queryFn: () => listarPostsPublicos() });
  const { data: cats } = useQuery({ queryKey: ["blog", "cats"], queryFn: () => listarCategoriasPublicas() });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-24 lg:py-32 w-full">
        <span className="eyebrow">Editorial</span>
        <h1 className="font-display text-5xl md:text-6xl mt-4 mb-6">Blog RM Prime</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Análises de mercado, tendências de arquitetura e guias para investidores de imóveis de alto padrão.
        </p>

        {cats && cats.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10">
            {cats.map((c) => (
              <span key={c.id} className="text-[11px] uppercase tracking-[0.2em] border border-foreground/10 rounded-full px-3 py-1.5 text-foreground/70">
                {c.nome}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {posts?.map((p) => {
            const cat = Array.isArray(p.categoria) ? p.categoria[0] : p.categoria;
            return (
            <Link
              key={p.id}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group block bg-card rounded-lg overflow-hidden border border-foreground/5 hover:border-gold/40 transition-colors"
            >
              {p.imagem_capa && (
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  <img src={p.imagem_capa} alt={p.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-6">
                {cat?.nome && (
                  <span className="eyebrow text-gold">{cat.nome}</span>
                )}
                <h2 className="font-display text-xl mt-2 group-hover:text-gold transition-colors">{p.titulo}</h2>
                {p.resumo && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.resumo}</p>}
                {p.publicado_em && (
                  <p className="text-xs text-muted-foreground mt-4">
                    {new Date(p.publicado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </Link>
            );
          })}
          {posts && posts.length === 0 && (
            <p className="text-muted-foreground col-span-full">Em breve, novos conteúdos.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
