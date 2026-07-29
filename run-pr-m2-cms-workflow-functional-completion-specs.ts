import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CMS_SCHEMA_VERSION,
  CONTENT_TYPE_REGISTRY,
  EDITOR_CONTROL_KEYS,
  EDITOR_CONTROL_REGISTRY,
  LAYOUT_TYPE_KEYS,
  LAYOUT_TYPE_REGISTRY,
  PAGE_TYPE_KEYS,
  PAGE_TYPE_REGISTRY,
  SECTION_TYPE_KEYS,
  SECTION_TYPE_REGISTRY,
  TEMPLATE_KEYS,
  TEMPLATE_REGISTRY,
  campaignSnapshotSchema,
  formSnapshotSchema,
  validateCmsPageSnapshot,
} from "./src/lib/cms/cms-registry";
import {
  CMS_EXTENSION_CONTRACT_DIMENSIONS,
  CMS_EXTENSION_CONTRACTS,
  assertCompleteCmsExtensionContracts,
} from "./src/lib/cms/cms-extension-contracts";

let assertions = 0;
function ok(value: unknown, message: string): void {
  assert.ok(value, message);
  assertions += 1;
}
function equal(actual: unknown, expected: unknown, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function has(source: string, token: string, message = token): void {
  ok(source.includes(token), `missing ${message}`);
}
function lacks(source: string, token: string, message = token): void {
  ok(!source.includes(token), `prohibited ${message}`);
}

const files = {
  migration: readFileSync("supabase/migrations/20260729183000_pr_m2_cms_workflow_functional_completion.sql", "utf8"),
  registry: readFileSync("src/lib/cms/cms-registry.ts", "utf8"),
  extensionContracts: readFileSync("src/lib/cms/cms-extension-contracts.ts", "utf8"),
  authority: readFileSync("src/lib/api/tenant-cms-authority.server.ts", "utf8"),
  functions: readFileSync("src/lib/api/tenant-cms.functions.ts", "utf8"),
  pageAdapter: readFileSync("src/components/content/adapters/usePageAdapter.ts", "utf8"),
  formAdapter: readFileSync("src/components/content/adapters/useFormAdapter.ts", "utf8"),
  campaignAdapter: readFileSync("src/components/content/adapters/useCampaignAdapter.ts", "utf8"),
  editor: readFileSync("src/components/content/blocks/BlockEditor.tsx", "utf8"),
  pages: readFileSync("src/lib/api/pages.functions.ts", "utf8"),
  forms: readFileSync("src/lib/api/forms.functions.ts", "utf8"),
  campaigns: readFileSync("src/lib/api/campaigns.functions.ts", "utf8"),
  helper: readFileSync("src/lib/api/_cms.ts", "utf8"),
};

// Closed build-time registries.
equal(CMS_SCHEMA_VERSION, 1, "explicit schema version");
equal(PAGE_TYPE_KEYS.length, 3, "page type count");
equal(SECTION_TYPE_KEYS.length, 10, "section type count");
equal(LAYOUT_TYPE_KEYS.length, 3, "layout count");
equal(TEMPLATE_KEYS.length, 3, "template count");
equal(EDITOR_CONTROL_KEYS.length, 10, "editor control count");

for (const key of PAGE_TYPE_KEYS) {
  equal(PAGE_TYPE_REGISTRY[key].key, key, `${key}:stable`);
  equal(PAGE_TYPE_REGISTRY[key].schemaVersion, 1, `${key}:version`);
  equal(PAGE_TYPE_REGISTRY[key].publicationContract, "atomic_snapshot", `${key}:publication`);
  equal(PAGE_TYPE_REGISTRY[key].publicRenderContract, "host_derived_published_only", `${key}:public`);
}
for (const key of SECTION_TYPE_KEYS) {
  equal(SECTION_TYPE_REGISTRY[key].key, key, `${key}:stable`);
  equal(SECTION_TYPE_REGISTRY[key].schemaVersion, 1, `${key}:version`);
  equal(SECTION_TYPE_REGISTRY[key].publicExposure, "published_only", `${key}:public`);
  equal(SECTION_TYPE_REGISTRY[key].previewBehavior, "draft_snapshot", `${key}:preview`);
  equal(SECTION_TYPE_REGISTRY[key].publishBehavior, "validated_snapshot", `${key}:publish`);
  ok(EDITOR_CONTROL_KEYS.includes(SECTION_TYPE_REGISTRY[key].editorControl), `${key}:control`);
}
for (const key of LAYOUT_TYPE_KEYS) {
  equal(LAYOUT_TYPE_REGISTRY[key].key, key, `${key}:stable`);
  ok(LAYOUT_TYPE_REGISTRY[key].regions.length > 0, `${key}:regions`);
  equal(LAYOUT_TYPE_REGISTRY[key].publicRenderContract, "registry_renderer", `${key}:renderer`);
}
for (const key of TEMPLATE_KEYS) {
  equal(TEMPLATE_REGISTRY[key].key, key, `${key}:stable`);
  equal(TEMPLATE_REGISTRY[key].immutableSystemTemplate, true, `${key}:immutable`);
  ok(PAGE_TYPE_KEYS.includes(TEMPLATE_REGISTRY[key].pageType), `${key}:page type`);
  ok(LAYOUT_TYPE_KEYS.includes(TEMPLATE_REGISTRY[key].layoutType), `${key}:layout`);
}
for (const key of EDITOR_CONTROL_KEYS) {
  equal(EDITOR_CONTROL_REGISTRY[key].key, key, `${key}:stable`);
  equal(EDITOR_CONTROL_REGISTRY[key].validationContract, "zod_build_time", `${key}:validation`);
}
for (const definition of Object.values(CONTENT_TYPE_REGISTRY)) {
  ok(definition.workflow.length >= 3, `${definition.key}:workflow`);
}

equal(assertCompleteCmsExtensionContracts(), true, "extension contracts are complete");
for (const [key, contract] of Object.entries(CMS_EXTENSION_CONTRACTS)) {
  equal(contract.key, key, `${key}:contract key`);
  for (const dimension of CMS_EXTENSION_CONTRACT_DIMENSIONS) {
    const value = contract[dimension];
    ok(
      typeof value === "string" ? value.trim().length > 0 : value.length > 0,
      `${key}:${dimension}`,
    );
  }
}
for (const token of [
  "NEW_PAGE_TYPE",
  "NEW_SECTION_TYPE",
  "NEW_LAYOUT",
  "NEW_TEMPLATE",
  "NEW_CONTENT_TYPE",
  "NEW_EDITOR_CONTROL",
  "NEW_TENANT_CONFIGURATION",
  "authorization",
  "persistence",
  "rollback",
  "compatibility",
  "diagnostics",
  "cardinality",
]) has(files.extensionContracts, token, `extension contract ${token}`);

// Closed snapshot validation.
const ids = {
  page: "33333333-3333-4333-8333-333333333333",
  media: "11111111-1111-4111-8111-111111111111",
  form: "22222222-2222-4222-8222-222222222222",
  campaign: "44444444-4444-4444-8444-444444444444",
  hero: "55555555-5555-4555-8555-555555555555",
  cta: "66666666-6666-4666-8666-666666666666",
  formSection: "77777777-7777-4777-8777-777777777777",
};
const validPage = {
  page_id: ids.page,
  page_type: "landing" as const,
  schema_version: 1 as const,
  slug: "campanha-segura",
  title: "Campanha segura",
  description: "Snapshot validado",
  status: "draft" as const,
  seo: { meta_title: "Campanha", og_media_id: ids.media },
  layout: {
    type: "full_width" as const,
    sections: [
      { id: ids.hero, type: "hero" as const, region: "main", data: { titulo: "Hero", media_id: ids.media, altura: "md" } },
      { id: ids.formSection, type: "form" as const, region: "main", data: { form_id: ids.form } },
      { id: ids.cta, type: "cta" as const, region: "main", data: { titulo: "CTA", botao_label: "Enviar", botao_href: "/contato" } },
    ],
  },
  navigation_references: ["/contato"],
  form_references: [ids.form],
  campaign_references: [ids.campaign],
  media_references: [ids.media],
  configuration_references: ["primary_logo"],
};
const valid = validateCmsPageSnapshot(validPage);
equal(valid.valid, true, "valid page");
if (!valid.valid) throw new Error("valid snapshot rejected");
equal(valid.value.layout.sections.length, 3, "section order");
equal(valid.value.media_references[0], ids.media, "media reference");
equal(valid.value.form_references[0], ids.form, "form reference");

const invalidPages: unknown[] = [
  { ...validPage, page_type: "runtime" },
  { ...validPage, layout: { ...validPage.layout, type: "runtime" } },
  { ...validPage, componentName: "TenantComponent" },
  { ...validPage, slug: "Unsafe Slug" },
  { ...validPage, media_references: [] },
  { ...validPage, form_references: [] },
  { ...validPage, seo: { canonical: "javascript:unsafe" } },
  { ...validPage, layout: { ...validPage.layout, sections: [validPage.layout.sections[2]] }, media_references: [], form_references: [] },
  { ...validPage, layout: { ...validPage.layout, sections: [validPage.layout.sections[0]] } },
  { ...validPage, layout: { ...validPage.layout, sections: [{ ...validPage.layout.sections[0], region: "runtime" }, validPage.layout.sections[2]] } },
  { ...validPage, page_type: "standard", layout: { type: "single_column", sections: [{ id: ids.hero, type: "image", region: "main", data: { url: "https://raw.invalid/a.jpg" } }] }, media_references: [], form_references: [], campaign_references: [] },
  { ...validPage, page_type: "standard", layout: { type: "single_column", sections: [{ id: ids.hero, type: "form", region: "main", data: { form_slug: "contact" } }] }, media_references: [], form_references: [], campaign_references: [] },
  { ...validPage, page_type: "standard", layout: { type: "single_column", sections: [{ id: ids.hero, type: "richtext", region: "main", data: { format: "sanitized_html_v1", html: "<script>unsafe</script>" } }] }, media_references: [], form_references: [], campaign_references: [] },
  { ...validPage, layout: { ...validPage.layout, sections: [validPage.layout.sections[0], { ...validPage.layout.sections[0], id: ids.cta }, validPage.layout.sections[2]] } },
];
for (const candidate of invalidPages) equal(validateCmsPageSnapshot(candidate).valid, false, "invalid page fail closed");

const validForm = {
  form_id: ids.form,
  schema_version: 1 as const,
  nome: "Contato",
  slug: "contato",
  status: "draft" as const,
  config: { criar_lead: true, consent_required: true },
  fields: [{ ordem: 0, tipo: "checkbox" as const, nome: "consent", label: "Aceito", obrigatorio: true, consentimento: true, opcoes: [], validacao: {}, largura: "full" as const }],
};
equal(formSnapshotSchema.safeParse(validForm).success, true, "valid form");
equal(formSnapshotSchema.safeParse({ ...validForm, webhook_url: "https://invalid" }).success, false, "unknown form key");
equal(formSnapshotSchema.safeParse({ ...validForm, fields: [{ ...validForm.fields[0], tipo: "runtime" }] }).success, false, "unknown field type");

const validCampaign = {
  campaign_id: ids.campaign,
  schema_version: 1 as const,
  nome: "Banner",
  tipo: "banner_top" as const,
  status: "draft" as const,
  prioridade: 1,
  conteudo: { titulo: "Oferta", media_id: ids.media, cta_url: "/imoveis" },
  segmentacao: { rotas_incluir: ["/"], rotas_excluir: [], dispositivo: "all" as const },
  frequencia: { max_por_sessao: 1, cooldown_horas: 24 },
  start_at: "2026-07-29T12:00:00.000Z",
  end_at: "2026-07-30T12:00:00.000Z",
  target_page_ids: [ids.page],
};
equal(campaignSnapshotSchema.safeParse(validCampaign).success, true, "valid campaign");
equal(campaignSnapshotSchema.safeParse({ ...validCampaign, tipo: "runtime" }).success, false, "unknown placement");
equal(campaignSnapshotSchema.safeParse({ ...validCampaign, end_at: "2026-07-28T12:00:00.000Z" }).success, false, "invalid schedule");

// SQL workflow, locks, audit, RLS, grants and ACL.
for (const token of [
  "cms_page_versions", "cms_templates", "cms_template_versions", "cms_form_versions", "cms_campaign_versions",
  "ux_cms_page_versions_one_draft", "ux_cms_page_versions_one_published", "ux_cms_form_versions_one_draft",
  "ux_cms_form_versions_one_published", "ux_cms_campaign_versions_one_draft", "ux_cms_campaign_versions_one_published",
  "ux_cms_pages_tenant_slug", "cms_protect_version_content", "cms_protect_form_version_content",
  "cms_protect_campaign_version_content", "validate_tenant_cms_snapshot", "save_tenant_page_draft",
  "publish_tenant_page", "unpublish_tenant_page", "rollback_tenant_page", "save_tenant_template_version",
  "instantiate_tenant_template", "save_tenant_form_definition", "publish_tenant_form",
  "save_tenant_campaign_definition", "publish_tenant_campaign", "FOR UPDATE", "cms_page_revision_conflict",
  "cms_form_revision_conflict", "cms_campaign_revision_conflict", "cms_runtime_code_prohibited",
  "cms_media_reference_invalid", "cms_form_reference_invalid", "cms_campaign_reference_invalid",
  "cms_target_page_invalid", "INSERT INTO public.audit_log", "ENABLE ROW LEVEL SECURITY",
  "REVOKE ALL ON TABLE public.cms_pages FROM anon, authenticated", "REVOKE ALL ON TABLE public.cms_forms FROM anon, authenticated",
  "REVOKE ALL ON TABLE public.cms_form_fields FROM anon, authenticated", "REVOKE ALL ON TABLE public.cms_campaigns FROM anon, authenticated",
  "GRANT EXECUTE ON FUNCTION public.save_tenant_page_draft", "GRANT EXECUTE ON FUNCTION public.publish_tenant_page",
  "GRANT EXECUTE ON FUNCTION public.save_tenant_form_definition", "GRANT EXECUTE ON FUNCTION public.publish_tenant_form",
  "GRANT EXECUTE ON FUNCTION public.save_tenant_campaign_definition", "GRANT EXECUTE ON FUNCTION public.publish_tenant_campaign",
  "COMMIT;",
]) has(files.migration, token);
lacks(files.migration, "TO authenticated;\n\nCOMMIT", "authenticated mutation grant");
lacks(files.migration, "http_post", "HTTP in transaction");

// Server authority and cutover.
for (const token of ["resolveEffectiveTenantPermission", "trustedTenantAccessContext", "requireTenantScopedAuthority", "tenant_cms_global_scope_required", "super_admin_impersonation"]) has(files.authority, token);
for (const token of ["middleware([requireTenant])", "authorizeTenantPageOperation", "authorizeTenantFormOperation", "authorizeTenantCampaignOperation", "assertExactTenantReferenceSet", "save_tenant_page_draft", "publish_tenant_page", "rollback_tenant_page", "save_tenant_form_definition", "publish_tenant_form", "save_tenant_campaign_definition", "publish_tenant_campaign", "getTenantCmsDiagnostics"]) has(files.functions, token);
for (const token of ["listTenantPages", "getTenantPage", "saveTenantPageDraft", "publishTenantPage", "listTenantPageVersions", "rollbackTenantPage"]) has(files.pageAdapter, token);
for (const token of ["listTenantForms", "getTenantForm", "saveTenantFormDraft", "publishTenantForm", "listTenantFormVersions"]) has(files.formAdapter, token);
for (const token of ["listTenantCampaigns", "getTenantCampaign", "saveTenantCampaignDraft", "publishTenantCampaign", "listTenantCampaignVersions"]) has(files.campaignAdapter, token);
lacks(files.pageAdapter, "salvarPagina", "legacy page mutation");
lacks(files.formAdapter, "salvarCampos", "partial field mutation");
lacks(files.campaignAdapter, "salvarCampanha", "legacy campaign mutation");
for (const token of ["media_library.id", "cms_forms.id", "media_id", "form_id", "sanitized_html_v1"]) has(files.editor, token);
lacks(files.editor, "URL da imagem", "raw image URL control");
lacks(files.editor, "Slug do formulário", "raw form slug control");
for (const token of ["legacy_cms_page_mutation_retired", "published_version_id"]) has(files.pages, token);
for (const token of ["legacy_cms_form_mutation_retired", "legacy_cms_form_fields_mutation_retired", "published_version_id"]) has(files.forms, token);
for (const token of ["legacy_cms_campaign_mutation_retired", "published_version_id"]) has(files.campaigns, token);
has(files.helper, "legacy_cms_permission_boundary_retired");
has(files.helper, "authorizeTenantCmsOperation");
lacks(files.helper, '.rpc("has_role"', "role authority");
lacks(files.helper, '.rpc("is_super_admin"', "global super admin authority");

ok(assertions >= 280, `expected >= 280 assertions, got ${assertions}`);
console.log(`PR_M2_CMS_WORKFLOW_FUNCTIONAL_COMPLETION_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_CMS_WORKFLOW_FUNCTIONAL_COMPLETION_SPECS=PASS");
