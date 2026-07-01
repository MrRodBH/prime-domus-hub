import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { obterPaginaPublica, type CmsBlock } from "@/lib/api/pages.functions";
import { CmsPageRenderer } from "@/components/site/CmsPageRenderer";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Suspense } from "react";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData({
      queryKey: ["cms-page", params.slug],
      queryFn: () => obterPaginaPublica({ data: { slug: params.slug } }),
    });
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.page as { titulo: string; descricao: string | null; seo: Record<string, unknown> } | undefined;
    const seo = (p?.seo ?? {}) as { meta_title?: string; meta_description?: string; og_image?: string; canonical?: string; noindex?: boolean };
    const title = seo.meta_title || p?.titulo || "RM Prime Imóveis";
    const desc = seo.meta_description || p?.descricao || "";
    const url = `https://rmprimeimoveis.com.br/p/${params.slug}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: seo.canonical || url },
      { property: "og:type", content: "website" },
    ];
    if (seo.og_image) meta.push({ property: "og:image", content: seo.og_image });
    if (seo.noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
    return {
      meta,
      links: [{ rel: "canonical", href: seo.canonical || url }],
    };
  },
  component: PaginaPublica,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-3xl font-serif mb-2">Página não encontrada</h1>
      <p className="text-muted-foreground">A página que você procura não existe ou foi despublicada.</p>
    </div>
  ),
});

function PaginaPublica() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery({
    queryKey: ["cms-page", slug],
    queryFn: () => obterPaginaPublica({ data: { slug } }),
  });
  if (!page) return null;
  const blocks = (page.blocks as CmsBlock[]) ?? [];
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={null}><Header /></Suspense>
      <main className="flex-1">
        <CmsPageRenderer blocks={blocks} />
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
}
