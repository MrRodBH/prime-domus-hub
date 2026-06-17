import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Facebook, Linkedin, ArrowUpRight } from "lucide-react";
import logo from "@/assets/logo-rm-prime.png";
import { obterSiteSettings } from "@/lib/api/site.functions";

function normalizeInstagram(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "").replace(/^instagram\.com\//i, "");
  return `https://instagram.com/${handle}`;
}

function normalizeUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function Footer() {
  const { data: site } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => obterSiteSettings(),
  });

  const instagramUrl = normalizeInstagram(site?.contato?.instagram);
  const facebookUrl = normalizeUrl(site?.contato?.facebook);
  const linkedinUrl = normalizeUrl(site?.contato?.linkedin);

  return (
    <footer className="bg-secondary/60 pt-24 pb-12 border-t border-foreground/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-20 items-start">
          <div className="flex flex-col items-center text-center h-full">
            <Link to="/" className="inline-flex items-center justify-center" aria-label="RM Prime Imóveis - Início">
              <img src={logo} alt="RM Prime Imóveis" width={500} height={500} className="h-[6.6rem] w-auto object-contain" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[32ch] mt-auto pt-6">
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
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-9 rounded-full border border-foreground/15 grid place-items-center text-foreground/60 hover:bg-petroleum hover:text-linen hover:border-petroleum transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="size-4" strokeWidth={1.5} />
                </a>
              )}
              <a
                href="#"
                className="size-9 rounded-full border border-foreground/15 grid place-items-center text-foreground/60 hover:bg-petroleum hover:text-linen hover:border-petroleum transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="size-4" strokeWidth={1.5} />
              </a>
              <a
                href="#"
                className="size-9 rounded-full border border-foreground/15 grid place-items-center text-foreground/60 hover:bg-petroleum hover:text-linen hover:border-petroleum transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="size-4" strokeWidth={1.5} />
              </a>
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
