# Domain listing membership schema correction — 2026-09-13

Baseline main: `7a6d7223831b061a6cfa9aa4ee4f7c0f298d384e`.

## Evidence and cause

The owner opened `/rmprime/admin/domains` and saw `Unknown domain operation error` instead of the domain list. Direct read-only inspection confirms the existing domain `6eda5a4e-be96-4756-b39b-746d886bc387` remains attached to RM Prime in `pending_ownership_verification`. No deletion occurred in this corrective.

The live `tenant_members` schema and generated TypeScript schema both define `membership_status`; neither defines `status`. `authorizeTenantDomainOperation` selected and filtered the nonexistent column before listing domains. A PostgREST plain-object error is reduced to the generic message by the existing domain error adapter. This is a concrete application/schema mismatch, not evidence that environment variables are missing.

## Minimal contract and impact

Use `membership_status = active` in the existing server-only authorization query, retain tenant/user equality and exactly-one membership requirements, and retain the existing operation-role matrix. Remove the `any` cast from that query so the generated database types participate in checking it. All tenant domain reads and commands reuse this boundary; no alternate read path is added. The upstream `requireTenant` continues to prohibit Super Admin tenant operations.

Allowed changes: the authority module, its isolated regression test, one test step in the existing access/recovery workflow, and this evidence document. No migrations, RLS, grants, credentials, DNS, provider configuration, domains, users, memberships, CMS records or website content are changed. No production Auth session is fabricated or reused by the test.

## Validation and completion limits

The schema-aware isolated regression reproduced the original failure with `42703: column status does not exist`. The corrected module is tested for active Admin access, inactive memberships, cross-tenant/cross-user rejection, membership cardinality, reader/writer role separation and database failure. Run existing tenant access tests, domain activation invariants, typecheck and build; audit PR checks before publication.

Published source identity must be measured independently of Git metadata. An unauthenticated route smoke test does not constitute authenticated domain-list acceptance. After publication, the owner's existing Admin session must refresh the domain view; only then issue its expiring ownership challenge. Domain connection prerequisites from `REAL_DOMAIN_EXECUTION_PREPARATION.md` remain pending: processor/runtime configuration, production provider credentials, apex DNS evidence, ownership, provider binding and SSL. Fixing the list does not activate the domain.

The owner-provided server logs from `2026-09-13T19:21:16Z` correlate through `cf_ray=a3a9838c2a1d8781`: GET `/` on `rmprimeimoveis.com.br` returned 500 and the browser boundary reported `PUBLIC_TENANT_NOT_RESOLVED`. Deployment reference `85ac2ea9-9218-4257-8ef2-58520e29722e` matches the previously published application. This public-host issue is distinct from the membership-column error on the authenticated domain-management page. No support ticket or secret inspection is required for this source correction.
