import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
import {
  loadPublishedConfigurationForTenant,
} from "@/lib/api/tenant-configuration-authority.server";
import {
  normalizeConfigurationSnapshot,
  type ConfigurationSnapshot,
} from "@/lib/api/configuration-registry";

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
  home_hero: Record<string, unknown> & { image_path?: string | null; image_url?: string | null };
  home_secoes: Record<string, unknown>;
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
  pagina_lancamentos: Record<string, unknown> & { image_path?: string | null; image_url?: string | null };
  home_diferenciais: Record<string, unknown>;
  home_depoimentos: Record<string, unknown>;
  pagina_sobre: Record<string, unknown> & { hero_image_path?: string | null; hero_image_url?: string | null; cta_url?: string };
  pagina_contato: Record<string, unknown> & { mapa_url?: string };
  pagina_anuncie: Record<string, unknown> & { hero_image_path?: string | null; hero_image_url?: string | null };
}

type ResolvedMedia = { id: string; path: string; url: string };

function stringValue(snapshot: ConfigurationSnapshot, key: keyof ConfigurationSnapshot): string | undefined {
  const value = snapshot[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function objectValue(snapshot: ConfigurationSnapshot, key: keyof ConfigurationSnapshot): Record<string, unknown> {
  const value = snapshot[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? structuredClone(value as Record<string, unknown>)
    : {};
}

async function resolveConfigurationMedia(
  tenantId: string,
  snapshot: ConfigurationSnapshot,
): Promise<Map<string, ResolvedMedia>> {
  const keys = [
    "primary_logo",
    "secondary_logo",
    "favicon",
    "default_og_image",
  ] as const;
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
  if ((data ?? []).length !== ids.length) throw new Error("public_configuration_media_missing");

  const rowById = new Map((data ?? []).map((row: any) => [row.id as string, row]));
  const resolved = new Map<string, ResolvedMedia>();
  for (const request of requested) {
    const row = rowById.get(request.id);
    if (!row || row.tenant_id !== tenantId) throw new Error("public_configuration_media_cross_tenant");
    const target = validateTenantSignRequest({
      bucket: "site",
      path: row.arquivo as string,
      tenantId,
    });
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
    const label = typeof (entry as any).label === "string" ? (entry as any).label : "";
    const rawUrl = typeof (entry as any).url === "string" ? (entry as any).url : "";
    const url = normalizePublicNavigationUrl(rawUrl, "contact");
    return label && url ? [{ label, url }] : [];
  });
}

export async function projectConfigurationToSiteSettings(
  tenantId: string,
  snapshotInput: unknown,
): Promise<SiteSettings> {
  const snapshot = normalizeConfigurationSnapshot(snapshotInput);
  const media = await resolveConfigurationMedia(tenantId, snapshot);
  const footerColumns = Array.isArray(snapshot.footer_columns) ? snapshot.footer_columns : [];
  const firstColumn = footerColumns[0] as Record<string, unknown> | undefined;
  const secondColumn = footerColumns[1] as Record<string, unknown> | undefined;

  const paginaSobre = objectValue(snapshot, "pagina_sobre");
  const paginaContato = objectValue(snapshot, "pagina_contato");
  const paginaAnuncie = objectValue(snapshot, "pagina_anuncie");
  const paginaLancamentos = objectValue(snapshot, "pagina_lancamentos");
  const homeHero = objectValue(snapshot, "home_hero");

  if (typeof paginaSobre.cta_url === "string") {
    paginaSobre.cta_url = normalizePublicNavigationUrl(paginaSobre.cta_url, "contact") ?? "";
  }
  if (typeof paginaContato.mapa_url === "string") {
    paginaContato.mapa_url = normalizePublicEmbedUrl(paginaContato.mapa_url) ?? "";
  }

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
    home_secoes: objectValue(snapshot, "home_secoes"),
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
    home_diferenciais: objectValue(snapshot, "home_diferenciais"),
    home_depoimentos: objectValue(snapshot, "home_depoimentos"),
    pagina_sobre: paginaSobre,
    pagina_contato: paginaContato,
    pagina_anuncie: paginaAnuncie,
  };
}

/** Compatibilidade de leitura para consumidores públicos existentes. */
export async function hydrateSiteSettings(
  input: { key: string; value: unknown }[] | ConfigurationSnapshot | Record<string, unknown>,
  tenantId?: string,
): Promise<SiteSettings> {
  if (!tenantId) throw new Error("canonical_configuration_tenant_required");
  const snapshot = Array.isArray(input)
    ? Object.fromEntries(input.map(({ key, value }) => [key, value]))
    : input;
  return projectConfigurationToSiteSettings(tenantId, snapshot);
}

export const obterSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SiteSettings> => {
  const tenant = await requirePublicTenantFromRequest();
  const published = await loadPublishedConfigurationForTenant(tenant.id);
  return projectConfigurationToSiteSettings(tenant.id, published.snapshot);
});

/**
 * Caminho legado deliberadamente encerrado. A mutation canônica é
 * saveTenantConfigurationDraft → publishTenantConfiguration.
 */
export const atualizarSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ key: z.string(), value: z.record(z.string(), z.unknown()) }).strict())
  .handler(async () => {
    throw new Error("legacy_site_settings_mutation_retired");
  });
