import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Menu, X } from "lucide-react";
import { useState } from "react";
import defaultLogo from "@/assets/logo-rm-prime.png";
import { obterSiteSettings } from "@/lib/api/site.functions";

const navItems = [
  { to: "/imoveis", label: "Imóveis" },
  { to: "/lancamentos", label: "Lançamentos" },
  { to: "/blog", label: "Blog" },
  { to: "/anuncie", label: "Anuncie" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { data: site } = useQuery({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings(), staleTime: 5 * 60 * 1000 });

  const logo = site?.branding?.logo_url || defaultLogo;
  const siteName = site?.branding?.site_name || "RM Prime Imóveis";
  const wa = site?.contato?.whatsapp ? `https://wa.me/${site.contato.whatsapp}` : "https://wa.me/5531999990001";

  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-foreground/5">
      <div className="max-w-7xl mx-auto px-6 h-32 flex items-center justify-between gap-8">
        <Link to="/" className="flex items-center" aria-label={`${siteName} - Início`}>
          <img src={logo} alt={siteName} width={500} height={500} className="h-24 md:h-28 w-auto object-contain" />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/80 hover:text-gold transition-colors"
              activeProps={{ className: "text-gold" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-2 bg-petroleum text-linen text-[11px] font-semibold uppercase tracking-[0.18em] py-3 px-5 rounded-full hover:bg-gold transition-colors duration-300"
          >
            <MessageCircle className="size-4" strokeWidth={1.5} />
            <span>Falar com Consultor</span>
          </a>
          <button type="button" className="lg:hidden p-2 -mr-2 text-foreground" aria-label="Abrir menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-foreground/5 bg-background">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm uppercase tracking-[0.2em] font-medium text-foreground/80 hover:text-gold"
                activeProps={{ className: "text-gold" }}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="sm:hidden mt-2 inline-flex items-center gap-2 bg-petroleum text-linen text-[11px] font-semibold uppercase tracking-[0.18em] py-3 px-5 rounded-full justify-center"
            >
              <MessageCircle className="size-4" strokeWidth={1.5} />
              Falar com Consultor
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
