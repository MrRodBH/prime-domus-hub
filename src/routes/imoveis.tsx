import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search, MapPin, BedDouble, Maximize2, Car, SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { listarImoveis, listarBairros, listarCidades } from "@/lib/api/catalogo.functions";
import { imovelImage, formatPreco } from "@/lib/property-images";

const searchSchema = z.object({
  finalidade: z.enum(["venda", "aluguel", "lancamento"]).optional(),
  tipo: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  quartos_min: z.coerce.number().int().min(1).max(10).optional(),
  suites_min: z.coerce.number().int().min(1).max(10).optional(),
  vagas_min: z.coerce.number().int().min(1).max(10).optional(),
  preco_min: z.coerce.number().min(0).optional(),
  preco_max: z.coerce.number().min(0).optional(),
  area_min: z.coerce.number().min(0).optional(),
  ordenar: z.enum(["recentes", "preco_asc", "preco_desc", "area_desc"]).optional(),
  busca: z.string().optional(),
});

type Filtros = z.infer<typeof searchSchema>;

const imoveisQuery = (f: Filtros) =>
  queryOptions({
    queryKey: ["imoveis", f],
    queryFn: () => listarImoveis({ data: f }),
  });

const bairrosQuery = queryOptions({
  queryKey: ["bairros"],
  queryFn: () => listarBairros(),
});

const cidadesQuery = queryOptions({
  queryKey: ["cidades"],
  queryFn: () => listarCidades(),
});

export const Route = createFileRoute("/imoveis")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  head: () => ({
    meta: [
      { title: "Imóveis à venda em Belo Horizonte — RM Prime" },
      { name: "description", content: "Catálogo de imóveis de alto padrão à venda em Belo Horizonte: coberturas, casas em condomínio, apartamentos e garden em Lourdes, Belvedere e Vila da Serra." },
      { property: "og:title", content: "Imóveis à venda em Belo Horizonte — RM Prime" },
      { property: "og:description", content: "Catálogo exclusivo de imóveis de alto padrão em BH." },
      { property: "og:url", content: "/imoveis" },
    ],
    links: [{ rel: "canonical", href: "/imoveis" }],
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(imoveisQuery(deps)),
      context.queryClient.ensureQueryData(bairrosQuery),
      context.queryClient.ensureQueryData(cidadesQuery),
    ]);
  },
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : "Erro ao carregar imóveis."} />
  ),
  notFoundComponent: () => <ErrorState message="Nenhum imóvel encontrado." />,
  component: Page,
});

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-32 w-full">
        <p className="text-muted-foreground">{message}</p>
      </main>
      <Footer />
    </div>
  );
}

const tipos = [
  { v: "apartamento", l: "Apartamento" },
  { v: "cobertura", l: "Cobertura" },
  { v: "garden", l: "Garden" },
  { v: "casa", l: "Casa" },
  { v: "casa_condominio", l: "Casa em condomínio" },
  { v: "terreno", l: "Terreno" },
  { v: "comercial", l: "Comercial" },
];

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: imoveis } = useSuspenseQuery(imoveisQuery(search));
  const { data: bairros } = useSuspenseQuery(bairrosQuery);
  const { data: cidades } = useSuspenseQuery(cidadesQuery);

  const bairrosFiltrados = (() => {
    const lista = search.cidade
      ? bairros.filter((b) => {
          const c = (b as { cidade?: { slug?: string } | null }).cidade;
          return c?.slug === search.cidade;
        })
      : bairros;
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  })();
  const [buscaLocal, setBuscaLocal] = useState(search.busca ?? "");
  const [precoMin, setPrecoMin] = useState(search.preco_min?.toString() ?? "");
  const [precoMax, setPrecoMax] = useState(search.preco_max?.toString() ?? "");
  const [areaMin, setAreaMin] = useState(search.area_min?.toString() ?? "");
  const [maisFiltros, setMaisFiltros] = useState(
    Boolean(search.suites_min || search.vagas_min || search.area_min || search.preco_min || search.preco_max),
  );

  const update = (patch: Partial<Filtros>) => {
    navigate({ search: (prev: Filtros) => ({ ...prev, ...patch }) });
  };

  const aplicar = (e: React.FormEvent) => {
    e.preventDefault();
    update({
      busca: buscaLocal || undefined,
      preco_min: precoMin ? Number(precoMin) : undefined,
      preco_max: precoMax ? Number(precoMax) : undefined,
      area_min: areaMin ? Number(areaMin) : undefined,
    });
  };

  const limpar = () => {
    setBuscaLocal("");
    setPrecoMin("");
    setPrecoMax("");
    setAreaMin("");
    navigate({ search: {} });
  };

  const ativos = Object.entries(search).filter(([, v]) => v !== undefined && v !== "").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-secondary/40 border-b border-foreground/5">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <span className="eyebrow">Catálogo</span>
            <h1 className="font-display text-4xl md:text-5xl mt-4 mb-3 leading-[1.05] text-balance">
              Imóveis em destaque
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {imoveis.length} {imoveis.length === 1 ? "imóvel encontrado" : "imóveis encontrados"} para
              sua busca.
            </p>

            <form onSubmit={aplicar} className="mt-8 bg-card border border-foreground/5 rounded p-3 md:p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
                <div className="flex items-center gap-2 px-3 py-2 border border-foreground/10 rounded">
                  <Search className="size-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={buscaLocal}
                    onChange={(e) => setBuscaLocal(e.target.value)}
                    placeholder="Buscar título, código, endereço..."
                    className="bg-transparent flex-1 text-sm focus:outline-none"
                  />
                </div>
                <select
                  value={search.finalidade ?? ""}
                  onChange={(e) => update({ finalidade: (e.target.value || undefined) as Filtros["finalidade"] })}
                  className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none"
                >
                  <option value="">Finalidade (todas)</option>
                  <option value="venda">Venda</option>
                  <option value="aluguel">Aluguel</option>
                  <option value="lancamento">Lançamento</option>
                </select>
                <select
                  value={search.tipo ?? ""}
                  onChange={(e) => update({ tipo: e.target.value || undefined })}
                  className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none"
                >
                  <option value="">Tipo (todos)</option>
                  {tipos.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
                <select
                  value={search.cidade ?? ""}
                  onChange={(e) => update({ cidade: e.target.value || undefined, bairro: undefined })}
                  className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none"
                >
                  <option value="">Cidade (todas)</option>
                  {cidades.map((c) => (
                    <option key={c.id} value={c.slug}>{c.nome}</option>
                  ))}
                </select>
                <select
                  value={search.bairro ?? ""}
                  onChange={(e) => update({ bairro: e.target.value || undefined })}
                  className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none"
                >
                  <option value="">Bairro (todos)</option>
                  {bairrosFiltrados.map((b) => (
                    <option key={b.id} value={b.slug}>{b.nome}</option>
                  ))}
                </select>
                <select
                  value={search.quartos_min?.toString() ?? ""}
                  onChange={(e) => update({ quartos_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none"
                >
                  <option value="">Quartos (mín.)</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ quartos</option>)}
                </select>
              </div>

              {maisFiltros && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                  <input type="number" inputMode="numeric" placeholder="Preço mín. (R$)" value={precoMin} onChange={(e) => setPrecoMin(e.target.value)} className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none" />
                  <input type="number" inputMode="numeric" placeholder="Preço máx. (R$)" value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none" />
                  <input type="number" inputMode="numeric" placeholder="Área mín. (m²)" value={areaMin} onChange={(e) => setAreaMin(e.target.value)} className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none" />
                  <select value={search.suites_min?.toString() ?? ""} onChange={(e) => update({ suites_min: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none">
                    <option value="">Suítes (mín.)</option>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ suítes</option>)}
                  </select>
                  <select value={search.vagas_min?.toString() ?? ""} onChange={(e) => update({ vagas_min: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-2 text-sm bg-transparent border border-foreground/10 rounded focus:outline-none">
                    <option value="">Vagas (mín.)</option>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ vagas</option>)}
                  </select>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setMaisFiltros((v) => !v)} className="text-xs uppercase tracking-[0.18em] text-petroleum hover:text-gold inline-flex items-center gap-1.5">
                    <SlidersHorizontal className="size-3.5" strokeWidth={1.5} />
                    {maisFiltros ? "Menos filtros" : "Mais filtros"}
                  </button>
                  {ativos > 0 && (
                    <button type="button" onClick={limpar} className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-petroleum inline-flex items-center gap-1.5">
                      <X className="size-3.5" strokeWidth={1.5} />
                      Limpar ({ativos})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <select value={search.ordenar ?? ""} onChange={(e) => update({ ordenar: (e.target.value || undefined) as Filtros["ordenar"] })} className="px-3 py-2 text-xs bg-transparent border border-foreground/10 rounded focus:outline-none">
                    <option value="">Ordenar: relevância</option>
                    <option value="recentes">Mais recentes</option>
                    <option value="preco_asc">Menor preço</option>
                    <option value="preco_desc">Maior preço</option>
                    <option value="area_desc">Maior área</option>
                  </select>
                  <button type="submit" className="bg-petroleum hover:bg-gold text-linen text-[11px] uppercase tracking-[0.18em] font-semibold px-5 py-2.5 rounded">
                    Aplicar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-16">
          {imoveis.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-display text-2xl mb-2">Nenhum imóvel encontrado</p>
              <p className="text-muted-foreground">Ajuste os filtros e tente novamente.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {imoveis.map((p, i) => {
                const bairroNome = Array.isArray(p.bairro)
                  ? p.bairro[0]?.nome
                  : (p.bairro as { nome?: string } | null)?.nome;
                return (
                  <Link to="/imovel/$slug" params={{ slug: p.slug }} key={p.id} className="group block" aria-label={p.titulo}>
                    <div className="relative overflow-hidden rounded mb-5 bg-muted">
                      <img src={p.imagem_capa || imovelImage(p.slug, i)} alt={p.titulo} width={1600} height={900} loading="lazy" className="block w-full h-auto" />
                      {p.badge && (
                        <div className="absolute top-4 left-4 bg-linen/95 backdrop-blur px-3 py-1.5 rounded-full">
                          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-petroleum">{p.badge}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {bairroNome && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.22em] flex items-center gap-1.5">
                          <MapPin className="size-3" strokeWidth={1.5} />
                          {bairroNome}
                        </p>
                      )}
                      <h3 className="font-display text-2xl group-hover:text-gold transition-colors">{p.titulo}</h3>
                      <div className="flex items-center gap-5 text-xs text-muted-foreground pt-3 border-t border-foreground/5">
                        {p.area_util && (
                          <span className="flex items-center gap-1.5"><Maximize2 className="size-3" strokeWidth={1.5} />{Math.round(Number(p.area_util))} m²</span>
                        )}
                        {p.suites != null && (
                          <span className="flex items-center gap-1.5"><BedDouble className="size-3" strokeWidth={1.5} />{p.suites} suítes</span>
                        )}
                        {p.vagas != null && (
                          <span className="flex items-center gap-1.5"><Car className="size-3" strokeWidth={1.5} />{p.vagas} vagas</span>
                        )}
                      </div>
                      <p className="text-lg font-medium text-gold pt-3">{formatPreco(Number(p.preco), p.preco_sob_consulta)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
