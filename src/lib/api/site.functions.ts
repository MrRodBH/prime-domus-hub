import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import {
  normalizePublicEmbedUrl,
  normalizePublicNavigationUrl,
} from "@/lib/public-content-security";
import {
  SIGNED_URL_TTL_PREVIEW_SECONDS,
  validateTenantSignRequest,
} from "@/lib/storage/signed-url";
import { loadPublishedConfigurationForTenant } from "@/lib/api/tenant-configuration-authority.server";
import { normalizeConfigurationSnapshot } from "@/lib/api/configuration-registry";

export interface SiteSettings {
  branding: {
    logo_path?: string | null;
    logo_url?: string | null;
    favicon_path?: string | null;
    favicon_url?: string | null;
    site_name?: string;
  };
  branding_v2: {
    color_primary?: string;
    color_secondary?: string;
    color_accent?: string;
    color_button?: string;
    color_link?: string;
    font_primary?: string;
    font_secondary?: string;
    logo_mobile_path?: string | null;
    logo_mobile_url?: string | null;
  };
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
  footer: {
    copyright?: string;
    coluna1_titulo?: string;
    coluna1_links?: { label: string; url: string }[];
    coluna2_titulo?: string;
    coluna2_links?: { label: string; url: string }[];
    mostrar_redes?: boolean;
    texto_legal?: string;
  };
  seo_global: {
    default_title?: string;
    default_description?: string;
    default_og_image_path?: string | null;
    default_og_image_url?: string | null;
    keywords?: string;
    twitter_handle?: string;
  };
  home_hero: {
    eyebrow?: string;
    title_lines?: string[];
    subtitle?: string;
    cta_primary?: string;
    cta_secondary?: string;
    image_path?: string | null;
    image_url?: string | null;
    search_tipos?: string[];
  };
  home_secoes: {
    destaques_eyebrow?: string;
    destaques_titulo?: string;
    destaques_qtd?: number;
    bairros_eyebrow?: string;
    bairros_titulo?: string;
    bairros_descricao?: string;
    bairros_qtd?: number;
  };
  contato: {
    telefone?: string;
    whatsapp?: string;
    email?: string;
    endereco?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    creci?: string;
    localizacao?: string;
  };
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
  home_diferenciais: {
    eyebrow?: string;
    titulo?: string;
    itens?: { n: string; title: string; desc: string }[];
  };
  home_depoimentos: {
    eyebrow?: string;
    titulo?: string;
    itens?: { quote: string; name: string; role: string }[];
  };
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

type SnapshotRecord = Record<string, unknown>;
type ResolvedMedia = { id: string; path: string; url: string };
type MediaRow = { id: string; tenant_id: string; arquivo: string };

function stringValue(snapshot: SnapshotRecord, key: string): string | undefined {
  const value = snapshot[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function objectValue<T extends object>(snapshot: SnapshotRecord, key: string): T {
  const value = snapshot[key];
  return (typeof value === "object" && value !== null && !Array.isArray(value)
    ? structuredClone(value)
    : {}) as T;
}

async function resolveConfigurationMedia(
  tenantId: string,
  snapshot: SnapshotRecord,
): Promise<Map<string, ResolvedMedia>> {
  const keys = ["primary_logo", "secondary_logo", "favicon", "default_og_image"] as const;
  const requested = keys.flatMap((key) => {
    const value = snapshot[key];
    return typeof value === "string" && value.length > 0 ? [{ key, id: value }] : [];
  });
  if (requested.length === 0) return new Map();

  const ids = [...new Set(requested.map((item) => item.id))];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("media_library")
    .select("id, tenant_id, arquivo")
    .eq("tenant_id", tenantId)
    .in("id", ids);
  if (error) throw new Error("public_configuration_media_read_failed");
  const rows = (data ?? []) as MediaRow[];
  if (rows.length !== ids.length) throw new Error("public_configuration_media_missing");

  const rowById = new Map<string, MediaRow>(rows.map((row) => [row.id, row]));
  const resolved = new Map<string, ResolvedMedia>();
  for (const request of requested) {
    const row = rowById.get(request.id);
    if (!row || row.tenant_id !== tenantId) throw new Error("public_configuration_media_cross_tenant");
    const target = validateTenantSignRequest({ bucket: "site", path: row.arquivo, tenantId });
    const signed = await supabaseAdmin.storage
      .from(target.bucket)
      .createSignedUrl(target.path, SIGNED_URL_TTL_PREVIEW_SECONDS);
    if (signed.error || !signed.data?.signedUrl) throw new Error("public_configuration_media_sign_failed");
    resolved.set(request.key, { id: request.id, path: target.path, url: signed.data.signedUrl });
  }
  return resolved;
}

function normalizeLinkArray(value: unknown): { label: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label : "";
    const rawUrl = typeof record.url === "string" ? record.url : "";
    const url = normalizePublicNavigationUrl(rawUrl, "contact");
    return label && url ? [{ label, url }] : [];
  });
}

export async function projectConfigurationToSiteSettings(
  tenantId: string,
  snapshotInput: unknown,
): Promise<SiteSettings> {
  const snapshot = normalizeConfigurationSnapshot(snapshotInput) as unknown as SnapshotRecord;
  const media = await resolveConfigurationMedia(tenantId, snapshot);
  const footerColumns = Array.isArray(snapshot.footer_columns) ? snapshot.footer_columns : [];
  const firstColumn = footerColumns[0] as Record<string, unknown> | undefined;
  const secondColumn = footerColumns[1] as Record<string, unknown> | undefined;

  const homeHero = objectValue<SiteSettings["home_hero"]>(snapshot, "home_hero");
  const homeSecoes = objectValue<SiteSettings["home_secoes"]>(snapshot, "home_secoes");
  const paginaLancamentos = objectValue<SiteSettings["pagina_lancamentos"]>(snapshot, "pagina_lancamentos");
  const diferenciais = objectValue<SiteSettings["home_diferenciais"]>(snapshot, "home_diferenciais");
  const depoimentos = objectValue<SiteSettings["home_depoimentos"]>(snapshot, "home_depoimentos");
  const paginaSobre = objectValue<SiteSettings["pagina_sobre"]>(snapshot, "pagina_sobre");
  const paginaContato = objectValue<SiteSettings["pagina_contato"]>(snapshot, "pagina_contato");
  const paginaAnuncie = objectValue<SiteSettings["pagina_anuncie"]>(snapshot, "pagina_anuncie");

  if (paginaSobre.cta_url) paginaSobre.cta_url = normalizePublicNavigationUrl(paginaSobre.cta_url, "contact") ?? "";
  if (paginaContato.mapa_url) paginaContato.mapa_url = normalizePublicEmbedUrl(paginaContato.mapa_url) ?? "";

  const primaryLogo = media.get("primary_logo");
  const secondaryLogo = media.get("secondary_logo");
  const favicon = media.get("favicon");
  const ogImage = media.get("default_og_image");

  return {
    branding: {
      logo_path: primaryLogo?.path ?? null,
      logo_url: primaryLogo?.url ?? null,
      favicon_path: favicon?.path ?? null,
      favicon_url: favicon?.url ?? null,
      site_name: stringValue(snapshot, "trade_name") ?? stringValue(snapshot, "short_name"),
    },
    branding_v2: {
      color_primary: stringValue(snapshot, "primary_color"),
      color_secondary: stringValue(snapshot, "secondary_color"),
      color_accent: stringValue(snapshot, "accent_color"),
      color_button: stringValue(snapshot, "button_color") ?? stringValue(snapshot, "primary_color"),
      color_link: stringValue(snapshot, "link_color") ?? stringValue(snapshot, "accent_color"),
      font_primary: stringValue(snapshot, "body_font"),
      font_secondary: stringValue(snapshot, "heading_font"),
      logo_mobile_path: secondaryLogo?.path ?? null,
      logo_mobile_url: secondaryLogo?.url ?? null,
    },
    empresa: {
      razao_social: stringValue(snapshot, "legal_name"),
      nome_fantasia: stringValue(snapshot, "trade_name"),
      cnpj: stringValue(snapshot, "tax_document_display"),
      creci: stringValue(snapshot, "creci_or_registration"),
      responsavel_tecnico: stringValue(snapshot, "technical_responsible"),
      fundacao: typeof snapshot.founded_year === "number" ? String(snapshot.founded_year) : undefined,
      slogan: stringValue(snapshot, "tagline"),
      sobre_curto: stringValue(snapshot, "institutional_description"),
    },
    footer: {
      copyright: stringValue(snapshot, "footer_copyright"),
      coluna1_titulo: typeof firstColumn?.title === "string" ? firstColumn.title : undefined,
      coluna1_links: normalizeLinkArray(firstColumn?.links),
      coluna2_titulo: typeof secondColumn?.title === "string" ? secondColumn.title : undefined,
      coluna2_links: normalizeLinkArray(secondColumn?.links),
      mostrar_redes: snapshot.show_social_links !== false,
      texto_legal: stringValue(snapshot, "legal_notice_text"),
    },
    seo_global: {
      default_title: stringValue(snapshot, "default_meta_title"),
      default_description: stringValue(snapshot, "default_meta_description"),
      default_og_image_path: ogImage?.path ?? null,
      default_og_image_url: ogImage?.url ?? null,
      keywords: stringValue(snapshot, "seo_keywords"),
      twitter_handle: stringValue(snapshot, "x_twitter_handle"),
    },
    home_hero: homeHero,
    home_secoes: homeSecoes,
    contato: {
      telefone: stringValue(snapshot, "primary_phone"),
      whatsapp: stringValue(snapshot, "whatsapp"),
      email: stringValue(snapshot, "primary_email"),
      endereco: stringValue(snapshot, "address"),
      instagram: normalizePublicNavigationUrl(stringValue(snapshot, "instagram") ?? "") ?? undefined,
      facebook: normalizePublicNavigationUrl(stringValue(snapshot, "facebook") ?? "") ?? undefined,
      linkedin: normalizePublicNavigationUrl(stringValue(snapshot, "linkedin") ?? "") ?? undefined,
      creci: stringValue(snapshot, "creci_or_registration"),
      localizacao: stringValue(snapshot, "location_description"),
    },
    pagina_lancamentos: paginaLancamentos,
    home_diferenciais: diferenciais,
    home_depoimentos: depoimentos,
    pagina_sobre: paginaSobre,
    pagina_contato: paginaContato,
    pagina_anuncie: paginaAnuncie,
  };
}

export async function hydrateSiteSettings(
  input: { key: string; value: Json }[] | Record<string, Json>,
  tenantId?: string,
): Promise<SiteSettings> {
  if (!tenantId) throw new Error("canonical_configuration_tenant_required");
  const snapshot = Array.isArray(input) ? Object.fromEntries(input.map(({ key, value }) => [key, value])) : input;
  return projectConfigurationToSiteSettings(tenantId, snapshot);
}

export const obterSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SiteSettings> => {
  const tenant = await requirePublicTenantFromRequest();
  const published = await loadPublishedConfigurationForTenant(tenant.id);
  return projectConfigurationToSiteSettings(tenant.id, published.snapshot);
});

export const atualizarSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ key: z.string(), value: z.record(z.string(), z.unknown()) }).strict())
  .handler(async (): Promise<{ ok: false }> => {
    throw new Error("legacy_site_settings_mutation_retired");
  });
