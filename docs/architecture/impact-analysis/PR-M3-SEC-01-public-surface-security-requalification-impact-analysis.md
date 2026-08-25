# PR-M3-SEC-01 — Public Surface Security Requalification and Impact Analysis

## Status

```text
STATE = Accepted as architecture-first input for PR-M3-SEC-02
SOURCE_MAIN = 2072e7cc97cd2583feb6d7e3acae169c173d86e5
SOURCE_TREE = 05c24a82421ff10134dc1ff8a383d927ab4c56bf
GITHUB_IS_TECHNICAL_AUTHORITY = true
SAME_BACKEND_HOMOLOGATION_CELL = binding
DATABASE_WRITE_DURING_ANALYSIS = false
PROVIDER_WRITE_DURING_ANALYSIS = false
PRODUCTION_CUTOVER = false
```

## Scope and authority

This document records the direct GitHub and Same-Backend requalification that
precedes PR-M3-SEC-02. Lovable scanner output is an input signal only. Every
finding below was compared with effective repository code, live RLS policy
metadata, grants, migration ledger and current row counts.

The server remains the sole authority for tenant, authorization and public data
projection. Client visibility flags, URL state, headers and provider metadata
are never authority. Missing or ambiguous evidence fails closed.

## Current Same-Backend snapshot

| Object | Rows | RLS | Material state |
|---|---:|---|---|
| `public.imoveis` | 0 | enabled | Public detail returns raw address fields before client-side hiding. |
| `public.cms_campaign_events` | 0 | enabled | Legacy `events_public_insert` and broad direct grants remain. |
| `public.corretores` | 4 | enabled | `corretores self update` and broad authenticated UPDATE remain. |
| `public.lead_origens` | 8 | enabled | Anonymous read policy/grants remain dormant behind restrictive tenant resolution. |

The canonical repository contains
`20260721190000_ptw_01_public_writer_dml_hardening.sql`, but the live migration
ledger does not contain that version or equivalent name. Historical migration
reapplication is prohibited; reconciliation must be a new forward-only
migration.

## Security findings matrix

### SEC-01-A — Public property address redaction

```text
FINDING = confirmed
SEVERITY = release_blocking_before_real_property_data_or_production
CURRENT_LIVE_ROWS = 0
ROOT_CAUSE = visibility decision occurs after server serialization
```

`obterImovel` selects and returns `endereco`, `rua`, `numero`, `complemento`,
`cep`, exact coordinates and visibility flags. The public route then decides
what to render. Hidden values can therefore exist in SSR payloads, query cache,
browser memory and debugging surfaces.

The public search also includes `endereco`, allowing a hidden value to influence
results. The accepted correction is a server-owned projection with exactly
`hidden | street | full`, removal of all raw fields before return and exact
coordinates only in valid `full` mode.

### SEC-01-B — Campaign event direct insert

```text
SCANNER_ANY_TENANT_CLAIM = false_positive
DIRECT_DATA_API_INTEGRITY_DRIFT = confirmed
SEVERITY = release_blocking_analytics_integrity
```

Anonymous requests resolve no tenant and cannot satisfy restrictive
`tenant_isolation` for an arbitrary tenant. The scanner's broad cross-tenant
statement is unsupported. The legacy permissive INSERT policy and broad direct
grants nevertheless remain, allowing an authenticated tenant-bound session to
bypass canonical campaign validation.

The accepted flow remains:

```text
request host
→ requirePublicWriterTenantFromRequest
→ recordPublicCampaignEvent
→ supabaseAdmin
```

### SEC-01-C — Broker self-update

```text
FINDING = confirmed
SEVERITY = release_blocking_profile_and_commercial_integrity
CROSS_TENANT_ESCALATION_PROVEN = false
```

The restrictive tenant policy prevents a proven cross-tenant write, but the
self-update policy and table grants allow the authenticated broker row to alter
sensitive professional and lifecycle fields including `team_id`, `cpf`, `slug`,
`ativo`, `status` and `foto_url`.

Direct authenticated mutation is removed. `adminSalvarCorretor` and
`adminExcluirCorretor` remain canonical tenant-authorized server writers.

### SEC-01-D — Lead-source anonymous read

```text
SCANNER_CURRENT_EXPOSURE = false_positive
HARDENING = required_before_release
SEVERITY = non_blocking_in_isolation
```

Effective anonymous SELECT returned no rows because tenant resolution is null
and `tenant_isolation` is restrictive. No legitimate public consumer was found.
The dormant public policy/grants are removed by least privilege while
authenticated CRM policies and server functions remain.

### SEC-01-E — Anonymous SECURITY DEFINER execution

```text
FINDING = partially_confirmed
PRIVILEGE_ESCALATION_PROVEN = false
SEVERITY = non_blocking_least_privilege_hardening
```

Anonymous execution is preserved for the two host resolvers and fail-closed RLS
helpers:

- `resolve_public_tenant_by_host(text)`;
- `get_canonical_redirect_for_active_alias(text)`;
- `get_current_tenant_id()`;
- `is_super_admin()`.

Anonymous execution is removed from `user_belongs_to_tenant(uuid)` because no
anonymous runtime contract requires it. Function bodies are unchanged.

## Impact analysis

### Multi-tenant isolation

The correction does not change tenant identity resolution, membership,
impersonation, tenant domains or restrictive RLS predicates. It removes surplus
direct authority and adds server-side output minimization. Super Admin without
explicit impersonation remains unable to establish tenant-scoped authority.

### Auth, Storage and provider boundaries

No Auth row, Storage object, bucket, signed URL contract, provider object,
secret or deployment is changed. Signed URLs remain presentation transport,
not authorization. Cloudflare, Stripe and external Supabase fallback are out of
scope.

### Data and migration safety

The repository migration performs policy/grant metadata changes only. It has
transactional preflight and postcondition checks, no row INSERT, UPDATE or
DELETE, and no function rewrite. Same-Backend application is deferred to
PR-M3-SEC-03 under separate explicit DDL authorization.

### Regression risks

Primary risks are removal of required public host resolvers, regression of
administrative reads, reintroduction of raw address fields and failure of
historical PR-M3/PR-M2/WRI contracts. The SEC-02 focused runner and Release Gate
cover these boundaries.

## Accepted implementation envelope

```text
FILES_ALLOWED = 11 exact paths
NEW_DEPENDENCIES = false
BUN_LOCK_CHANGE = false
DATABASE_APPLICATION = false
ROW_DML = false
AUTH_STORAGE_TENANT_MEMBERSHIP_DOMAIN_MUTATION = false
PROVIDER_DEPLOY_PUBLISH = false
PR_105_MERGE = false
FVS7_PARALLEL_SAFE = false
```

## Successor

After repository acceptance and post-merge Release Gate success, the only
successor is:

```text
PR-M3-SEC-03_SAME_BACKEND_PUBLIC_SURFACE_SECURITY_APPLICATION
```

SEC-03 must revalidate live state, apply only the SEC-02 migration in one
transaction, prove final policies/grants/functions and row-count invariance,
and emit the Lovable reconciliation capability preflight. Production publish
remains unauthorized.
