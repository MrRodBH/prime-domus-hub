export const CMS_EXTENSION_CONTRACT_DIMENSIONS = [
  "files_and_registries",
  "schema_and_version",
  "defaults",
  "validation",
  "authorization",
  "persistence",
  "preview",
  "publication",
  "public_rendering",
  "deterministic_tests",
  "rollback",
  "compatibility",
  "diagnostics",
  "cardinality",
] as const;

export type CmsExtensionContractDimension =
  (typeof CMS_EXTENSION_CONTRACT_DIMENSIONS)[number];

export type CmsExtensionContractKey =
  | "NEW_PAGE_TYPE"
  | "NEW_SECTION_TYPE"
  | "NEW_LAYOUT"
  | "NEW_TEMPLATE"
  | "NEW_CONTENT_TYPE"
  | "NEW_EDITOR_CONTROL"
  | "NEW_TENANT_CONFIGURATION";

export type CmsExtensionContract = {
  readonly key: CmsExtensionContractKey;
  readonly files_and_registries: readonly string[];
  readonly schema_and_version: string;
  readonly defaults: string;
  readonly validation: string;
  readonly authorization: string;
  readonly persistence: string;
  readonly preview: string;
  readonly publication: string;
  readonly public_rendering: string;
  readonly deterministic_tests: readonly string[];
  readonly rollback: string;
  readonly compatibility: string;
  readonly diagnostics: readonly string[];
  readonly cardinality: string;
};

const common = {
  authorization:
    "Tenant and actor are derived by requireTenant; effective Tenant Access Control scope is server-evaluated; Super Admin requires explicit impersonation.",
  preview:
    "Preview reads a tenant-scoped draft snapshot and never changes or exposes the published pointer.",
  publication:
    "Publication validates the complete snapshot and changes the published pointer atomically through a service-role-only primitive.",
  public_rendering:
    "Public rendering is Host-derived, published-only, registry-controlled, sanitized and free of administrative metadata.",
  rollback:
    "Rollback never edits immutable history; it creates a new draft that requires explicit validation and publication.",
  compatibility:
    "Unknown schema versions or registry keys fail closed; compatibility adapters may delegate to the canonical authority but may not implement a parallel runtime.",
} as const;

export const CMS_EXTENSION_CONTRACTS: Record<
  CmsExtensionContractKey,
  CmsExtensionContract
> = {
  NEW_PAGE_TYPE: {
    key: "NEW_PAGE_TYPE",
    files_and_registries: [
      "src/lib/cms/cms-registry.ts:PAGE_TYPE_REGISTRY",
      "src/lib/cms/renderers/page-renderer registry",
      "src/lib/api/tenant-cms.functions.ts",
    ],
    schema_and_version:
      "Declare a stable PageTypeKey, explicit schema version, allowed layouts/sections, required sections, SEO contract and public renderer contract.",
    defaults:
      "Provide a deterministic build-time draft template; tenants cannot provide defaults or executable component names.",
    validation:
      "Validate page type, layout compatibility, required sections, references, sanitization and complete snapshot cardinality before save or publish.",
    authorization: common.authorization,
    persistence:
      "Persist only the catalogued page_type and validated snapshot in cms_page_versions; use save_tenant_page_draft and publish_tenant_page.",
    preview: common.preview,
    publication: common.publication,
    public_rendering: common.public_rendering,
    deterministic_tests: [
      "catalogued type accepted",
      "unknown type denied",
      "layout/section compatibility",
      "draft/preview/publish/rollback",
      "Host-derived public rendering",
    ],
    rollback: common.rollback,
    compatibility: common.compatibility,
    diagnostics: ["registry presence", "schema compatibility", "reference validity", "publication state"],
    cardinality:
      "Declare allowed and required sections plus per-section limits; at most one current draft and one published page version.",
  },
  NEW_SECTION_TYPE: {
    key: "NEW_SECTION_TYPE",
    files_and_registries: [
      "src/lib/cms/cms-registry.ts:SECTION_TYPE_REGISTRY",
      "src/lib/cms/cms-registry.ts:SECTION_VALUE_SCHEMAS",
      "src/components/content/blocks/BlockEditor.tsx",
      "public section renderer registry",
    ],
    schema_and_version:
      "Declare a stable SectionTypeKey, versioned strict value schema, allowed page types/regions, media contract and editor control.",
    defaults:
      "Provide deterministic schema-valid section data without tenant-supplied code, HTML handlers, raw storage paths or arbitrary URLs.",
    validation:
      "Validate strict data shape, region compatibility, instance limits, media/form references and rich-text sanitization.",
    authorization: common.authorization,
    persistence:
      "Persist section data only inside a validated immutable page snapshot; institutional media is stored by media_library.id.",
    preview: common.preview,
    publication: common.publication,
    public_rendering: common.public_rendering,
    deterministic_tests: [
      "catalogued section accepted",
      "unknown section denied",
      "schema invalid denied",
      "unsafe content denied",
      "region and instance cardinality",
    ],
    rollback: common.rollback,
    compatibility: common.compatibility,
    diagnostics: ["schema issue paths", "region mismatch", "media/reference mismatch", "renderer availability"],
    cardinality:
      "Declare minInstances, maxInstances and allowed regions; duplicate section ids and excess instances fail closed.",
  },
  NEW_LAYOUT: {
    key: "NEW_LAYOUT",
    files_and_registries: [
      "src/lib/cms/cms-registry.ts:LAYOUT_TYPE_REGISTRY",
      "preview layout renderer registry",
      "public layout renderer registry",
    ],
    schema_and_version:
      "Declare a stable LayoutTypeKey with explicit regions, region cardinality, allowed page types and responsive contract.",
    defaults:
      "Provide deterministic region ordering and no tenant-defined component or dynamic import.",
    validation:
      "Reject unknown regions, incompatible page types, incompatible sections and region counts outside declared bounds.",
    authorization: common.authorization,
    persistence:
      "Persist only the catalogued layout key and ordered section-region assignments in the page snapshot.",
    preview: common.preview,
    publication: common.publication,
    public_rendering: common.public_rendering,
    deterministic_tests: [
      "catalogued layout accepted",
      "unknown layout denied",
      "unknown region denied",
      "responsive contract present",
      "region cardinality",
    ],
    rollback: common.rollback,
    compatibility: common.compatibility,
    diagnostics: ["layout registry presence", "region violations", "renderer availability"],
    cardinality:
      "Every region declares minimum and maximum section counts and ordering; no implicit default region is selected.",
  },
  NEW_TEMPLATE: {
    key: "NEW_TEMPLATE",
    files_and_registries: [
      "src/lib/cms/cms-registry.ts:TEMPLATE_REGISTRY",
      "public.cms_templates",
      "public.cms_template_versions",
      "src/lib/api/tenant-cms.functions.ts",
    ],
    schema_and_version:
      "Declare a stable TemplateKey, page type, layout type, schema version and initial section snapshot.",
    defaults:
      "System templates are immutable build-time defaults; tenant customization creates a tenant-scoped version.",
    validation:
      "Validate template snapshot through the same closed page registry and tenant-scoped reference checks before version save or instantiation.",
    authorization: common.authorization,
    persistence:
      "Use cms_templates/cms_template_versions through save_tenant_template_version; instantiation creates a page draft, never a publication.",
    preview: common.preview,
    publication: common.publication,
    public_rendering:
      "Templates are not publicly rendered; only a separately validated and published page instantiated from the template is public.",
    deterministic_tests: [
      "system template immutable",
      "tenant version ownership",
      "unknown template denied",
      "instantiation creates draft",
      "published pages remain unchanged",
    ],
    rollback: common.rollback,
    compatibility: common.compatibility,
    diagnostics: ["template/version ownership", "schema compatibility", "current version pointer"],
    cardinality:
      "One tenant template per tenant_id + template_key; versions are immutable and monotonically revisioned.",
  },
  NEW_CONTENT_TYPE: {
    key: "NEW_CONTENT_TYPE",
    files_and_registries: [
      "src/lib/cms/cms-registry.ts:CONTENT_TYPE_REGISTRY",
      "dedicated tenant authority wrapper",
      "dedicated immutable version table or approved canonical ledger",
      "dedicated server functions and primitives",
    ],
    schema_and_version:
      "Declare a stable content key, complete workflow, explicit schema version, DTO and public exposure contract.",
    defaults:
      "Provide deterministic draft defaults and no client-defined states, schemas or authority fields.",
    validation:
      "Validate full snapshot, workflow transition, references, tenant ownership and optimistic revision before mutation.",
    authorization: common.authorization,
    persistence:
      "Persist through a specialized service-role-only transactional primitive with tenant/resource locks and atomic audit.",
    preview: common.preview,
    publication: common.publication,
    public_rendering: common.public_rendering,
    deterministic_tests: [
      "workflow transitions",
      "ownership and cross-tenant denial",
      "one draft/one published cardinality",
      "optimistic conflict",
      "public draft denial",
    ],
    rollback: common.rollback,
    compatibility: common.compatibility,
    diagnostics: ["workflow state", "pointer integrity", "reference integrity", "ACL/RLS state"],
    cardinality:
      "Define explicit resource, draft, published and historical version cardinality; ambiguous state aborts.",
  },
  NEW_EDITOR_CONTROL: {
    key: "NEW_EDITOR_CONTROL",
    files_and_registries: [
      "src/lib/cms/cms-registry.ts:EDITOR_CONTROL_REGISTRY",
      "src/components/content/blocks/BlockEditor.tsx",
      "control serialization/validation tests",
    ],
    schema_and_version:
      "Declare a stable EditorControlKey, value kind, serialization contract, validation contract and allowed section types.",
    defaults:
      "Provide a deterministic schema-valid default value; the client cannot provide a component name, validator or renderer.",
    validation:
      "Validate value before it enters the snapshot and apply required public sanitization; unknown controls fail closed.",
    authorization: common.authorization,
    persistence:
      "Controls do not persist independently; only validated serialized values are persisted in the parent immutable snapshot.",
    preview: common.preview,
    publication: common.publication,
    public_rendering:
      "Editor controls are never exposed publicly; public output contains only sanitized rendered values.",
    deterministic_tests: [
      "catalogued control accepted",
      "unknown control denied",
      "serialization round trip",
      "invalid value denied",
      "sanitization contract",
    ],
    rollback: common.rollback,
    compatibility: common.compatibility,
    diagnostics: ["control registry presence", "schema issue path", "serialization failure"],
    cardinality:
      "Allowed section types are explicit; repeatable controls declare parent schema array limits rather than implicit unlimited values.",
  },
  NEW_TENANT_CONFIGURATION: {
    key: "NEW_TENANT_CONFIGURATION",
    files_and_registries: [
      "src/lib/api/configuration-registry.ts",
      "src/lib/api/tenant-configuration.functions.ts",
      "public.site_settings_versions canonical configuration snapshot",
    ],
    schema_and_version:
      "Declare a stable configuration key, value schema, registry version, scope, defaults and public exposure classification.",
    defaults:
      "Defaults are build-time registry values; tenants cannot add arbitrary keys or provide secrets inline.",
    validation:
      "Validate registry membership, strict value schema, reference ownership and secret/reference policy before draft save or publication.",
    authorization: common.authorization,
    persistence:
      "Persist in the canonical tenant configuration draft/version workflow through service-role-only primitives; no per-key parallel editor.",
    preview: common.preview,
    publication: common.publication,
    public_rendering:
      "Only keys classified public are projected through Host-derived published configuration; draft and secret/reference metadata are omitted.",
    deterministic_tests: [
      "catalogued key accepted",
      "unknown key denied",
      "draft/preview/publish/rollback",
      "public projection classification",
      "secret scan",
    ],
    rollback: common.rollback,
    compatibility: common.compatibility,
    diagnostics: ["registry coverage", "schema issue path", "published snapshot integrity", "secret/reference state"],
    cardinality:
      "One canonical configuration snapshot per tenant workflow state; key definitions are unique in the build-time registry.",
  },
};

export function assertCompleteCmsExtensionContracts(): true {
  for (const [key, contract] of Object.entries(CMS_EXTENSION_CONTRACTS)) {
    if (contract.key !== key) throw new Error(`cms_extension_contract_key_mismatch:${key}`);
    for (const dimension of CMS_EXTENSION_CONTRACT_DIMENSIONS) {
      const value = contract[dimension];
      if (Array.isArray(value) ? value.length === 0 : typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`cms_extension_contract_incomplete:${key}:${dimension}`);
      }
    }
  }
  return true;
}
