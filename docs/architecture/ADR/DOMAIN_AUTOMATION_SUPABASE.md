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
