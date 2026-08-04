import { z } from "zod";

export const CMS_FUNCTIONAL_SCHEMA_VERSION = 2 as const;
export const CMS_FUNCTIONAL_COMPONENT_KEYS = [
  "testimonials",
  "property_listing",
  "launch_listing",
  "team_listing",
  "contact_panel",
  "map",
  "embed",
  "tour",
  "reusable_block",
  "widget",
  "theme_tokens",
  "scheduled_publication",
  "header",
  "footer",
  "grid",
  "columns",
  "cards",
] as const;
export type CmsFunctionalComponentKey = (typeof CMS_FUNCTIONAL_COMPONENT_KEYS)[number];

const uuid = z.string().uuid();
const shortText = z.string().trim().max(500);
const safeHttpsUrl = z.string().url().refine((value) => value.startsWith("https://"), "cms_https_required");
const navigationReference = z.string().trim().max(2000).refine(
  (value) => value.startsWith("/") || value.startsWith("#") || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("https://"),
  "cms_navigation_reference_invalid",
);
const themeTokenSchema = z.object({
  primary: z.string().regex(/^#[0-9a-f]{6}$/i),
  secondary: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  surface: z.string().regex(/^#[0-9a-f]{6}$/i),
  text: z.string().regex(/^#[0-9a-f]{6}$/i),
  headingFont: z.enum(["system", "serif", "sans"]),
  bodyFont: z.enum(["system", "serif", "sans"]),
  radius: z.enum(["none", "sm", "md", "lg"]),
}).strict();

export const CMS_FUNCTIONAL_COMPONENT_SCHEMAS = {
  testimonials: z.object({ title: shortText.optional(), itemIds: z.array(uuid).min(1).max(30), columns: z.enum(["1", "2", "3"]).default("3") }).strict(),
  property_listing: z.object({ title: shortText.optional(), propertyIds: z.array(uuid).max(60).default([]), filter: z.enum(["featured", "latest", "sale", "rent", "launch"]).default("featured"), limit: z.number().int().min(1).max(60).default(12) }).strict(),
  launch_listing: z.object({ title: shortText.optional(), launchIds: z.array(uuid).max(30).default([]), limit: z.number().int().min(1).max(30).default(6) }).strict(),
  team_listing: z.object({ title: shortText.optional(), brokerIds: z.array(uuid).max(100).default([]), showContact: z.boolean().default(true) }).strict(),
  contact_panel: z.object({ title: shortText.optional(), contactKeys: z.array(z.enum(["phone", "whatsapp", "email", "address", "business_hours"])).min(1).max(5), ctaLabel: shortText.optional(), ctaHref: navigationReference.optional() }).strict(),
  map: z.object({ title: shortText.optional(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), zoom: z.number().int().min(1).max(20).default(14), markerLabel: shortText.optional() }).strict(),
  embed: z.object({ title: shortText.optional(), provider: z.enum(["youtube", "vimeo", "matterport", "kuula", "maps"]), url: safeHttpsUrl }).strict(),
  tour: z.object({ title: shortText.optional(), provider: z.enum(["matterport", "kuula", "custom_iframe"]), url: safeHttpsUrl }).strict(),
  reusable_block: z.object({ blockId: uuid, revision: z.number().int().positive() }).strict(),
  widget: z.object({ widgetKey: z.enum(["property_search", "lead_capture", "financing_cta", "whatsapp_cta", "social_links"]), configuration: z.record(z.string(), z.unknown()).default({}) }).strict(),
  theme_tokens: themeTokenSchema,
  scheduled_publication: z.object({ publishAt: z.string().datetime(), timezone: z.literal("America/Sao_Paulo"), revision: z.number().int().positive() }).strict(),
  header: z.object({ variant: z.enum(["standard", "centered", "compact"]), menuLocation: z.enum(["primary", "secondary"]), sticky: z.boolean().default(false), showSearch: z.boolean().default(true), showContactCta: z.boolean().default(true) }).strict(),
  footer: z.object({ variant: z.enum(["standard", "compact", "columns"]), columnIds: z.array(uuid).max(6).default([]), showSocial: z.boolean().default(true), showLegal: z.boolean().default(true) }).strict(),
  grid: z.object({ columns: z.number().int().min(1).max(6), gap: z.enum(["none", "sm", "md", "lg"]), childBlockIds: z.array(uuid).min(1).max(60) }).strict(),
  columns: z.object({ ratios: z.array(z.number().positive()).min(2).max(4), regions: z.array(z.object({ key: z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/), childBlockIds: z.array(uuid).max(30) }).strict()).min(2).max(4) }).strict(),
  cards: z.object({ title: shortText.optional(), cards: z.array(z.object({ title: z.string().trim().min(1).max(300), description: z.string().trim().max(2000).optional(), mediaId: uuid.optional(), href: navigationReference.optional(), label: shortText.optional() }).strict()).min(1).max(30), columns: z.enum(["1", "2", "3", "4"]).default("3") }).strict(),
} satisfies Record<CmsFunctionalComponentKey, z.ZodTypeAny>;

export type CmsFunctionalComponentDefinition = {
  readonly key: CmsFunctionalComponentKey;
  readonly schemaVersion: typeof CMS_FUNCTIONAL_SCHEMA_VERSION;
  readonly editorControls: readonly string[];
  readonly tenantReferenceValidation: readonly string[];
  readonly responsiveContract: string;
  readonly previewContract: "draft_snapshot";
  readonly publicationContract: "validated_atomic_snapshot" | "scheduled_validated_snapshot";
  readonly publicRenderingContract: "host_derived_published_only";
  readonly permissionContract: { readonly module: "cms.paginas" | "cms.configuracoes"; readonly editAction: "editar"; readonly publishAction: "publicar" };
  readonly diagnostics: readonly string[];
  readonly rollback: "immutable_version_republication";
};

const visualDefinition = (key: CmsFunctionalComponentKey, references: readonly string[] = []): CmsFunctionalComponentDefinition => ({
  key,
  schemaVersion: CMS_FUNCTIONAL_SCHEMA_VERSION,
  editorControls: ["registry_form", "strict_validation", "preview"],
  tenantReferenceValidation: references,
  responsiveContract: "stack_or_reflow_with_declared_breakpoints",
  previewContract: "draft_snapshot",
  publicationContract: key === "scheduled_publication" ? "scheduled_validated_snapshot" : "validated_atomic_snapshot",
  publicRenderingContract: "host_derived_published_only",
  permissionContract: { module: key === "theme_tokens" || key === "header" || key === "footer" ? "cms.configuracoes" : "cms.paginas", editAction: "editar", publishAction: "publicar" },
  diagnostics: ["schema_validation", "tenant_reference_validation", "responsive_contract", "publication_state"],
  rollback: "immutable_version_republication",
});

export const CMS_FUNCTIONAL_COMPONENT_REGISTRY: Record<CmsFunctionalComponentKey, CmsFunctionalComponentDefinition> = {
  testimonials: visualDefinition("testimonials", ["cms_testimonial_id"]),
  property_listing: visualDefinition("property_listing", ["imoveis.id + tenant_id"]),
  launch_listing: visualDefinition("launch_listing", ["launch_projects.id + tenant_id"]),
  team_listing: visualDefinition("team_listing", ["corretores.id + tenant_id"]),
  contact_panel: visualDefinition("contact_panel", ["published_configuration_contact_keys"]),
  map: visualDefinition("map"),
  embed: visualDefinition("embed", ["closed_provider_origin"]),
  tour: visualDefinition("tour", ["closed_provider_origin"]),
  reusable_block: visualDefinition("reusable_block", ["cms_reusable_blocks.id + tenant_id + revision"]),
  widget: visualDefinition("widget", ["closed_widget_key"]),
  theme_tokens: visualDefinition("theme_tokens", ["published_configuration_theme"]),
  scheduled_publication: visualDefinition("scheduled_publication", ["page_revision + tenant_id"]),
  header: visualDefinition("header", ["published_configuration_menu"]),
  footer: visualDefinition("footer", ["published_configuration_footer"]),
  grid: visualDefinition("grid", ["child_block_ids_same_snapshot"]),
  columns: visualDefinition("columns", ["child_block_ids_same_snapshot"]),
  cards: visualDefinition("cards", ["media_library.id + tenant_id"]),
};

export const CMS_FUNCTIONAL_EXTENSION_CONTRACT = {
  arbitraryTenantCode: false,
  tenantSpecificFork: false,
  duplicateEditorPath: false,
  parallelRuntime: false,
  clientAuthority: false,
  schemaAuthority: "build_time_registry",
  editorAuthority: "registry_driven",
  scheduledPublicationAuthority: "server_validated_revision_and_time",
  supportedComponentCount: CMS_FUNCTIONAL_COMPONENT_KEYS.length,
} as const;

export function validateCmsFunctionalComponent(key: CmsFunctionalComponentKey, value: unknown) {
  return CMS_FUNCTIONAL_COMPONENT_SCHEMAS[key].parse(value);
}
