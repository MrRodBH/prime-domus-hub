# Domain connection execution safety — 2026-09-13

> Superseded integration boundary (owner instruction 2026-09-13): see `../ADR/DOMAIN_AUTOMATION_SUPABASE.md` and `../../operations/DOMAIN_AUTOMATION_ROLLOUT.md`. The earlier broad Lovable API/support blocker and Worker executor direction below are historical. Queue safety work remains valid.

## Baseline and authorization

Owner authorizes impact analysis, repository implementation, controlled tests and a PR. Baseline `7f01dd2a23c4d55e961cc974483b149f583c0644`, tree `10af54073707702e525860574fe99e65d6f2b3ca`. No live database, queue, provider, DNS, cron, publication or merge is authorized. The local source snapshot has the exact audited tree; remote commits will use the audited main parent.

## Evidence and external boundary

The owner shows apex/www for REAL ONE and RM Prime as Live in Lovable. Cloudflare DNS has A records for the customer apex/www, and the canonical application has verified the tenant TXT. These are distinct observations, not the domain activation predicate. The current application adapter is Cloudflare Custom Hostnames; no supported runtime-accessible Lovable domain-status API is exposed in the inspected tools or public API documentation. Do not invent one, scrape dashboard sessions, adopt a screenshot as authority, compare shared IPs as tenant proof, or fall back between providers.

The existing canonical delivery contract remains Cloudflare for SaaS, with original Host/SNI, exact server-owned provider binding, tenant/generation ownership, DNS observation, SSL and alias checks. The staged REAL ONE delivery infrastructure is documented in REAL_DOMAIN_EXECUTION_PREPARATION.md. That path is not yet the live customer's direct-A hosting integration. This PR cannot truthfully activate direct Lovable hosting; end-to-end connection remains Blocked External. A future direct-hosting adapter requires a supported authenticated provider observation API (project, exact hostname, active routing/TLS, redirects), server credentials and an explicit architecture decision replacing the provider contract. A production Cloudflare path instead requires the existing staged origin to serve the original tenant Host/SNI, separate customer/delivery-zone mappings, protected runtime credentials, apex provider-DNS evidence and a supported executor. No silent choice or cutover is made here.

## Corrections implementable without fabricating provider support

1. Stable preparation identity: one DNS-preparation job per tenant/domain/generation/mode/lock version. Timestamps and manual retries cannot supersede the ownership continuation. Conflict reads use the exact idempotency key and never overwrite pending, leased or completed work. Failed-state recovery increments domain version through the existing command; it does not reset a leased job.
2. Classify old generation, retired domain, superseded mode and already-completed phase jobs before execution. Cancel only the exact leased job through the existing completion RPC, preserving attempts/history; do not bulk-cancel or pick newest. A cancelled obsolete task is not a successful domain activation.
3. A failing attempt cannot regress a domain whose generation, version or phase advanced concurrently. Identity/version errors never mutate domain status. Existing domain locks remain authoritative for mutations; no new SQL privileges.
4. Expose a read-only, tenant-scoped processing summary in Domains. Distinguish TXT ownership, queued work with zero attempts, processing/failure and activation. Check Status refreshes persisted state; its success does not claim DNS/SSL validation. Preserve palette, navigation and theme. Do not expose queue payloads or provider credentials in the summary.

## Scope and validation

Allowed files: domain job repository/consumer, a pure lifecycle policy, tenant domain presentation, isolated domain tests and narrowly scoped CI wiring, this impact document. No schema, API activation predicate, public resolver, provider switch, DNS or TLS weakening. Existing apex/www and redirect authority remain fail-closed. Controlled fixtures cover concurrent duplicate enqueue, tenant/domain/generation separation, immutable payload, old tasks, phase/version races, operational errors, blocked provider prerequisites and UI status messages. Existing ownership, membership, activation and navigation tests plus typecheck/build are retained where executable. Network and database access in new tests are replaced by fixtures; results must separate controlled validation from real hosting acceptance.

## Rollout and completion

Deliver a draft PR while external activation prerequisites remain unresolved. No cron activation or cleanup accompanies this PR. Rollback is reverting repository changes before publication; no live state changed in this execution. Do not present this safety correction as a connected website or repeat owner DNS rotation.

References: https://docs.lovable.dev/integrations/lovable-api ; https://docs.lovable.dev/features/custom-domain ; docs/architecture/impact-analysis/REAL_DOMAIN_EXECUTION_PREPARATION.md.

## Validation performed

- PASS `node tests/domains/connection-execution.mjs`: eight concurrent retries converge on one immutable preparation; separate tenant/domain/generation/mode/version operations remain separate; exact-key conflict failure is closed; actual consumer cancels obsolete tasks through completion, preserves concurrent progress, rejects absent provider/CNAME evidence; activation predicate rejects dashboard/shared-IP/HTTPS claims, missing SSL, unmatched alias and wrong-generation binding.
- PASS existing `tests/domains/ownership-verification.mjs` and `membership-authority.mjs`.
- PASS `node --import tsx/esm run-dca-01-domain-cloudflare-activation-specs.ts`: 174 assertions.
- PASS `ROUND52_JSDOM_MODULE=/tmp/rmprime-tests/node_modules/jsdom/lib/api.js node run-round-56-approved-navigation-specs.mjs`: navigation, brand isolation, domain actions/removal/clipboard and existing CMS DOM regressions. The first invocation omitted the required jsdom location; rerunning with the existing dependency resolved the harness error without source changes.
- PASS `tsc --noEmit --pretty false`; PASS `vite build`. Build emitted existing deprecated-validator/chunk/config warnings. No publish command executed.
- PASS `git diff --check`.

Tests use the exact source tree recovered from an existing local checkout and its cached dependencies. No dependency changes or new database migration were needed. New assertions run in the existing access/release CI scopes, without suppressing prior gates. Remote CI is reported separately in the PR.

## File justification

| File | Reason |
| --- | --- |
| `domain-repository-job.server.ts` | Stable preparation key, tenant identity guard and immutable exact-key conflict read. |
| `domain-job-lifecycle.ts` | Explicit obsolete-task and current-version failure policies. |
| `domain-jobs.server.ts` | Apply policies through existing lease/completion and transition authority. |
| `domain-processing.ts` | Render the persisted processing state without implying provider verification. |
| `TenantDomainWorkspace.tsx` | Show the processing message, prevent duplicate pending retries, distinguish terminal task responses. |
| `tests/domains/connection-execution.mjs` | Execute the new behavior and negative authority cases with isolated I/O. |
| Three existing access/release workflows | Include exact changed domain paths and make the new tests mandatory; retain previous checks. |
| This impact analysis | Record authorization, single-provider boundary, external prerequisites, scope and results. |
