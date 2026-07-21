import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { obterPaginaPublica } from "@/lib/api/pages.functions";
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
  head: ({ loaderData }) => {
    const page = loaderData?.page;
    const seo = page?.seo;
    const title = seo?.meta_title || page?.titulo || "RM Prime Imóveis";
    const desc = seo?.meta_description || page?.descricao || "";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
    ];
    if (seo?.canonical) {
      meta.push({ property: "og:url", content: seo.canonical });
    }
    if (seo?.og_image) {
      meta.push({ property: "og:image", content: seo.og_image });
    }
    if (seo?.noindex) {
      meta.push({ name: "robots", content: "noindex, nofollow" });
    }
    return {
      meta,
      links: seo?.canonical
        ? [{ rel: "canonical", href: seo.canonical }]
        : [],
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
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={null}><Header /></Suspense>
      <main className="flex-1">
        <CmsPageRenderer blocks={page.blocks} />
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
}
