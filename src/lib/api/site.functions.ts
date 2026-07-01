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
  };
  for (const row of data ?? []) {
    if (
      row.key === "branding" ||
      row.key === "branding_v2" ||
      row.key === "empresa" ||
      row.key === "footer" ||
      row.key === "seo_global" ||
      row.key === "home_hero" ||
      row.key === "contato"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[row.key] = (row.value as Record<string, unknown>) ?? {};
    } else if (row.key === "home_secoes") {
      result.home_secoes = { ...DEFAULT_SECOES, ...((row.value as Record<string, unknown>) ?? {}) };
    } else if (row.key === "pagina_lancamentos") {
      result.pagina_lancamentos = { ...DEFAULT_LANCAMENTOS, ...((row.value as Record<string, unknown>) ?? {}) };
    }
  }
  if (result.branding.logo_path) {
    result.branding.logo_url = await signedUrl("site", result.branding.logo_path);
  }
  if (result.branding.favicon_path) {
    result.branding.favicon_url = await signedUrl("site", result.branding.favicon_path);
  }
  if (result.branding_v2.logo_mobile_path) {
    result.branding_v2.logo_mobile_url = await signedUrl("site", result.branding_v2.logo_mobile_path);
  }
  if (result.seo_global.default_og_image_path) {
    result.seo_global.default_og_image_url = await signedUrl("site", result.seo_global.default_og_image_path);
  }
  if (result.home_hero.image_path) {
    result.home_hero.image_url = await signedUrl("site", result.home_hero.image_path);
  }
  if (result.pagina_lancamentos.image_path) {
    result.pagina_lancamentos.image_url = await signedUrl("site", result.pagina_lancamentos.image_path);
  }

  return result;
});


export const atualizarSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      key: z.enum(["branding", "home_hero", "home_secoes", "contato", "pagina_lancamentos"]),
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
