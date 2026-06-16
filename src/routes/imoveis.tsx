import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search, MapPin, BedDouble, Maximize2, Car, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { listarImoveis, listarBairros } from "@/lib/api/catalogo.functions";
import { imovelImage, formatPreco } from "@/lib/property-images";

const searchSchema = z.object({
  finalidade: z.enum(["venda", "aluguel", "lancamento"]).optional(),
  tipo: z.string().optional(),
  bairro: z.string().optional(),
  quartos_min: z.coerce.number().int().min(1).max(10).optional(),
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

export const Route = createFileRoute("/imoveis")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(imoveisQuery(deps)),
      context.queryClient.ensureQueryData(bairrosQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Imóveis à venda em Belo Horizonte — RM Prime Imóveis" },
      {
        name: "description",
        content:
          "Catálogo curado de imóveis de alto padrão em Belo Horizonte: coberturas, garden, casas em condomínio e lançamentos exclusivos.",
      },
      { property: "og:title", content: "Imóveis de alto padrão — RM Prime" },
      { property: "og:url", content: "/imoveis" },
    ],
    links: [{ rel: "canonical", href: "/imoveis" }],
  }),
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

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: imoveis } = useSuspenseQuery(imoveisQuery(search));
  const { data: bairros } = useSuspenseQuery(bairrosQuery);
  const [buscaLocal, setBuscaLocal] = useState(search.busca ?? "");

  const update = (patch: Partial<Filtros>) => {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-secondary/40 border-b border-foreground/5">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <span className="eyebrow">Catálogo</span>
            <h1 className="font-display text-4xl md:text-5xl mt-4 mb-3 leading-[1.05] text-balance">
              Imóveis em curadoria
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {imoveis.length} {imoveis.length === 1 ? "imóvel encontrado" : "imóveis encontrados"} para
              sua busca.
            </p>

            {/* Filtros */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update({ busca: buscaLocal || undefined });
              }}
              className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 bg-card border border-foreground/5 rounded p-2"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-r border-foreground/5">
                <Search className="size-4 text-muted-foreground" strokeWidth={1.5} />
                <input
                  type="text"
                  value={buscaLocal}
                  onChange={(e) => setBuscaLocal(e.target.value)}
                  placeholder="Buscar por título..."
                  className="bg-transparent flex-1 text-sm focus:outline-none"
                />
              </div>
              <select
                value={search.finalidade ?? ""}
                onChange={(e) => update({ finalidade: (e.target.value || undefined) as Filtros["finalidade"] })}
                className="px-3 py-2 text-sm bg-transparent border-r border-foreground/5 focus:outline-none"
              >
                <option value="">Finalidade (todas)</option>
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
                <option value="lancamento">Lançamento</option>
              </select>
              <select
                value={search.tipo ?? ""}
                onChange={(e) => update({ tipo: e.target.value || undefined })}
                className="px-3 py-2 text-sm bg-transparent border-r border-foreground/5 focus:outline-none"
              >
                <option value="">Tipo (todos)</option>
                <option value="apartamento">Apartamento</option>
                <option value="cobertura">Cobertura</option>
                <option value="garden">Garden</option>
                <option value="casa">Casa</option>
                <option value="casa_condominio">Casa em condomínio</option>
                <option value="terreno">Terreno</option>
                <option value="comercial">Comercial</option>
              </select>
              <select
                value={search.bairro ?? ""}
                onChange={(e) => update({ bairro: e.target.value || undefined })}
                className="px-3 py-2 text-sm bg-transparent border-r border-foreground/5 focus:outline-none"
              >
                <option value="">Bairro (todos)</option>
                {bairros.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.nome}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-petroleum hover:bg-gold text-linen text-[11px] uppercase tracking-[0.18em] font-semibold px-5 py-3 rounded inline-flex items-center justify-center gap-2"
              >
                <SlidersHorizontal className="size-4" strokeWidth={1.5} />
                Aplicar
              </button>
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
                  <Link
                    to="/imoveis"
                    key={p.id}
                    className="group block"
                    aria-label={p.titulo}
                  >
                    <div className="relative overflow-hidden rounded mb-5 aspect-[4/5] bg-muted">
                      <img
                        src={p.imagem_capa || imovelImage(p.slug, i)}
                        alt={p.titulo}
                        width={800}
                        height={1000}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-[800ms] group-hover:scale-[1.04]"
                      />
                      {p.badge && (
                        <div className="absolute top-4 left-4 bg-linen/95 backdrop-blur px-3 py-1.5 rounded-full">
                          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-petroleum">
                            {p.badge}
                          </span>
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
                      <h3 className="font-display text-2xl group-hover:text-gold transition-colors">
                        {p.titulo}
                      </h3>
                      <div className="flex items-center gap-5 text-xs text-muted-foreground pt-3 border-t border-foreground/5">
                        {p.area_util && (
                          <span className="flex items-center gap-1.5">
                            <Maximize2 className="size-3" strokeWidth={1.5} />
                            {Math.round(Number(p.area_util))} m²
                          </span>
                        )}
                        {p.suites != null && (
                          <span className="flex items-center gap-1.5">
                            <BedDouble className="size-3" strokeWidth={1.5} />
                            {p.suites} suítes
                          </span>
                        )}
                        {p.vagas != null && (
                          <span className="flex items-center gap-1.5">
                            <Car className="size-3" strokeWidth={1.5} />
                            {p.vagas} vagas
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-medium text-gold pt-3">
                        {formatPreco(Number(p.preco), p.preco_sob_consulta)}
                      </p>
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
