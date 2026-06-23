import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://rmprimeimoveis.com.br";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/imoveis", changefreq: "daily", priority: "0.9" },
          { path: "/lancamentos", changefreq: "weekly", priority: "0.8" },
          { path: "/sobre", changefreq: "monthly", priority: "0.5" },
          { path: "/anuncie", changefreq: "monthly", priority: "0.6" },
          { path: "/contato", changefreq: "monthly", priority: "0.5" },
          { path: "/blog", changefreq: "weekly", priority: "0.6" },
        ];

        try {
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          const { data } = await supabase
            .from("imoveis")
            .select("slug, updated_at")
            .eq("status", "ativo");
          for (const row of data ?? []) {
            entries.push({
              path: `/imovel/${row.slug}`,
              lastmod: row.updated_at?.slice(0, 10),
              changefreq: "weekly",
              priority: "0.8",
            });
          }
          const { data: posts } = await supabase
            .from("blog_posts")
            .select("slug, updated_at")
            .eq("status", "publicado");
          for (const row of posts ?? []) {
            entries.push({
              path: `/blog/${row.slug}`,
              lastmod: row.updated_at?.slice(0, 10),
              changefreq: "monthly",
              priority: "0.6",
            });
          }
          const { data: lancs } = await supabase
            .from("launch_projects")
            .select("slug, updated_at")
            .eq("publicado", true);
          for (const row of lancs ?? []) {
            entries.push({
              path: `/lancamentos/${row.slug}`,
              lastmod: row.updated_at?.slice(0, 10),
              changefreq: "weekly",
              priority: "0.85",
            });
          }
        } catch {
          // se faltar config, ainda retornamos rotas estáticas
        }


        const urls = entries
          .map((e) =>
            [
              "  <url>",
              `    <loc>${BASE_URL}${e.path}</loc>`,
              e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              "  </url>",
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
