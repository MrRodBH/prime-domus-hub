import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { obterSiteSettings } from "@/lib/api/site.functions";

export function WhatsAppFab() {
  const { data: site } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => obterSiteSettings(),
  });

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
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-[#1ebe5d] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      <span className="hidden text-sm font-medium sm:inline">Fale Conosco</span>
    </a>
  );
}
