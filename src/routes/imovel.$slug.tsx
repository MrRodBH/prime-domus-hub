import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  MapPin, BedDouble, Bath, Maximize2, Car, ArrowLeft, Phone, Mail, MessageCircle,
  CheckCircle2, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { obterImovel, enviarLead } from "@/lib/api/catalogo.functions";
import { imovelImage, formatPreco } from "@/lib/property-images";
import { toEmbedUrl } from "@/lib/embed-url";

const imovelQuery = (slug: string) =>
  queryOptions({
    queryKey: ["imovel", slug],
    queryFn: () => obterImovel({ data: { slug } }),
  });

export const Route = createFileRoute("/imovel/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(imovelQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const titulo = loaderData?.titulo ?? "Imóvel";
    const bairro = (loaderData?.bairro as { nome?: string } | null)?.nome;
    const firstGalleryImage = (loaderData?.imagens as Array<{ url?: string | null }> | null | undefined)?.[0]?.url;
    const desc =
      loaderData?.descricao ??
      `Imóvel de alto padrão${bairro ? ` em ${bairro}` : ""} - RM Prime Imóveis.`;
    const ogImage = firstGalleryImage ?? loaderData?.imagem_capa ?? undefined;
    const preco = loaderData?.preco ? Number(loaderData.preco) : null;
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: titulo,
      description: desc.slice(0, 300),
      ...(ogImage ? { image: ogImage } : {}),
      brand: { "@type": "Brand", name: "RM Prime Imóveis" },
      category: "Real Estate",
      ...(preco && !loaderData?.preco_sob_consulta
        ? {
            offers: {
              "@type": "Offer",
              price: preco,
              priceCurrency: "BRL",
              availability: "https://schema.org/InStock",
            },
          }
        : {}),
    };
    return {
      meta: [
        { title: `${titulo} — RM Prime Imóveis` },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc.slice(0, 160) },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `/imovel/${params.slug}` },
        ...(ogImage ? [{ property: "og:image", content: ogImage }, { name: "twitter:image", content: ogImage }] : []),
      ],
      links: [
        { rel: "canonical", href: `/imovel/${params.slug}` },
        ...(ogImage ? [{ rel: "preload", as: "image", href: ogImage, fetchpriority: "high" }] : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(ld),
        },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <Shell><p className="text-muted-foreground">{error.message}</p></Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <h1 className="font-display text-3xl mb-3">Imóvel não encontrado</h1>
      <p className="text-muted-foreground mb-6">Talvez ele tenha sido vendido ou removido.</p>
      <Link to="/imoveis" className="text-gold underline">Ver outros imóveis</Link>
    </Shell>
  ),
  component: Page,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-32 w-full">{children}</main>
      <Footer />
    </div>
  );
}

function Page() {
  const { slug } = Route.useParams();
  const { data: imovel } = useSuspenseQuery(imovelQuery(slug));
  if (!imovel) return null;

  const bairro = (imovel.bairro as { nome?: string; slug?: string } | null) ?? null;
  const corretor =
    (imovel.corretor as {
      nome?: string; creci?: string; foto_url?: string; whatsapp?: string;
      telefone?: string; email?: string; bio?: string;
    } | null) ?? null;

  const galeria =
    (imovel.imagens as { url: string; thumb?: string; alt?: string }[] | null)?.length
      ? (imovel.imagens as { url: string; thumb?: string; alt?: string }[]).map((i) => ({
          url: i.url,
          thumb: i.thumb ?? i.url,
        }))
      : [{ url: imovel.imagem_capa || imovelImage(imovel.slug, 0), thumb: imovel.imagem_capa || imovelImage(imovel.slug, 0) }];


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
          <Link
            to="/imoveis"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition-colors"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            Voltar ao catálogo
          </Link>
        </div>

        <VideoTop videoUrl={(imovel as { video_url?: string | null }).video_url ?? null} />
        <Galeria imagens={galeria} titulo={imovel.titulo} />

        <section className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-[1fr_360px] gap-12">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {imovel.badge && (
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-petroleum bg-tiffany/40 px-3 py-1.5 rounded-full">
                  {imovel.badge}
                </span>
              )}
              {imovel.exclusivo && (
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-linen bg-gold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="size-3" strokeWidth={1.5} />
                  Exclusivo RM
                </span>
              )}
              {imovel.codigo && (
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Ref. {imovel.codigo}
                </span>
              )}
            </div>

            {bairro?.nome && (
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1.5 mb-2">
                <MapPin className="size-3.5" strokeWidth={1.5} />
                {bairro.nome}
              </p>
            )}
            <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-balance mb-4">
              {imovel.titulo}
            </h1>
            <p className="text-2xl md:text-3xl font-medium text-gold mb-3">
              {formatPreco(Number(imovel.preco), imovel.preco_sob_consulta)}
            </p>
            {(() => {
              const im = imovel as {
                rua?: string | null; numero?: string | null; complemento?: string | null;
                endereco?: string | null; cidade?: string | null; estado?: string | null;
                cep?: string | null; mostrar_rua?: boolean; mostrar_endereco_completo?: boolean;
              };
              const rua = (im.rua || im.endereco || "").trim();
              let texto: string | null = null;
              if (im.mostrar_endereco_completo) {
                texto = [
                  [rua, im.numero].filter(Boolean).join(", "),
                  im.complemento,
                  bairro?.nome,
                  [im.cidade, im.estado].filter(Boolean).join(" - "),
                  im.cep,
                ].filter(Boolean).join(" • ");
              } else if (im.mostrar_rua && rua) {
                texto = [rua, bairro?.nome, im.cidade].filter(Boolean).join(", ");
              }
              if (!texto) return <div className="mb-8" />;
              return (
                <p className="text-sm text-muted-foreground flex items-start gap-1.5 mb-8">
                  <MapPin className="size-3.5 mt-0.5 shrink-0" strokeWidth={1.5} />
                  <span>{texto}</span>
                </p>
              );
            })()}

            {/* Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-foreground/10">
              <Spec icon={<Maximize2 className="size-4" />} label="Área útil" value={imovel.area_util ? `${Math.round(Number(imovel.area_util))} m²` : "—"} />
              <Spec icon={<BedDouble className="size-4" />} label="Suítes" value={imovel.suites ?? "—"} />
              <Spec icon={<Bath className="size-4" />} label="Banheiros" value={imovel.banheiros ?? "—"} />
              <Spec icon={<Car className="size-4" />} label="Vagas" value={imovel.vagas ?? "—"} />
            </div>

            {imovel.descricao && (
              <section className="mt-12">
                <span className="eyebrow">Sobre o imóvel</span>
                <h2 className="font-display text-3xl mt-3 mb-5">Descrição</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-pretty">
                  {imovel.descricao}
                </p>
              </section>
            )}

            {imovel.caracteristicas && imovel.caracteristicas.length > 0 && (
              <section className="mt-12">
                <span className="eyebrow">Diferenciais</span>
                <h2 className="font-display text-3xl mt-3 mb-5">Características</h2>
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  {imovel.caracteristicas.map((c: string) => (
                    <li key={c} className="flex items-center gap-3 text-sm text-foreground/85">
                      <CheckCircle2 className="size-4 text-gold shrink-0" strokeWidth={1.5} />
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <MediaEmbed
              tourUrl={(imovel as { tour_url?: string | null }).tour_url ?? null}
              videoUrl={(imovel as { video_url?: string | null }).video_url ?? null}
            />



            {/* Mapa */}
            <section className="mt-12">
              <span className="eyebrow">Localização</span>
              <h2 className="font-display text-3xl mt-3 mb-5">Como chegar</h2>
              {(() => {
                const im = imovel as {
                  rua?: string | null; numero?: string | null;
                  endereco?: string | null;
                  cidade?: string | null; estado?: string | null;
                  mostrar_rua?: boolean; mostrar_endereco_completo?: boolean;
                };
                const ruaNome = (im.rua || im.endereco || "").trim();
                const ruaComNumero = [ruaNome, im.numero].filter(Boolean).join(", ");
                const enderecoFull = ruaComNumero || im.endereco || "";
                const cidade = im.cidade || "Belo Horizonte";
                return (
                  <>
                    <Mapa
                      bairro={bairro?.nome ?? cidade}
                      endereco={enderecoFull}
                      lat={imovel.latitude ? Number(imovel.latitude) : null}
                      lng={imovel.longitude ? Number(imovel.longitude) : null}
                      mostrarRua={im.mostrar_rua ?? false}
                      mostrarCompleto={im.mostrar_endereco_completo ?? false}
                    />
                    {(() => {
                      if (im.mostrar_endereco_completo && enderecoFull) {
                        return <p className="text-sm text-muted-foreground mt-3">{enderecoFull}{bairro?.nome ? `, ${bairro.nome}` : ""}</p>;
                      }
                      if (im.mostrar_rua && ruaNome) {
                        return <p className="text-sm text-muted-foreground mt-3">{ruaNome}{bairro?.nome ? `, ${bairro.nome}` : ""}</p>;
                      }
                      return bairro?.nome ? <p className="text-sm text-muted-foreground mt-3">{bairro.nome}</p> : null;
                    })()}
                  </>
                );
              })()}
            </section>
          </article>

          <aside className="lg:sticky lg:top-28 self-start space-y-6">
            <CorretorCard corretor={corretor} titulo={imovel.titulo} />
            <FormContato imovelId={imovel.id} imovelTitulo={imovel.titulo} />
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
      <span className="font-display text-xl">{value}</span>
    </div>
  );
}

function preloadImage(url: string, onReady?: () => void) {
  if (typeof window === "undefined" || !url) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      onReady?.();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

function Galeria({ imagens, titulo }: { imagens: { url: string; thumb: string }[]; titulo: string }) {
  const [idx, setIdx] = useState(0);
  const total = imagens.length;
  const select = (nextIdx: number) => {
    if (nextIdx === idx) return;
    const target = imagens[nextIdx]?.url;
    if (!target) return;
    setIdx(nextIdx);
    void preloadImage(target);
  };
  const prev = () => select((idx - 1 + total) % total);
  const next = () => select((idx + 1) % total);

  useEffect(() => {
    if (!imagens.length) return;
    let cancelled = false;
    const visible = imagens.slice(0, 8);
    const rest = imagens.slice(8);
    const loadBatch = async (items: typeof imagens, size = 3) => {
      for (let i = 0; i < items.length; i += size) {
        if (cancelled) return;
        await Promise.all(items.slice(i, i + size).map((img) => preloadImage(img.url)));
      }
    };
    const run = async () => {
      await Promise.all(imagens.map((img) => preloadImage(img.thumb)));
      await loadBatch(visible);
      const waitForIdle = () => new Promise<void>((resolve) => {
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(() => resolve(), { timeout: 1500 });
        } else {
          setTimeout(resolve, 800);
        }
      });
      await waitForIdle();
      await loadBatch(rest, 2);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [imagens]);

  const current = imagens[idx];

  return (
    <section className="max-w-7xl mx-auto px-6">
      <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-muted">
        <img
          src={current.thumb}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <img
          key={current.url}
          src={current.url}
          alt={`${titulo} — foto ${idx + 1}`}
          width={1600}
          height={1000}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-linen/90 hover:bg-linen p-3 rounded-full backdrop-blur"
            >
              <ChevronLeft className="size-5 text-petroleum" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próxima foto"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-linen/90 hover:bg-linen p-3 rounded-full backdrop-blur"
            >
              <ChevronRight className="size-5 text-petroleum" strokeWidth={1.5} />
            </button>
            <div className="absolute bottom-4 right-4 bg-petroleum/90 text-linen text-xs px-3 py-1.5 rounded-full backdrop-blur">
              {idx + 1} / {total}
            </div>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 [scrollbar-gutter:stable]">
          {imagens.map((img, i) => (
            <button
              type="button"
              key={img.url + i}
              onClick={() => select(i)}
              onMouseEnter={() => void preloadImage(img.url)}
              onFocus={() => void preloadImage(img.url)}
              className={`relative shrink-0 w-28 h-[72px] overflow-hidden rounded bg-muted ${
                i === idx ? "ring-2 ring-gold" : "opacity-70 hover:opacity-100"
              }`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img
                src={img.thumb}
                alt=""
                loading="eager"
                decoding="async"
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function VideoTop({ videoUrl }: { videoUrl: string | null }) {
  const video = toEmbedUrl(videoUrl);
  if (!video) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 mb-6">
      <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ aspectRatio: "16 / 10" }}>
        <iframe
          title="Vídeo do imóvel"
          src={video}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}

function MediaEmbed({ tourUrl }: { tourUrl: string | null; videoUrl?: string | null }) {
  const tour = toEmbedUrl(tourUrl);
  if (!tour) return null;
  return (
    <section className="mt-12 space-y-10">
      <div>
        <span className="eyebrow">Visita imersiva</span>
        <h2 className="font-display text-3xl mt-3 mb-5">Tour virtual 360°</h2>
        <div className="aspect-[16/9] rounded overflow-hidden border border-foreground/10 bg-muted">
          <iframe
            title="Tour virtual 360°"
            src={tour}
            loading="lazy"
            allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
            allowFullScreen
            className="w-full h-full"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

function Mapa({
  bairro,
  endereco,
  lat,
  lng,
  mostrarRua,
  mostrarCompleto,
}: {
  bairro: string;
  endereco: string | null;
  lat: number | null;
  lng: number | null;
  mostrarRua: boolean;
  mostrarCompleto: boolean;
}) {
  // Define o destino do pino conforme a visibilidade configurada no CMS
  let src: string;
  if (mostrarCompleto) {
    // Pino exato: lat/lng se houver, senão endereço completo
    if (lat != null && lng != null) {
      src = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    } else {
      const q = encodeURIComponent(
        (endereco ? endereco + ", " : "") + bairro + ", Belo Horizonte, MG",
      );
      src = `https://www.google.com/maps?q=${q}&z=16&output=embed`;
    }
  } else if (mostrarRua) {
    // Pino na rua (sem número exato): remove número do endereço
    const semNumero = (endereco ?? "").replace(/,?\s*\d+.*$/, "").trim();
    const q = encodeURIComponent(
      (semNumero ? semNumero + ", " : "") + bairro + ", Belo Horizonte, MG",
    );
    src = `https://www.google.com/maps?q=${q}&z=15&output=embed`;
  } else {
    // Apenas bairro
    const q = encodeURIComponent(bairro + ", Belo Horizonte, MG");
    src = `https://www.google.com/maps?q=${q}&z=14&output=embed`;
  }
  return (
    <div className="aspect-[16/9] rounded overflow-hidden border border-foreground/10">
      <iframe
        title={`Mapa - ${bairro}`}
        src={src}
        loading="lazy"
        className="w-full h-full"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function CorretorCard({
  corretor,
  titulo,
}: {
  corretor: {
    nome?: string; creci?: string; foto_url?: string;
    whatsapp?: string; telefone?: string; email?: string; bio?: string;
  } | null;
  titulo: string;
}) {
  if (!corretor?.nome) return null;
  const whatsappMsg = encodeURIComponent(`Olá ${corretor.nome.split(" ")[0]}, tenho interesse no imóvel "${titulo}".`);
  return (
    <div className="bg-card border border-foreground/5 rounded p-6 shadow-soft">
      <span className="eyebrow">Consultor responsável</span>
      <div className="flex items-center gap-4 mt-4">
        {corretor.foto_url ? (
          <img src={corretor.foto_url} alt={corretor.nome} className="size-14 rounded-full object-cover" />
        ) : (
          <div className="size-14 rounded-full bg-gold/15 text-gold flex items-center justify-center font-display text-xl">
            {corretor.nome.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-display text-xl leading-tight">{corretor.nome}</p>
          {corretor.creci && <p className="text-xs text-muted-foreground mt-0.5">{corretor.creci}</p>}
        </div>
      </div>
      <div className="grid gap-2 mt-5">
        {corretor.whatsapp && (
          <a
            href={`https://wa.me/${corretor.whatsapp.replace(/\D/g, "")}?text=${whatsappMsg}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-petroleum hover:bg-gold text-linen text-xs uppercase tracking-[0.18em] font-semibold py-3 px-4 rounded transition-colors"
          >
            <MessageCircle className="size-4" strokeWidth={1.5} />
            WhatsApp
          </a>
        )}
        {corretor.telefone && (
          <a
            href={`tel:${corretor.telefone.replace(/\D/g, "")}`}
            className="inline-flex items-center justify-center gap-2 border border-foreground/15 hover:border-gold hover:text-gold text-xs uppercase tracking-[0.18em] font-semibold py-3 px-4 rounded transition-colors"
          >
            <Phone className="size-4" strokeWidth={1.5} />
            Ligar
          </a>
        )}
        {corretor.email && (
          <a
            href={`mailto:${corretor.email}`}
            className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-gold py-1"
          >
            <Mail className="size-3.5" strokeWidth={1.5} />
            {corretor.email}
          </a>
        )}
      </div>
    </div>
  );
}

function FormContato({ imovelId, imovelTitulo }: { imovelId: string; imovelTitulo: string }) {
  const router = useRouter();
  const enviar = useServerFn(enviarLead);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    mensagem: `Tenho interesse no imóvel "${imovelTitulo}".`,
  });

  const mut = useMutation({
    mutationFn: () =>
      enviar({
        data: {
          ...form,
          origem: "ficha-imovel",
          imovel_id: imovelId,
        },
      }),
    onSuccess: () => {
      setOk(true);
      router.invalidate();
    },
  });

  if (ok) {
    return (
      <div className="bg-tiffany/20 border border-tiffany/40 rounded p-6 text-center">
        <CheckCircle2 className="size-8 text-petroleum mx-auto mb-3" strokeWidth={1.5} />
        <p className="font-display text-xl text-petroleum">Obrigado!</p>
        <p className="text-sm text-petroleum/80 mt-1">Em breve um consultor entrará em contato.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
      className="bg-card border border-foreground/5 rounded p-6 shadow-soft space-y-3"
    >
      <span className="eyebrow">Solicite informações</span>
      <h3 className="font-display text-2xl mb-1">Fale com um consultor</h3>
      <input
        required
        type="text"
        placeholder="Nome completo *"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
        className="w-full bg-background border border-foreground/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
      />
      <input
        type="email"
        placeholder="E-mail"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full bg-background border border-foreground/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
      />
      <input
        type="tel"
        placeholder="Telefone / WhatsApp"
        value={form.telefone}
        onChange={(e) => setForm({ ...form, telefone: e.target.value })}
        className="w-full bg-background border border-foreground/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
      />
      <textarea
        rows={3}
        placeholder="Mensagem"
        value={form.mensagem}
        onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
        className="w-full bg-background border border-foreground/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none"
      />
      <p className="text-[10px] text-muted-foreground">Informe e-mail ou telefone para que possamos retornar.</p>
      {mut.error && (
        <p className="text-xs text-destructive">{(mut.error as Error).message}</p>
      )}
      <button
        type="submit"
        disabled={mut.isPending}
        className="w-full bg-petroleum hover:bg-gold disabled:opacity-60 text-linen text-xs uppercase tracking-[0.2em] font-semibold py-3 rounded transition-colors"
      >
        {mut.isPending ? "Enviando..." : "Quero saber mais"}
      </button>
    </form>
  );
}
