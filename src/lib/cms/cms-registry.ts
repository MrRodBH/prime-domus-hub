import { z } from "zod";

/**
 * PR-M2 — closed build-time CMS extensibility registry.
 *
 * Tenant data may select catalogued keys and provide values that satisfy the
 * corresponding schemas. It can never provide executable code, component
 * names, schemas, defaults, validators or runtime imports.
 */

export const CMS_SCHEMA_VERSION = 1 as const;

export const PAGE_TYPE_KEYS = ["standard", "landing", "institutional"] as const;
export const SECTION_TYPE_KEYS = [
  "hero",
  "richtext",
  "image",
  "gallery",
  "video",
  "cta",
  "form",
  "features",
  "faq",
  "spacer",
] as const;
export const LAYOUT_TYPE_KEYS = ["single_column", "sidebar_right", "full_width"] as const;
export const TEMPLATE_KEYS = ["blank", "lead_capture", "institutional"] as const;
export const CONTENT_TYPE_KEYS = ["page", "form", "campaign"] as const;
export const EDITOR_CONTROL_KEYS = [
  "text",
  "textarea",
  "sanitized_richtext",
  "media_reference",
  "navigation_reference",
  "form_reference",
  "select",
  "repeatable_group",
  "number",
  "boolean",
] as const;

export type PageTypeKey = (typeof PAGE_TYPE_KEYS)[number];
export type SectionTypeKey = (typeof SECTION_TYPE_KEYS)[number];
export type LayoutTypeKey = (typeof LAYOUT_TYPE_KEYS)[number];
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export type ContentTypeKey = (typeof CONTENT_TYPE_KEYS)[number];
export type EditorControlKey = (typeof EDITOR_CONTROL_KEYS)[number];

const uuid = z.string().uuid();
const safeText = z.string().max(20_000);
const shortText = z.string().max(500);
const navigationReferenceSchema = z
  .string()
  .min(1)
  .max(2_000)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("#") ||
      value.startsWith("mailto:") ||
      value.startsWith("tel:") ||
      value.startsWith("https://"),
    "cms_unsafe_navigation_reference",
  );
const embedUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "cms_embed_requires_https");

function assertNoExecutableContent(value: unknown, path = "root"): void {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const prohibited = [
      "<script",
      "javascript:",
      "data:text/html",
      "onerror=",
      "onload=",
      "onclick=",
      "eval(",
      "new function",
      "dynamic import",
    ];
    if (prohibited.some((token) => normalized.includes(token))) {
      throw new Error(`cms_runtime_code_prohibited:${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoExecutableContent(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase();
      if (["component", "componentname", "javascript", "typescript", "css", "code", "script"].includes(normalizedKey)) {
        throw new Error(`cms_runtime_extension_key_prohibited:${path}.${key}`);
      }
      assertNoExecutableContent(entry, `${path}.${key}`);
    }
  }
}

const sanitizedHtmlSchema = z
  .string()
  .max(100_000)
  .superRefine((html, context) => {
    try {
      assertNoExecutableContent(html, "richtext.html");
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : "cms_unsafe_richtext",
      });
    }
  });

const heroDataSchema = z
  .object({
    eyebrow: shortText.optional(),
    titulo: z.string().min(1).max(300),
    subtitulo: safeText.optional(),
    media_id: uuid.optional(),
    cta_label: shortText.optional(),
    cta_href: navigationReferenceSchema.optional(),
    altura: z.enum(["sm", "md", "lg"]).optional(),
  })
  .strict();

const richtextDataSchema = z
  .object({
    format: z.literal("sanitized_html_v1").default("sanitized_html_v1"),
    html: sanitizedHtmlSchema,
    align: z.enum(["left", "center"]).optional(),
  })
  .strict();

const imageDataSchema = z
  .object({
    media_id: uuid,
    alt: shortText.optional(),
    legenda: shortText.optional(),
    variant: z.enum(["original", "medium", "thumbnail"]).default("medium"),
  })
  .strict();

const galleryDataSchema = z
  .object({
    imagens: z
      .array(
        z
          .object({
            media_id: uuid,
            alt: shortText.optional(),
            variant: z.enum(["original", "medium", "thumbnail"]).default("medium"),
          })
          .strict(),
      )
      .max(50),
    colunas: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  })
  .strict();

const videoDataSchema = z
  .object({
    embed_url: embedUrlSchema,
    titulo: shortText.optional(),
  })
  .strict();

const ctaDataSchema = z
  .object({
    titulo: z.string().min(1).max(300),
    descricao: safeText.optional(),
    botao_label: z.string().min(1).max(150),
    botao_href: navigationReferenceSchema,
    variante: z.enum(["default", "outline"]).optional(),
  })
  .strict();

const formDataSchema = z
  .object({
    form_id: uuid,
    titulo: shortText.optional(),
  })
  .strict();

const featuresDataSchema = z
  .object({
    titulo: shortText.optional(),
    itens: z
      .array(
        z
          .object({
            titulo: z.string().min(1).max(300),
            descricao: safeText.optional(),
            icone: z.string().max(100).optional(),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();

const faqDataSchema = z
  .object({
    titulo: shortText.optional(),
    itens: z
      .array(
        z
          .object({
            pergunta: z.string().min(1).max(500),
            resposta: sanitizedHtmlSchema,
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

const spacerDataSchema = z
  .object({ altura: z.enum(["sm", "md", "lg", "xl"]) })
  .strict();

export const SECTION_VALUE_SCHEMAS = {
  hero: heroDataSchema,
  richtext: richtextDataSchema,
  image: imageDataSchema,
  gallery: galleryDataSchema,
  video: videoDataSchema,
  cta: ctaDataSchema,
  form: formDataSchema,
  features: featuresDataSchema,
  faq: faqDataSchema,
  spacer: spacerDataSchema,
} satisfies Record<SectionTypeKey, z.ZodTypeAny>;

export type PageTypeDefinition = {
  readonly key: PageTypeKey;
  readonly label: string;
  readonly description: string;
  readonly schemaVersion: number;
  readonly allowedLayouts: readonly LayoutTypeKey[];
  readonly allowedSections: readonly SectionTypeKey[];
  readonly requiredSections: readonly SectionTypeKey[];
  readonly seoContract: "standard";
  readonly publicationContract: "atomic_snapshot";
  readonly publicRenderContract: "host_derived_published_only";
  readonly permissionsModule: "cms.paginas";
  readonly diagnostics: readonly string[];
};

export type SectionTypeDefinition = {
  readonly key: SectionTypeKey;
  readonly label: string;
  readonly description: string;
  readonly schemaVersion: number;
  readonly allowedPageTypes: readonly PageTypeKey[];
  readonly allowedLayoutRegions: readonly string[];
  readonly minInstances: number;
  readonly maxInstances: number;
  readonly mediaContract: "none" | "media_library_id";
  readonly publicExposure: "published_only";
  readonly previewBehavior: "draft_snapshot";
  readonly publishBehavior: "validated_snapshot";
  readonly editorControl: EditorControlKey;
  readonly validationMessages: readonly string[];
};

export type LayoutTypeDefinition = {
  readonly key: LayoutTypeKey;
  readonly label: string;
  readonly regions: readonly {
    readonly key: string;
    readonly minSections: number;
    readonly maxSections: number;
  }[];
  readonly allowedPageTypes: readonly PageTypeKey[];
  readonly responsiveContract: "stack_regions_on_small_viewports";
  readonly previewContract: "registry_renderer";
  readonly publicRenderContract: "registry_renderer";
};

export type TemplateDefinition = {
  readonly key: TemplateKey;
  readonly pageType: PageTypeKey;
  readonly layoutType: LayoutTypeKey;
  readonly schemaVersion: number;
  readonly initialSections: readonly SectionTypeKey[];
  readonly immutableSystemTemplate: true;
  readonly tenantCustomizableFields: readonly string[];
  readonly previewContract: "draft_snapshot";
};

export type EditorControlDefinition = {
  readonly key: EditorControlKey;
  readonly valueKind: string;
  readonly serializationContract: "json";
  readonly validationContract: "zod_build_time";
  readonly allowedSectionTypes: readonly SectionTypeKey[];
  readonly publicSanitization: "required" | "not_applicable";
};

const ALL_PAGE_TYPES: readonly PageTypeKey[] = [...PAGE_TYPE_KEYS];
const ALL_SECTIONS: readonly SectionTypeKey[] = [...SECTION_TYPE_KEYS];

export const PAGE_TYPE_REGISTRY: Record<PageTypeKey, PageTypeDefinition> = {
  standard: {
    key: "standard",
    label: "Página padrão",
    description: "Página editorial de propósito geral.",
    schemaVersion: CMS_SCHEMA_VERSION,
    allowedLayouts: ["single_column", "sidebar_right", "full_width"],
    allowedSections: ALL_SECTIONS,
    requiredSections: [],
    seoContract: "standard",
    publicationContract: "atomic_snapshot",
    publicRenderContract: "host_derived_published_only",
    permissionsModule: "cms.paginas",
    diagnostics: ["schema", "references", "layout", "publication"],
  },
  landing: {
    key: "landing",
    label: "Landing page",
    description: "Página de campanha com CTA e captura de lead.",
    schemaVersion: CMS_SCHEMA_VERSION,
    allowedLayouts: ["single_column", "full_width"],
    allowedSections: ALL_SECTIONS,
    requiredSections: ["hero", "cta"],
    seoContract: "standard",
    publicationContract: "atomic_snapshot",
    publicRenderContract: "host_derived_published_only",
    permissionsModule: "cms.paginas",
    diagnostics: ["schema", "references", "conversion", "publication"],
  },
  institutional: {
    key: "institutional",
    label: "Institucional",
    description: "Página institucional com conteúdo editorial controlado.",
    schemaVersion: CMS_SCHEMA_VERSION,
    allowedLayouts: ["single_column", "sidebar_right", "full_width"],
    allowedSections: ["hero", "richtext", "image", "gallery", "video", "cta", "features", "faq", "spacer"],
    requiredSections: ["richtext"],
    seoContract: "standard",
    publicationContract: "atomic_snapshot",
    publicRenderContract: "host_derived_published_only",
    permissionsModule: "cms.paginas",
    diagnostics: ["schema", "references", "publication"],
  },
};

export const LAYOUT_TYPE_REGISTRY: Record<LayoutTypeKey, LayoutTypeDefinition> = {
  single_column: {
    key: "single_column",
    label: "Uma coluna",
    regions: [{ key: "main", minSections: 0, maxSections: 100 }],
    allowedPageTypes: ALL_PAGE_TYPES,
    responsiveContract: "stack_regions_on_small_viewports",
    previewContract: "registry_renderer",
    publicRenderContract: "registry_renderer",
  },
  sidebar_right: {
    key: "sidebar_right",
    label: "Conteúdo com lateral",
    regions: [
      { key: "main", minSections: 0, maxSections: 80 },
      { key: "sidebar", minSections: 0, maxSections: 20 },
    ],
    allowedPageTypes: ["standard", "institutional"],
    responsiveContract: "stack_regions_on_small_viewports",
    previewContract: "registry_renderer",
    publicRenderContract: "registry_renderer",
  },
  full_width: {
    key: "full_width",
    label: "Largura total",
    regions: [{ key: "main", minSections: 0, maxSections: 100 }],
    allowedPageTypes: ALL_PAGE_TYPES,
    responsiveContract: "stack_regions_on_small_viewports",
    previewContract: "registry_renderer",
    publicRenderContract: "registry_renderer",
  },
};

const sectionDefinition = (
  key: SectionTypeKey,
  editorControl: EditorControlKey,
  options: Partial<Pick<SectionTypeDefinition, "allowedPageTypes" | "allowedLayoutRegions" | "minInstances" | "maxInstances" | "mediaContract">> = {},
): SectionTypeDefinition => ({
  key,
  label: key,
  description: `Seção CMS catalogada: ${key}`,
  schemaVersion: CMS_SCHEMA_VERSION,
  allowedPageTypes: options.allowedPageTypes ?? ALL_PAGE_TYPES,
  allowedLayoutRegions: options.allowedLayoutRegions ?? ["main", "sidebar"],
  minInstances: options.minInstances ?? 0,
  maxInstances: options.maxInstances ?? 20,
  mediaContract: options.mediaContract ?? "none",
  publicExposure: "published_only",
  previewBehavior: "draft_snapshot",
  publishBehavior: "validated_snapshot",
  editorControl,
  validationMessages: [`cms_${key}_invalid`],
});

export const SECTION_TYPE_REGISTRY: Record<SectionTypeKey, SectionTypeDefinition> = {
  hero: sectionDefinition("hero", "repeatable_group", { maxInstances: 1, allowedLayoutRegions: ["main"], mediaContract: "media_library_id" }),
  richtext: sectionDefinition("richtext", "sanitized_richtext"),
  image: sectionDefinition("image", "media_reference", { mediaContract: "media_library_id" }),
  gallery: sectionDefinition("gallery", "media_reference", { mediaContract: "media_library_id" }),
  video: sectionDefinition("video", "navigation_reference"),
  cta: sectionDefinition("cta", "navigation_reference"),
  form: sectionDefinition("form", "form_reference", { maxInstances: 5 }),
  features: sectionDefinition("features", "repeatable_group"),
  faq: sectionDefinition("faq", "repeatable_group"),
  spacer: sectionDefinition("spacer", "select"),
};

export const TEMPLATE_REGISTRY: Record<TemplateKey, TemplateDefinition> = {
  blank: {
    key: "blank",
    pageType: "standard",
    layoutType: "single_column",
    schemaVersion: CMS_SCHEMA_VERSION,
    initialSections: [],
    immutableSystemTemplate: true,
    tenantCustomizableFields: ["title", "slug", "seo", "sections"],
    previewContract: "draft_snapshot",
  },
  lead_capture: {
    key: "lead_capture",
    pageType: "landing",
    layoutType: "full_width",
    schemaVersion: CMS_SCHEMA_VERSION,
    initialSections: ["hero", "features", "form", "cta"],
    immutableSystemTemplate: true,
    tenantCustomizableFields: ["title", "slug", "seo", "sections"],
    previewContract: "draft_snapshot",
  },
  institutional: {
    key: "institutional",
    pageType: "institutional",
    layoutType: "single_column",
    schemaVersion: CMS_SCHEMA_VERSION,
    initialSections: ["hero", "richtext", "cta"],
    immutableSystemTemplate: true,
    tenantCustomizableFields: ["title", "slug", "seo", "sections"],
    previewContract: "draft_snapshot",
  },
};

export const CONTENT_TYPE_REGISTRY: Record<ContentTypeKey, { key: ContentTypeKey; schemaVersion: number; workflow: readonly string[] }> = {
  page: { key: "page", schemaVersion: CMS_SCHEMA_VERSION, workflow: ["draft", "published", "unpublished", "archived"] },
  form: { key: "form", schemaVersion: CMS_SCHEMA_VERSION, workflow: ["draft", "published", "archived"] },
  campaign: { key: "campaign", schemaVersion: CMS_SCHEMA_VERSION, workflow: ["draft", "active", "paused", "archived"] },
};

const editorControlDefinition = (
  key: EditorControlKey,
  publicSanitization: EditorControlDefinition["publicSanitization"] = "not_applicable",
): EditorControlDefinition => ({
  key,
  valueKind: key,
  serializationContract: "json",
  validationContract: "zod_build_time",
  allowedSectionTypes: ALL_SECTIONS,
  publicSanitization,
});

/**
 * Explicit object literal is intentional: `satisfies` proves every catalogued
 * key is present and rejects missing, misspelled or incompatible definitions.
 */
export const EDITOR_CONTROL_REGISTRY = {
  text: editorControlDefinition("text"),
  textarea: editorControlDefinition("textarea"),
  sanitized_richtext: editorControlDefinition("sanitized_richtext", "required"),
  media_reference: editorControlDefinition("media_reference"),
  navigation_reference: editorControlDefinition("navigation_reference", "required"),
  form_reference: editorControlDefinition("form_reference"),
  select: editorControlDefinition("select"),
  repeatable_group: editorControlDefinition("repeatable_group"),
  number: editorControlDefinition("number"),
  boolean: editorControlDefinition("boolean"),
} satisfies Record<EditorControlKey, EditorControlDefinition>;

const sectionEnvelopeSchema = z
  .object({
    id: uuid,
    type: z.enum(SECTION_TYPE_KEYS),
    region: z.string().min(1).max(80),
    data: z.unknown(),
  })
  .strict();

const seoSchema = z
  .object({
    meta_title: z.string().max(300).optional(),
    meta_description: z.string().max(1_000).optional(),
    og_media_id: uuid.optional(),
    canonical: navigationReferenceSchema.optional(),
    noindex: z.boolean().optional(),
  })
  .strict();

export const pageSnapshotInputSchema = z
  .object({
    page_id: uuid.optional(),
    page_type: z.enum(PAGE_TYPE_KEYS),
    schema_version: z.literal(CMS_SCHEMA_VERSION),
    slug: z.string().min(1).max(180).regex(/^[a-z0-9-]+$/),
    title: z.string().min(1).max(300),
    description: z.string().max(5_000).nullable().optional(),
    status: z.literal("draft").default("draft"),
    seo: seoSchema.default({}),
    layout: z
      .object({
        type: z.enum(LAYOUT_TYPE_KEYS),
        sections: z.array(sectionEnvelopeSchema).max(100),
      })
      .strict(),
    navigation_references: z.array(navigationReferenceSchema).max(100).default([]),
    form_references: z.array(uuid).max(50).default([]),
    campaign_references: z.array(uuid).max(50).default([]),
    media_references: z.array(uuid).max(200).default([]),
    configuration_references: z.array(z.string().min(1).max(120)).max(100).default([]),
  })
  .strict();

export type CmsPageSnapshot = z.infer<typeof pageSnapshotInputSchema>;

export type CmsValidationIssue = {
  readonly code: string;
  readonly path: string;
  readonly message: string;
};

export type CmsValidationResult<T> =
  | { readonly valid: true; readonly value: T; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: readonly CmsValidationIssue[] };

function issue(code: string, path: string, message: string): CmsValidationIssue {
  return { code, path, message };
}

function collectSectionMedia(section: z.infer<typeof sectionEnvelopeSchema>): string[] {
  const data = section.data as Record<string, unknown>;
  switch (section.type) {
    case "hero":
    case "image":
      return typeof data.media_id === "string" ? [data.media_id] : [];
    case "gallery":
      return Array.isArray(data.imagens)
        ? data.imagens.flatMap((entry) =>
            entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).media_id === "string"
              ? [(entry as Record<string, unknown>).media_id as string]
              : [],
          )
        : [];
    default:
      return [];
  }
}

export function validateCmsPageSnapshot(input: unknown): CmsValidationResult<CmsPageSnapshot> {
  const parsed = pageSnapshotInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((entry) =>
        issue("cms_snapshot_schema_invalid", entry.path.join("."), entry.message),
      ),
    };
  }

  const value = parsed.data;
  const issues: CmsValidationIssue[] = [];
  const pageType = PAGE_TYPE_REGISTRY[value.page_type];
  const layout = LAYOUT_TYPE_REGISTRY[value.layout.type];

  if (!pageType.allowedLayouts.includes(value.layout.type)) {
    issues.push(issue("cms_layout_not_allowed", "layout.type", "Layout não permitido para o tipo de página."));
  }
  if (!layout.allowedPageTypes.includes(value.page_type)) {
    issues.push(issue("cms_layout_page_type_mismatch", "layout.type", "Layout incompatível com o tipo de página."));
  }

  const regionDefinitions = new Map(layout.regions.map((region) => [region.key, region]));
  const regionCounts = new Map<string, number>();
  const sectionCounts = new Map<SectionTypeKey, number>();
  const sectionIds = new Set<string>();
  const collectedMedia = new Set<string>();
  const collectedForms = new Set<string>();

  value.layout.sections.forEach((section, index) => {
    const definition = SECTION_TYPE_REGISTRY[section.type];
    const path = `layout.sections.${index}`;
    if (sectionIds.has(section.id)) {
      issues.push(issue("cms_duplicate_section_id", `${path}.id`, "Section id duplicado."));
    }
    sectionIds.add(section.id);

    const region = regionDefinitions.get(section.region);
    if (!region || !definition.allowedLayoutRegions.includes(section.region)) {
      issues.push(issue("cms_section_region_invalid", `${path}.region`, "Região desconhecida ou incompatível."));
    }
    if (!pageType.allowedSections.includes(section.type)) {
      issues.push(issue("cms_section_page_type_mismatch", `${path}.type`, "Seção incompatível com o tipo de página."));
    }

    const parsedData = SECTION_VALUE_SCHEMAS[section.type].safeParse(section.data);
    if (!parsedData.success) {
      for (const entry of parsedData.error.issues) {
        issues.push(issue(`cms_${section.type}_invalid`, `${path}.data.${entry.path.join(".")}`, entry.message));
      }
    }

    regionCounts.set(section.region, (regionCounts.get(section.region) ?? 0) + 1);
    sectionCounts.set(section.type, (sectionCounts.get(section.type) ?? 0) + 1);
    collectSectionMedia(section).forEach((id) => collectedMedia.add(id));
    if (section.type === "form" && parsedData.success) {
      collectedForms.add((parsedData.data as z.infer<typeof formDataSchema>).form_id);
    }
  });

  for (const region of layout.regions) {
    const count = regionCounts.get(region.key) ?? 0;
    if (count < region.minSections || count > region.maxSections) {
      issues.push(issue("cms_layout_region_cardinality", `layout.regions.${region.key}`, "Cardinalidade da região inválida."));
    }
  }

  for (const definition of Object.values(SECTION_TYPE_REGISTRY)) {
    const count = sectionCounts.get(definition.key) ?? 0;
    if (count < definition.minInstances || count > definition.maxInstances) {
      issues.push(issue("cms_section_cardinality", `sections.${definition.key}`, "Cardinalidade da seção inválida."));
    }
  }

  for (const required of pageType.requiredSections) {
    if ((sectionCounts.get(required) ?? 0) === 0) {
      issues.push(issue("cms_required_section_missing", `sections.${required}`, "Seção obrigatória ausente."));
    }
  }

  if (value.seo.og_media_id) collectedMedia.add(value.seo.og_media_id);
  const declaredMedia = new Set(value.media_references);
  if (
    collectedMedia.size !== declaredMedia.size ||
    [...collectedMedia].some((id) => !declaredMedia.has(id))
  ) {
    issues.push(issue("cms_media_reference_set_mismatch", "media_references", "Referências de mídia não correspondem ao snapshot."));
  }

  const declaredForms = new Set(value.form_references);
  if ([...collectedForms].some((id) => !declaredForms.has(id))) {
    issues.push(issue("cms_form_reference_set_mismatch", "form_references", "Referência de formulário ausente do catálogo do snapshot."));
  }

  try {
    assertNoExecutableContent(value);
  } catch (error) {
    issues.push(issue("cms_runtime_code_prohibited", "snapshot", error instanceof Error ? error.message : "Conteúdo executável proibido."));
  }

  return issues.length === 0 ? { valid: true, value, issues: [] } : { valid: false, issues };
}

const formFieldSchema = z
  .object({
    id: uuid.optional(),
    ordem: z.number().int().min(0).max(500),
    tipo: z.enum(["text", "textarea", "email", "phone", "number", "date", "select", "radio", "checkbox", "file", "hidden"]),
    nome: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/),
    label: z.string().min(1).max(200),
    placeholder: z.string().max(200).nullable().optional(),
    ajuda: z.string().max(500).nullable().optional(),
    obrigatorio: z.boolean(),
    consentimento: z.boolean().default(false),
    opcoes: z.array(z.object({ label: shortText, value: shortText }).strict()).max(100).default([]),
    validacao: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
        minLength: z.number().int().optional(),
        maxLength: z.number().int().optional(),
        regex: z.string().max(500).optional(),
        mascara: z.string().max(100).optional(),
      })
      .strict()
      .default({}),
    valor_padrao: z.string().max(5_000).nullable().optional(),
    largura: z.enum(["full", "half", "third"]).default("full"),
  })
  .strict();

export const formSnapshotSchema = z
  .object({
    form_id: uuid.optional(),
    schema_version: z.literal(CMS_SCHEMA_VERSION),
    nome: z.string().min(1).max(200),
    slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
    status: z.literal("draft").default("draft"),
    descricao: z.string().max(5_000).nullable().optional(),
    config: z
      .object({
        success_message: z.string().max(2_000).optional(),
        redirect_url: navigationReferenceSchema.optional(),
        submit_button_label: z.string().max(150).optional(),
        criar_lead: z.boolean().default(true),
        lead_origem_slug: z.string().max(120).optional(),
        consent_required: z.boolean().default(false),
      })
      .strict(),
    fields: z.array(formFieldSchema).max(200),
  })
  .strict();

export type CmsFormSnapshot = z.infer<typeof formSnapshotSchema>;

export const campaignSnapshotSchema = z
  .object({
    campaign_id: uuid.optional(),
    schema_version: z.literal(CMS_SCHEMA_VERSION),
    nome: z.string().min(1).max(200),
    tipo: z.enum(["banner_top", "banner_bottom", "popup_center", "modal", "floating"]),
    status: z.literal("draft").default("draft"),
    prioridade: z.number().int().min(-10_000).max(10_000).default(0),
    conteudo: z
      .object({
        titulo: z.string().max(300).optional(),
        mensagem: sanitizedHtmlSchema.optional(),
        media_id: uuid.optional(),
        cta_label: z.string().max(150).optional(),
        cta_url: navigationReferenceSchema.optional(),
        cor_fundo: z.string().max(30).optional(),
        cor_texto: z.string().max(30).optional(),
        dismissible: z.boolean().optional(),
      })
      .strict(),
    segmentacao: z
      .object({
        rotas_incluir: z.array(navigationReferenceSchema).max(100).default([]),
        rotas_excluir: z.array(navigationReferenceSchema).max(100).default([]),
        dispositivo: z.enum(["all", "desktop", "mobile"]).default("all"),
      })
      .strict(),
    frequencia: z
      .object({
        max_por_sessao: z.number().int().min(0).max(100).default(1),
        cooldown_horas: z.number().int().min(0).max(8_760).default(24),
      })
      .strict(),
    start_at: z.string().datetime().nullable().optional(),
    end_at: z.string().datetime().nullable().optional(),
    target_page_ids: z.array(uuid).max(100).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.start_at && value.end_at && value.end_at <= value.start_at) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["end_at"], message: "cms_campaign_schedule_invalid" });
    }
    try {
      assertNoExecutableContent(value);
    } catch (error) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : "cms_runtime_code_prohibited" });
    }
  });

export type CmsCampaignSnapshot = z.infer<typeof campaignSnapshotSchema>;

export function getCmsRegistrySnapshot() {
  return {
    schemaVersion: CMS_SCHEMA_VERSION,
    pageTypes: PAGE_TYPE_REGISTRY,
    sectionTypes: SECTION_TYPE_REGISTRY,
    layoutTypes: LAYOUT_TYPE_REGISTRY,
    templates: TEMPLATE_REGISTRY,
    contentTypes: CONTENT_TYPE_REGISTRY,
    editorControls: EDITOR_CONTROL_REGISTRY,
    extensionContracts: {
      NEW_PAGE_TYPE: ["registry", "schema", "validation", "preview", "publication", "public_renderer", "tests", "compatibility", "diagnostics", "cardinality"],
      NEW_SECTION_TYPE: ["registry", "value_schema", "editor_control", "media_contract", "preview", "publication", "public_renderer", "tests", "cardinality"],
      NEW_LAYOUT: ["registry", "regions", "cardinality", "responsive_contract", "preview", "public_renderer", "tests"],
      NEW_TEMPLATE: ["registry", "page_type", "layout", "initial_sections", "versioning", "instantiation", "tests"],
      NEW_CONTENT_TYPE: ["registry", "workflow", "authority", "persistence", "preview", "publication", "tests"],
      NEW_EDITOR_CONTROL: ["registry", "serialization", "validation", "sanitization", "allowed_sections", "tests"],
      NEW_TENANT_CONFIGURATION: ["configuration_registry", "schema", "defaults", "draft", "preview", "publish", "rollback", "tests"],
    } as const,
  } as const;
}