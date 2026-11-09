// Landing page pública por imóvel (modelo RM Prime), restrita à empresa do domínio acessado.
import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bath, BedDouble, Car, CheckCircle2, MapPin, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { obterImovel, enviarLead } from "@/lib/api/catalogo.functions";
import { obterLandingPagePublica } from "@/lib/api/rm-landing-pages.functions";
import { formatPreco } from "@/lib/property-images";

const lpQuery = (slug: string) =>
  queryOptions({
    queryKey: ["lp", slug],
    queryFn: async () => {
      const lp = await obterLandingPagePublica({ data: { slug } });
      if (!lp) return null;
      const imovel = await obterImovel({ data: { slug: lp.imovelSlug } });
      return imovel ? { lp, imovel: imovel as Record<string, any> } : null;
    },
  });

export const Route = createFileRoute("/lp/$slug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(lpQuery(params.slug));
    if (!d) throw notFound();
    return { titulo: d.lp.conteudo.titulo || String(d.imovel.titulo), descricao: d.lp.conteudo.subtitulo || String(d.imovel.titulo) };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.titulo ?? "Imóvel";
    const d = loaderData?.descricao ?? t;
    return {
      meta: [
        { title: t }, { name: "description", content: d },
        { property: "og:title", content: t }, { property: "og:description", content: d },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: PaginaLandingPage,
});

function PaginaLandingPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(lpQuery(slug));
  const [foto, setFoto] = useState(0);
  if (!data) return null;
  const { lp, imovel } = data;
  const c = lp.conteudo;
  const fotos: string[] = ((imovel.imagens ?? []) as Array<{ url?: string | null }>).map((i) => i.url).filter(Boolean) as string[];
  if (fotos.length === 0 && imovel.imagem_capa) fotos.push(imovel.imagem_capa);
  const local = [imovel.bairro?.nome, imovel.bairro?.cidade?.nome ?? imovel.cidade].filter(Boolean).join(", ");
  const specs = [
    imovel.area_util ? { i: Ruler, t: `${imovel.area_util} m²` } : null,
    imovel.quartos ? { i: BedDouble, t: `${imovel.quartos} quartos` } : null,
    imovel.banheiros ? { i: Bath, t: `${imovel.banheiros} banheiros` } : null,
    imovel.vagas ? { i: Car, t: `${imovel.vagas} vagas` } : null,
  ].filter(Boolean) as { i: typeof Ruler; t: string }[];
  const caracteristicas: string[] = Array.isArray(imovel.caracteristicas) ? imovel.caracteristicas : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            {fotos.length > 0 ? (
              <div>
                <img src={fotos[foto]} alt={String(imovel.titulo)} className="aspect-[16/10] w-full rounded-xl object-cover" />
                {fotos.length > 1 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {fotos.map((f, i) => (
                      <button key={f} type="button" onClick={() => setFoto(i)} aria-label={`Foto ${i + 1}`}
                        className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 ${i === foto ? "border-primary" : "border-transparent"}`}>
                        <img src={f} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <h1 className="mt-6 font-display text-3xl font-bold text-foreground md:text-4xl">{c.titulo || imovel.titulo}</h1>
            {c.subtitulo ? <p className="mt-2 text-lg text-muted-foreground">{c.subtitulo}</p> : null}
            {local ? <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{local}</p> : null}
            {specs.length ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {specs.map(({ i: Icone, t }) => (
                  <span key={t} className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"><Icone className="h-4 w-4 text-primary" />{t}</span>
                ))}
              </div>
            ) : null}
            {c.texto ? <div className="mt-6 space-y-4 whitespace-pre-line leading-relaxed text-foreground">{c.texto}</div> : null}
            {caracteristicas.length ? (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {caracteristicas.map((x) => <li key={x} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />{x}</li>)}
              </ul>
            ) : null}
          </div>
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              {!imovel.preco_sob_consulta && imovel.preco ? <p className="font-display text-3xl font-bold text-primary">{formatPreco(Number(imovel.preco))}</p> : <p className="font-display text-xl font-semibold">Valor sob consulta</p>}
              <FormularioLp imovelId={String(imovel.id)} slug={lp.slug} />
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FormularioLp({ imovelId, slug }: { imovelId: string; slug: string }) {
  const enviar = useServerFn(enviarLead);
  const [ok, setOk] = useState(false);
  const mut = useMutation({
    mutationFn: (form: FormData) => {
      const p = new URLSearchParams(window.location.search);
      const v = (k: string) => String(form.get(k) ?? "").trim();
      const utm = (k: string) => p.get(k) || undefined;
      return enviar({ data: {
        nome: v("nome"), email: v("email"), telefone: v("telefone") || undefined, mensagem: v("mensagem") || undefined,
        origem: `Landing page /lp/${slug}`, imovel_id: imovelId, consent_lgpd: true,
        utm_source: utm("utm_source"), utm_medium: utm("utm_medium"), utm_campaign: utm("utm_campaign"),
        utm_term: utm("utm_term"), utm_content: utm("utm_content"), gclid: utm("gclid"), fbclid: utm("fbclid"),
        referrer: document.referrer.slice(0, 500) || undefined, landing_url: window.location.href.slice(0, 500),
      } });
    },
    onSuccess: () => setOk(true),
    onError: () => toast.error("Não foi possível enviar agora. Tente novamente."),
  });
  if (ok) return <p className="mt-5 rounded-md bg-muted p-4 text-sm">Recebemos seu contato. Um corretor vai falar com você em breve.</p>;
  return (
    <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(new FormData(e.currentTarget)); }}>
      <p className="text-sm text-muted-foreground">Quer saber mais ou agendar uma visita?</p>
      <Input name="nome" required minLength={2} placeholder="Seu nome" aria-label="Nome" />
      <Input name="telefone" required placeholder="WhatsApp" aria-label="WhatsApp" />
      <Input name="email" type="email" placeholder="E-mail (opcional)" aria-label="E-mail" />
      <Textarea name="mensagem" rows={3} placeholder="Mensagem (opcional)" aria-label="Mensagem" />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" required className="mt-0.5" />
        <span>Concordo com a <a href="/privacidade" className="underline">Política de Privacidade</a>.</span>
      </label>
      <Button type="submit" className="w-full" disabled={mut.isPending}>{mut.isPending ? "Enviando…" : "Quero ser contatado"}</Button>
    </form>
  );
}
