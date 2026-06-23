import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, BedDouble, Maximize2, Car, ArrowRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { obterSiteSettings } from "@/lib/api/site.functions";
import { listarImoveis } from "@/lib/api/catalogo.functions";
import heroImg from "@/assets/hero.jpg";

const DEFAULT_META_TITLE = "Lançamentos — RM Prime Imóveis";
const DEFAULT_META_DESC = "Empreendimentos exclusivos com acesso antecipado em BH e Nova Lima.";

export const Route = createFileRoute("/lancamentos")({
  head: (ctx: { loaderData?: { metaTitle?: string; metaDescription?: string } }) => {
    const t = ctx.loaderData?.metaTitle ?? DEFAULT_META_TITLE;
    const d = ctx.loaderData?.metaDescription ?? DEFAULT_META_DESC;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:url", content: "/lancamentos" },
      ],
      links: [{ rel: "canonical", href: "/lancamentos" }],
    };
  },
  loader: async ({ context }) => {
    const [site] = await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings() }),
      context.queryClient.ensureQueryData({
        queryKey: ["lancamentos-list"],
        queryFn: () => listarImoveis({ data: { finalidade: "lancamento", limite: 60 } }),
      }),
    ]);
    return {
      metaTitle: site.pagina_lancamentos.meta_title || DEFAULT_META_TITLE,
      metaDescription: site.pagina_lancamentos.meta_description || DEFAULT_META_DESC,
    };
  },
  component: Page,
});

function formatPreco(p: number | null | undefined, sobConsulta?: boolean | null) {
  if (sobConsulta || !p) return "Sob consulta";
  return `R$ ${p.toLocaleString("pt-BR")}`;
}

function Page() {
  const { data: site } = useQuery({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings(), staleTime: 5 * 60 * 1000 });
  const { data: imoveis } = useQuery({
    queryKey: ["lancamentos-list"],
    queryFn: () => listarImoveis({ data: { finalidade: "lancamento", limite: 60 } }),
    staleTime: 2 * 60 * 1000,
  });

  const cfg = site?.pagina_lancamentos ?? {};
  const titleLines = cfg.title_lines && cfg.title_lines.length > 0 ? cfg.title_lines : ["Empreendimentos", "exclusivos"];
  const eyebrow = cfg.eyebrow || "Lançamentos";
  const subtitle = cfg.subtitle || "";
  const ctaPrimary = cfg.cta_primary || "Falar com especialista";
  const ctaSecondary = cfg.cta_secondary || "";
  const heroImage = cfg.image_url || heroImg;
  const emptyMsg = cfg.empty_message || "Em breve novos lançamentos.";

  const lista = imoveis ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* HERO */}
      <section className="relative h-[72vh] min-h-[520px] flex items-end pb-16 md:pb-20 overflow-hidden">
        <img src={heroImage} alt="Lançamentos de alto padrão" width={1920} height={1080} fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-petroleum/85 via-petroleum/40 to-petroleum/10" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <span className="eyebrow !text-tiffany">{eyebrow}</span>
          <h1 className="font-display text-5xl md:text-7xl text-linen leading-[1.05] mt-5 mb-6 text-balance max-w-3xl">
            {titleLines.map((line, i) => (<span key={i} className="block">{line}</span>))}
          </h1>
          {subtitle && <p className="text-linen/80 text-lg max-w-2xl mb-8">{subtitle}</p>}
          <div className="flex flex-wrap gap-3">
            <Link to="/contato" className="bg-gold hover:bg-gold/90 text-petroleum px-7 py-4 rounded font-medium text-sm uppercase tracking-[0.18em]">
              {ctaPrimary}
            </Link>
            {ctaSecondary && (
              <Link to="/imoveis" className="bg-linen/10 hover:bg-linen/20 backdrop-blur text-linen px-7 py-4 rounded font-medium text-sm uppercase tracking-[0.18em] border border-linen/30">
                {ctaSecondary}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* LISTA */}
      <section className="py-24 md:py-32 flex-1">
        <div className="max-w-7xl mx-auto px-6">
          {lista.length === 0 ? (
            <div className="text-center py-12 max-w-2xl mx-auto">
              <p className="text-muted-foreground text-lg">{emptyMsg}</p>
              <Link to="/contato" className="group inline-flex items-center gap-2 text-sm font-medium border-b border-foreground/20 pb-1 hover:border-gold hover:text-gold transition-colors mt-8">
                Fale com um especialista
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
              {lista.map((p) => {
                const bairroNome = (p.bairro as { nome?: string } | null)?.nome ?? "";
                const suitesTxt = p.suites ? `${p.suites} suíte${p.suites > 1 ? "s" : ""}` : (p.quartos ? `${p.quartos} quarto${p.quartos > 1 ? "s" : ""}` : "—");
                const vagasTxt = p.vagas ? `${p.vagas} vaga${p.vagas > 1 ? "s" : ""}` : "—";
                const areaTxt = p.area_util ? `${p.area_util} m²` : "—";
                return (
                  <Link key={p.id} to="/imovel/$slug" params={{ slug: p.slug }} className="group cursor-pointer block">
                    <div className="relative overflow-hidden rounded mb-5 bg-muted">
                      {p.imagem_capa ? (
                        <img src={p.imagem_capa} alt={p.titulo} loading="lazy" className="block w-full h-auto" />
                      ) : (
                        <div className="aspect-[16/10] w-full bg-muted flex items-center justify-center text-muted-foreground text-sm">Sem foto</div>
                      )}
                      <div className="absolute top-4 left-4 bg-gold px-3 py-1.5 rounded-full">
                        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-petroleum">Lançamento</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.22em] flex items-center gap-1.5">
                        <MapPin className="size-3" strokeWidth={1.5} />{bairroNome}
                      </p>
                      <h3 className="font-display text-2xl group-hover:text-gold transition-colors">{p.titulo}</h3>
                      <div className="flex items-center gap-5 text-xs text-muted-foreground pt-3 border-t border-foreground/5">
                        <span className="flex items-center gap-1.5"><Maximize2 className="size-3" strokeWidth={1.5} />{areaTxt}</span>
                        <span className="flex items-center gap-1.5"><BedDouble className="size-3" strokeWidth={1.5} />{suitesTxt}</span>
                        <span className="flex items-center gap-1.5"><Car className="size-3" strokeWidth={1.5} />{vagasTxt}</span>
                      </div>
                      <p className="text-lg font-medium text-gold pt-3">{formatPreco(p.preco, p.preco_sob_consulta)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
