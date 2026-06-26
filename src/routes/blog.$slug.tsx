import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { obterPostPublico } from "@/lib/api/blog.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await obterPostPublico({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return post;
  },
  head: ({ params, loaderData }) => {
    const post = loaderData;
    const autor = post ? (Array.isArray(post.autor) ? post.autor[0] : post.autor) : null;
    const title = post?.meta_title || `${post?.titulo} — Blog RM Prime`;
    const desc = post?.meta_description || post?.resumo || "Artigo do blog RM Prime Imóveis.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/blog/${params.slug}` },
        ...(post?.imagem_capa ? [{ property: "og:image", content: post.imagem_capa }] : []),
      ],
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
      scripts: post
        ? [{
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.titulo,
              description: desc,
              image: post.imagem_capa || undefined,
              datePublished: post.publicado_em,
              author: autor?.nome ? { "@type": "Person", name: autor.nome } : undefined,
            }),
          }]
        : [],
    };
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-32">
        <p className="text-muted-foreground">Erro ao carregar post: {error.message}</p>
      </main>
      <Footer />
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-32 text-center">
        <h1 className="font-display text-4xl mb-4">Post não encontrado</h1>
        <Link to="/blog" className="text-gold underline">Voltar ao blog</Link>
      </main>
      <Footer />
    </div>
  ),
  component: Page,
});

function Page() {
  const post = Route.useLoaderData();
  const cat = Array.isArray(post.categoria) ? post.categoria[0] : post.categoria;
  const autor = Array.isArray(post.autor) ? post.autor[0] : post.autor;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {post.imagem_capa && (
          <div className="w-full aspect-[21/9] max-h-[60vh] overflow-hidden bg-secondary">
            <img src={post.imagem_capa} alt={post.titulo} className="w-full h-full object-cover" />
          </div>
        )}
        <article className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
          {cat?.nome && <span className="eyebrow text-gold">{cat.nome}</span>}
          <h1 className="font-display text-4xl md:text-5xl mt-4 mb-4">{post.titulo}</h1>
          {post.publicado_em && (
            <p className="text-sm text-muted-foreground mb-8">
              {new Date(post.publicado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              {autor?.nome && <> · por {[autor.nome, (autor as { sobrenome?: string }).sobrenome].filter(Boolean).join(" ")}</>}
            </p>
          )}
          {post.resumo && <p className="text-xl text-foreground/80 leading-relaxed mb-10">{post.resumo}</p>}
          <div
            className="prose prose-lg max-w-none [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gold [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-gold [&_a]:underline [&_p]:my-4 [&_p]:leading-relaxed [&_img]:rounded-md [&_img]:my-6 [&_img]:w-full [&_img]:h-auto [&_figure]:my-8 [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_table]:text-sm [&_th]:border [&_th]:border-foreground/15 [&_th]:bg-secondary/40 [&_th]:p-3 [&_th]:text-left [&_th]:font-medium [&_td]:border [&_td]:border-foreground/15 [&_td]:p-3 [&_td]:align-top"
            dangerouslySetInnerHTML={{ __html: post.conteudo || "" }}
          />
          <div className="mt-16 pt-8 border-t border-foreground/5">
            <Link to="/blog" className="text-sm text-gold hover:underline">← Voltar ao blog</Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
