# CMS website recovery — 2026-09-14

## Continuity and scope

Owner confirmed both domain/browser identities working and requested tenant sidebar labels `Imóveis` and `Marketing`, plus correction of the failing CMS and its fictitious preview. Read AGENTS.md, OWNER_UI_APPROVALS.md, P0_MULTI_TENANT_SELF_SERVICE_WEBSITE_BUILDER.md, BROWSER_IDENTITY_CORRECTION.md and the current canonical configuration/CMS authority implementation. Source is the deployed PR #287 `bb9c587e5f2e03773588986da018d3d28b67984a`, whose parent remains main `18f6a8e7eece84e542df926295b7049f721094ae`. The PR retains that already approved browser-identity delta; no GitHub operation is delegated to Lovable.

## Confirmed causes and smallest correction

Native read-only diagnosis found pgcrypto in `extensions`, while six CMS writer functions use `search_path=public,pg_temp` and unqualified `digest()`. This makes the hash computation unresolved (42883); the generic UI fallback obscures this server defect. There was one published configuration and no draft/save audit entry. This is schema-resolution evidence, not a captured historical PostgreSQL error log. The existing website-setup validator migration is applied and the normalized snapshot passes local catalog validation; it must not be reapplied or weakened.

The wizard separately rendered a static illustration and read obsolete `home_hero.titulo/subtitulo`. The public page uses `title_lines/subtitle`. Its menu generator used `href` without the required `location/url` contract and discarded custom/footer entries. These are corrected without replacing the public template or published settings.

The preview loads the actual public page on the server-selected active canonical domain. Its private saved-configuration endpoint requires tenant authentication, configuration-view permission, and equality between the session tenant and the server-resolved host tenant. It projects public-safe settings and the same normalized menu used by the website. No client tenant ID or hostname selects authority. Loading/error states never announce a successful draft preview. A missing draft is explicitly identified as the published version. The retired `Publicar tudo` action is removed; publishing remains in the canonical CMS editor with its existing permission/revision checks. Draft save is not publication.

Ordinary pages retain `frame-ancestors 'none'`; only root `?__preview=1` allows same-origin framing. Admin/auth documents allow same-origin frames only. Preview HTML is private/no-store; analytics/campaign runtime is omitted in preview. Cross-origin administration offers an explicit link to sign in on the tenant domain, not an expanded CSP allowlist. Leaving preview resets its query cache. Preview uses the existing CSS projection, not a new styling system.

The wizard no longer advertises unimplemented alternate layouts, logo placement, or background/text controls that the published renderer does not consume. Their stored catalog values are preserved; implementing additional templates remains a separate product change. Available color/font controls still use the public rendering contract. The approved layout is unchanged.

## Database application evidence

CLI initially generated `20260914205742_cms_qualified_digest.sql`; the managed migration mechanism assigned the actual ledger/file `20260914210012_7fdd3240-0b97-4fdd-8c5e-9cc92af6d9ba.sql`. Only the latter is committed, preventing duplicate migration application.

Native protected execution: `umsg_01m2gvem0cec4vqtqxbf75wvdz`. A transaction rehearsed the exact SQL twice and rolled back intentionally: `qualified=6 unqualified=0 metadata_stable=t idempotent=t config_stable=t`. One subsequent managed migration applied the same SQL. Readback: all six functions qualify `extensions.digest`; owner postgres, SECURITY DEFINER, `search_path=public,pg_temp`, and ACL `{postgres=X/postgres,service_role=X/postgres}` unchanged. The known SHA-256 of `abc` passes. RM Prime configuration remains one published row/no draft; aggregate content hash `6a99db0f27f44983b3ab53c2ce5d1019` unchanged. No save, publish, impersonation, domain-state update, DNS, provider, cron or credential change occurred in this database correction. The nine unrelated CRM functions identified by diagnosis are outside this CMS correction.

The migration modifies only unqualified digest calls in the *current* definitions, preserves later changes and security metadata, fails if the expected six-function signature set changes, and is idempotent. It neither changes historical migrations nor grants client roles execution.

## Validation and application

Passed locally: TypeScript; production Vite build; CMS recovery controlled DOM/server tests (three tenants, inactive/ambiguous domain rejection, host mismatch, permission denial, failed load retry, failed save preserving edits, canonical hero, menu preservation/idempotency, saved-preview refresh and no implicit publication); approved navigation/branding/CMS session DOM suite; configuration center (133 checks); CMS workflow (381 checks); CMS authority; website builder/catalog parity; analytics security (393 existing checks plus bounded frame assertions). No synthetic result is represented as an authenticated production save.

CI adds the focused recovery suite. The historical PCA-05R manifest reuses the three post-rehearsal classifications already corrected in PR #286, then explicitly classifies this new CMS migration outside the old rehearsal (138 files, 16 exclusions). All original 17 rehearsal migration hashes and fail-closed checks remain unchanged; the new migration's own rehearsal/readback is recorded above.

Deployment: apply the UI delta to the existing protected application and build a separate canonical copy for `rm-prime-sites-prod`, retaining the four canonical build-overlay files and all eight runtime bindings. Do not alter realone.com.br hosting, DNS or domain automation. Publish the existing platform application and activate only the validated new tenant Worker version. Application-source transfer and live acceptance evidence must be recorded when completed.

Owner acceptance: reload the tenant admin; confirm `Imóveis`/`Marketing`; open Conteúdo → Website and inspect the real page. Use `Salvar e continuar` to save a draft; check its preview. Use `Editar conteúdo e publicar` for the existing publication workflow only after approving the content. Opening the wizard or preview does not save or publish.

## File justification (delta beyond PR #287)

| File | Reason |
| --- | --- |
| `src/components/workspace/contexts.ts` | Two requested labels; same IDs, order, routes and permissions. |
| `src/components/site-builder/WebsiteSetupWizard.tsx` | Canonical fields, safe error/retry/save state, preserved menu, honest supported controls, actual preview and publication entry. |
| `src/components/site-builder/WebsitePreview.tsx` | Scaled desktop/tablet/mobile rendering of the actual same-origin website. |
| `src/components/site/CmsPreviewOverlay.tsx` | Authenticated saved snapshot/menu, truthful source/error states, removal of retired publish action and cache cleanup. |
| `src/lib/website-builder-state.ts` | Preserve existing menu identities/metadata and canonical title lines. |
| `src/lib/website-preview-policy.ts` | Reject tenant mismatch/ambiguous or inactive canonical targets; bounded framing policy. |
| `src/lib/website-branding-css.ts` | Share the unchanged existing branding projection with private preview. |
| `src/lib/api/menu.functions.ts` | Export the existing safe menu normalizer for reuse. |
| `src/lib/api/site-versions.functions.ts` | Private preview with server session/host equality and public-safe projection. |
| `src/lib/api/tenant-configuration.functions.ts` | Server-authorized canonical preview target. |
| `src/lib/api/tenant-configuration-authority.server.ts` | Actionable safe 42883/authority messages, without permission changes. |
| `src/routes/__root.tsx` | Shared branding CSS and omission of analytics/campaign runtime in preview. |
| `src/server.ts` | Same-origin preview framing and private/no-store HTML; other security headers preserved. |
| `supabase/migrations/20260914210012_7fdd3240-0b97-4fdd-8c5e-9cc92af6d9ba.sql` | Exact applied six-writer correction, no tenant data or ACL mutation. |
| `run-cms-website-recovery-specs.mjs` | Actual wizard DOM and private-preview handler under controlled authority/failure fixtures. |
| `run-round-47-plan-address-specs.mjs` | Supply the actual extracted framing-policy dependency to the existing CSP runtime test; preserve every postal/security assertion. |
| `run-round-56-approved-navigation-specs.mjs` | Explicit owner-approved tenant label assertions; existing suite retained. |
| `run-pr-m2-analytics-tracking-conversion-events-functional-completion-specs.ts` | Test default frame denial and narrowly bounded preview exception. |
| `.github/workflows/cms-website-recovery.yml` | Execute focused tests, typecheck and build at PR head. |
| `run-pca-05r-prerequisite-closure-manifest-specs.mjs` | Explicit migration classification, exact counts and changed-migration guard. |
| `docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json` | Generated exact hash inventory; preserves historical rehearsal. |
| `docs/operations/CMS_WEBSITE_RECOVERY.md` | Impact, evidence, file reasons and concrete acceptance path. |

## Transfer hold and remaining evidence

Automatic approval review rejected the attempted upload of `cms-correction-overlay.json.xz` (17 files) to the protected Lovable project's file storage. Reason: prior explicit transfer authorization covers the eight PR #287 files and four build files, not the thirteen new CMS source files. No alternate transfer or native-code reconstruction was used to bypass the rejection. No new UI publication or Worker version was created in this cycle. Database correction above is applied; UI correction remains in GitHub pending this specific transfer authorization.

Archive SHA-256: `25dd41185a4c7079a3171c0cdb3ff66f1d337e31d27cb11117805026daa6a222`. Canonical application source fingerprint: `5115717eb4d2207ea831db50fe60070b234d4bd77abd7fb488e54d6509c34b02` (684 files). The thirteen source files are the thirteen `src/` entries in the file-justification table; the four build-only files are `package.json`, `bun.lock`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, unchanged from the canonical build contract. They must only overlay the isolated Worker build, not replace the protected project's managed integration files.

Initial CI surfaced a test-harness missing dependency in round47 after extracting the frame policy; it is corrected by loading the real policy, without changing any assertion. The two broad release jobs also reached a previously hidden historical PCA-12B locked-source mismatch: `supabase/config.toml` expected SHA-256 `7d405383925631b3bd8b4f5be82b85370316407c631f5a2374d1cec29cbab020`, current `deaf7d50c74a24a1af7fe8f7d490cdde1607ae64c8954b92cc2b37473ee0a48e`. That file and the PCA-12B source locks are unchanged by this PR. Do not revise historical hashes or revert approved domain configuration merely to mark this gate green. This PR must not be represented as all-CI-green or ready to merge while those jobs fail.
