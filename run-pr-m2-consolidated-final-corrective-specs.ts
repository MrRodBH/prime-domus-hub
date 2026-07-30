import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let assertions = 0;
function check(name: string, fn: () => void) {
  fn();
  assertions += 1;
  console.log(`✓ ${name}`);
}
function source(path: string) {
  return readFileSync(path, "utf8");
}
function sourceFiles(root: string): string[] {
  const rows: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) rows.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry)) rows.push(path);
  }
  return rows;
}
function gitBlobSha1(content: Buffer) {
  const header = Buffer.from(`blob ${content.length}\0`);
  return createHash("sha1").update(Buffer.concat([header, content])).digest("hex");
}
function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  assert.ok(from >= 0, `start marker missing: ${start}`);
  const to = text.indexOf(end, from + start.length);
  assert.ok(to > from, `end marker missing: ${end}`);
  return text.slice(from, to);
}

const packageJson = JSON.parse(source("package.json"));
const bunLock = readFileSync("bun.lock");
const apiFiles = sourceFiles("src/lib/api");
const applicationFiles = sourceFiles("src");
const activeApplication = applicationFiles.filter((path) => path !== "src/lib/api/admin.functions.legacy.ts");
const uiFiles = activeApplication.filter((path) => path.startsWith("src/components/") || path.startsWith("src/routes/"));

const dashboard = source("src/lib/api/dashboard.functions.ts");
const property = source("src/lib/api/property-admin.functions.ts");
const adminBarrel = source("src/lib/api/admin.functions.ts");
const uploadContract = source("src/lib/storage/upload-contract.ts");
const uploadFunctions = source("src/lib/api/uploads.functions.ts");
const propertyForm = source("src/components/admin/ImovelForm.tsx");
const crmRegistry = source("src/lib/crm/crm-functional-registry.ts");
const crmFunctions = source("src/lib/api/tenant-crm-functional.functions.ts");
const crmRoute = source("src/routes/_authenticated.admin.crm-operacoes.tsx");
const cmsRegistry = source("src/lib/cms/cms-functional-inventory.ts");
const cmsFunctions = source("src/lib/api/tenant-cms-functional.functions.ts");
const cmsRoute = source("src/routes/_authenticated.admin.cms-inventario.tsx");
const marketingRegistry = source("src/lib/marketing/marketing-channel-registry.ts");
const marketingProvider = source("src/lib/marketing/marketing-provider-ingestion.server.ts");
const marketingRoute = source("src/routes/_authenticated.admin.marketing.tsx");
const superFunctions = source("src/lib/api/super-control-plane.functions.ts");
const superRoute = source("src/routes/_authenticated.super.control-plane.tsx");
const contexts = source("src/components/workspace/contexts.ts");

const postForm = source("src/components/admin/PostForm.tsx");
const launchForm = source("src/components/admin/LancamentoForm.tsx");
const launchGallery = source("src/components/admin/GaleriaLancamento.tsx");
const launchPdfs = source("src/components/admin/PdfsLancamento.tsx");
const instagramManager = source("src/components/admin/InstagramPostManager.tsx");
const instagramFunctions = source("src/lib/api/instagram.functions.ts");
const deterministicContent = source("src/lib/api/ia.functions.ts");
const contentMedia = source("src/lib/api/content-media.functions.ts");
const launchCatalog = source("src/lib/api/tenant-launch-catalog.functions.ts");
const cmsTransfer = source("src/lib/api/cms-transfer.functions.ts");
const cmsTransferRoute = source("src/routes/_authenticated.admin.cms-transferencia.tsx");
const contentConsumerMigrationPath = "supabase/migrations/20260730100000_pr_m2_content_upload_target_consumers.sql";
const launchSaveMigrationPath = "supabase/migrations/20260730101000_pr_m2_launch_project_transactional_save.sql";
const contentConsumerMigration = source(contentConsumerMigrationPath);
const launchSaveMigration = source(launchSaveMigrationPath);

const correctiveMigrations = [
  "supabase/migrations/20260730043000_pr_m2_consolidated_final_corrective.sql",
  "supabase/migrations/20260730050000_pr_m2_cms_functional_inventory.sql",
  "supabase/migrations/20260730051500_pr_m2_marketing_adapter_activation.sql",
  "supabase/migrations/20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql",
  "supabase/migrations/20260730060000_pr_m2_super_control_plane.sql",
  contentConsumerMigrationPath,
  launchSaveMigrationPath,
];
const migrationSource = correctiveMigrations.map(source).join("\n");

const canonicalEvidence = [
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-administrative-cms-tenant-authority-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-dashboard-functional-authority-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-crm-report-authority-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-property-administration-authority-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-tenant-lifecycle-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-tenant-access-control-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-configuration-center-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-portal-functional-completion-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-cms-workflow-functional-completion-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-crm-operational-workflow-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-marketing-channels-lead-ingestion-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-analytics-tracking-conversion-events-evidence.md",
];

check("dependency manifest matches the merge-base contract", () => {
  assert.equal(packageJson.overrides?.["js-yaml"], "^4.1.0");
  assert.equal(packageJson.resolutions?.["js-yaml"], "^4.1.0");
  assert.equal(packageJson.dependencies?.["js-yaml"], undefined);
  assert.equal(packageJson.devDependencies?.["js-yaml"], undefined);
  assert.equal(gitBlobSha1(bunLock), "098eac32e22b587197565fb454706bf024769840");
});

check("legacy administrative wildcard and active imports are absent", () => {
  assert.equal(/export\s+\*\s+from\s+["']\.\/admin\.functions\.legacy["']/.test(adminBarrel), false);
  const offenders = activeApplication.filter((path) => source(path).includes("admin.functions.legacy"));
  assert.deepEqual(offenders, []);
});

check("tenant authorities do not use global role tables", () => {
  for (const [name, file] of [["dashboard", dashboard], ["property", property], ["crm", crmFunctions], ["cms", cmsFunctions]]) {
    assert.equal(file.includes('.rpc("has_role"'), false, name);
    assert.equal(file.includes('.from("user_roles")'), false, name);
    assert.ok(file.includes("requireTenant"), name);
  }
  assert.ok(dashboard.includes("resolveEffectiveTenantPermission"));
  assert.ok(property.includes("resolveEffectiveTenantPermission"));
});

check("no active tenant mutation uses the historical auth-plus-role pattern", () => {
  const candidates = apiFiles.filter((path) => !path.endsWith("admin.functions.legacy.ts"));
  const offenders = candidates.filter((path) => {
    const text = source(path);
    return text.includes("requireSupabaseAuth") && text.includes('.rpc("has_role"') && /\.(insert|update|delete)\(/.test(text);
  });
  assert.deepEqual(offenders, []);
});

check("upload provenance is the sole property image registration authority", () => {
  assert.ok(uploadContract.includes("targetId: string"));
  assert.ok(uploadFunctions.includes("register_tenant_upload_target"));
  assert.ok(property.includes("consume_tenant_property_upload_target"));
  assert.ok(property.includes("uploadTargetId: z.string().uuid()"));
  assert.equal(property.includes("validatePropertyImagePath(data.url"), false);
  assert.ok(propertyForm.includes("uploadTargetId: target.targetId"));
  assert.equal(propertyForm.includes("url: target.path"), false);
  assert.equal(propertyForm.includes("data: { id: image.id, path:"), false);
  for (const token of ["storage.objects", "upload_target_expired", "upload_target_actor_mismatch", "upload_target_concurrent_consumption"]) {
    assert.ok(migrationSource.includes(token), token);
  }
});

check("dashboard functional authority and metric registry are complete", () => {
  const metricRegistry = source("src/lib/dashboard/dashboard-metric-registry.ts");
  for (const token of [
    "metricKey", "dataSource", "formula", "timezone", "periodBoundary", "nullBehavior",
    "cardinality", "permission", "scopes", "drillDown", "sales_lost", "leads_discarded",
    "active_properties", "marketing_ingestion_events", "portal_publications",
  ]) assert.ok(metricRegistry.includes(token), token);
  for (const token of ["effectiveScope", "applyBrokerScope", "dashboard_team_filter_denied", "Dashboard partial-data error"]) {
    assert.ok(dashboard.includes(token), token);
  }
});

check("CRM required functional capabilities are materialized and exposed", () => {
  for (const token of [
    "contacts", "calendar", "visits", "proposals", "attachments", "automation_rules",
    "manual_import", "deterministic_export", "communication_jobs", "sla_policies", "alerts",
    "follow_up_policy", "property_relationships", "broker_relationships", "campaign_relationships",
  ]) assert.ok(crmRegistry.includes(`"${token}"`), token);
  for (const table of [
    "crm_contacts", "crm_calendar_events", "crm_visits", "crm_proposals", "crm_attachments",
    "crm_automation_rules", "crm_communication_jobs", "crm_sla_policies", "crm_alerts",
  ]) assert.ok(migrationSource.includes(table), table);
  assert.ok(crmFunctions.includes("exportTenantCrmData"));
  assert.ok(crmFunctions.includes("importTenantCrmContacts"));
  assert.ok(crmRoute.includes("CRM Operational Center"));
  assert.ok(crmFunctions.includes('adapter_state: "adapter_not_implemented"'));
});

check("CMS functional inventory is closed, persisted and exposed", () => {
  for (const token of [
    "testimonials", "property_listing", "launch_listing", "team_listing", "contact_panel",
    "map", "embed", "tour", "reusable_block", "widget", "theme_tokens",
    "scheduled_publication", "header", "footer", "grid", "columns", "cards",
  ]) assert.ok(cmsRegistry.includes(`"${token}"`), token);
  for (const table of ["cms_testimonials", "cms_reusable_blocks", "cms_publication_schedules"]) {
    assert.ok(migrationSource.includes(table), table);
  }
  assert.ok(cmsFunctions.includes("validateTenantCmsFunctionalComponent"));
  assert.ok(cmsFunctions.includes("scheduleTenantCmsPublication"));
  assert.ok(cmsRoute.includes("CMS Functional Inventory"));
  assert.equal(cmsRegistry.includes("eval("), false);
  assert.equal(cmsRegistry.includes("new Function"), false);
});

check("required Meta and Google adapters are implemented without external execution claims", () => {
  for (const key of ["META_ADS", "GOOGLE_ADS"]) {
    const marker = marketingRegistry.indexOf(`channelKey: "${key}"`);
    const next = marketingRegistry.indexOf("channelKey:", marker + 20);
    const block = marketingRegistry.slice(marker, next > 0 ? next : undefined);
    assert.ok(block.includes('adapterImplementationState: "implemented"'), key);
    assert.ok(block.includes('externalVerificationState: "not_live_verified"'), key);
    assert.ok(block.includes('availabilityState: "credential_required"'), key);
  }
  for (const token of ["verifyMetaXHubSignature256", "verifyGoogleLeadWebhookKey", "reserve_marketing_ingestion_payload", "ingest_verified_provider_marketing_lead"]) {
    assert.ok(marketingProvider.includes(token), token);
  }
  assert.equal(marketingProvider.includes("fetch("), false);
  assert.ok(marketingRoute.includes("not_live_verified"));
  assert.equal(marketingRoute.includes("adapter_not_implemented</strong>"), false);
});

check("Super Admin Control Plane separates global authority from tenant impersonation", () => {
  for (const token of [
    "globalExecutiveDashboard", "commercialVisibility", "domainVisibility", "integrations",
    "operations", "incidents", "support", "audit", "reports", "pending_BCA01", "pending_DCA01",
  ]) assert.ok(superFunctions.includes(token), token);
  assert.ok(superFunctions.includes("getSuperTenantScopedOperationalView"));
  assert.ok(superFunctions.includes("context.tenant.impersonation"));
  assert.ok(superFunctions.includes('context.tenant.origin !== "impersonation"'));
  assert.ok(superRoute.includes("SaaS Control Plane"));
  assert.ok(contexts.includes('{ label: "Control Plane", to: "/super/control-plane" }'));
});

check("the seven-workspace invariant is preserved", () => {
  assert.equal((contexts.match(/\n    id: "/g) ?? []).length, 7);
  assert.ok(contexts.includes('{ label: "CRM Operacional", to: "/admin/crm-operacoes" }'));
  assert.ok(contexts.includes('{ label: "Inventário", to: "/admin/cms-inventario" }'));
});

check("corrective migrations are unique, additive and service-role-only", () => {
  assert.equal(new Set(correctiveMigrations).size, correctiveMigrations.length);
  for (const path of correctiveMigrations) assert.ok(existsSync(path), path);
  for (const token of ["ENABLE ROW LEVEL SECURITY", "FROM PUBLIC, anon, authenticated", "TO service_role", "SECURITY DEFINER", "SET search_path = public"]) {
    assert.ok(migrationSource.includes(token), token);
  }
  assert.equal(/GRANT\s+EXECUTE[\s\S]{0,180}\s+TO\s+(anon|authenticated)/i.test(migrationSource), false);
  for (const token of ["net.http", "http_post", "http_get", "is_super_admin()", "auth.uid()"]) {
    assert.equal(migrationSource.includes(token), false, token);
  }
});

check("twelve canonical increment evidences exist and supersede historical claims", () => {
  assert.equal(canonicalEvidence.length, 12);
  for (const path of canonicalEvidence) {
    assert.ok(existsSync(path), path);
    const text = source(path);
    assert.ok(text.includes("CANONICAL_EVIDENCE_STATE = Current"), path);
    assert.ok(text.includes("MANAGED_MIGRATION_EXECUTED = false"), path);
    assert.ok(text.includes("MERGE_EXECUTED = false"), path);
    assert.ok(text.includes("HISTORICAL_EVIDENCE_AUTHORITY = superseded"), path);
  }
});

check("final closure evidence authorizes only the separate protected-merge audit", () => {
  const path = "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-consolidated-closure-and-merge-readiness.md";
  assert.ok(existsSync(path), path);
  const text = source(path);
  assert.ok(text.includes("PRM2_FINAL_CLOSURE_STATE = Accepted — Ready for Protected Merge Audit"));
  assert.ok(text.includes("PRM2_PROTECTED_MERGE_AUDIT_AUTHORIZED = true"));
  assert.ok(text.includes("PRM2_MERGE_AUTHORIZED = false"));
  assert.ok(text.includes("MERGE_EXECUTED = false"));
  assert.ok(text.includes("CORRECTIVE_EVIDENCE_HEAD = 7e722a5f0b204aba0a9f486250cc3987c43230ba"));
  assert.ok(text.includes("NEXT_AUTHORIZED_ACTION = PR-M2 — Protected Merge Audit"));
  assert.equal(text.includes("PRM2_MERGE_AUTHORIZED = true"), false);
});

check("Blog cover uses target consumption and persisted-path signing only", () => {
  assert.equal(postForm.includes("adminAssinarUrl"), false);
  assert.ok(postForm.includes("coverUploadTargetId: coverTargetId"));
  assert.ok(postForm.includes("target.targetId"));
  const blogSchema = between(contentMedia, "const blogSaveSchema", "export const saveTenantBlogPost");
  assert.equal(blogSchema.includes("imagem_capa"), false);
  assert.ok(blogSchema.includes("coverUploadTargetId"));
  assert.ok(contentMedia.includes('admin.rpc("save_tenant_blog_post"'));
  assert.ok(contentMedia.includes("signTenantBlogCover"));
  assert.ok(contentMedia.includes('.eq("id", data.postId)'));
});

check("Launch UI has no raw-path mutation or property signer reuse", () => {
  for (const [name, file] of [["form", launchForm], ["gallery", launchGallery], ["pdf", launchPdfs]]) {
    assert.equal(file.includes("adminAssinarUrl"), false, name);
    assert.equal(file.includes("storage_path: target.path"), false, name);
  }
  const saveCall = between(launchForm, "mutationFn: () => saveTenantLaunchProject", "onSuccess:");
  assert.equal(saveCall.includes("imagem_capa"), false);
  assert.ok(launchForm.includes("consumeTenantLaunchCover"));
  assert.ok(launchGallery.includes("consumeTenantLaunchGalleryImage"));
  assert.ok(launchGallery.includes("setTenantLaunchCoverFromImage"));
  assert.ok(launchPdfs.includes("consumeTenantLaunchPdf"));
  assert.ok(launchGallery.includes("targetId: target.targetId"));
  assert.ok(launchPdfs.includes("targetId: target.targetId"));
  const legacyUiOffenders = uiFiles.filter((path) => {
    const text = source(path);
    return text.includes("adminSalvarLancamento")
      || text.includes("adminAdicionarImagemLancamento")
      || text.includes("adminAdicionarPdfLancamento");
  });
  assert.deepEqual(legacyUiOffenders, []);
});

check("canonical Launch boundary accepts IDs and persisted references, never caller paths", () => {
  const launchSchema = between(contentMedia, "const launchProjectSchema", "export const saveTenantLaunchProject");
  assert.equal(launchSchema.includes("imagem_capa"), false);
  assert.equal(launchSchema.includes("og_image"), false);
  assert.ok(contentMedia.includes('admin.rpc("save_tenant_launch_project"'));
  const launchSaveBlock = between(contentMedia, "export const saveTenantLaunchProject", "const launchConsumerResult");
  assert.equal(launchSaveBlock.includes('.from("launch_projects")'), false);
  assert.equal(launchSaveBlock.includes('.from("launch_project_amenities")'), false);
  assert.ok(contentMedia.includes("consumeTenantLaunchCover"));
  assert.ok(contentMedia.includes("consumeTenantLaunchGalleryImage"));
  assert.ok(contentMedia.includes("consumeTenantLaunchPdf"));
  assert.ok(contentMedia.includes("setTenantLaunchCoverFromImage"));
  assert.ok(contentMedia.includes("signTenantLaunchMedia"));
  assert.ok(contentMedia.includes('.eq("id", data.resourceId)'));
  assert.equal(contentMedia.includes("bucket: z."), false);
});

check("content target consumers lock, validate and consume atomically", () => {
  assert.equal((contentConsumerMigration.match(/CREATE OR REPLACE FUNCTION public\.save_tenant_blog_post/g) ?? []).length, 1);
  assert.equal((contentConsumerMigration.match(/CREATE OR REPLACE FUNCTION public\.consume_tenant_launch_upload_target/g) ?? []).length, 1);
  const blogSql = between(contentConsumerMigration, "CREATE OR REPLACE FUNCTION public.save_tenant_blog_post", "CREATE OR REPLACE FUNCTION public.consume_tenant_launch_upload_target");
  const launchSql = contentConsumerMigration.slice(contentConsumerMigration.indexOf("CREATE OR REPLACE FUNCTION public.consume_tenant_launch_upload_target"));
  assert.ok(blogSql.indexOf("FOR UPDATE") < blogSql.indexOf("v_decision := public.resolve_tenant_permission"));
  assert.ok(launchSql.indexOf("FOR UPDATE") < launchSql.indexOf("v_decision := public.resolve_tenant_permission"));
  for (const token of [
    "upload_target_not_pending", "upload_target_expired", "upload_target_actor_mismatch",
    "blog_cover_target_mismatch", "launch_upload_target_mismatch", "upload_target_object_not_found",
    "upload_target_concurrent_consumption", "storage.objects", "audit_log",
  ]) assert.ok(contentConsumerMigration.includes(token), token);
  assert.ok(contentConsumerMigration.includes("left(v_target.path, length(v_required_prefix))"));
  assert.ok(contentConsumerMigration.includes("FROM PUBLIC, anon, authenticated"));
  assert.ok(contentConsumerMigration.includes("TO service_role"));
  assert.equal(/GRANT\s+EXECUTE[\s\S]{0,180}\s+TO\s+(anon|authenticated)/i.test(contentConsumerMigration), false);
  for (const token of ["net.http", "http_post", "http_get", "fetch("]) assert.equal(contentConsumerMigration.includes(token), false, token);
});

check("Launch project and amenities save is one closed transaction", () => {
  assert.equal((launchSaveMigration.match(/CREATE OR REPLACE FUNCTION public\.save_tenant_launch_project/g) ?? []).length, 1);
  for (const token of [
    "launch_save_payload_key_not_allowed", "launch_save_permission_denied",
    "launch_status_cross_tenant_or_missing", "launch_amenity_cross_tenant_or_missing",
    "DELETE FROM public.launch_project_amenities", "INSERT INTO public.launch_project_amenities",
    "launch.project.save", "'transactional', true",
  ]) assert.ok(launchSaveMigration.includes(token), token);
  assert.equal(launchSaveMigration.includes("imagem_capa"), false);
  assert.equal(launchSaveMigration.includes("og_image"), false);
  assert.ok(launchSaveMigration.includes("FROM PUBLIC, anon, authenticated"));
  assert.ok(launchSaveMigration.includes("TO service_role"));
  assert.equal(/GRANT\s+EXECUTE[\s\S]{0,180}\s+TO\s+(anon|authenticated)/i.test(launchSaveMigration), false);
  for (const token of ["net.http", "http_post", "http_get"]) assert.equal(launchSaveMigration.includes(token), false, token);
});

check("Instagram remains a manual tenant draft surface", () => {
  assert.ok(instagramFunctions.includes("instagram_copy_ai_adapter_not_implemented"));
  assert.equal(instagramManager.includes("igGerarPost"), false);
  assert.equal(instagramManager.includes("Gerar com IA"), false);
  assert.ok(instagramManager.includes("modelo_ia: null"));
  assert.ok(instagramManager.includes("drafts manuais") || instagramManager.includes("preenchidas manualmente"));
  assert.equal(instagramManager.includes("adminAssinarUrl"), false);
});

check("active content helpers are deterministic and provider-free", () => {
  for (const token of ["LOVABLE_API_KEY", "ai.gateway.lovable.dev", '.rpc("has_role"', "requireSupabaseAuth", "fetch("]) {
    assert.equal(deterministicContent.includes(token), false, token);
  }
  assert.ok(deterministicContent.includes("requireTenant"));
  assert.ok(deterministicContent.includes('generationMode: "deterministic_local"'));
  assert.ok(deterministicContent.includes("externalProviderExecuted: false"));
  assert.equal(propertyForm.includes("Gerar com IA"), false);
  assert.ok(propertyForm.includes("Gerar rascunho local"));
  assert.equal(launchForm.includes("Gerar com IA"), false);
});

check("CMS transfer exposes read-only export and no active retired actions", () => {
  assert.ok(cmsTransfer.includes("exportarCms"));
  assert.ok(cmsTransfer.includes("cms_transfer_import_retired_transactional_primitive_required"));
  assert.ok(cmsTransfer.includes("cms_snapshot_restore_retired_transactional_primitive_required"));
  assert.ok(cmsTransferRoute.includes('redirect({ to: "/admin/auditoria"'));
  assert.equal(cmsTransferRoute.includes("importarCms"), false);
  assert.equal(cmsTransferRoute.includes("restaurarSnapshot"), false);
  const routeOffenders = uiFiles.filter((path) => {
    const text = source(path);
    return text.includes("importarCms(") || text.includes("restaurarSnapshot(");
  });
  assert.deepEqual(routeOffenders, []);
});

check("administrative Launch catalogs are tenant-scoped", () => {
  assert.ok(launchCatalog.includes("requireTenant"));
  assert.ok(launchCatalog.includes("authorizeTenantCmsOperation"));
  assert.ok(launchCatalog.includes('.eq("tenant_id", authorization.tenantId)'));
  assert.equal(launchForm.includes("listarStatusLancamento"), false);
  assert.equal(propertyForm.includes("listarAmenities"), false);
  assert.ok(launchForm.includes("listarTenantLaunchStatuses"));
  assert.ok(propertyForm.includes("listarTenantLaunchAmenities"));
});

assert.ok(assertions >= 23);
console.log(`PR_M2_CONSOLIDATED_FINAL_CORRECTIVE_SPEC_ASSERTIONS=${assertions}`);
console.log("PR_M2_CONSOLIDATED_FINAL_CORRECTIVE_SPECS=PASS");
