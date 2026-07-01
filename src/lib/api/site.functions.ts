import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// 1 ano em segundos (URLs assinadas longas para conteúdo público estático)
const SIGN_TTL = 60 * 60 * 24 * 365;

/** Converte um caminho "bucket/path" em URL assinada. Aceita já URLs http.
 *  Usa service role apenas para assinar (a URL gerada é pública e expira). */
export async function signedUrl(
  bucket: string,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}


export interface SiteSettings {
  branding: {
    logo_path?: string | null;
    logo_url?: string | null;
    favicon_path?: string | null;
    favicon_url?: string | null;
    site_name?: string;
  };
  /** Novo: branding dinâmico (cores/fontes) aplicado em runtime via CSS vars. */
  branding_v2: {
    color_primary?: string;      // hex/oklch
    color_secondary?: string;
    color_accent?: string;
    color_button?: string;
    color_link?: string;
    font_primary?: string;       // ex: "Inter"
    font_secondary?: string;     // ex: "Cormorant Garamond"
    logo_mobile_path?: string | null;
    logo_mobile_url?: string | null;
  };
  /** Dados institucionais da empresa. */
  empresa: {
    razao_social?: string;
    nome_fantasia?: string;
    cnpj?: string;
    creci?: string;
    responsavel_tecnico?: string;
    fundacao?: string;
    slogan?: string;
    sobre_curto?: string;
  };
  /** Config do rodapé (colunas de links + texto). */
  footer: {
    copyright?: string;
    coluna1_titulo?: string;
    coluna1_links?: { label: string; url: string }[];
    coluna2_titulo?: string;
    coluna2_links?: { label: string; url: string }[];
    mostrar_redes?: boolean;
    texto_legal?: string;
  };
  /** SEO global padrão (fallback quando página não define). */
  seo_global: {
    default_title?: string;
    default_description?: string;
    default_og_image_path?: string | null;
    default_og_image_url?: string | null;
    keywords?: string;
    twitter_handle?: string;
  };
  home_hero: { eyebrow?: string; title_lines?: string[]; subtitle?: string; cta_primary?: string; cta_secondary?: string; image_path?: string | null; image_url?: string | null; search_tipos?: string[] };
  home_secoes: {
    destaques_eyebrow?: string;
    destaques_titulo?: string;
    destaques_qtd?: number;
    bairros_eyebrow?: string;
    bairros_titulo?: string;
    bairros_descricao?: string;
    bairros_qtd?: number;
  };
  contato: { telefone?: string; whatsapp?: string; email?: string; endereco?: string; instagram?: string; facebook?: string; linkedin?: string; creci?: string; localizacao?: string };
  pagina_lancamentos: {
    eyebrow?: string;
    title_lines?: string[];
    subtitle?: string;
    cta_primary?: string;
    cta_secondary?: string;
    image_path?: string | null;
    image_url?: string | null;
    empty_message?: string;
    meta_title?: string;
    meta_description?: string;
  };
  /** Home — bloco de Diferenciais (numerados). */
  home_diferenciais: {
    eyebrow?: string;
    titulo?: string;
    itens?: { n: string; title: string; desc: string }[];
  };
  /** Home — bloco de Depoimentos. */
  home_depoimentos: {
    eyebrow?: string;
    titulo?: string;
    itens?: { quote: string; name: string; role: string }[];
  };
  /** Página Sobre. */
  pagina_sobre: {
    hero_eyebrow?: string;
    hero_titulo?: string;
    hero_subtitle?: string;
    hero_image_path?: string | null;
    hero_image_url?: string | null;
    blocos?: { titulo?: string; texto: string }[];
    stats?: { valor: string; label: string }[];
    cta_titulo?: string;
    cta_texto?: string;
    cta_label?: string;
    cta_url?: string;
    meta_title?: string;
    meta_description?: string;
  };
  /** Página Contato — apenas textos institucionais (contatos vêm de `empresa`/`contato`). */
  pagina_contato: {
    hero_eyebrow?: string;
    hero_titulo?: string;
    hero_subtitle?: string;
    form_titulo?: string;
    form_texto?: string;
    form_botao?: string;
    mapa_url?: string;
    horario_atendimento?: string;
    meta_title?: string;
    meta_description?: string;
  };
  /** Página Anuncie. */
  pagina_anuncie: {
    hero_eyebrow?: string;
    hero_titulo?: string;
    hero_subtitle?: string;
    hero_image_path?: string | null;
    hero_image_url?: string | null;
    beneficios_eyebrow?: string;
    beneficios_titulo?: string;
    beneficios?: { titulo: string; desc: string }[];
    form_titulo?: string;
    form_texto?: string;
    form_botao?: string;
    meta_title?: string;
    meta_description?: string;
  };
}


const DEFAULT_SECOES: SiteSettings["home_secoes"] = {
  destaques_eyebrow: "Seleção Exclusiva",
  destaques_titulo: "Destaques",
  destaques_qtd: 3,
  bairros_eyebrow: "Os Melhores Endereços",
  bairros_titulo: "Bairros em destaque",
  bairros_descricao: "Uma seleção estratégica das regiões mais valorizadas para morar e investir em Belo Horizonte.",
  bairros_qtd: 4,
};

const DEFAULT_LANCAMENTOS: SiteSettings["pagina_lancamentos"] = {
  eyebrow: "Lançamentos",
  title_lines: ["Empreendimentos", "exclusivos"],
  subtitle: "Acesso antecipado aos principais lançamentos de alto padrão em Belo Horizonte e Nova Lima.",
  cta_primary: "Falar com especialista",
  cta_secondary: "Ver imóveis prontos",
  empty_message: "Em breve novos lançamentos. Fale com nossos especialistas para acesso antecipado.",
  meta_title: "Lançamentos — RM Prime Imóveis",
  meta_description: "Empreendimentos exclusivos com acesso antecipado em BH e Nova Lima.",
};

const DEFAULT_DIFERENCIAIS: SiteSettings["home_diferenciais"] = {
  eyebrow: "Por que RM Prime",
  titulo: "Diferenciais",
  itens: [
    { n: "01", title: "Seleção especializada", desc: "Portfólio rigorosamente selecionado por arquitetura autoral e localização premium." },
    { n: "02", title: "Atendimento consultivo", desc: "Especialistas dedicados a entender sua necessidade real, sem pressa." },
    { n: "03", title: "Exclusividade total", desc: "Acesso a imóveis off-market que não circulam nos portais comuns." },
    { n: "04", title: "Experiência digital", desc: "Acompanhamento transparente via nossa plataforma proprietária." },
  ],
};

const DEFAULT_DEPOIMENTOS: SiteSettings["home_depoimentos"] = {
  eyebrow: "O que dizem",
  titulo: "Clientes",
  itens: [
    { quote: "A RM Prime entendeu exatamente o que buscávamos. Em três semanas estávamos morando na cobertura dos sonhos.", name: "Mariana Andrade", role: "Investidora, BH" },
    { quote: "Atendimento à altura do imóvel. Discrição, conhecimento de mercado e portfólio realmente exclusivo.", name: "Eduardo Vasconcelos", role: "Executivo, Nova Lima" },
  ],
};

const DEFAULT_SOBRE: SiteSettings["pagina_sobre"] = {
  hero_eyebrow: "Nossa história",
  hero_titulo: "Uma boutique imobiliária dedicada ao alto padrão.",
  hero_subtitle: "",
  blocos: [
    { texto: "A RM Prime Imóveis nasceu da convicção de que comprar ou vender um imóvel de alto padrão exige mais do que técnica: exige sensibilidade, discrição e profundo conhecimento das regiões mais valorizadas de Belo Horizonte." },
    { texto: "Atuamos como curadores — não como intermediários. Selecionamos cada propriedade do nosso portfólio com o mesmo rigor com que orientamos nossos clientes a tomar decisões patrimoniais relevantes." },
  ],
  stats: [],
  cta_titulo: "",
  cta_texto: "",
  cta_label: "Fale conosco",
  cta_url: "/contato",
  meta_title: "Sobre — RM Prime Imóveis",
  meta_description: "Boutique imobiliária dedicada ao alto padrão em Belo Horizonte.",
};

const DEFAULT_PAGINA_CONTATO: SiteSettings["pagina_contato"] = {
  hero_eyebrow: "Fale Conosco",
  hero_titulo: "Estamos prontos para atender você.",
  hero_subtitle: "",
  form_titulo: "Envie sua mensagem",
  form_texto: "",
  form_botao: "Enviar mensagem",
  mapa_url: "",
  horario_atendimento: "",
  meta_title: "Contato — RM Prime Imóveis",
  meta_description: "Fale com a equipe RM Prime Imóveis em Belo Horizonte.",
};

const DEFAULT_ANUNCIE: SiteSettings["pagina_anuncie"] = {
  hero_eyebrow: "Anuncie com exclusividade",
  hero_titulo: "Anuncie seu imóvel",
  hero_subtitle: "Preencha as informações abaixo e um consultor entrará em contato em até 24h.",
  beneficios_eyebrow: "Por que anunciar com a RM Prime",
  beneficios_titulo: "Vantagens exclusivas",
  beneficios: [
    { titulo: "Avaliação gratuita", desc: "Precificação estratégica baseada em dados de mercado e comparáveis reais." },
    { titulo: "Marketing personalizado", desc: "Fotografia profissional, tour virtual e distribuição segmentada." },
    { titulo: "Discrição absoluta", desc: "Divulgação off-market para clientes qualificados quando necessário." },
  ],
  form_titulo: "",
  form_texto: "",
  form_botao: "Confirmar Informações",
  meta_title: "Anuncie seu imóvel — RM Prime Imóveis",
  meta_description: "Anuncie seu imóvel de alto padrão com a RM Prime.",
};

export const obterSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SiteSettings> => {
  const supabase = publicClient();
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw new Error(error.message);
  const result: SiteSettings = {
    branding: {},
    branding_v2: {},
    empresa: {},
    footer: {},
    seo_global: {},
    home_hero: {},
    home_secoes: { ...DEFAULT_SECOES },
    contato: {},
    pagina_lancamentos: { ...DEFAULT_LANCAMENTOS },
    home_diferenciais: { ...DEFAULT_DIFERENCIAIS },
    home_depoimentos: { ...DEFAULT_DEPOIMENTOS },
    pagina_sobre: { ...DEFAULT_SOBRE },
    pagina_contato: { ...DEFAULT_PAGINA_CONTATO },
    pagina_anuncie: { ...DEFAULT_ANUNCIE },
  };
  const mergeDefaults: Record<string, Record<string, unknown> | undefined> = {
    home_secoes: DEFAULT_SECOES as Record<string, unknown>,
    pagina_lancamentos: DEFAULT_LANCAMENTOS as Record<string, unknown>,
    home_diferenciais: DEFAULT_DIFERENCIAIS as Record<string, unknown>,
    home_depoimentos: DEFAULT_DEPOIMENTOS as Record<string, unknown>,
    pagina_sobre: DEFAULT_SOBRE as Record<string, unknown>,
    pagina_contato: DEFAULT_PAGINA_CONTATO as Record<string, unknown>,
    pagina_anuncie: DEFAULT_ANUNCIE as Record<string, unknown>,
  };
  const simpleKeys = new Set([
    "branding","branding_v2","empresa","footer","seo_global","home_hero","contato",
  ]);
  for (const row of data ?? []) {
    if (simpleKeys.has(row.key)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[row.key] = (row.value as Record<string, unknown>) ?? {};
    } else if (row.key in mergeDefaults) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[row.key] = { ...mergeDefaults[row.key], ...((row.value as Record<string, unknown>) ?? {}) };
    }
  }
  if (result.branding.logo_path) result.branding.logo_url = await signedUrl("site", result.branding.logo_path);
  if (result.branding.favicon_path) result.branding.favicon_url = await signedUrl("site", result.branding.favicon_path);
  if (result.branding_v2.logo_mobile_path) result.branding_v2.logo_mobile_url = await signedUrl("site", result.branding_v2.logo_mobile_path);
  if (result.seo_global.default_og_image_path) result.seo_global.default_og_image_url = await signedUrl("site", result.seo_global.default_og_image_path);
  if (result.home_hero.image_path) result.home_hero.image_url = await signedUrl("site", result.home_hero.image_path);
  if (result.pagina_lancamentos.image_path) result.pagina_lancamentos.image_url = await signedUrl("site", result.pagina_lancamentos.image_path);
  if (result.pagina_sobre.hero_image_path) result.pagina_sobre.hero_image_url = await signedUrl("site", result.pagina_sobre.hero_image_path);
  if (result.pagina_anuncie.hero_image_path) result.pagina_anuncie.hero_image_url = await signedUrl("site", result.pagina_anuncie.hero_image_path);

  return result;
});


export const atualizarSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      key: z.enum([
        "branding",
        "branding_v2",
        "empresa",
        "footer",
        "seo_global",
        "home_hero",
        "home_secoes",
        "contato",
        "pagina_lancamentos",
        "home_diferenciais",
        "home_depoimentos",
        "pagina_sobre",
        "pagina_contato",
        "pagina_anuncie",
      ]),

      value: z.record(z.string(), z.unknown()),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: data.key, value: data.value as never, updated_by: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
