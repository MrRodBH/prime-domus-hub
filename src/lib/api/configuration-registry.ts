export const CONFIGURATION_DOMAINS = [
  "identity",
  "branding",
  "visual",
  "contact",
  "social",
  "seo",
  "legal",
  "catalog",
  "lead_capture",
  "header_footer",
  "analytics",
  "future_activation",
  "legacy_content",
] as const;

export type ConfigurationDomain = (typeof CONFIGURATION_DOMAINS)[number];
export type ConfigurationValueKind =
  | "string"
  | "email"
  | "phone"
  | "url"
  | "color"
  | "font"
  | "boolean"
  | "integer"
  | "number"
  | "string_list"
  | "json"
  | "media_id"
  | "analytics_id"
  | "enum";
export type ConfigurationUiControl =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "textarea"
  | "color"
  | "select"
  | "switch"
  | "number"
  | "string-list"
  | "json"
  | "media-picker"
  | "readonly";
export type ConfigurationVisibility = "public" | "admin";
export type ConfigurationEditAuthority = "configuration_manager" | "system";
export type ConfigurationSecretClassification = "public_identifier" | "non_secret";

export interface ConfigurationDefinition {
  key: string;
  domain: ConfigurationDomain;
  label: string;
  description: string;
  valueKind: ConfigurationValueKind;
  defaultValue: unknown;
  nullable: boolean;
  visibility: ConfigurationVisibility;
  editAuthority: ConfigurationEditAuthority;
  publicExposure: boolean;
  secretClassification: ConfigurationSecretClassification;
  previewBehavior: "live_draft" | "published_only" | "not_applicable";
  publishBehavior: "snapshot" | "future_gate";
  rollbackBehavior: "snapshot_version" | "not_applicable";
  uiControl: ConfigurationUiControl;
  options?: readonly string[];
  validationMessage: string;
  maxLength?: number;
}

const define = <T extends ConfigurationDefinition>(definition: T): T => definition;
const text = (
  key: string,
  domain: ConfigurationDomain,
  label: string,
  options: Partial<ConfigurationDefinition> = {},
) => define({
  key,
  domain,
  label,
  description: options.description ?? label,
  valueKind: options.valueKind ?? "string",
  defaultValue: options.defaultValue ?? "",
  nullable: options.nullable ?? false,
  visibility: options.visibility ?? "public",
  editAuthority: options.editAuthority ?? "configuration_manager",
  publicExposure: options.publicExposure ?? true,
  secretClassification: options.secretClassification ?? "non_secret",
  previewBehavior: options.previewBehavior ?? "live_draft",
  publishBehavior: options.publishBehavior ?? "snapshot",
  rollbackBehavior: options.rollbackBehavior ?? "snapshot_version",
  uiControl: options.uiControl ?? "text",
  options: options.options,
  validationMessage: options.validationMessage ?? `${label} possui valor inválido.`,
  maxLength: options.maxLength ?? 500,
});
const media = (key: string, label: string) => text(key, "branding", label, {
  valueKind: "media_id",
  defaultValue: null,
  nullable: true,
  uiControl: "media-picker",
  maxLength: undefined,
  validationMessage: `${label} deve referenciar uma mídia UUID pertencente ao tenant.`,
});
const flag = (key: string, domain: ConfigurationDomain, label: string, defaultValue = false) => text(key, domain, label, {
  valueKind: "boolean",
  defaultValue,
  uiControl: "switch",
  maxLength: undefined,
});
const json = (
  key: string,
  domain: ConfigurationDomain,
  label: string,
  defaultValue: unknown,
  options: Partial<ConfigurationDefinition> = {},
) => text(key, domain, label, {
  ...options,
  valueKind: "json",
  defaultValue,
  uiControl: options.uiControl ?? "json",
  maxLength: undefined,
});
const enumDefinition = (
  key: string,
  domain: ConfigurationDomain,
  label: string,
  options: readonly string[],
  defaultValue: string,
  extra: Partial<ConfigurationDefinition> = {},
) => text(key, domain, label, {
  ...extra,
  valueKind: extra.valueKind === "font" ? "font" : "enum",
  options,
  defaultValue,
  uiControl: extra.uiControl ?? "select",
  maxLength: undefined,
});

const FONT_OPTIONS = [
  "Inter", "Poppins", "Montserrat", "Playfair Display", "Cormorant Garamond",
  "Roboto", "Lato", "Merriweather", "Source Sans 3", "DM Sans",
] as const;

export const CONFIGURATION_REGISTRY = [
  text("trade_name", "identity", "Nome fantasia", { maxLength: 160 }),
  text("legal_name", "identity", "Razão social", { maxLength: 200 }),
  text("short_name", "identity", "Nome curto", { maxLength: 80 }),
  text("tagline", "identity", "Tagline", { maxLength: 200 }),
  text("institutional_description", "identity", "Descrição institucional", { uiControl: "textarea", maxLength: 4000 }),
  text("creci_or_registration", "identity", "CRECI ou registro profissional", { maxLength: 100 }),
  text("tax_document_display", "identity", "Documento fiscal para exibição", { maxLength: 40 }),
  text("technical_responsible", "identity", "Responsável técnico", { maxLength: 200 }),
  text("founded_year", "identity", "Ano de fundação", { valueKind: "integer", defaultValue: null, nullable: true, uiControl: "number", maxLength: undefined }),
  text("service_regions", "identity", "Regiões atendidas", { valueKind: "string_list", defaultValue: [], uiControl: "string-list", maxLength: undefined }),
  text("languages", "identity", "Idiomas", { valueKind: "string_list", defaultValue: ["pt-BR"], uiControl: "string-list", maxLength: undefined }),

  media("primary_logo", "Logo principal"),
  media("secondary_logo", "Logo secundária"),
  media("light_logo", "Logo para fundo claro"),
  media("dark_logo", "Logo para fundo escuro"),
  media("favicon", "Favicon"),
  media("application_icon", "Ícone da aplicação"),
  media("default_social_image", "Imagem social padrão"),
  media("watermark", "Marca d'água"),

  text("primary_color", "visual", "Cor primária", { valueKind: "color", defaultValue: "#0f3d44", uiControl: "color", maxLength: undefined }),
  text("secondary_color", "visual", "Cor secundária", { valueKind: "color", defaultValue: "#d4af37", uiControl: "color", maxLength: undefined }),
  text("accent_color", "visual", "Cor de destaque", { valueKind: "color", defaultValue: "#b78b42", uiControl: "color", maxLength: undefined }),
  text("background_color", "visual", "Cor de fundo", { valueKind: "color", defaultValue: "#ffffff", uiControl: "color", maxLength: undefined }),
  text("surface_color", "visual", "Cor de superfície", { valueKind: "color", defaultValue: "#f7f7f5", uiControl: "color", maxLength: undefined }),
  text("text_color", "visual", "Cor do texto", { valueKind: "color", defaultValue: "#172023", uiControl: "color", maxLength: undefined }),
  text("muted_text_color", "visual", "Cor do texto secundário", { valueKind: "color", defaultValue: "#667176", uiControl: "color", maxLength: undefined }),
  text("success_color", "visual", "Cor de sucesso", { valueKind: "color", defaultValue: "#16803c", uiControl: "color", maxLength: undefined }),
  text("warning_color", "visual", "Cor de alerta", { valueKind: "color", defaultValue: "#b7791f", uiControl: "color", maxLength: undefined }),
  text("error_color", "visual", "Cor de erro", { valueKind: "color", defaultValue: "#b42318", uiControl: "color", maxLength: undefined }),
  text("button_color", "visual", "Cor dos botões", { valueKind: "color", defaultValue: "#0f3d44", uiControl: "color", maxLength: undefined }),
  text("link_color", "visual", "Cor dos links", { valueKind: "color", defaultValue: "#b78b42", uiControl: "color", maxLength: undefined }),
  enumDefinition("heading_font", "visual", "Fonte de títulos", FONT_OPTIONS, "Cormorant Garamond", { valueKind: "font" }),
  enumDefinition("body_font", "visual", "Fonte de texto", FONT_OPTIONS, "Inter", { valueKind: "font" }),
  enumDefinition("font_scale", "visual", "Escala tipográfica", ["sm", "md", "lg"], "md"),
  enumDefinition("border_radius_scale", "visual", "Escala de bordas", ["none", "sm", "md", "lg", "full"], "md"),

  text("primary_email", "contact", "E-mail principal", { valueKind: "email", uiControl: "email", maxLength: 254 }),
  text("commercial_email", "contact", "E-mail comercial", { valueKind: "email", uiControl: "email", maxLength: 254 }),
  text("support_email", "contact", "E-mail de suporte", { valueKind: "email", uiControl: "email", maxLength: 254 }),
  text("primary_phone", "contact", "Telefone principal", { valueKind: "phone", uiControl: "phone", maxLength: 40 }),
  text("whatsapp", "contact", "WhatsApp", { valueKind: "phone", uiControl: "phone", maxLength: 40 }),
  text("whatsapp_default_message", "contact", "Mensagem padrão do WhatsApp", { uiControl: "textarea", maxLength: 1000 }),
  text("address", "contact", "Endereço", { maxLength: 500 }),
  text("city", "contact", "Cidade", { maxLength: 120 }),
  text("state", "contact", "Estado", { maxLength: 80 }),
  text("postal_code", "contact", "CEP", { maxLength: 20 }),
  text("latitude", "contact", "Latitude", { valueKind: "number", defaultValue: null, nullable: true, uiControl: "number", maxLength: undefined }),
  text("longitude", "contact", "Longitude", { valueKind: "number", defaultValue: null, nullable: true, uiControl: "number", maxLength: undefined }),
  json("business_hours", "contact", "Horários de atendimento", []),
  text("emergency_or_after_hours_message", "contact", "Mensagem fora do horário", { uiControl: "textarea", maxLength: 1000 }),
  text("location_description", "contact", "Descrição da localização", { maxLength: 500 }),
  text("map_embed_url", "contact", "URL do mapa", { valueKind: "url", uiControl: "url", maxLength: 2000 }),

  text("instagram", "social", "Instagram", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  text("facebook", "social", "Facebook", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  text("linkedin", "social", "LinkedIn", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  text("youtube", "social", "YouTube", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  text("tiktok", "social", "TikTok", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  text("x_twitter", "social", "X / Twitter", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  text("pinterest", "social", "Pinterest", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  text("x_twitter_handle", "social", "Handle X / Twitter", { maxLength: 80 }),

  text("default_meta_title", "seo", "Título SEO padrão", { maxLength: 70 }),
  text("default_meta_description", "seo", "Descrição SEO padrão", { uiControl: "textarea", maxLength: 200 }),
  text("default_og_image", "seo", "Imagem OG padrão", { valueKind: "media_id", defaultValue: null, nullable: true, uiControl: "media-picker", maxLength: undefined }),
  flag("robots_index", "seo", "Permitir indexação", true),
  flag("robots_follow", "seo", "Permitir seguir links", true),
  json("organization_schema_fields", "seo", "Organization schema", {}),
  json("local_business_schema_fields", "seo", "LocalBusiness schema", {}),
  flag("sitemap_visibility", "seo", "Exibir no sitemap", true),
  text("seo_keywords", "seo", "Palavras-chave SEO", { maxLength: 1000 }),

  text("privacy_policy_reference", "legal", "Referência da política de privacidade", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  text("terms_reference", "legal", "Referência dos termos", { valueKind: "url", uiControl: "url", maxLength: 1000 }),
  flag("cookie_notice_enabled", "legal", "Aviso de cookies", true),
  flag("cookie_preferences_enabled", "legal", "Preferências de cookies", true),
  text("data_controller_identity", "legal", "Identidade do controlador", { maxLength: 500 }),
  text("legal_contact", "legal", "Contato jurídico/LGPD", { maxLength: 254 }),
  text("legal_notice_text", "legal", "Aviso legal do rodapé", { uiControl: "textarea", maxLength: 2000 }),

  flag("show_prices", "catalog", "Exibir preços", true),
  flag("show_exact_address", "catalog", "Exibir endereço exato", false),
  flag("show_broker_contact", "catalog", "Exibir contato do corretor", true),
  flag("show_whatsapp_cta", "catalog", "Exibir CTA de WhatsApp", true),
  flag("show_financing_cta", "catalog", "Exibir CTA de financiamento", true),
  flag("show_similar_properties", "catalog", "Exibir imóveis similares", true),
  flag("show_featured_properties", "catalog", "Exibir imóveis em destaque", true),
  enumDefinition("default_property_sort", "catalog", "Ordenação padrão", ["recent", "price_asc", "price_desc", "featured"], "featured"),
  text("items_per_page", "catalog", "Itens por página", { valueKind: "integer", defaultValue: 12, uiControl: "number", maxLength: undefined }),

  text("lead_form_required_fields", "lead_capture", "Campos obrigatórios do lead", { valueKind: "string_list", defaultValue: ["nome", "telefone"], uiControl: "string-list", maxLength: undefined }),
  flag("lead_consent_required", "lead_capture", "Consentimento obrigatório", true),
  enumDefinition("lead_assignment_visibility", "lead_capture", "Visibilidade da atribuição", ["hidden", "assigned_only", "team", "global"], "assigned_only"),

  enumDefinition("header_variant", "header_footer", "Variação do cabeçalho", ["standard", "minimal", "transparent"], "standard"),
  enumDefinition("footer_variant", "header_footer", "Variação do rodapé", ["standard", "compact", "extended"], "standard"),
  flag("sticky_header", "header_footer", "Cabeçalho fixo", true),
  flag("show_search", "header_footer", "Exibir busca", true),
  flag("show_social_links", "header_footer", "Exibir redes sociais", true),
  flag("show_contact_cta", "header_footer", "Exibir CTA de contato", true),
  text("menu_locations", "header_footer", "Locais de menu", { valueKind: "string_list", defaultValue: ["header", "footer"], uiControl: "string-list", maxLength: undefined }),
  json("menu_items", "header_footer", "Itens de menu", []),
  json("footer_columns", "header_footer", "Colunas do rodapé", []),
  json("legal_links", "header_footer", "Links legais", []),
  text("footer_copyright", "header_footer", "Copyright do rodapé", { maxLength: 500 }),

  text("ga4_measurement_id", "analytics", "GA4 Measurement ID", { valueKind: "analytics_id", secretClassification: "public_identifier", maxLength: 40 }),
  text("google_tag_manager_container_id", "analytics", "Google Tag Manager", { valueKind: "analytics_id", secretClassification: "public_identifier", maxLength: 40 }),
  text("meta_pixel_id", "analytics", "Meta Pixel ID", { valueKind: "analytics_id", secretClassification: "public_identifier", maxLength: 40 }),
  text("google_ads_conversion_id", "analytics", "Google Ads Conversion ID", { valueKind: "analytics_id", secretClassification: "public_identifier", maxLength: 40 }),
  text("linkedin_partner_id", "analytics", "LinkedIn Partner ID", { valueKind: "analytics_id", secretClassification: "public_identifier", maxLength: 40 }),
  text("tiktok_pixel_id", "analytics", "TikTok Pixel ID", { valueKind: "analytics_id", secretClassification: "public_identifier", maxLength: 40 }),

  enumDefinition("domain_activation_state", "future_activation", "Ativação de domínio", ["pending_DCA01"], "pending_DCA01", { visibility: "admin", publicExposure: false, editAuthority: "system", uiControl: "readonly", publishBehavior: "future_gate", rollbackBehavior: "not_applicable" }),
  enumDefinition("cloudflare_mode", "future_activation", "Modo Cloudflare", ["HYBRID_pending_DCA01"], "HYBRID_pending_DCA01", { visibility: "admin", publicExposure: false, editAuthority: "system", uiControl: "readonly", publishBehavior: "future_gate", rollbackBehavior: "not_applicable" }),
  enumDefinition("billing_activation_state", "future_activation", "Ativação comercial", ["pending_BCA01"], "pending_BCA01", { visibility: "admin", publicExposure: false, editAuthority: "system", uiControl: "readonly", publishBehavior: "future_gate", rollbackBehavior: "not_applicable" }),
  enumDefinition("final_visual_refinement", "future_activation", "Refinamento visual final", ["pending_PRM3"], "pending_PRM3", { visibility: "admin", publicExposure: false, editAuthority: "system", uiControl: "readonly", publishBehavior: "future_gate", rollbackBehavior: "not_applicable" }),

  json("home_hero", "legacy_content", "Home — Hero", {}),
  json("home_secoes", "legacy_content", "Home — Seções", {}),
  json("home_diferenciais", "legacy_content", "Home — Diferenciais", {}),
  json("home_depoimentos", "legacy_content", "Home — Depoimentos", {}),
  json("pagina_sobre", "legacy_content", "Página Sobre", {}),
  json("pagina_contato", "legacy_content", "Página Contato", {}),
  json("pagina_anuncie", "legacy_content", "Página Anuncie", {}),
  json("pagina_lancamentos", "legacy_content", "Página Lançamentos", {}),
  json("legacy_settings_archive", "legacy_content", "Arquivo integral da configuração legada", {}, {
    visibility: "admin",
    publicExposure: false,
    editAuthority: "system",
    uiControl: "readonly",
    previewBehavior: "not_applicable",
  }),
] as const satisfies readonly ConfigurationDefinition[];

export type ConfigurationKey = (typeof CONFIGURATION_REGISTRY)[number]["key"];
export type ConfigurationSnapshot = Record<ConfigurationKey, unknown>;

const DEFINITION_BY_KEY = new Map<string, ConfigurationDefinition>(CONFIGURATION_REGISTRY.map((definition) => [definition.key, definition]));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s0-9]{6,40}$/;
const SAFE_TEXT_REJECT_RE = /<script|javascript:|data:text\/html|onerror\s*=|onload\s*=/i;
const SECRET_KEY_RE = /(secret|password|private[_-]?key|refresh[_-]?token|client[_-]?secret|api[_-]?key|access[_-]?token)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stable(value: unknown) {
  return JSON.stringify(value);
}
function validateUrl(key: string, value: string) {
  if (value === "" || value.startsWith("/")) return;
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error(`configuration_invalid_url:${key}`); }
  if (parsed.protocol !== "https:") throw new Error(`configuration_invalid_url_protocol:${key}`);
  const socialHosts: Partial<Record<string, readonly string[]>> = {
    instagram: ["instagram.com", "www.instagram.com"],
    facebook: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com"],
    linkedin: ["linkedin.com", "www.linkedin.com"],
    youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
    tiktok: ["tiktok.com", "www.tiktok.com"],
    x_twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
    pinterest: ["pinterest.com", "www.pinterest.com", "br.pinterest.com"],
  };
  const allowed = socialHosts[key];
  if (allowed && !allowed.includes(parsed.hostname.toLowerCase())) throw new Error(`configuration_invalid_social_host:${key}`);
}
function validateAnalyticsId(key: string, value: string) {
  if (value === "") return;
  const patterns: Record<string, RegExp> = {
    ga4_measurement_id: /^G-[A-Z0-9]{4,20}$/,
    google_tag_manager_container_id: /^GTM-[A-Z0-9]{4,20}$/,
    meta_pixel_id: /^\d{5,30}$/,
    google_ads_conversion_id: /^AW-\d{5,30}$/,
    linkedin_partner_id: /^\d{3,30}$/,
    tiktok_pixel_id: /^[A-Z0-9]{5,40}$/,
  };
  if (!patterns[key]?.test(value)) throw new Error(`configuration_invalid_analytics_id:${key}`);
}
function validateJsonValue(key: string, value: unknown) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined || serialized.length > 1_000_000) throw new Error(`configuration_invalid_json:${key}`);
  if (SAFE_TEXT_REJECT_RE.test(serialized)) throw new Error(`configuration_unsafe_content:${key}`);
}
function validateDefinitionValue(definition: ConfigurationDefinition, value: unknown): unknown {
  if (value === null) {
    if (definition.nullable) return null;
    throw new Error(`configuration_null_not_allowed:${definition.key}`);
  }
  switch (definition.valueKind) {
    case "string":
    case "email":
    case "phone":
    case "url":
    case "color":
    case "font":
    case "analytics_id":
    case "enum": {
      if (typeof value !== "string") throw new Error(`configuration_string_required:${definition.key}`);
      if (definition.maxLength && value.length > definition.maxLength) throw new Error(`configuration_too_long:${definition.key}`);
      if (SAFE_TEXT_REJECT_RE.test(value)) throw new Error(`configuration_unsafe_content:${definition.key}`);
      if (definition.valueKind === "email" && value !== "" && !EMAIL_RE.test(value)) throw new Error(`configuration_invalid_email:${definition.key}`);
      if (definition.valueKind === "phone" && value !== "" && !PHONE_RE.test(value)) throw new Error(`configuration_invalid_phone:${definition.key}`);
      if (definition.valueKind === "url") validateUrl(definition.key, value);
      if (definition.valueKind === "color" && !COLOR_RE.test(value)) throw new Error(`configuration_invalid_color:${definition.key}`);
      if ((definition.valueKind === "font" || definition.valueKind === "enum") && !definition.options?.includes(value)) throw new Error(`configuration_invalid_option:${definition.key}`);
      if (definition.valueKind === "analytics_id") validateAnalyticsId(definition.key, value);
      return value;
    }
    case "boolean":
      if (typeof value !== "boolean") throw new Error(`configuration_boolean_required:${definition.key}`);
      return value;
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`configuration_integer_required:${definition.key}`);
      if (definition.key === "founded_year" && (value < 1800 || value > 2200)) throw new Error("configuration_invalid_founded_year");
      if (definition.key === "items_per_page" && (value < 1 || value > 100)) throw new Error("configuration_invalid_items_per_page");
      return value;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`configuration_number_required:${definition.key}`);
      if (definition.key === "latitude" && (value < -90 || value > 90)) throw new Error("configuration_invalid_latitude");
      if (definition.key === "longitude" && (value < -180 || value > 180)) throw new Error("configuration_invalid_longitude");
      return value;
    case "string_list":
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length > 200 || SAFE_TEXT_REJECT_RE.test(item))) throw new Error(`configuration_string_list_required:${definition.key}`);
      return [...new Set(value)];
    case "json":
      validateJsonValue(definition.key, value);
      return structuredClone(value);
    case "media_id":
      if (value === "") return null;
      if (typeof value !== "string" || !UUID_RE.test(value)) throw new Error(`configuration_invalid_media_id:${definition.key}`);
      return value;
  }
}

export function getConfigurationDefinition(key: string): ConfigurationDefinition {
  const definition = DEFINITION_BY_KEY.get(key);
  if (!definition) throw new Error(`configuration_key_not_cataloged:${key}`);
  return definition;
}
export function getConfigurationDefaults(): ConfigurationSnapshot {
  return Object.fromEntries(CONFIGURATION_REGISTRY.map((definition) => [definition.key, structuredClone(definition.defaultValue)])) as ConfigurationSnapshot;
}
export function normalizeConfigurationSnapshot(input: unknown): ConfigurationSnapshot {
  if (!isRecord(input)) throw new Error("configuration_snapshot_must_be_object");
  const normalized = getConfigurationDefaults();
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY_RE.test(key)) throw new Error(`configuration_secret_key_prohibited:${key}`);
    const definition = getConfigurationDefinition(key);
    normalized[key as ConfigurationKey] = validateDefinitionValue(definition, value);
  }
  return normalized;
}
export function validateConfigurationSnapshot(input: unknown): { valid: true; snapshot: ConfigurationSnapshot } | { valid: false; errors: string[] } {
  try { return { valid: true, snapshot: normalizeConfigurationSnapshot(input) }; }
  catch (error) { return { valid: false, errors: [error instanceof Error ? error.message : "configuration_invalid"] }; }
}
export function publicConfigurationSnapshot(input: unknown): Partial<ConfigurationSnapshot> {
  const snapshot = normalizeConfigurationSnapshot(input);
  return Object.fromEntries(CONFIGURATION_REGISTRY.filter((definition) => definition.publicExposure).map((definition) => [definition.key, snapshot[definition.key as ConfigurationKey]])) as Partial<ConfigurationSnapshot>;
}
export function configurationDefinitionsForDomain(domain: ConfigurationDomain) {
  return CONFIGURATION_REGISTRY.filter((definition) => definition.domain === domain);
}
export function configurationDomainSnapshot(input: unknown, domain: ConfigurationDomain): Record<string, unknown> {
  const snapshot = normalizeConfigurationSnapshot(input);
  return Object.fromEntries(configurationDefinitionsForDomain(domain).map((definition) => [definition.key, snapshot[definition.key as ConfigurationKey]]));
}
export function mergeConfigurationDomain(
  input: unknown,
  domain: ConfigurationDomain,
  patch: Record<string, unknown>,
): ConfigurationSnapshot {
  const current = normalizeConfigurationSnapshot(input);
  const definitions = new Map(configurationDefinitionsForDomain(domain).map((definition) => [definition.key, definition]));
  for (const [key, value] of Object.entries(patch)) {
    const definition = definitions.get(key);
    if (!definition) throw new Error(`configuration_domain_key_mismatch:${domain}:${key}`);
    if (definition.editAuthority === "system" && stable(value) !== stable(current[key as ConfigurationKey])) {
      throw new Error(`configuration_system_key_immutable:${key}`);
    }
  }
  return normalizeConfigurationSnapshot({ ...current, ...patch });
}
export const CONFIGURATION_MEDIA_KEYS = CONFIGURATION_REGISTRY.filter((definition) => definition.valueKind === "media_id").map((definition) => definition.key) as ConfigurationKey[];
export const CONFIGURATION_KEY_NAMES = CONFIGURATION_REGISTRY.map((definition) => definition.key) as ConfigurationKey[];
