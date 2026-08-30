# PCA-11 — Exact-main non-production runtime candidate materialization envelope

## Binding authority

```text
REPOSITORY_AUTHORITY = PROTECTED_GITHUB_MAIN_ONLY
CANONICAL_BACKEND = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
CANDIDATE_PROVIDER = CLOUDFLARE_WORKERS
CANDIDATE_WORKER = rm-prime-pca11-hml
CANDIDATE_MODE = INACTIVE_VERSIONED_PREVIEW_ONLY
MATERIALIZATION_READY = false
```

This envelope is forward-only and repository-only. It selects a current
runtime adapter without making Cloudflare a permanent product authority.
Lovable remains the only allowed executor/custodian for canonical Supabase
operations and administrative secrets. Lovable must never perform GitHub operations.

## Candidate invariants

Before any provider write, all of the following must hold:

1. source SHA/tree equals the protected `main` authorized for materialization;
2. dedicated target Worker is absent and historical Worker reuse is impossible;
3. exact build, typecheck, bundle audit, Wrangler dry-run and local `workerd`
   proof pass on that same tree;
4. compiled manifest, source fingerprint and artifact digests are frozen;
5. generated Wrangler configuration is ephemeral, ignored and mode `0600`;
6. `workers_dev=false`, routes/crons/DNS empty and deployment count zero;
7. only a versioned preview may later be enabled, after traffic-control proof;
8. no real traffic, tenant mutation, fixture creation or production action occurs.

## Exact preview-host authority

The candidate preview hostname is provider-resolved and not known until safe
materialization. The current host authority does not accept `.workers.dev`.
The corrective must introduce an external exact-host allowlist with these
properties:

- one full normalized hostname, no wildcard or suffix-wide trust;
- one explicitly authorized synthetic tenant slug;
- fail closed on absent, malformed, duplicate or non-preview entries;
- no forwarded-host or payload authority;
- no mapping to a pre-existing or real tenant;
- byte-stable tests proving rejection of adjacent preview hosts.

Unqualified broad `.workers.dev` trust is prohibited.

## Managed binding and secret custody

The current SPR-03 bridge targets `rm-prime-wri01-hml` and cannot be reused.
The corrective must parameterize a dedicated-target contract while preserving:

```text
EXPECTED_ACCOUNT_ID = exact allowlisted account
EXPECTED_WORKER_ID = rm-prime-pca11-hml
EXPECTED_BOOTSTRAP_VERSION_ID = exact UUID
EXPECTED_SOURCE_FINGERPRINT = exact digest
EXPECTED_ACTIVE_DEPLOYMENT_COUNT = 0
EXPECTED_SECRET_COUNT_BEFORE = 0
NEW_VERSION_MUST_REMAIN_INACTIVE = true
OWNER_MAY_HANDLE_SUPABASE_SERVICE_ROLE_KEY = false
```

Request payloads may carry only identifiers/digests, never binding values.
Supabase administrative material remains in Lovable-managed server-side secret
custody. A temporary Cloudflare provisioner token may be handled only through
the separately authorized secure ceremony and must have account-scoped Workers
Scripts permissions without DNS, routes, zones, custom hostnames or token
administration.

### Binding classification

Plain runtime configuration:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `RM_PRIME_AUTH_SITE_ORIGIN`
- `RM_PRIME_EMAIL_SITE_NAME`
- `RM_PRIME_EMAIL_SENDER_DOMAIN`
- `RM_PRIME_EMAIL_FROM_DOMAIN`

Public build-time configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Mandatory server secret:

- `SUPABASE_SERVICE_ROLE_KEY`

Conditionally unavailable provider features:

- `LOVABLE_API_KEY`
- `CLOUDFLARE_API_TOKEN_DCA01_HML`
- `PORTAL_DLQ_RETRY_SECRET`

An unavailable provider binding must produce an explicit unavailable result;
it may never be represented as success.

## Future materialization sequence

The later, separately authorized sequence must be finite and fail-closed:

1. revalidate protected main and all exact-head gates;
2. read-only confirm target absence and historical Worker non-reuse;
3. build exact source with public inputs obtained through managed custody;
4. create the dedicated Worker/bootstrap version without deployment;
5. use the corrected Lovable-managed bridge for canary then final bindings;
6. verify secret names only, source identity and zero active deployments;
7. enable only the exact versioned preview after host/traffic controls pass;
8. run bounded runtime capability probes, including CPU-limit observation;
9. preserve rollback/teardown evidence and leave production untouched.

Any ambiguity, secret disclosure attempt, source drift, unexpected provider
object, active deployment, host-authority mismatch or binding-set mismatch stops
before exposure and selects deterministic teardown.

## Authorization boundary

```text
REPOSITORY_CORRECTIVE_AUTHORIZED = false
PROVIDER_MATERIALIZATION_AUTHORIZED = false
LOVABLE_SECRET_BRIDGE_EXECUTION_AUTHORIZED = false
SAME_BACKEND_READ_AUTHORIZED = false
FIXTURE_CREATION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
NEXT_GATE = PCA-11R_CLOUDFLARE_DEDICATED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION
```
