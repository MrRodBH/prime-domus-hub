import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Facebook, Linkedin } from "lucide-react";
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

const DEFAULT_COL1_LINKS = [
  { label: "Comprar", url: "/imoveis" },
  { label: "Lançamentos", url: "/lancamentos" },
  { label: "Bairros Premium", url: "/imoveis" },
  { label: "Anuncie seu imóvel", url: "/anuncie" },
];

const DEFAULT_COL2_LINKS = [
  { label: "Nossa história", url: "/sobre" },
  { label: "Blog editorial", url: "/blog" },
  { label: "Contato", url: "/contato" },
  { label: "Política de privacidade", url: "/privacidade" },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{label}</a>;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Link to={href as any} className="hover:text-gold transition-colors">{label}</Link>;
}

export function Footer() {
  const { data: site } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => obterSiteSettings(),
  });

  const instagramUrl = normalizeInstagram(site?.contato?.instagram);
  const facebookUrl = normalizeUrl(site?.contato?.facebook);
  const linkedinUrl = normalizeUrl(site?.contato?.linkedin);
  const mostrarRedes = site?.footer?.mostrar_redes !== false;
  const col1Titulo = site?.footer?.coluna1_titulo || "Explore";
  const col2Titulo = site?.footer?.coluna2_titulo || "Institucional";
  const col1 = (site?.footer?.coluna1_links?.length ? site.footer.coluna1_links : DEFAULT_COL1_LINKS);
  const col2 = (site?.footer?.coluna2_links?.length ? site.footer.coluna2_links : DEFAULT_COL2_LINKS);
  const siteName = site?.branding?.site_name || "RM Prime Imóveis";
  const copyright = site?.footer?.copyright || `© ${new Date().getFullYear()} ${siteName}`;
  const logoSrc = site?.branding?.logo_url || logo;
  const sobreCurto = site?.empresa?.sobre_curto ||
    "Conectando você ao seu melhor imóvel. Especialistas no mercado de alto padrão em Belo Horizonte e região metropolitana.";

  return (
    <footer className="bg-secondary/60 pt-24 pb-12 border-t border-foreground/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-20 items-start">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left h-full">
            <Link to="/" className="inline-flex items-center" aria-label={`${siteName} - Início`}>
              <img src={logoSrc} alt={siteName} width={500} height={500} className="h-[6.6rem] w-auto object-contain" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[40ch] mt-6">{sobreCurto}</p>
          </div>

          <div className="lg:pl-8">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6">{col1Titulo}</h5>
            <ul className="space-y-3.5 text-sm text-muted-foreground">
              {col1.map((l) => (<li key={`c1-${l.url}-${l.label}`}><FooterLink href={l.url} label={l.label} /></li>))}
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6">{col2Titulo}</h5>
            <ul className="space-y-3.5 text-sm text-muted-foreground">
              {col2.map((l) => (<li key={`c2-${l.url}-${l.label}`}><FooterLink href={l.url} label={l.label} /></li>))}
            </ul>
          </div>

          {mostrarRedes && (
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6">Redes Sociais</h5>
              <div className="flex gap-3">
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="size-9 rounded-full border border-foreground/15 grid place-items-center text-foreground/60 hover:bg-petroleum hover:text-linen hover:border-petroleum transition-colors" aria-label="Instagram">
                    <Instagram className="size-4" strokeWidth={1.5} />
                  </a>
                )}
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="size-9 rounded-full border border-foreground/15 grid place-items-center text-foreground/60 hover:bg-petroleum hover:text-linen hover:border-petroleum transition-colors" aria-label="Facebook">
                    <Facebook className="size-4" strokeWidth={1.5} />
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="size-9 rounded-full border border-foreground/15 grid place-items-center text-foreground/60 hover:bg-petroleum hover:text-linen hover:border-petroleum transition-colors" aria-label="LinkedIn">
                    <Linkedin className="size-4" strokeWidth={1.5} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>


        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-foreground/5 gap-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {copyright}{site?.contato?.creci ? ` · ${site.contato.creci}` : ""}
          </p>
          {site?.contato?.localizacao && (
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {site.contato.localizacao}
            </p>
          )}
        </div>
        {site?.footer?.texto_legal && (
          <p className="mt-4 text-[10px] text-muted-foreground/80 text-center">{site.footer.texto_legal}</p>
        )}
      </div>
    </footer>
  );
}
