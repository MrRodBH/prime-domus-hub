import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import faviconAsset from "../assets/favicon.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { structuredLog } from "../lib/structured-log";
import { loadRequiredPublicRootDataForPath } from "../lib/public-tenant-read-guards";
import { WhatsAppFab } from "../components/site/WhatsAppFab";
import { CmsPreviewOverlay } from "../components/site/CmsPreviewOverlay";
import { CampaignRenderer } from "../components/site/CampaignRenderer";
import { PublicTrackingRuntime } from "../components/site/PublicTrackingRuntime";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço informado não existe ou foi alterado.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  structuredLog({
    level: "error",
    event: "browser.root_boundary_failed",
    code: "tanstack_root_error",
    route: "browser",
    context: { boundary: "tanstack_root_error_component" },
    error,
  });
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu uma falha inesperada. Tente novamente ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ location }) => {
    const publicRootData = await loadRequiredPublicRootDataForPath(
      location.pathname,
      async () => {
        const { obterSiteSettings } = await import("../lib/api/site.functions");
        return obterSiteSettings();
      },
      async () => {
        const { getPublicTrackingSnapshot } = await import("../lib/api/tenant-tracking.functions");
        return getPublicTrackingSnapshot();
      },
    );

    if (!publicRootData) {
      return {
        tenantIndependent: true as const,
        faviconUrl: null,
        tracking: null,
        brandingV2: {},
        seoGlobal: {},
        siteName: "RM Prime Imóveis",
      };
    }

    const { settings, meta: tracking } = publicRootData;

    return {
      tenantIndependent: false as const,
      faviconUrl: settings.branding.favicon_url ?? null,
      tracking,
      brandingV2: settings.branding_v2 ?? {},
      seoGlobal: settings.seo_global ?? {},
      siteName: settings.branding.site_name || "RM Prime Imóveis",
    };
  },
  head: ({ loaderData }) => {
    const seo = (loaderData?.seoGlobal ?? {}) as Record<string, string | undefined>;
    const bv2 = (loaderData?.brandingV2 ?? {}) as Record<string, string | undefined>;
    const title = seo.default_title || "RM Prime Imóveis — Alto padrão em Belo Horizonte";
    const description =
      seo.default_description ||
      "Boutique imobiliária especializada em imóveis de alto padrão em Belo Horizonte: Lourdes, Belvedere, Vila da Serra e Funcionários.";
    const links: Array<Record<string, unknown>> = [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: loaderData?.faviconUrl ?? faviconAsset.url },
      { rel: "apple-touch-icon", href: loaderData?.faviconUrl ?? faviconAsset.url },
    ];
    const fontFamilies: string[] = [];
    if (bv2.font_primary) fontFamilies.push(`${bv2.font_primary}:wght@400;500;600;700`);
    if (bv2.font_secondary && bv2.font_secondary !== bv2.font_primary)
      fontFamilies.push(`${bv2.font_secondary}:wght@400;500;600`);
    if (fontFamilies.length > 0) {
      links.push({ rel: "preconnect", href: "https://fonts.googleapis.com" });
      links.push({
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      });
      links.push({
        rel: "stylesheet",
        href: `https://fonts.googleapis.com/css2?${fontFamilies
          .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`)
          .join("&")}&display=swap`,
      });
    }
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title },
        { name: "description", content: description },
        ...(seo.keywords
          ? [{ name: "keywords", content: seo.keywords } as Record<string, string>]
          : []),
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: loaderData?.siteName || "RM Prime Imóveis" },
        { property: "og:locale", content: "pt_BR" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary_large_image" },
        ...(seo.twitter_handle
          ? [{ name: "twitter:site", content: seo.twitter_handle } as Record<string, string>]
          : []),
        { name: "theme-color", content: bv2.color_primary || "#0b3a3a" },
      ],
      links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateAgent",
            name: loaderData?.siteName || "RM Prime Imóveis",
            description,
            areaServed: ["Belo Horizonte", "Nova Lima", "Minas Gerais"],
          }),
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function buildBrandingCss(
  bv2: Record<string, string | undefined | null> | undefined | null,
): string {
  if (!bv2) return "";
  const map: Record<string, string> = {
    color_primary: "--primary",
    color_secondary: "--secondary",
    color_accent: "--accent",
    color_button: "--ring",
    color_link: "--gold",
  };
  const decls: string[] = [];
  for (const [k, v] of Object.entries(map)) {
    const val = bv2[k];
    if (val && typeof val === "string" && val.trim()) decls.push(`${v}: ${val.trim()};`);
  }
  if (bv2.font_primary)
    decls.push(`--font-sans: "${bv2.font_primary}", ui-sans-serif, system-ui, sans-serif;`);
  if (bv2.font_secondary)
    decls.push(`--font-display: "${bv2.font_secondary}", ui-serif, Georgia, serif;`);
  if (!decls.length) return "";
  return `:root{${decls.join("")}}`;
}

function RootShell({ children }: { children: ReactNode }) {
  const loaderData = Route.useLoaderData();
  const brandingCss = buildBrandingCss(
    loaderData?.brandingV2 as Record<string, string | undefined>,
  );
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        {brandingCss ? <style dangerouslySetInnerHTML={{ __html: brandingCss }} /> : null}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const loaderData = Route.useLoaderData();
  const router = useRouter();

  useEffect(() => {
    if (loaderData.tenantIndependent) return;
    import("../lib/attribution").then((m) => m.captureAttribution()).catch(() => {});
    return router.subscribe("onResolved", () => {
      import("../lib/attribution").then((m) => m.captureAttribution()).catch(() => {});
    });
  }, [loaderData.tenantIndependent, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {loaderData.tenantIndependent ? null : <CmsPreviewOverlay />}
      <Outlet />
      {loaderData.tenantIndependent ? null : <WhatsAppFab />}
      {loaderData.tenantIndependent ? null : <CampaignRenderer />}
      {loaderData.tenantIndependent ? null : (
        <PublicTrackingRuntime snapshot={loaderData.tracking} />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
