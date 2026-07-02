import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { obterSiteSettings } from "@/lib/api/site.functions";
import { metaTrack, metaEventId, metaBrowserIds } from "@/lib/meta-pixel";
import { enviarEventoMetaCAPI } from "@/lib/api/meta.functions";

export function WhatsAppFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  const { data: site } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => obterSiteSettings(),
    enabled: !isAdmin,
  });

  if (isAdmin) return null;


  const numero = site?.contato?.whatsapp?.replace(/\D/g, "") || "5531999990001";
  const nome = site?.branding?.site_name || "RM Prime Imóveis";
  const msg = encodeURIComponent(
    `Olá, ${nome}! Vim pelo site e gostaria de mais informações.`,
  );
  const href = `https://wa.me/${numero}?text=${msg}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      onClick={() => {
        // Marca origem "sticky" caso o usuário volte e preencha um formulário.
        import("@/lib/attribution").then((m) => m.setOriginOverride("WhatsApp", 60)).catch(() => {});
        const event_id = metaEventId();
        metaTrack("Contact", { content_name: "whatsapp_fab" }, event_id);
        const ids = metaBrowserIds();
        enviarEventoMetaCAPI({
          data: {
            event_name: "Contact",
            event_id,
            event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
            action_source: "website",
            user_data: {
              client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
              ...ids,
            },
            custom_data: { content_name: "whatsapp_fab" },
          },
        }).catch(() => {});
      }}
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[#0a6b5c] px-4 py-3 text-white shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-[#075247] focus:outline-none focus:ring-2 focus:ring-[#0a6b5c] focus:ring-offset-2"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      <span className="hidden text-sm font-semibold sm:inline">Fale Conosco</span>
    </a>
  );
}
