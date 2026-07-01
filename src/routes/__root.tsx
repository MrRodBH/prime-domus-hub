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
import { WhatsAppFab } from "../components/site/WhatsAppFab";
import { CmsPreviewOverlay } from "../components/site/CmsPreviewOverlay";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    let faviconUrl: string | null = null;
    let metaPixelId: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let brandingV2: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let seoGlobal: any = {};
    let siteName = "RM Prime Imóveis";
    try {
      const { obterSiteSettings } = await import("../lib/api/site.functions");
      const settings = await obterSiteSettings();
      faviconUrl = settings.branding.favicon_url ?? null;
      brandingV2 = settings.branding_v2 ?? {};
      seoGlobal = settings.seo_global ?? {};
      siteName = settings.branding.site_name || siteName;
    } catch {
      // ignore
    }
    try {
      const { obterMetaPixelId } = await import("../lib/api/meta.functions");
      const r = await obterMetaPixelId();
      metaPixelId = r.pixel_id;
    } catch {
      // ignore
    }
    return { faviconUrl, metaPixelId, brandingV2, seoGlobal, siteName };
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seoGlobal ?? {};
    const bv2 = loaderData?.brandingV2 ?? {};
    const title = seo.default_title || "RM Prime Imóveis — Alto padrão em Belo Horizonte";
    const description =
      seo.default_description ||
      "Boutique imobiliária especializada em imóveis de alto padrão em Belo Horizonte: Lourdes, Belvedere, Vila da Serra e Funcionários.";
    const links: Array<Record<string, unknown>> = [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: loaderData?.faviconUrl ?? faviconAsset.url },
      { rel: "apple-touch-icon", href: loaderData?.faviconUrl ?? faviconAsset.url },
    ];
    // Preload Google Fonts se configurado
    const fontFamilies: string[] = [];
    if (bv2.font_primary) fontFamilies.push(`${bv2.font_primary}:wght@400;500;600;700`);
    if (bv2.font_secondary && bv2.font_secondary !== bv2.font_primary)
      fontFamilies.push(`${bv2.font_secondary}:wght@400;500;600`);
    if (fontFamilies.length > 0) {
      links.push({ rel: "preconnect", href: "https://fonts.googleapis.com" });
      links.push({ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" });
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
        ...(seo.keywords ? [{ name: "keywords", content: seo.keywords } as Record<string, string>] : []),
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
        { async: true, src: "https://www.googletagmanager.com/gtag/js?id=G-BYVFRCL0VV" },
        {
          children: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-BYVFRCL0VV');`,
        },
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

function buildBrandingCss(bv2: Record<string, string | undefined | null> | undefined | null): string {
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
  if (bv2.font_primary) decls.push(`--font-sans: "${bv2.font_primary}", ui-sans-serif, system-ui, sans-serif;`);
  if (bv2.font_secondary) decls.push(`--font-display: "${bv2.font_secondary}", ui-serif, Georgia, serif;`);
  if (!decls.length) return "";
  return `:root{${decls.join("")}}`;
}

function RootShell({ children }: { children: ReactNode }) {
  const loaderData = Route.useLoaderData();
  const pixelId = loaderData?.metaPixelId ?? null;
  const brandingCss = buildBrandingCss(loaderData?.brandingV2 as Record<string, string | undefined>);
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        {brandingCss ? <style dangerouslySetInnerHTML={{ __html: brandingCss }} /> : null}
        {pixelId ? (
          <>
            <script
              dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`,
              }}
            />
            <noscript
              dangerouslySetInnerHTML={{
                __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`,
              }}
            />
          </>
        ) : null}
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
  const router = useRouter();

  useEffect(() => {
    // Captura inicial de atribuição (UTM / gclid / fbclid / referrer).
    import("../lib/attribution").then((m) => m.captureAttribution()).catch(() => {});
    return router.subscribe("onResolved", ({ toLocation }) => {
      // Recaptura em cada navegação SPA — novos paid touches sobrescrevem.
      import("../lib/attribution").then((m) => m.captureAttribution()).catch(() => {});
      const w = window as unknown as {
        gtag?: (...args: unknown[]) => void;
        fbq?: (...args: unknown[]) => void;
      };
      if (typeof w.gtag === "function") {
        w.gtag("config", "G-BYVFRCL0VV", {
          page_path: toLocation.pathname + toLocation.searchStr,
        });
      }
      if (typeof w.fbq === "function") {
        try { w.fbq("track", "PageView"); } catch { /* noop */ }
      }
    });
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <CmsPreviewOverlay />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <WhatsAppFab />
      <Toaster />
    </QueryClientProvider>
  );
}
