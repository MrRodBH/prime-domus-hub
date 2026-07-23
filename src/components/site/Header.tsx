import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Menu, X } from "lucide-react";
import { useState } from "react";
import defaultLogo from "@/assets/logo-rm-prime.png";
import { obterSiteSettings } from "@/lib/api/site.functions";
import { listarMenuPublico } from "@/lib/api/menu.functions";

const FALLBACK_MENU = [
  { id: "f1", location: "header", label: "Imóveis", url: "/imoveis", target: "_self", tipo: "internal", ordem: 10, visivel: true },
  { id: "f2", location: "header", label: "Lançamentos", url: "/lancamentos", target: "_self", tipo: "internal", ordem: 20, visivel: true },
  { id: "f3", location: "header", label: "Blog", url: "/blog", target: "_self", tipo: "internal", ordem: 30, visivel: true },
  { id: "f4", location: "header", label: "Anuncie", url: "/anuncie", target: "_self", tipo: "internal", ordem: 40, visivel: true },
  { id: "f5", location: "header", label: "Sobre", url: "/sobre", target: "_self", tipo: "internal", ordem: 50, visivel: true },
  { id: "f6", location: "header", label: "Contato", url: "/contato", target: "_self", tipo: "internal", ordem: 60, visivel: true },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { data: site } = useQuery({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings(), staleTime: 5 * 60 * 1000 });
  const { data: menuData } = useQuery({ queryKey: ["menu-header"], queryFn: () => listarMenuPublico(), staleTime: 5 * 60 * 1000 });

  const menu = (menuData ?? FALLBACK_MENU).filter((m) => m.location === "header" && m.visivel);
  const logo = site?.branding?.logo_url || defaultLogo;
  const siteName = site?.branding?.site_name || "RM Prime Imóveis";
  const waNumber = site?.contato?.whatsapp?.replace(/\D/g, "") || "5531999990001";
  const wa = `https://wa.me/${waNumber}`;

  const renderLink = (item: (typeof menu)[number], onClickExtra?: () => void) => {
    const isExternal = item.tipo === "external" || /^https?:\/\//i.test(item.url);
    const className = "text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/80 hover:text-gold transition-colors";
    if (isExternal) {
      return (
        <a key={item.id} href={item.url} target={item.target} rel="noopener noreferrer" className={className} onClick={onClickExtra}>
          {item.label}
        </a>
      );
    }
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link key={item.id} to={item.url as any} className={className} activeProps={{ className: `${className} text-gold` }} onClick={onClickExtra}>
        {item.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-foreground/5">
      <div className="max-w-7xl mx-auto px-6 h-32 flex items-center justify-between gap-8">
        <Link to="/" className="flex items-center" aria-label={`${siteName} - Início`}>
          <img src={logo} alt={siteName} width={500} height={500} className="h-24 md:h-28 w-auto object-contain" />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {menu.map((item) => renderLink(item))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
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
            {menu.map((item) => (
              <div key={item.id} className="py-1">
                {renderLink(item, () => setOpen(false))}
              </div>
            ))}
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
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
