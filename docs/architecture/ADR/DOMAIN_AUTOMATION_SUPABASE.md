# Domain automation — Supabase executor / Cloudflare for SaaS

Owner decision recovered from 2026-08-12 and explicitly reaffirmed 2026-09-13. This supersedes the scheduled-Worker requirement in the DCA-01 runbook and the broad Lovable API external blocker in DOMAIN_CONNECTION_EXECUTION_SAFETY.md. It does not supersede tenant isolation, provider identity claims, the state machine, or the prohibition on live writes in this execution.

## Impact before implementation

PR #281 head dc0bf6de453dd520d655a9c5e5231215001372bc and base 7f01dd2a23c4d55e961cc974483b149f583c0644 reconciled once. Existing queue fixes are preserved. Read AGENTS.md, OWNER_UI_APPROVALS.md, DCA-01-domain-activation-operator-runbook.md, DOMAIN_CONNECTION_EXECUTION_SAFETY.md, REAL_DOMAIN_EXECUTION_PREPARATION.md and relevant source. The July continuity attachment is historical (including obsolete impersonation guidance). Current owner instructions prevail.

One authenticated Supabase Edge Function runs the existing processor and repository RPCs; pg_cron/pg_net invoke it using a dedicated secret in Vault. Domain processing is removed from Worker scheduled events. Packaging reuses canonical TypeScript through a deterministic build, not a copied alternative state machine. Each invocation is bounded and accepts no tenant, hostname, job or activation input. Authentication precedes any database/network work. No new database privileges or direct status writes.

The legacy `capabilities.zones[registrableDomain]` map remains explicitly the delivery-zone assignment required by the existing DCA-02 SQL claim boundary. A separate `customer_dns_zones` map supplies DNS zone id and DNS read credential reference. Never infer one from the other. Provider-owned DNS configuration plus public resolution establishes flattening; public shared IP alone does not prove tenant ownership. Provider identity and TLS remain separate required evidence. HTTPS routing must also be checked before reconciliation succeeds.

## Plan and API verification

Owner screenshot: SSL for SaaS Basic active; Workers Free is a separate subscription. The delivery zone's Free Website response does not negate metered SaaS billing. No Workers upgrade is required for Supabase automation. Official docs inspected on 2026-09-13:

- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/ — individual custom hostnames, managed certificates, custom origins available; 100 included and up to 50,000 on self-service plans. Do not confuse included quota with maximum or claim all Enterprise features from an active Basic subscription.
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/create-custom-hostnames/ — create/observe exact hostname and SSL status. Existing API adapter does not send custom_metadata.
- https://developers.cloudflare.com/dns/cname-flattening/ — apex CNAME returns addresses; use customer DNS configuration and independent public observations.
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/reference/connection-details/ — fallback origin preserves Host and uses the customer hostname for SNI. This requires origin acceptance; dashboard Live is not that test.
- https://supabase.com/docs/guides/functions/schedule-functions and /auth — pg_cron/pg_net, Vault and function authentication. Changelog markdown endpoint returned an error; current feature docs checked.

No Enterprise wildcard custom hostname, custom metadata, SNI rewrite or paid Apex Proxying is required by this implementation. Fixed A records to the current Lovable IP are not treated as the future SaaS DNS plan. Customer cutover is a later controlled operation. Root and www are independently reserved and verified records, with www represented as an alias of the same tenant's canonical generation.

## Acceptance boundary

Controlled tests must cover three tenants, immutable jobs, obsolete generations, API/TLS failures, malformed configuration, insufficient evidence and cross-tenant redirects. No real DB/queue/DNS/provider/cron/deployment mutation is authorized. Deployment must use the managed backend; a disconnected Supabase management connector is not a reason to create an alternative project. Origin routing, real credentials and production acceptance are validated during the documented rollout, not inferred from fixtures.

## Files changed and justification

| Path | Justification |
| --- | --- |
| `.github/workflows/pr-m2-consolidated-corrective-gate.yml` | Wire exact domain-change scope and mandatory controlled checks; managed runtime/package check in access workflow. |
| `.github/workflows/release-gate.yml` | Wire exact domain-change scope and mandatory controlled checks; managed runtime/package check in access workflow. |
| `.github/workflows/tenant-access-support-recovery.yml` | Wire exact domain-change scope and mandatory controlled checks; managed runtime/package check in access workflow. |
| `.github/workflows/wri-01-worker-runtime-gate.yml` | Assert local scheduled events do not dispatch domain work; retain fetch-context, process cleanup and dry-run proofs. |
| `scripts/verify-wri-01-worker-bundle.mjs` | Prove the deployed application bundle contains no domain queue lease; retain all unrelated bundle checks. |
| `AGENTS.md` | Mandatory documentation/evolution consultation and concrete owner action rule. |
| `docs/architecture/ADR/DOMAIN_AUTOMATION_SUPABASE.md` | Record decision, impact, supersession, plan evidence or concrete rollout responsibilities and configuration. |
| `docs/architecture/impact-analysis/DOMAIN_CONNECTION_EXECUTION_SAFETY.md` | Record decision, impact, supersession, plan evidence or concrete rollout responsibilities and configuration. |
| `docs/operations/DCA-01-domain-activation-operator-runbook.md` | Record decision, impact, supersession, plan evidence or concrete rollout responsibilities and configuration. |
| `docs/operations/DOMAIN_AUTOMATION_ROLLOUT.md` | Record decision, impact, supersession, plan evidence or concrete rollout responsibilities and configuration. |
| `run-dca-01-domain-cloudflare-activation-specs.ts` | Replace obsolete Worker assertions with the sole Supabase executor requirement. |
| `run-wri-01-cloudflare-worker-runtime-specs.ts` | Replace obsolete domain scheduler assertions; preserve application Worker request-context and deployment checks. |
| `run-round-56-approved-navigation-specs.mjs` | Preserve all prior navigation checks; assert exact DNS display and new automatic default. |
| `scripts/domains/build-edge.mjs` | Deterministic canonical Edge packaging or explicit later-authorized scheduler installation; no live execution. |
| `scripts/domains/schedule-managed-processor.sql` | Deterministic canonical Edge packaging or explicit later-authorized scheduler installation; no live execution. |
| `src/components/domains/TenantDomainWorkspace.tsx` | Tenant-scoped DNS instructions, automatic progress and truthful user actions; existing visual identity preserved. |
| `src/components/domains/presentation/domain-processing.ts` | Tenant-scoped DNS instructions, automatic progress and truthful user actions; existing visual identity preserved. |
| `src/lib/api/tenant-domain.functions.ts` | Enqueue observation on authenticated challenge creation/rotation, retaining server authority. |
| `src/lib/domains/cloudflare-adapter.server.ts` | Observe authenticated exact customer DNS; managed HTTP certificate validation; bound request timeout. |
| `src/lib/domains/dns-observation.server.ts` | Public address observation and rejection of private/reserved probe destinations. |
| `src/lib/domains/domain-dns-plan.server.ts` | Verify current-generation CNAME plan and authoritative flattening plus public resolution. |
| `src/lib/domains/domain-edge-handler.ts` | Authenticate scheduler before I/O; reject caller-supplied domain/tenant; bounded single lease. |
| `src/lib/domains/domain-https-observation.server.ts` | Pinned-address verified-TLS probe; reject wrong signature, redirect and generation. |
| `src/lib/domains/domain-job-lifecycle.ts` | Classify stale jobs and preserve challenge regeneration on expiry. |
| `src/lib/domains/domain-jobs.server.ts` | Reuse canonical processor, automatic ownership retry and obsolete-proof cancellation. |
| `src/lib/domains/domain-reconciliation.server.ts` | Require fresh DNS and signed HTTPS origin evidence before existing activation transition. |
| `src/lib/domains/domain-repository-job.server.ts` | Retain immutable preparation identity and existing lease/completion RPCs. |
| `src/lib/domains/domain-repository-provider.server.ts` | Separate delivery-zone binding from customer DNS read mapping without altering DCA-02 SQL identity. |
| `src/lib/domains/domain-routing-contract.ts` | Bind proof to nonce/domain/tenant/generation and exactly one same-tenant canonical. |
| `src/lib/domains/domain-routing-proof.server.ts` | Server-only diagnostic response for exact verified hostname; no content or activation bypass. |
| `src/lib/runtime/wri-01-cloudflare-nitro-plugin.server.ts` | Remove the second domain scheduler hook while preserving request context hooks. |
| `src/server.ts` | Remove domain scheduler; serve server-bound routing proof before public tenant content. |
| `supabase/config.toml` | Declare dedicated-secret Edge authentication; preserve existing function configuration. |
| `supabase/functions/domain-processor/.gitignore` | Single deployable Edge entry; generated canonical code excluded from source and built as CI artifact. |
| `supabase/functions/domain-processor/index.ts` | Single deployable Edge entry; generated canonical code excluded from source and built as CI artifact. |
| `tests/domains/connection-execution.mjs` | Controlled domain behavior, authority, failure and runtime regression coverage; no external writes. |
| `tests/domains/edge-runtime.ts` | Controlled domain behavior, authority, failure and runtime regression coverage; no external writes. |
| `tests/domains/supabase-automation.mjs` | Controlled domain behavior, authority, failure and runtime regression coverage; no external writes. |

## Controlled validation

PASS: domain ownership, membership, connection execution, three-tenant Supabase automation, all 174 DCA assertions, approved navigation and related DOM regressions, TypeScript and production build. Exact-head CI and Deno import/runtime checks are reported in PR #281. No real database, queue, DNS, provider, cron, publication or tenant content action is claimed.

## PR #281 CI completion — owner extension, 2026-09-13

Continued from `2bf2b4b3894fddb21b1e0e1928a8728d1cbaaec5`; PR/base reconciled once and unchanged. The owner expressly expanded scope to the six inherited CI failures. Consulted AGENTS.md, this ADR, DOMAIN_AUTOMATION_ROLLOUT.md, the prior PR report and the failing workflow log. Production code, database definitions, dependencies and approved interfaces are unchanged in this follow-up.

The five Round 44/46/48/49/50 failures came from two blanket `git diff` assertions against old UI delivery commits. Those assertions conflated accepted backend evolution with browser isolation. They are replaced by checks of actual browser build inputs AND external imports; server functions, Supabase clients, SQL/functions and server runtime dependencies must be absent. Existing DOM, tenant separation, false-activation, privacy, authorization and denial assertions remain. Round 44 additionally executes the current Round 42 production wrapper/authority regression. Mutation probes demonstrate that including or externalizing privileged dependencies fails the new boundary. No test job is disabled, and no known failed assertion is marked passed without a replacement contract.

The `node:async_hooks` failure was specifically in `tests/round65/journey.mjs`, executed by the Round 52 workflow, not in the standalone Round 52 UI runner. Its login bundle missed the existing tenant, tenant-selection and tenant-lifecycle fixture mappings used by the current Round 51 test. Update only those explicit test transports, retain real Node server validators/auth middleware and isolated PostgreSQL RPCs, and assert both browser bundles contain no backend. Do not polyfill server APIs into the browser or change production dependencies.

| Follow-up path | Reason |
| --- | --- |
| `run-round-44-broker-identity-ui-specs.mjs` | Replace historical freeze with current production authority tests and browser boundary; preserve every interaction case. |
| `run-round-46-empty-onboarding-specs.mjs` | Replace historical freeze with actual backend-free browser boundary; preserve all shared Round 46/48/49/50 cases. |
| `tests/ci/controlled-browser-boundary.mjs` | Require build metadata and reject actual or external privileged/server dependencies. |
| `tests/ci/controlled-browser-boundary.spec.mjs` | Build negative fixtures demonstrating that the boundary rejects injected and externalized backend modules. |
| `tests/round65/journey.mjs` | Restore exact auth fixture mappings and enforce browser/server packaging separation; retain real server/SQL journey. |
| `.github/workflows/pr-m2-consolidated-corrective-gate.yml`, `.github/workflows/release-gate.yml` | Include only these explicit follow-up test paths in the existing corrective scope; all controlled checks still run. |
| `docs/architecture/ADR/DOMAIN_AUTOMATION_SUPABASE.md` | Record owner scope extension, impact, replacement assertions and evidence locations. |

Local controlled validation: Round 44, 46, 48, 49 and 50 runners passed; standalone Round 52 UI passed; login browser packaging passed without `node:async_hooks`. The complete PostgreSQL/login/logout journey and final-head CI results are recorded in PR #281. Live application remains a later operation under DOMAIN_AUTOMATION_ROLLOUT.md; no merge or infrastructure action in this execution.

The first follow-up CI (`eaa4231`) passed the integrated SQL/login/logout journey, then exposed the same stale packaging in the subsequent Round 54 navigation runner. That runner still tested the old `/admin` role/impersonation path. Updated its explicit fixture transports and assertions to the approved server-resolved legacy redirect plus `/$tenantSlug/admin` route. Retained role denial/unavailable authority/shared-menu assertions and added three-tenant slug mismatch, anonymous login return-path and server revalidation cases. `run-round-54-navigation-context-specs.mjs` is the only additional test file; the two existing CI scope lists also include it. Round 53 and the Round 52 server contracts passed locally. No production navigation change.

## Live rollout corrective — private DNS credential reference, 2026-09-14

Owner subsequently authorized the required live delta end to end. Baseline is merged PR #281, e6e011625ec1958efc4451fca55e0966e90de1b8. Consulted AGENTS.md, this ADR, DOMAIN_AUTOMATION_ROLLOUT.md and current backend evidence. Do not reinterpret earlier code-only restrictions as the current authorization.

The authenticated tenant changed its mode to api_automated (generation 1, lock 2), cancelling the 11 old-mode jobs through the existing command. Vault-to-Edge authentication passed without exposing secrets; new runtime credential names passed the four protected configuration-environment Cloudflare GETs. The sole processor prepared the exact root CNAME plan (HTTP 200, succeeded 1), and the operator applied it to the existing customer DNS record. No realone.com.br DNS record was changed. Scheduling remains off pending successful completion.

Actual observe_required_dns jobs failed domain_secret_reference_missing, including after an unchanged Edge redeploy. Reproduced cause: getProviderAccountForDomain passed private capabilities through objectValue, which deliberately redacts credential_reference to [redacted]. This is a repository mapping defect, not evidence of missing user secrets. Preserve this distinction between sandbox access and actual job execution.

Fix scope and file justification: src/lib/domains/domain-repository-provider.server.ts reads only the env:NAME pointer from the exact server-selected registrable-domain configuration, validates its syntax, and preserves all existing sanitized projections. tests/domains/supabase-automation.mjs exercises the real mapper for three tenants, proves the original failure, rejects other-tenant assignments and malformed/inline references, and verifies diagnostic output remains redacted. This ADR records impact, authorization and evidence. No schema, UI, role, membership, tenant activation predicate, or alternate scheduler is introduced.

Controlled regression failed before the fix with actual [redacted] versus expected env:CF_DNS_1, then the full Supabase domain automation suite passed. Existing signed origin, TLS, redirect rejection, isolation and API-failure cases remain enabled. Live connection is not claimed by these tests. Publish/deploy only the corrected canonical artifact and resume through the state-machine recovery transition; preserve failed job history.
