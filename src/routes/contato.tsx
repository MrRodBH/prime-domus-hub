import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { metaTrack, metaEventId, metaBrowserIds } from "@/lib/meta-pixel";
import { enviarEventoMetaCAPI } from "@/lib/api/meta.functions";
import { obterSiteSettings } from "@/lib/api/site.functions";
import { enviarLead } from "@/lib/api/catalogo.functions";
import { attributionPayload } from "@/lib/attribution";
import { maskPhoneBR, isValidPhoneBR, digitsOnly } from "@/lib/phone-br";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — RM Prime Imóveis" },
      { name: "description", content: "Fale com a equipe RM Prime Imóveis em Belo Horizonte." },
      { property: "og:title", content: "Contato — RM Prime Imóveis" },
      { property: "og:description", content: "Atendimento consultivo para imóveis de alto padrão em Belo Horizonte." },
      { property: "og:url", content: "https://rmprimeimoveis.com.br/contato" },
    ],
    links: [{ rel: "canonical", href: "https://rmprimeimoveis.com.br/contato" }],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings() });
  },
  component: Page,
});

function Page() {
  const { data: site } = useQuery({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings(), staleTime: 5 * 60 * 1000 });
  const pag = site?.pagina_contato ?? {};
  const cont = site?.contato ?? {};
  const emp = site?.empresa ?? {};
  const [telefone, setTelefone] = useState("");
  const [consent, setConsent] = useState(false);

  const enviar = useMutation({
    mutationFn: (p: Parameters<typeof enviarLead>[0]["data"]) => enviarLead({ data: p }),
    onSuccess: () => {
      toast.success("Mensagem enviada! Retornaremos em breve.");
      (document.getElementById("contato-form") as HTMLFormElement | null)?.reset();
      setTelefone(""); setConsent(false);
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao enviar."),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const mensagem = String(fd.get("mensagem") || "").trim();
    const tel = digitsOnly(telefone);
    if (nome.length < 2) return toast.error("Informe seu nome.");
    if (!email && !tel) return toast.error("Informe e-mail ou telefone.");
    if (tel && !isValidPhoneBR(telefone)) return toast.error("Telefone inválido.");
    if (!consent) return toast.error("É necessário aceitar a Política de Privacidade.");

    const attr = attributionPayload();
    enviar.mutate({
      nome,
      email: email || undefined,
      telefone: tel || undefined,
      mensagem: mensagem || "Mensagem via /contato",
      ...attr,
      origem: "Contato (Site)",
      consent_lgpd: true,
      notificar_gestores: true,
    });

    const event_id = metaEventId();
    metaTrack("Lead", { content_name: "Formulário Contato", source: "/contato" }, event_id);
    const ids = metaBrowserIds();
    enviarEventoMetaCAPI({
      data: {
        event_name: "Lead", event_id,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        action_source: "website",
        user_data: {
          email: email || undefined, phone: tel || undefined,
          first_name: nome.split(" ")[0] || undefined,
          last_name: nome.split(" ").slice(1).join(" ") || undefined,
          client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          ...ids,
        },
        custom_data: { content_name: "Formulário Contato", source: "/contato" },
      },
    }).catch(() => {});
  }

  const endereco = emp.razao_social ? cont.endereco : (cont.endereco ?? "");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            {pag.hero_eyebrow && <span className="eyebrow">{pag.hero_eyebrow}</span>}
            <h1 className="font-display text-5xl md:text-6xl mt-4 mb-6 leading-[1.05]">
              {pag.hero_titulo ?? "Estamos prontos para atender você."}
            </h1>
            {pag.hero_subtitle && <p className="text-muted-foreground text-lg mb-10">{pag.hero_subtitle}</p>}
            <div className="space-y-7">
              {endereco && <ContactLine icon={MapPin} label="Endereço" value={endereco} />}
              {(cont.telefone || cont.whatsapp) && <ContactLine icon={Phone} label="Telefone" value={cont.telefone ?? cont.whatsapp ?? ""} />}
              {cont.email && <ContactLine icon={Mail} label="E-mail" value={cont.email} />}
              {pag.horario_atendimento && <ContactLine icon={Clock} label="Horário" value={pag.horario_atendimento} />}
            </div>
            {pag.mapa_url && (
              <iframe
                title="Mapa"
                src={pag.mapa_url}
                className="w-full h-64 mt-10 rounded border border-foreground/10"
                loading="lazy"
              />
            )}
          </div>
          <div>
            {pag.form_titulo && <h2 className="font-display text-2xl mb-3">{pag.form_titulo}</h2>}
            {pag.form_texto && <p className="text-muted-foreground text-sm mb-6">{pag.form_texto}</p>}
            <form id="contato-form" className="bg-card border border-foreground/5 p-8 md:p-10 rounded shadow-soft grid gap-5" onSubmit={onSubmit}>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Nome</span>
                <input name="nome" type="text" required className="w-full bg-background border border-foreground/15 rounded px-4 py-3 focus:border-gold focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">E-mail</span>
                <input name="email" type="email" className="w-full bg-background border border-foreground/15 rounded px-4 py-3 focus:border-gold focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Telefone</span>
                <input
                  name="telefone" type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhoneBR(e.target.value))}
                  placeholder="(11) 91234-5678"
                  className="w-full bg-background border border-foreground/15 rounded px-4 py-3 focus:border-gold focus:outline-none"
                />
              </label>
              <label>
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Mensagem</span>
                <textarea name="mensagem" rows={5} className="w-full bg-background border border-foreground/15 rounded px-4 py-3 focus:border-gold focus:outline-none" />
              </label>
              <label className="flex items-start gap-2 text-xs text-foreground/80 leading-snug cursor-pointer">
                <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-petroleum shrink-0" />
                <span>
                  Li e concordo com a{" "}
                  <Link to="/privacidade" className="text-gold hover:underline" target="_blank">Política de Privacidade</Link>.
                </span>
              </label>
              <button disabled={enviar.isPending} className="bg-petroleum hover:bg-gold text-linen py-4 rounded-full text-sm uppercase tracking-[0.18em] font-medium transition-colors disabled:opacity-60">
                {enviar.isPending ? "Enviando…" : (pag.form_botao ?? "Enviar mensagem")}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ContactLine({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="size-11 rounded-full bg-secondary grid place-items-center text-gold shrink-0">
        <Icon className="size-4" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</p>
        <p className="text-base">{value}</p>
      </div>
    </div>
  );
}
