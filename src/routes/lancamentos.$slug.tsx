import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, BedDouble, Maximize2, Car, Building2, Calendar, Layers, ArrowUpDown, FileText, Eye, Download, MessageCircle, Phone } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { obterLancamentoPublico } from "@/lib/api/lancamentos.functions";

export const Route = createFileRoute("/lancamentos/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["lancamento-publico", params.slug],
      queryFn: () => obterLancamentoPublico({ data: { slug: params.slug } }),
    });
    if (!data) throw notFound();
    return data;
  },
  head: (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = ctx.loaderData;
    if (!d) return { meta: [{ title: "Lançamento" }] };
    const title = d.meta_title || `${d.nome} — Lançamento RM Prime Imóveis`;
    const desc = d.meta_description || `${d.nome}${d.construtora ? ` — ${d.construtora}` : ""}. ${d.endereco ?? ""}`;
    const canonical = `https://rmprimeimoveis.com.br/lancamentos/${d.slug}`;
    const meta: Array<Record<string, string>> = [
      { title }, { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
    ];
    if (d.og_image_url || d.imagem_capa_url) {
      meta.push({ property: "og:image", content: d.og_image_url || d.imagem_capa_url });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
      meta.push({ name: "twitter:image", content: d.og_image_url || d.imagem_capa_url });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: canonical }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          name: d.nome,
          description: desc,
          url: canonical,
          image: d.og_image_url || d.imagem_capa_url || undefined,
          address: d.endereco ? { "@type": "PostalAddress", streetAddress: d.endereco, addressLocality: d.cidade?.nome, addressRegion: d.cidade?.uf } : undefined,
          numberOfRooms: d.quartos ?? undefined,
          floorSize: d.area_apartamentos ? { "@type": "QuantitativeValue", value: d.area_apartamentos, unitCode: "MTK" } : undefined,
          offers: d.preco_min ? { "@type": "AggregateOffer", lowPrice: d.preco_min, highPrice: d.preco_max, priceCurrency: "BRL" } : undefined,
        }),
      }],
    };
  },
  component: Page,
  errorComponent: () => <div className="p-10 text-center">Erro ao carregar lançamento.</div>,
  notFoundComponent: () => (
    <div className="p-10 text-center space-y-3">
      <h1 className="font-display text-3xl">Lançamento não encontrado</h1>
      <Link to="/lancamentos" className="text-gold underline">Ver todos os lançamentos</Link>
    </div>
  ),
});

const TIPO_LABEL: Record<string, string> = {
  "1_quarto": "1 Quarto", "2_quartos": "2 Quartos", "3_quartos": "3 Quartos",
  "4_quartos_mais": "4 Quartos +", cobertura: "Cobertura", garden: "Garden",
};
const STATUS_UNIT: Record<string, { label: string; cls: string }> = {
  disponivel: { label: "Disponível", cls: "bg-green-100 text-green-700" },
  reservada: { label: "Reservada", cls: "bg-amber-100 text-amber-700" },
  vendida: { label: "Vendida", cls: "bg-red-100 text-red-700" },
  indisponivel: { label: "Indisponível", cls: "bg-secondary text-foreground/70" },
};

function fmtBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtMesAno(s: string | null | undefined) {
  if (!s) return null;
  const [y, m] = String(s).slice(0, 7).split("-");
  return `${m}/${y}`;
}

function Page() {
  const { slug } = Route.useParams();
  const { data: d } = useQuery({
    queryKey: ["lancamento-publico", slug],
    queryFn: () => obterLancamentoPublico({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });

  if (!d) return null;

  const whatsappBase = d.corretor?.whatsapp || d.corretor?.telefone || "";
  const whatsappLink = whatsappBase
    ? `https://wa.me/${whatsappBase.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Tenho interesse no lançamento ${d.nome}.`)}`
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* HERO */}
      <section className="relative h-[70vh] min-h-[480px] flex items-end pb-12 overflow-hidden">
        {d.imagem_capa_url ? (
          <img src={d.imagem_capa_url} alt={d.nome} className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" />
        ) : (
          <div className="absolute inset-0 bg-petroleum" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-petroleum/90 via-petroleum/40 to-petroleum/10" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          {d.status && (
            <span className="inline-block bg-gold text-petroleum px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.22em] mb-4">
              {d.status.nome}
            </span>
          )}
          <h1 className="font-display text-5xl md:text-7xl text-linen leading-[1.05] mb-3 max-w-3xl">{d.nome}</h1>
          {d.construtora && <p className="text-linen/70 text-sm uppercase tracking-[0.2em]">por {d.construtora}</p>}
          {d.endereco && (
            <p className="text-linen/80 text-base mt-3 flex items-center gap-2"><MapPin className="size-4" />{d.endereco}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to="/contato"
              search={{ assunto: `Interesse no lançamento ${d.nome}` }}
              className="bg-gold hover:bg-gold/90 text-petroleum px-7 py-4 rounded font-medium text-sm uppercase tracking-[0.18em]"
            >
              Solicitar atendimento
            </Link>
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="bg-linen/10 hover:bg-linen/20 backdrop-blur text-linen px-7 py-4 rounded font-medium text-sm uppercase tracking-[0.18em] border border-linen/30 inline-flex items-center gap-2">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* DADOS RÁPIDOS */}
      <section className="border-b border-foreground/5 py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 text-sm">
          {d.area_apartamentos && <Fato icon={Maximize2} label="Área" value={`${d.area_apartamentos} m²`} />}
          {d.quartos != null && <Fato icon={BedDouble} label="Quartos" value={`${d.quartos}${d.suites ? ` (${d.suites} suítes)` : ""}`} />}
          {d.vagas != null && <Fato icon={Car} label="Vagas" value={String(d.vagas)} />}
          {d.entrega && <Fato icon={Calendar} label="Entrega" value={fmtMesAno(d.entrega) ?? "—"} />}
          {d.numero_torres != null && <Fato icon={Building2} label="Torres" value={String(d.numero_torres)} />}
          {d.numero_andares != null && <Fato icon={Layers} label="Andares" value={String(d.numero_andares)} />}
          {d.elevadores != null && <Fato icon={ArrowUpDown} label="Elevadores" value={String(d.elevadores)} />}
          {d.numero_unidades != null && <Fato icon={Building2} label="Unidades" value={String(d.numero_unidades)} />}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* GALERIA */}
          {d.imagens && d.imagens.length > 0 && (
            <section>
              <h2 className="font-display text-3xl mb-6">Galeria</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {d.imagens.map((img) => (
                  img.url && (
                    <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded bg-muted">
                      <img src={img.thumb ?? img.url} alt={img.legenda ?? ""} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </a>
                  )
                ))}
              </div>
            </section>
          )}

          {/* VÍDEO */}
          {d.video_url && (
            <section>
              <h2 className="font-display text-3xl mb-6">Vídeo</h2>
              <div className="aspect-video">
                <iframe src={d.video_url.replace("watch?v=", "embed/")} title={d.nome} allowFullScreen className="w-full h-full rounded" />
              </div>
            </section>
          )}

          {/* DESCRIÇÃO */}
          {d.descricao && (
            <section>
              <h2 className="font-display text-3xl mb-6">Sobre o empreendimento</h2>
              <div className="prose prose-sm max-w-none [&_h2]:font-display [&_h2]:text-2xl [&_h3]:font-display [&_a]:text-gold" dangerouslySetInnerHTML={{ __html: d.descricao }} />
            </section>
          )}

          {/* LAZER */}
          {d.amenities && d.amenities.length > 0 && (
            <section>
              <h2 className="font-display text-3xl mb-6">Lazer</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {d.amenities.map((a) => (
                  <div key={a.slug} className="flex items-center gap-2 px-3 py-2 rounded border border-foreground/10 text-sm">
                    <span className="size-1.5 rounded-full bg-gold" /> {a.nome}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* UNIDADES */}
          {d.unidades && d.unidades.length > 0 && (
            <section>
              <h2 className="font-display text-3xl mb-6">Plantas e unidades</h2>
              <div className="border border-foreground/5 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Unid.</th>
                      <th className="px-4 py-2 text-left">Bloco</th>
                      <th className="px-4 py-2 text-left">Tipo</th>
                      <th className="px-4 py-2 text-left">Área</th>
                      <th className="px-4 py-2 text-left">Vagas</th>
                      <th className="px-4 py-2 text-left">Valor</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {d.unidades.map((u) => {
                      const si = STATUS_UNIT[u.status] ?? STATUS_UNIT.disponivel;
                      return (
                        <tr key={u.id}>
                          <td className="px-4 py-2 font-medium">{u.unidade}</td>
                          <td className="px-4 py-2">{u.bloco ?? "—"}</td>
                          <td className="px-4 py-2">{u.tipo ? TIPO_LABEL[u.tipo] : "—"}</td>
                          <td className="px-4 py-2">{u.area ? `${Number(u.area).toFixed(2).replace(".", ",")} m²` : "—"}</td>
                          <td className="px-4 py-2">{u.vagas ?? "—"}</td>
                          <td className="px-4 py-2">{u.valor ? fmtBRL(Number(u.valor)) : "Sob consulta"}</td>
                          <td className="px-4 py-2"><span className={`text-[10px] px-2 py-0.5 rounded ${si.cls}`}>{si.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {d.preco_min && (
                <p className="text-sm text-muted-foreground mt-3">
                  Valores a partir de <strong className="text-gold">{fmtBRL(d.preco_min)}</strong>
                  {d.preco_max && d.preco_max !== d.preco_min ? ` até ${fmtBRL(d.preco_max)}` : ""}.
                </p>
              )}
            </section>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          {/* Preço */}
          {d.preco_min && (
            <div className="bg-card border border-foreground/5 rounded-lg p-6">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">A partir de</p>
              <p className="font-display text-3xl text-gold mt-1">{fmtBRL(d.preco_min)}</p>
            </div>
          )}

          {/* PDFs */}
          {d.pdfs && d.pdfs.length > 0 && (
            <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-3">
              <h3 className="font-medium">Documentos</h3>
              <ul className="space-y-2">
                {d.pdfs.map((p) => p.url && (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 text-gold" />
                    <span className="flex-1 truncate">{p.titulo ?? (p.kind === "tabela_precos" ? "Tabela de preços" : "Documento")}</span>
                    <a href={p.url} target="_blank" rel="noreferrer" title="Visualizar" className="p-1 hover:text-gold"><Eye className="size-4" /></a>
                    <a href={p.url} download title="Baixar" className="p-1 hover:text-gold"><Download className="size-4" /></a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Condições */}
          {d.condicoes && (
            <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-2 text-sm">
              <h3 className="font-medium">Condições de pagamento</h3>
              {d.condicoes.entrada ? <p>Entrada: <strong>{fmtBRL(Number(d.condicoes.entrada))}</strong></p> : null}
              <p>Sinal: <strong>{fmtBRL(Number(d.condicoes.sinal))}</strong></p>
              {d.condicoes.num_parcelas > 0 && (
                <p>{d.condicoes.num_parcelas}× <strong>{fmtBRL(Number(d.condicoes.valor_parcela))}</strong></p>
              )}
              {d.condicoes.qtd_anuais && d.condicoes.qtd_anuais > 0 ? (
                <p>{d.condicoes.qtd_anuais} anuais de <strong>{fmtBRL(Number(d.condicoes.valor_anual))}</strong></p>
              ) : null}
              {d.condicoes.qtd_semestrais && d.condicoes.qtd_semestrais > 0 ? (
                <p>{d.condicoes.qtd_semestrais} semestrais de <strong>{fmtBRL(Number(d.condicoes.valor_semestral))}</strong></p>
              ) : null}
              {d.condicoes.observacoes && <p className="text-xs text-muted-foreground mt-2">{d.condicoes.observacoes}</p>}
            </div>
          )}

          {/* Corretor / contato */}
          <div className="bg-petroleum text-linen rounded-lg p-6 space-y-3">
            <h3 className="font-display text-xl">Fale com um especialista</h3>
            {d.corretor && (
              <div className="flex items-center gap-3 pb-3 border-b border-linen/10">
                {d.corretor.foto_url && <img src={d.corretor.foto_url} alt="" className="size-12 rounded-full object-cover" />}
                <div>
                  <p className="text-sm font-medium">{d.corretor.nome}</p>
                  {d.corretor.creci && <p className="text-[10px] text-linen/60 uppercase tracking-wider">CRECI {d.corretor.creci}</p>}
                </div>
              </div>
            )}
            <Link to="/contato" search={{ assunto: `Interesse no lançamento ${d.nome}` }} className="block w-full text-center bg-gold text-petroleum px-4 py-3 rounded font-medium text-sm uppercase tracking-[0.18em]">
              Solicitar atendimento
            </Link>
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="block w-full text-center bg-linen/10 hover:bg-linen/20 px-4 py-3 rounded font-medium text-sm uppercase tracking-[0.18em] border border-linen/30 inline-flex items-center justify-center gap-2">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
            {d.corretor?.telefone && (
              <a href={`tel:${d.corretor.telefone.replace(/\D/g, "")}`} className="block w-full text-center px-4 py-3 text-sm text-linen/80 hover:text-linen inline-flex items-center justify-center gap-2">
                <Phone className="size-4" /> {d.corretor.telefone}
              </a>
            )}
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
}

function Fato({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-5 text-gold" strokeWidth={1.5} />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
