import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Linkedin, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary/60 pt-24 pb-12 border-t border-foreground/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-20">
          <div>
            <Link to="/" className="flex flex-col leading-none mb-6">
              <span className="font-display text-3xl tracking-tight">
                <span className="text-petroleum">RM</span>
                <span className="text-gold ml-1">PRIME</span>
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.4em] text-muted-foreground mt-1">
                Imóveis
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[32ch]">
              Conectando você ao seu melhor imóvel. Especialistas no mercado de alto padrão em
              Belo Horizonte e região metropolitana.
            </p>
          </div>

          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6">Explore</h5>
            <ul className="space-y-3.5 text-sm text-muted-foreground">
              <li><Link to="/imoveis" className="hover:text-gold transition-colors">Comprar</Link></li>
              <li><Link to="/lancamentos" className="hover:text-gold transition-colors">Lançamentos</Link></li>
              <li><Link to="/imoveis" className="hover:text-gold transition-colors">Bairros Premium</Link></li>
              <li><Link to="/anuncie" className="hover:text-gold transition-colors">Anuncie seu imóvel</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6">Institucional</h5>
            <ul className="space-y-3.5 text-sm text-muted-foreground">
              <li><Link to="/sobre" className="hover:text-gold transition-colors">Nossa história</Link></li>
              <li><Link to="/blog" className="hover:text-gold transition-colors">Blog editorial</Link></li>
              <li><Link to="/contato" className="hover:text-gold transition-colors">Contato</Link></li>
              <li><a href="#" className="hover:text-gold transition-colors">Política de privacidade</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6">Newsletter</h5>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Receba oportunidades selecionadas e relatórios de mercado.
            </p>
            <form className="flex border-b border-foreground/15 pb-2 gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                className="bg-transparent border-none text-sm w-full focus:outline-none placeholder:text-muted-foreground/60"
              />
              <button className="text-foreground hover:text-gold transition-colors" aria-label="Inscrever">
                <ArrowUpRight className="size-4" />
              </button>
            </form>

            <div className="flex gap-3 mt-8">
              {[Instagram, Facebook, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="size-9 rounded-full border border-foreground/15 grid place-items-center text-foreground/60 hover:bg-petroleum hover:text-linen hover:border-petroleum transition-colors"
                  aria-label="Social"
                >
                  <Icon className="size-4" strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-foreground/5 gap-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            © {new Date().getFullYear()} RM Prime Imóveis · CRECI-MG J0000
          </p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Lourdes · Belo Horizonte / MG
          </p>
        </div>
      </div>
    </footer>
  );
}
