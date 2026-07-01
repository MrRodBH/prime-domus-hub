import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { metaTrack, metaEventId, metaBrowserIds } from "@/lib/meta-pixel";
import { enviarEventoMetaCAPI } from "@/lib/api/meta.functions";
import { enviarLead } from "@/lib/api/catalogo.functions";
import { attributionPayload } from "@/lib/attribution";
import { maskPhoneBR, isValidPhoneBR, digitsOnly } from "@/lib/phone-br";

export const Route = createFileRoute("/anuncie")({
  head: () => ({
    meta: [
      { title: "Anuncie seu imóvel — RM Prime Imóveis" },
      { name: "description", content: "Anuncie seu imóvel de alto padrão com a RM Prime. Avaliação gratuita, marketing personalizado e discrição absoluta." },
      { property: "og:title", content: "Anuncie seu imóvel — RM Prime Imóveis" },
      { property: "og:description", content: "Avaliação e marketing personalizado para imóveis de alto padrão." },
      { property: "og:url", content: "/anuncie" },
    ],
    links: [{ rel: "canonical", href: "/anuncie" }],
  }),
  component: Page,
});

function Page() {
  const [telefone, setTelefone] = useState("");
  const [consent, setConsent] = useState(false);

  const enviar = useMutation({
    mutationFn: (payload: Parameters<typeof enviarLead>[0]["data"]) =>
      enviarLead({ data: payload }),
    onSuccess: () => {
      toast.success("Informações recebidas! Um consultor entrará em contato em breve.");
      (document.getElementById("anuncie-form") as HTMLFormElement | null)?.reset();
      setTelefone("");
      setConsent(false);
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao enviar. Tente novamente."),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const endereco = String(fd.get("endereco") || "").trim();
    const valor = String(fd.get("valor") || "").trim();
    const obs = String(fd.get("observacoes") || "").trim();
    const tel = digitsOnly(telefone);

    if (nome.length < 2) return toast.error("Informe seu nome completo.");
    if (!email && !tel) return toast.error("Informe e-mail ou telefone.");
    if (tel && !isValidPhoneBR(telefone)) return toast.error("Telefone inválido.");
    if (!consent) return toast.error("É necessário aceitar a Política de Privacidade.");

    const mensagem = [
      endereco ? `Endereço: ${endereco}` : null,
      valor ? `Valor pretendido: ${valor}` : null,
      obs ? `Observações: ${obs}` : null,
    ].filter(Boolean).join("\n") || "Solicitação de avaliação via /anuncie";

    const attr = attributionPayload();
    enviar.mutate({
      nome,
      email: email || undefined,
      telefone: tel || undefined,
      mensagem,
      origem: "Anúncio (Avaliação)",
      consent_lgpd: true,
      notificar_gestores: true,
      ...attr,
    });

    // Meta events (não bloqueia)
    const event_id = metaEventId();
    metaTrack("Lead", { content_name: "Formulário Anuncie", source: "/anuncie" }, event_id);
    const ids = metaBrowserIds();
    enviarEventoMetaCAPI({
      data: {
        event_name: "Lead",
        event_id,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        action_source: "website",
        user_data: {
          email: email || undefined,
          phone: tel || undefined,
          first_name: nome.split(" ")[0] || undefined,
          last_name: nome.split(" ").slice(1).join(" ") || undefined,
          client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          ...ids,
        },
        custom_data: { content_name: "Formulário Anuncie", source: "/anuncie" },
      },
    }).catch(() => {});
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-32 w-full">
        <span className="eyebrow">Anuncie com exclusividade</span>
        <h1 className="font-display text-5xl md:text-6xl mt-4 mb-6">Anuncie seu imóvel</h1>
        <p className="text-muted-foreground text-lg mb-12">
          Preencha as informações abaixo e um consultor entrará em contato em até 24h.
        </p>

        <form id="anuncie-form" className="grid gap-5" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Nome completo</span>
            <input name="nome" type="text" required className="w-full bg-card border border-foreground/15 rounded px-4 py-3 text-foreground focus:border-gold focus:outline-none transition-colors" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Telefone / WhatsApp</span>
            <input
              name="telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(maskPhoneBR(e.target.value))}
              placeholder="(11) 91234-5678"
              className="w-full bg-card border border-foreground/15 rounded px-4 py-3 text-foreground focus:border-gold focus:outline-none transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">E-mail</span>
            <input name="email" type="email" className="w-full bg-card border border-foreground/15 rounded px-4 py-3 text-foreground focus:border-gold focus:outline-none transition-colors" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Endereço do imóvel</span>
            <input name="endereco" type="text" className="w-full bg-card border border-foreground/15 rounded px-4 py-3 text-foreground focus:border-gold focus:outline-none transition-colors" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Valor pretendido</span>
            <input name="valor" type="text" className="w-full bg-card border border-foreground/15 rounded px-4 py-3 text-foreground focus:border-gold focus:outline-none transition-colors" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">Observações</span>
            <textarea name="observacoes" rows={4} className="w-full bg-card border border-foreground/15 rounded px-4 py-3 text-foreground focus:border-gold focus:outline-none transition-colors" />
          </label>
          <label className="flex items-start gap-2 text-xs text-foreground/80 leading-snug cursor-pointer">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-4 accent-petroleum shrink-0"
            />
            <span>
              Li e concordo com a{" "}
              <Link to="/privacidade" className="text-gold hover:underline" target="_blank">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
          <button
            type="submit"
            disabled={enviar.isPending}
            className="mt-4 bg-petroleum hover:bg-gold transition-colors text-linen py-4 rounded-full font-medium uppercase tracking-[0.18em] text-sm disabled:opacity-60"
          >
            {enviar.isPending ? "Enviando…" : "Confirmar Informações"}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
