import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ArrowRight, MapPin, BedDouble, Maximize2, Car, ChevronRight, Quote } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { obterSiteSettings } from "@/lib/api/site.functions";
import { listarImoveis, listarBairros } from "@/lib/api/catalogo.functions";
import { listarLancamentosPublico } from "@/lib/api/lancamentos.functions";
import heroImg from "@/assets/hero.jpg";
import feature from "@/assets/feature.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RM Prime Imóveis — Alto padrão em Belo Horizonte" },
      {
        name: "description",
        content:
          "Imóveis de alto padrão em Lourdes, Belvedere, Vila da Serra e demais regiões nobres de Belo Horizonte. Conectando você ao seu melhor imóvel.",
      },
      { property: "og:title", content: "RM Prime Imóveis — Alto padrão em Belo Horizonte" },
      {
        property: "og:description",
        content:
          "Imóveis de alto padrão em Belo Horizonte. Coberturas, mansões e lançamentos exclusivos.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter+Tight:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings() }),
      context.queryClient.ensureQueryData({ queryKey: ["home-destaques"], queryFn: () => listarImoveis({ data: { apenas_destaque: true, limite: 12 } }) }),
      context.queryClient.ensureQueryData({ queryKey: ["home-bairros", "destaque"], queryFn: () => listarBairros({ data: { apenas_destaque: true, limite: 24 } }) }),
      context.queryClient.ensureQueryData({ queryKey: ["lancamentos-publico"], queryFn: () => listarLancamentosPublico() }),
    ]);
  },
  component: Home,
});

const differentials = [
  { n: "01", title: "Seleção especializada", desc: "Portfólio rigorosamente selecionado por arquitetura autoral e localização premium." },
  { n: "02", title: "Atendimento consultivo", desc: "Especialistas dedicados a entender sua necessidade real, sem pressa." },
  { n: "03", title: "Exclusividade total", desc: "Acesso a imóveis off-market que não circulam nos portais comuns." },
  { n: "04", title: "Experiência digital", desc: "Acompanhamento transparente via nossa plataforma proprietária." },
];

const testimonials = [
  {
    quote:
      "A RM Prime entendeu exatamente o que buscávamos. Em três semanas estávamos morando na cobertura dos sonhos.",
    name: "Mariana Andrade",
    role: "Investidora, BH",
  },
  {
    quote:
      "Atendimento à altura do imóvel. Discrição, conhecimento de mercado e portfólio realmente exclusivo.",
    name: "Eduardo Vasconcelos",
    role: "Executivo, Nova Lima",
  },
];

function formatPreco(p: number | null | undefined, sobConsulta?: boolean | null) {
  if (sobConsulta || !p) return "Sob consulta";
  return `R$ ${p.toLocaleString("pt-BR")}`;
}

function HeroSearch({ searchTipos, ctaPrimary }: { searchTipos: string[]; ctaPrimary: string }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"comprar" | "lancamentos">("comprar");
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "lancamentos") {
      navigate({ to: "/lancamentos" });
      return;
    }
    const search: Record<string, string> = {};
    if (busca.trim()) search.busca = busca.trim();
    navigate({ to: "/imoveis", search });
  }

  return (
    <form onSubmit={submit} className="bg-linen/95 backdrop-blur-xl p-2 flex flex-col md:flex-row gap-2 rounded-md shadow-elegant ring-1 ring-foreground/5 animate-reveal" style={{ animationDelay: "200ms" }}>
      <div className="flex flex-1 gap-1 px-2">
        <button type="button" onClick={() => setTab("comprar")} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${tab === "comprar" ? "text-petroleum border-b-2 border-gold" : "text-muted-foreground hover:text-petroleum"}`}>
          Comprar
        </button>
        <button type="button" onClick={() => setTab("lancamentos")} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${tab === "lancamentos" ? "text-petroleum border-b-2 border-gold" : "text-muted-foreground hover:text-petroleum"}`}>
          Lançamentos
        </button>
      </div>
      <div className="hidden md:block w-px bg-foreground/10 my-2" />
      <div className={`flex-1 px-4 py-2 md:border-r border-foreground/10 ${tab === "lancamentos" ? "opacity-50 pointer-events-none" : ""}`}>
        <label className="block text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Onde / Código</label>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Lourdes, Vila da Serra, RMV-0001…"
          className="w-full bg-transparent border-none text-petroleum font-medium placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
      <div className={`flex-1 px-4 py-2 md:border-r border-foreground/10 ${tab === "lancamentos" ? "opacity-50 pointer-events-none" : ""}`}>
        <label className="block text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Tipo</label>
        <select aria-label="Tipo de imóvel" value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full bg-transparent border-none text-petroleum font-medium focus:outline-none appearance-none">
          <option value="">Todos</option>
          {searchTipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="bg-petroleum hover:bg-gold transition-colors text-linen px-8 py-4 rounded font-medium text-sm inline-flex items-center justify-center gap-2 uppercase tracking-[0.18em]">
        <Search className="size-4" strokeWidth={1.5} />
        {tab === "lancamentos" ? "Ver lançamentos" : ctaPrimary}
      </button>
    </form>
  );
}

function Home() {
  const { data: site } = useQuery({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings(), staleTime: 5 * 60 * 1000 });
  const hero = site?.home_hero ?? {};
  const secoes = site?.home_secoes ?? {};
  const destaquesQtd = secoes.destaques_qtd ?? 3;
  const bairrosQtd = secoes.bairros_qtd ?? 4;

  const { data: imoveis } = useQuery({
    queryKey: ["home-destaques"],
    queryFn: () => listarImoveis({ data: { apenas_destaque: true, limite: 12 } }),
    staleTime: 2 * 60 * 1000,
  });
  const { data: bairros } = useQuery({
    queryKey: ["home-bairros", "destaque"],
    queryFn: () => listarBairros({ data: { apenas_destaque: true, limite: 24 } }),
    staleTime: 2 * 60 * 1000,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lancamentos } = useQuery<any[]>({
    queryKey: ["lancamentos-publico"],
    queryFn: () => listarLancamentosPublico(),
    staleTime: 2 * 60 * 1000,
  });

  const destaques = (imoveis ?? []).slice(0, destaquesQtd);
  const bairrosLista = (bairros ?? []).slice(0, bairrosQtd);
  const lancDestaque = (lancamentos ?? []).filter((l) => l.destaque).slice(0, 3);

  const titleLines: string[] = hero.title_lines && hero.title_lines.length > 0
    ? hero.title_lines
    : ["Imóveis", "extraordinários em BH."];
  const eyebrow = hero.eyebrow || "RM Prime Imóveis";
  const subtitle = hero.subtitle || "";
  const ctaPrimary = hero.cta_primary || "Encontrar imóvel";
  const heroImage = hero.image_url || heroImg;
  const searchTipos = hero.search_tipos && hero.search_tipos.length > 0
    ? hero.search_tipos
    : ["Coberturas & Garden", "Apartamentos de luxo", "Casas em condomínio", "Terrenos premium"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative h-[92vh] min-h-[640px] flex items-end pb-16 md:pb-20 overflow-hidden">
        <img src={heroImage} alt="Cobertura de alto padrão em Belo Horizonte ao entardecer" width={1920} height={1080} fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-petroleum/80 via-petroleum/30 to-petroleum/10" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-3xl animate-reveal">
            <span className="eyebrow !text-tiffany">{eyebrow}</span>
            <h1 className="font-display text-5xl md:text-7xl text-linen leading-[1.05] mt-5 mb-6 text-balance">
              {titleLines.map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
            {subtitle && <p className="text-linen/80 text-lg max-w-2xl mb-8">{subtitle}</p>}
          </div>

          {/* Search */}
          <HeroSearch searchTipos={searchTipos} ctaPrimary={ctaPrimary} />

        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div className="max-w-[48ch]">
              <span className="eyebrow">{secoes.destaques_eyebrow ?? "Seleção Exclusiva"}</span>
              <h2 className="font-display text-4xl md:text-5xl mt-4 leading-[1.1] text-balance">
                {secoes.destaques_titulo ?? "Destaques"}
              </h2>
            </div>
            <Link to="/imoveis" className="group inline-flex items-center gap-2 text-sm font-medium border-b border-foreground/20 pb-1 hover:border-gold hover:text-gold transition-colors">
              Ver todos os imóveis
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
            </Link>
          </div>

          {destaques.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhum imóvel em destaque no momento.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
              {destaques.map((p) => {
                const bairroNome = (p.bairro as { nome?: string } | null)?.nome ?? "";
                const suitesTxt = p.suites ? `${p.suites} suíte${p.suites > 1 ? "s" : ""}` : (p.quartos ? `${p.quartos} quarto${p.quartos > 1 ? "s" : ""}` : "—");
                const vagasTxt = p.vagas ? `${p.vagas} vaga${p.vagas > 1 ? "s" : ""}` : "—";
                const areaTxt = p.area_util ? `${p.area_util} m²` : "—";
                return (
                  <Link key={p.id} to="/imovel/$slug" params={{ slug: p.slug }} className="group cursor-pointer block">
                    <div className="relative overflow-hidden rounded mb-5 bg-muted">
                      {p.imagem_capa ? (
                        <img
                          src={p.imagem_capa}
                          alt={p.titulo}
                          loading="lazy"
                          className="block w-full h-auto"
                        />
                      ) : (
                        <div className="aspect-[16/10] w-full bg-muted flex items-center justify-center text-muted-foreground text-sm">Sem foto</div>
                      )}
                      {p.badge && (
                        <div className="absolute top-4 left-4 bg-linen/95 backdrop-blur px-3 py-1.5 rounded-full">
                          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-petroleum">{p.badge}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.22em] flex items-center gap-1.5">
                        <MapPin className="size-3" strokeWidth={1.5} />
                        {bairroNome}
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

      {/* LANÇAMENTOS EM DESTAQUE */}
      {lancDestaque.length > 0 && (
        <section className="py-24 md:py-32 bg-petroleum text-linen">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="eyebrow !text-tiffany">Lançamentos</span>
                <h2 className="font-display text-4xl md:text-5xl mt-4 leading-[1.1]">Empreendimentos em destaque</h2>
              </div>
              <Link to="/lancamentos" className="group inline-flex items-center gap-2 text-sm font-medium border-b border-linen/30 pb-1 hover:border-gold hover:text-gold transition-colors">
                Ver todos os lançamentos
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
              {lancDestaque.map((l) => (
                <Link key={l.id} to="/lancamentos/$slug" params={{ slug: l.slug }} className="group block">
                  <div className="relative overflow-hidden rounded mb-5 bg-linen/5 aspect-[4/3]">
                    {l.capa_url ? (
                      <img src={l.capa_url} alt={l.nome} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-linen/40 text-sm">Em breve</div>
                    )}
                    {l.status && (
                      <div className="absolute top-4 left-4 bg-gold px-3 py-1.5 rounded-full">
                        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-petroleum">{l.status.nome}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-display text-2xl group-hover:text-gold transition-colors">{l.nome}</h3>
                  {l.construtora && <p className="text-linen/60 text-xs uppercase tracking-[0.18em] mt-1">{l.construtora}</p>}
                  {l.endereco && <p className="text-linen/70 text-sm mt-2 flex items-center gap-1.5"><MapPin className="size-3" />{l.endereco}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}



      {/* NEIGHBORHOODS */}
      <section className="py-24 md:py-32 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-[52ch] mx-auto">
            <span className="eyebrow">{secoes.bairros_eyebrow ?? "Os Melhores Endereços"}</span>
            <h2 className="font-display text-4xl md:text-5xl mt-4 leading-tight text-balance">
              {secoes.bairros_titulo ?? "Bairros em destaque"}
            </h2>
            {secoes.bairros_descricao && (
              <p className="text-muted-foreground mt-5 leading-relaxed">
                {secoes.bairros_descricao}
              </p>
            )}
          </div>

          {bairrosLista.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhum bairro cadastrado.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {bairrosLista.map((n) => {
                const row = n as { id: string; nome: string; slug: string; imagem_url?: string | null; count?: number };
                return (
                  <Link
                    key={row.id}
                    to="/imoveis"
                    className="relative group overflow-hidden aspect-[3/4] rounded flex items-end p-6 bg-muted"
                  >
                    {row.imagem_url && (
                      <img
                        src={row.imagem_url}
                        alt={`Bairro ${row.nome}`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-petroleum/85 via-petroleum/30 to-transparent" />
                    <div className="relative z-10 text-linen">
                      <h4 className="font-display text-2xl md:text-3xl">{row.nome}</h4>
                      <span className="text-[10px] uppercase tracking-[0.22em] text-tiffany mt-1 block">
                        {row.count ?? 0} {row.count === 1 ? "imóvel" : "imóveis"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* DIFFERENTIATORS */}
      <section className="py-24 md:py-32 bg-petroleum text-linen overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="animate-reveal">
              <span className="eyebrow !text-tiffany">Nossa Identidade</span>
              <h2 className="font-display text-4xl md:text-5xl mt-5 mb-8 leading-[1.1] text-balance">
                Muito além de m², entregamos <em className="text-gold not-italic">legado</em>.
              </h2>
              <p className="text-linen/70 text-lg leading-relaxed max-w-[48ch]">
                Combinamos a precisão do mercado de capitais com a sensibilidade do mercado de luxo. Cada
                imóvel em nosso portfólio é avaliado criteriosamente por arquitetura, localização e
                potencial de valorização.
              </p>

              <div className="grid sm:grid-cols-2 gap-10 mt-14">
                {(site?.home_diferenciais?.itens ?? differentials).map((d, i) => (
                  <div key={i} className="border-l border-gold/40 pl-5">
                    <span className="font-display text-3xl text-gold italic block mb-2">{d.n}</span>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] mb-2">{d.title}</h4>
                    <p className="text-sm text-linen/60 leading-relaxed">{d.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-full overflow-hidden border border-linen/10">
                <img
                  src={feature}
                  alt="Arquitetura editorial"
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-gold p-7 md:p-9 rounded shadow-elegant">
                <p className="font-display text-3xl md:text-4xl italic text-petroleum">+1.2 Bi</p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-petroleum/80 mt-1">
                  em ativos captados
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="eyebrow">{site?.home_depoimentos?.eyebrow ?? "Depoimentos"}</span>
            <h2 className="font-display text-4xl md:text-5xl mt-4 text-balance">
              {site?.home_depoimentos?.titulo ?? "Quem confiou, conta a história."}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            {(site?.home_depoimentos?.itens ?? testimonials).map((t, i) => (
              <figure key={i} className="bg-card border border-foreground/5 p-10 rounded shadow-soft">
                <Quote className="size-7 text-gold mb-6" strokeWidth={1.2} />
                <blockquote className="font-display text-2xl leading-snug text-pretty mb-8">
                  "{t.quote}"
                </blockquote>
                <figcaption className="text-sm">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-muted-foreground"> · {t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 md:pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative overflow-hidden bg-secondary/60 border border-foreground/5 rounded-lg p-12 md:p-20 text-center">
            <div className="relative z-10 max-w-[56ch] mx-auto">
              <span className="eyebrow">Anuncie com a RM Prime</span>
              <h2 className="font-display text-4xl md:text-6xl mt-5 mb-7 leading-[1.05] text-balance">
                Deseja vender seu imóvel de <em className="text-gold not-italic">alto padrão</em>?
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-10">
                Oferecemos um plano de marketing personalizado para propriedades premium, alcançando
                compradores qualificados com a discrição necessária.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/anuncie"
                  className="inline-flex items-center justify-center gap-2 bg-petroleum hover:bg-gold transition-colors text-linen px-10 py-4 rounded-full font-medium text-sm uppercase tracking-[0.18em]"
                >
                  Solicitar avaliação
                  <ChevronRight className="size-4" strokeWidth={1.5} />
                </Link>
                <Link
                  to="/contato"
                  className="inline-flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-10 py-4 rounded-full font-medium text-sm uppercase tracking-[0.18em] hover:bg-foreground/5 transition-colors"
                >
                  Falar com consultor
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
