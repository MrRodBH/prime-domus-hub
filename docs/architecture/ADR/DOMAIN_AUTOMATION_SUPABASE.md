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

## Native deployable artifact correction — 2026-09-14

After PR #282, native deployment failed with Module not found .../processor.generated.mjs despite the exact reviewed artifact existing on disk (blob f7dcb93fd49c8bf7fc87839dff20e0d0352c25ea). The managed packager excludes ignored files. Track the canonical generated sibling and remove only its ignore rule; this replaces the historical generated-artifact exclusion. CI compares the tracked artifact byte-for-byte with buildDomainEdge, retaining all behavior/security tests. The two existing CI scope lists include only this additional exact artifact path. No alternative executor, handwritten bundle, temporary ignore changes, permissions change, tenant status write, theme or navigation change.

Files justified: .gitignore and processor.generated.mjs make the existing function deployable; tests/domains/supabase-automation.mjs rejects stale generated code; the two corrective/release workflow scope lists admit the exact reviewed artifact without disabling gates; DOMAIN_AUTOMATION_ROLLOUT.md and this ADR record the actual native packaging contract and operator action. User authorization to complete the live domain delta remains in force.

## Managed HTTPS transport compatibility — 2026-09-14

PR283 deployed successfully with the reviewed artifact. Actual request 21094 completed DNS observation; request 21095 created the server-owned Cloudflare binding d726c58a-2e56-4ffa-b54d-6e2f958056c6. Cloudflare subsequently reported hostname and SSL active. Origin reconciliation request 21097 then failed with `Not implemented: ClientRequest.options.lookup`. This is an observed Deno Node-compatibility limitation, not missing DNS, credentials, or certificate issuance.

Use Deno.connect to the already validated public IPv4, then Deno.startTls with the original domain as hostname and default trusted certificates. This preserves IP pinning against DNS rebinding and certificate/SNI identity. Send only a bounded HTTP/1.1 probe with explicit Host and no credentials; parse at most 8192 bytes of headers, reject ambiguous proof/redirect headers, and close on completion/error/10-second deadline. Redirects remain observations for the existing same-tenant contract, never followed by the transport. Node runtime retains its existing pinned HTTPS implementation; both feed the same proof and state-machine logic, with one Edge scheduler. Missing native TLS capability fails closed.

Sources checked: Supabase changelog and [Node dependency support](https://supabase.com/docs/guides/functions/dependencies); Deno [network APIs](https://docs.deno.com/api/deno/network/) and [startTls example](https://docs.deno.com/examples/starttls/). The older Deno node:https implementation cannot be assumed to honor every Node transport option; merely replacing hostname with an IP would not establish verified original-host TLS in that implementation.

Files justified: domain-https-observation.server.ts implements native pinned TLS with bounded I/O; supabase-automation.mjs exercises the actual native branch, partial reads/writes, host/SNI separation, certificate rejection, header limits, duplicate proof rejection, missing capability and injection rejection while preserving three-tenant tests; processor.generated.mjs is rebuilt canonically; this ADR records live cause and application order. No DNS, provider object, secret or tenant data must be recreated. After deployment, resume the existing due SSL observation jobs; activation still requires fresh server-verified signed origin evidence. The global cron remains unapplied until the corrected live transport is verified.

## Origin rollout and safe proof diagnostics — 2026-09-14

Continued from PR284 merge 2541c8138c15e9d0610ce448ee6468cd7e3f53f2 under the owner's existing end-to-end live authorization. Reused AGENTS, this ADR and rollout evidence. Owner screenshots prove that the connected-domain menu exposes primary/disconnect only; stop requesting nonexistent DNS options there. Native inspection cannot confirm the proxy-mode flag. DNS is administered in Cloudflare.

Live DNS for the confirmed published project prime-domus-hub.lovable.app returned 185.41.148.1 and 185.41.148.2 (managed requests21217/21218). Native HTTPS probes to each address with original tenant Host/SNI and verified certificates returned204 with proof header, without redirect (message umsg_01m2frafgtfh18nn5t5megffyj). The previous fallback A185.158.133.1 had returned Cloudflare1000. After testing a proxied CNAME to the published project, the custom hostname returned to moved; the final tested origin is existing origin.realone.com.br record599a533bde49f04eb30adaf47c8970af, A185.41.148.1 proxied. Keep this origin address under operator monitoring against the published project's DNS; observed current reachability does not guarantee permanent IP allocation. The customer apex remains DNS-only CNAME sites.realone.com.br, recordf87efc8d783a8d4c97b81dddb18f9dd9. Platform apex, www and mail records were not changed. Existing custom hostname d726c58a-2e56-4ffa-b54d-6e2f958056c6 was refreshed after each distinct origin configuration change, never recreated. Provider subsequently reports hostname/SSL active; managed HTTPS request21223 returned204 with proof header. Neither is sufficient for tenant activation.

Actual canonical processor request21224 authenticated and retried with domain_provider_unavailable and empty result_sanitized. The domain remains pending_ssl (generation1, lock16): origin proof validation failed. The previous error could not distinguish HTTP response shape, absent proof and mismatched HMAC. Add only allowlisted scalar classification to the existing DomainError.safeDetail: phase, actual/expected status and booleans for response shape, proof presence/match and redirect presence. Never persist keys, HMAC values, nonce, bodies or Location URLs. No new endpoint, activation predicate, retry behavior, scheduling path or bypass. Three-tenant tests retain rejection of wrong proofs/cross-tenant redirects and assert the diagnostics contain no supplied proof/URL/identity. Local canonical bundle tests and TypeScript run before PR CI.

Files justified: domain-https-observation.server.ts adds safe failure classification; tests/domains/supabase-automation.mjs proves classification and absence of sensitive response data; processor.generated.mjs is rebuilt from canonical source; this ADR records the impact and observed rollout. Deploy this reviewed artifact, resume one existing due job and use its actual failure classification to correct the remaining runtime boundary. Do not recreate secrets by assumption or mark active directly. Record subsequent live result in the PR.
