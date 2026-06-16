import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

const navItems = [
  { to: "/imoveis", label: "Imóveis" },
  { to: "/lancamentos", label: "Lançamentos" },
  { to: "/blog", label: "Blog" },
  { to: "/anuncie", label: "Anuncie" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-foreground/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-display text-2xl tracking-tight">
            <span className="text-petroleum">RM</span>
            <span className="text-gold ml-1">PRIME</span>
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.4em] text-muted-foreground mt-0.5">
            Imóveis
          </span>
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

        <a
          href="https://wa.me/5531999999999"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-petroleum text-linen text-[11px] font-semibold uppercase tracking-[0.18em] py-3 px-5 rounded-full hover:bg-gold transition-colors duration-300"
        >
          <MessageCircle className="size-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Falar com Consultor</span>
        </a>
      </div>
    </header>
  );
}
