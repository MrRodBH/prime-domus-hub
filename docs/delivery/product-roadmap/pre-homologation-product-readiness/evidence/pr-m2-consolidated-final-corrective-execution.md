# PR-M2 — Consolidated Final Corrective Execution Evidence

## 1. Evidence authority and state

```text
EVIDENCE_TYPE = consolidated_final_corrective_execution
EVIDENCE_SCOPE = PR-M2 only
EXECUTION_MODEL = ChatGPT GitHub-native
REPOSITORY = MrRodBH/prime-domus-hub
BASE_BRANCH = main
IMPLEMENTATION_BRANCH = agent/pr-m2-functional-completion
PULL_REQUEST = 60

PRM2_CORRECTIVE_STATE = Corrected — Ready for Final Consolidated Closure Audit
PRM2_ACCEPTED = false
PRM2_MERGE_AUTHORIZED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
EXTERNAL_PROVIDER_EXECUTED = false
DCA01_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

This evidence records repository state and exact-head GitHub Actions proof. It does not claim deployment, managed-backend migration, live provider delivery, merge authorization, final PR-M2 acceptance, DCA-01, BCA-01 or PR-M3 execution.

## 2. Baselines and ancestry

```text
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
KNOWN_INTERMEDIATE_GREEN_HEAD = c529e47a8793082701f7beb888e69a1d0e403a98
POST_GATE_CORRECTIVE_START_HEAD = bdf07128816f95431156b77776df75ddac8b0ce0
FINAL_CODE_HEAD = 017f2f704ec23e740820aaae7ffe828afd9da792
MAIN_HEAD_AT_FINAL_CODE_AUDIT = ec05fd4edee94feabf8423a129154eb807c52a99
MERGE_BASE_AT_FINAL_CODE_AUDIT = ec05fd4edee94feabf8423a129154eb807c52a99
```

Ancestry proof:

```text
b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
→ 017f2f704ec23e740820aaae7ffe828afd9da792
STATUS = ahead
AHEAD_BY = 98
BEHIND_BY = 0
TOTAL_COMMITS = 98
LINEAR_ANCESTRY = true

bdf07128816f95431156b77776df75ddac8b0ce0
→ 017f2f704ec23e740820aaae7ffe828afd9da792
STATUS = ahead
AHEAD_BY = 14
BEHIND_BY = 0
TOTAL_COMMITS = 14
LINEAR_ANCESTRY = true
```

The PR remained open, draft, mergeable and not merged during the final code-head audit. No merge ref was used.

## 3. Corrective changed-file inventory

Whole corrective delta from `CORRECTIVE_START_HEAD` to `FINAL_CODE_HEAD`:

```text
CHANGED_FILE_COUNT = 73
```

### Workflow, package and harness

- `.github/workflows/pr-m2-consolidated-corrective-gate.yml`
- `package.json`
- `run-pr-m2-consolidated-final-corrective-specs.ts`
- `run-pr-m2-dashboard-authority-specs.ts`
- `run-pr-m2-marketing-channels-lead-ingestion-functional-completion-specs.ts`
- `run-pr-m2-property-admin-authority-specs.ts`

### Canonical evidence reconciliation

- `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-canonical-evidence-reconciliation-index.md`
- the twelve canonical increment evidence files listed in §12

### Administrative and public UI

- `src/components/admin/GaleriaLancamento.tsx`
- `src/components/admin/ImovelForm.tsx`
- `src/components/admin/InstagramPostManager.tsx`
- `src/components/admin/LancamentoForm.tsx`
- `src/components/admin/LazerPicker.tsx`
- `src/components/admin/LeadHistoricoDialog.tsx`
- `src/components/admin/PdfsLancamento.tsx`
- `src/components/admin/PostForm.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `src/components/workspace/contexts.ts`
- `src/hooks/use-cms-permissions.ts`
- `src/routes/_authenticated.admin.cms-inventario.tsx`
- `src/routes/_authenticated.admin.crm-operacoes.tsx`
- `src/routes/_authenticated.admin.marketing.tsx`
- `src/routes/_authenticated.super.control-plane.tsx`
- `src/routes/blog.$slug.tsx`
- `src/routes/blog.index.tsx`

### Server/runtime boundaries and registries

- `src/lib/api/admin.functions.ts`
- `src/lib/api/blog-public.functions.ts`
- `src/lib/api/blog.functions.ts`
- `src/lib/api/cms-transfer.functions.ts`
- `src/lib/api/content-media.functions.ts`
- `src/lib/api/dashboard.functions.ts`
- `src/lib/api/historico.functions.ts`
- `src/lib/api/ia.functions.ts`
- `src/lib/api/instagram.functions.ts`
- `src/lib/api/lancamentos.functions.ts`
- `src/lib/api/lead-reasons.functions.ts`
- `src/lib/api/legacy-storage.functions.ts`
- `src/lib/api/origens.functions.ts`
- `src/lib/api/property-admin.functions.ts`
- `src/lib/api/super-control-plane.functions.ts`
- `src/lib/api/tenant-catalog-admin.functions.ts`
- `src/lib/api/tenant-cms-functional.functions.ts`
- `src/lib/api/tenant-crm-functional.functions.ts`
- `src/lib/api/tenant-launch-catalog.functions.ts`
- `src/lib/api/tenant-ui-permission-compat.functions.ts`
- `src/lib/api/uploads.functions.ts`
- `src/lib/cms/cms-functional-inventory.ts`
- `src/lib/crm/crm-functional-registry.ts`
- `src/lib/dashboard/dashboard-metric-registry.ts`
- `src/lib/marketing/marketing-channel-registry.ts`
- `src/lib/marketing/marketing-provider-ingestion.server.ts`
- `src/lib/storage/upload-contract.ts`
- `src/lib/super-admin/platform-operations-registry.ts`

### Regression specifications

- `src/lib/__tests__/public-surface-tenant-read.spec.ts`
- `src/lib/leads/__tests__/lead-structural.spec.ts`

### Corrective migrations

- `supabase/migrations/20260730043000_pr_m2_consolidated_final_corrective.sql`
- `supabase/migrations/20260730050000_pr_m2_cms_functional_inventory.sql`
- `supabase/migrations/20260730051500_pr_m2_marketing_adapter_activation.sql`
- `supabase/migrations/20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql`
- `supabase/migrations/20260730060000_pr_m2_super_control_plane.sql`
- `supabase/migrations/20260730100000_pr_m2_content_upload_target_consumers.sql`
- `supabase/migrations/20260730101000_pr_m2_launch_project_transactional_save.sql`

Post-gate hardening delta from `POST_GATE_CORRECTIVE_START_HEAD` to `FINAL_CODE_HEAD`:

```text
POST_GATE_COMMIT_COUNT = 14
POST_GATE_CHANGED_FILE_COUNT = 12
```

The post-gate delta is limited to the consolidated harness, Blog/Launch content-media authorities, administrative media UIs, deterministic local content helpers, tenant launch catalogs, and the two post-gate additive migrations.

## 4. Dependency and lockfile reconciliation

```text
PACKAGE_OVERRIDE_JS_YAML = ^4.1.0
PACKAGE_RESOLUTION_JS_YAML = ^4.1.0
DIRECT_DEPENDENCY_JS_YAML = absent
DIRECT_DEV_DEPENDENCY_JS_YAML = absent
BUN_LOCK_CHANGED_IN_CORRECTIVE = false
BUN_LOCK_GIT_BLOB_SHA1 = 098eac32e22b587197565fb454706bf024769840
FROZEN_INSTALL_RESULT = success
```

No dependency version was added by the post-gate hardening. `bun install --frozen-lockfile` succeeded on the exact final code head.

## 5. Authority convergence and legacy cutover

The final code head proves:

- tenant selection and authorization remain server-derived through `requireTenant` and catalogued Tenant Access Control;
- no active administrative wildcard imports `admin.functions.legacy`;
- Dashboard, Property Administration, CRM and CMS authorities do not use `has_role` or `user_roles` as tenant authority;
- no active tenant mutation combines historical auth middleware, global-role lookup and direct mutation;
- Super Admin tenant-scoped operations require explicit impersonation;
- administrative Launch catalogs use the effective tenant context and do not reuse Host-derived public catalog functions;
- legacy Launch save/gallery/PDF mutation exports are not imported by active UI callers;
- CMS transfer exposes deterministic tenant-scoped export only; import and restore remain explicitly retired fail-closed and are not mounted by the redirect route.

## 6. Upload provenance

### Property Administration

```text
PROPERTY_UPLOAD_TARGET_SERVER_ISSUED = true
PROPERTY_METADATA_REGISTRATION_BY_TARGET_ID = true
PROPERTY_RAW_PATH_REGISTRATION_ACTIVE = false
PROPERTY_TARGET_REPLAY_DENIED = true
PROPERTY_OBJECT_EXISTENCE_REQUIRED = true
SIGNED_URL_PRIMARY_AUTHORIZATION = false
```

The existing property path remains a transport value generated by the server. Final image registration consumes the persisted upload target and validates actor, tenant, entity, expiry, status and object existence.

### Blog

```text
BLOG_COVER_RAW_PATH_INPUT = false
BLOG_COVER_TARGET_CONSUMPTION = atomic
BLOG_SAVE_AND_TARGET_CONSUMPTION = same_transaction
BLOG_PUBLIC_COVER = persisted_path_signed_server_side
BLOG_PROPERTY_SIGNER_REUSED = false
```

`PostForm` retains only the server-issued `coverUploadTargetId`. `save_tenant_blog_post` locks and validates the target before the permission decision, verifies the exact tenant prefix and object existence, saves the post, consumes the target and appends audit evidence in one transaction. Public and administrative cover presentation signs only the persisted metadata path.

### Launch media

```text
LAUNCH_COVER_RAW_PATH_INPUT = false
LAUNCH_GALLERY_RAW_PATH_INPUT = false
LAUNCH_PDF_RAW_PATH_INPUT = false
LAUNCH_COVER_TARGET_CONSUMPTION = atomic
LAUNCH_GALLERY_TARGET_CONSUMPTION = atomic
LAUNCH_PDF_TARGET_CONSUMPTION = atomic
LAUNCH_COVER_SELECTION = persisted_image_id
LAUNCH_SIGNING_INPUT = persisted_resource_id
PROPERTY_SIGNER_REUSED_FOR_LAUNCH = false
```

`consume_tenant_launch_upload_target` locks the target before permission and project decisions. It rejects replay, expiry, actor mismatch, tenant mismatch, wrong entity/domain/operation and missing storage object. Metadata persistence, target consumption and audit append occur in the same transaction.

### Transactional Launch project save

```text
LAUNCH_PROJECT_RAW_COVER_INPUT = false
LAUNCH_PROJECT_RAW_OG_IMAGE_INPUT = false
LAUNCH_PROJECT_AND_AMENITIES_SAVE = same_transaction
SILENT_PARTIAL_AMENITY_UPDATE = false
LAUNCH_REFERENCE_VALIDATION = tenant_scoped
```

`saveTenantLaunchProject` delegates to `save_tenant_launch_project`. The SQL primitive accepts a closed JSON key set, rejects caller-supplied media paths, validates status/city/neighborhood/broker/amenity references in the effective tenant, writes the project and amenities atomically, and appends audit evidence.

## 7. Functional results

### Dashboard

- closed metric registry and explicit formulas/data sources/timezone/null behavior;
- global, team and own scopes enforced;
- tenant filters across mandatory data sources;
- ambiguous broker/team cardinality fails closed;
- partial source failure does not produce success-shaped metrics;
- property, marketing, portal and CRM alert operational metrics included.

### CRM

- contacts, calendar, visits, proposals, attachments, automation rules, manual import, deterministic export, communication jobs, SLA policies, alerts and relationship models are materialized;
- compatibility callers delegate to canonical CRM authority;
- historical role authority and parallel Lead mutations are absent from active runtime;
- external communication adapters remain `adapter_not_implemented` unless factual evidence exists.

### CMS

- functional inventory includes listings, testimonials, contact, map/embed/tour, reusable blocks, widgets, themes, layouts and scheduled publication;
- tenant-authored executable JavaScript is not accepted;
- transfer import and restore remain fail-closed until a separately governed transactional primitive exists;
- Blog media save and presentation now use server-issued provenance and persisted-path signing.

### Meta Ads and Google Ads

```text
META_ADS_ADAPTER_IMPLEMENTATION_STATE = implemented
GOOGLE_ADS_ADAPTER_IMPLEMENTATION_STATE = implemented
EXTERNAL_VERIFICATION_STATE = not_live_verified
AVAILABILITY_STATE = credential_required
EXTERNAL_PROVIDER_EXECUTED = false
EXTERNAL_DELIVERY_PROVED = false
```

The code includes closed signature/key verification, payload reservation, idempotency and verified ingestion primitives. It performs no outbound provider request and makes no live-delivery claim.

### Analytics and tracking

- closed provider and event registries;
- consent-first loading;
- no provider load before consent;
- no arbitrary tenant JavaScript, endpoint or module path;
- GTM remains blocked where CSP-safe activation is not materialized;
- no external delivery proof is claimed.

### Instagram content

```text
INSTAGRAM_EXTERNAL_COPY_ADAPTER = adapter_not_implemented
INSTAGRAM_ACTIVE_AI_ACTION = false
INSTAGRAM_ACTIVE_MODE = manual_tenant_drafts
```

The UI no longer invokes `igGerarPost` or presents “Gerar com IA”. Drafts are entered manually, tenant-scoped, and saved without `modelo_ia` claims. ZIP generation consumes already authorized signed presentation URLs.

### Deterministic local content helpers

`src/lib/api/ia.functions.ts` contains no `LOVABLE_API_KEY`, Lovable gateway URL, external `fetch`, `requireSupabaseAuth` or `has_role`. Historical export names are retained only as compatibility surfaces for deterministic local drafts, with explicit `generationMode = deterministic_local` and `externalProviderExecuted = false`.

### Super Admin Control Plane and commercial boundary

- global Control Plane authority is separated from tenant operational detail;
- tenant detail requires explicit impersonation;
- domain visibility remains `pending_DCA01`;
- commercial/billing activation remains `pending_BCA01`;
- no domain activation, checkout, webhook, provider billing or revenue realization is claimed.

## 8. Migration inventory and execution boundary

PR-M2 migration inventory:

1. `20260728165000_pr_m2_tenant_lifecycle.sql`
2. `20260728180000_pr_m2_tenant_access_control.sql`
3. `20260728233000_pr_m2_configuration_center.sql`
4. `20260729103000_pr_m2_portal_functional_completion.sql`
5. `20260729183000_pr_m2_cms_workflow_functional_completion.sql`
6. `20260729211500_pr_m2_crm_operational_workflow.sql`
7. `20260729233000_pr_m2_marketing_channels_lead_ingestion.sql`
8. `20260730010000_pr_m2_analytics_tracking_conversion_events.sql`
9. `20260730043000_pr_m2_consolidated_final_corrective.sql`
10. `20260730050000_pr_m2_cms_functional_inventory.sql`
11. `20260730051500_pr_m2_marketing_adapter_activation.sql`
12. `20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql`
13. `20260730060000_pr_m2_super_control_plane.sql`
14. `20260730100000_pr_m2_content_upload_target_consumers.sql`
15. `20260730101000_pr_m2_launch_project_transactional_save.sql`

```text
MIGRATIONS_ADDITIVE = true
HISTORICAL_MIGRATIONS_EDITED = false
MANAGED_MIGRATION_EXECUTED = false
LIVE_BACKEND_SCHEMA_VERIFIED = false
```

## 9. RLS, grants and RPC ACL result

The corrective SQL inventory proves:

- PR-M2 tenant tables enable RLS where materialized;
- direct `PUBLIC`, `anon` and `authenticated` access is revoked for service-bound tables;
- service-role-only table access is preserved where specified;
- `SECURITY DEFINER` functions use controlled `search_path`;
- corrective RPC execution is revoked from `PUBLIC`, `anon` and `authenticated`;
- corrective RPC execution is granted only to `service_role`;
- no corrective migration performs network calls;
- no corrective SQL uses `auth.uid()`, `is_super_admin()` or client-selected tenant authority.

Specific post-gate RPC ACLs:

- `save_tenant_blog_post(...)` → `service_role` only;
- `consume_tenant_launch_upload_target(...)` → `service_role` only;
- `save_tenant_launch_project(...)` → `service_role` only.

## 10. Final code-head exact Release Gate

```text
FINAL_CODE_HEAD = 017f2f704ec23e740820aaae7ffe828afd9da792
WORKFLOW = PR-M2 Consolidated Corrective Gate
RUN_ID = 30553595065
JOB_ID = 90908355095
EXPECTED_SHA = 017f2f704ec23e740820aaae7ffe828afd9da792
CHECKED_OUT_SHA = 017f2f704ec23e740820aaae7ffe828afd9da792
EXACT_HEAD_MATCH = true
DETACHED_HEAD = true
MERGE_REF_USED = false
FROZEN_INSTALL = success
CONSOLIDATED_CORRECTIVE_ASSERTION_COUNT = 23
CONSOLIDATED_CORRECTIVE_HARNESS = PASS
VERIFY_RELEASE = PASS
TYPECHECK_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CYCLE_COMPOSITE_DIGEST_STABLE = true
ROUTE_TREE_SHA256 = c00345bef656aaba1abe83c161531638994f46898fc0e39a6975dce3423da41e
ALL_PREVIOUS_REGRESSIONS = true
```

Artifact:

```text
CODE_HEAD_ARTIFACT_ID = 8763925279
CODE_HEAD_ARTIFACT_NAME = pr-m2-consolidated-corrective-017f2f704ec23e740820aaae7ffe828afd9da792
CODE_HEAD_ARTIFACT_DIGEST = sha256:62cc5e56e82452a158b218ed0c06bfa8462ff6e4d74b9fda3d6ccc93e70d7bfe
CODE_HEAD_ARTIFACT_EXPIRED = false
CODE_HEAD_ARTIFACT_CREATED_AT = 2026-07-30T14:52:59Z
CODE_HEAD_ARTIFACT_EXPIRES_AT = 2026-08-13T14:52:59Z
```

## 11. Critical post-gate review

The first green intermediate head was not accepted automatically. Direct review identified and corrected:

1. Blog cover targets uploaded but not consumed;
2. Blog and Launch presentation incorrectly reused the property signer;
3. Launch cover/gallery/PDF callers persisted raw paths;
4. Instagram presented an unavailable AI adapter as an active feature;
5. `ia.functions.ts` retained global-role authority, Lovable credential and outbound gateway calls;
6. administrative Launch catalogs reused public Host-derived reads;
7. CMS import/restore fail-closed boundaries required confirmation that no active UI mounted them;
8. Launch project and amenity save could produce partial application-layer mutation.

Each finding was corrected and converted into a consolidated regression assertion. The final harness contains 23 passing assertions and preserves every prior PR-M2 and public-surface Release Gate.

Final review result:

```text
RESIDUAL_GLOBAL_ROLE_TENANT_AUTHORITY = false
ACTIVE_LEGACY_IMPORT = false
DUAL_ACTIVE_LAUNCH_MEDIA_RUNTIME = false
RAW_CLIENT_PATH_REGISTRATION = false
UPLOAD_TARGET_REPLAY = denied
CROSS_TENANT_REFERENCE = denied
TENANT_DEFAULT = false
FIRST_ROW_AUTHORITY = false
SILENT_PARTIAL_LAUNCH_SAVE = false
PROVIDER_SUCCESS_WITHOUT_PROOF = false
INLINE_CREDENTIAL = false
CMS_EXECUTABLE_TENANT_CONTENT = false
SUPER_ADMIN_TENANT_DETAIL_WITHOUT_IMPERSONATION = false
BILLING_ACTIVATION_CLAIM = false
DOMAIN_ACTIVATION_CLAIM = false
MIGRATION_RLS_ACL_BLOCKER = none_detected
```

## 12. Twelve canonical increment evidence paths

1. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-administrative-cms-tenant-authority-evidence.md`
2. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-dashboard-functional-authority-evidence.md`
3. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-crm-report-authority-evidence.md`
4. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-property-administration-authority-evidence.md`
5. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-tenant-lifecycle-evidence.md`
6. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-tenant-access-control-evidence.md`
7. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-configuration-center-evidence.md`
8. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-portal-functional-completion-evidence.md`
9. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-cms-workflow-functional-completion-evidence.md`
10. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-crm-operational-workflow-evidence.md`
11. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-marketing-channels-lead-ingestion-evidence.md`
12. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-final-analytics-tracking-conversion-events-evidence.md`

Each canonical evidence remains `Current`, records `MANAGED_MIGRATION_EXECUTED = false` and `MERGE_EXECUTED = false`, and supersedes its historical increment evidence for final PR-M2 audit purposes.

## 13. External execution boundaries

```text
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
REAL_PROVIDER_EXECUTED = false
REAL_CREDENTIAL_USED = false
LIVE_TRAFFIC_TESTED = false
LIVE_META_ADS_VERIFIED = false
LIVE_GOOGLE_ADS_VERIFIED = false
LIVE_ANALYTICS_DELIVERY_PROVED = false
LIVE_PORTAL_DELIVERY_PROVED = false
LIVE_DOMAIN_ACTIVATION_EXECUTED = false
LIVE_BILLING_ACTIVATION_EXECUTED = false
```

These are successor-stage boundaries, not hidden acceptance assumptions.

## 14. Future sequence

The binding sequence remains:

```text
PR-M2 final consolidated closure and protected-merge authorization audit
→ protected merge only after separate exact-head authorization
→ DCA-01
→ BCA-01
→ PR-M3
→ Pre-Homologation Release Candidate
→ TH-M1
→ TH-M2
→ LSV-03
→ formal homologation
→ production
```

No successor was started by this corrective.

## 15. Terminal corrective declaration

```text
PRM2_CORRECTIVE_STATE = Corrected — Ready for Final Consolidated Closure Audit
PRM2_ACCEPTED = false
PRM2_MERGE_AUTHORIZED = false
NEXT_AUTHORIZED_ACTION = PR-M2 — Final Consolidated Closure, Merge Readiness & Protected-Merge Authorization Gate
```
