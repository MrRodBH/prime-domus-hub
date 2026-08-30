# PCA-11R — Cloudflare dedicated preview-host and managed-binding compatibility corrective

## Status and authority

```text
GATE=PCA-11R_CLOUDFLARE_DEDICATED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN=e766b68cc808a9de787b45f7c927de22aac62a3e
SOURCE_TREE=14ee24136b19168d08293f2bafb5932264867d12
REPOSITORY_AUTHORITY=PROTECTED_GITHUB_MAIN_ONLY
CANONICAL_BACKEND=LOVABLE_MANAGED_BACKEND_ONLY
CANDIDATE_WORKER=rm-prime-pca11-hml
CANDIDATE_MATERIALIZED=false
```

The corrective implements the two repository compatibility requirements found
by PCA-11. It does not authorize or perform candidate creation, Version upload,
Preview URL activation, Same-Backend access, fixture creation or homologation.

## Read-only pre-mutation revalidation

At `2026-08-30T16:03:59Z`, direct GitHub inspection proved protected `main` at
the exact SHA/tree above. Direct Cloudflare inspection returned only historical
Worker `rm-prime-wri01-hml`; dedicated target `rm-prime-pca11-hml` remained
absent. Provider reads occurred only for capability revalidation; provider
writes and deploys remained zero.

## Exact preview-host authority

The server now accepts a PCA-11 preview only through
`PUBLIC_TENANT_PREVIEW_HOST_MAP`. The external JSON map must contain exactly one
entry with this provider-resolved shape:

```text
pca11-hml-rm-prime-pca11-hml.<ACCOUNT_SUBDOMAIN>.workers.dev -> pca11-hml
```

`pca11-hml` is both the fixed Wrangler preview alias and the only allowed
synthetic tenant slug. Wildcards, suffix-wide `.workers.dev` trust, duplicate
entries, adjacent aliases, arbitrary slugs and real-tenant mapping fail closed.
Unknown `.workers.dev` hosts never fall through to the product-domain resolver.

Cloudflare documents aliased preview URLs as
`<ALIAS>-<WORKER_NAME>.<SUBDOMAIN>.workers.dev`; the repository-pinned Wrangler
`4.114.0` exceeds the documented minimum `4.21.0`. Versioned configuration
keeps `workers_dev=false`, `preview_urls=false`, routes zero and Cron zero.
Activation remains a later, explicit provider gate.

## Dedicated managed-binding bridge

Target selection is a closed server contract. Arbitrary request-selected
Workers are rejected. Historical SPR-03 remains bound to
`rm-prime-wri01-hml`; PCA-11R adds only `rm-prime-pca11-hml` with:

```text
EXPECTED_ACCOUNT_ID=68ec853e6b04a038f09fca5712d6b26b
EXPECTED_ACTIVE_DEPLOYMENT_COUNT=0
EXPECTED_PREVIEWS_ENABLED=false
EXPECTED_SOURCE_FINGERPRINT=required exact SHA-256
PROVISIONER_ENV=CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER
PROVISIONER_AS_WORKER_BINDING=false
```

The inactive canary carries only the six required plain runtime bindings:
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `RM_PRIME_AUTH_SITE_ORIGIN` and the
three `RM_PRIME_EMAIL_*` identities. The final inactive Version additionally
requires `SUPABASE_SERVICE_ROLE_KEY` as `secret_text`.
`LOVABLE_API_KEY`, `CLOUDFLARE_API_TOKEN_DCA01_HML` and
`PORTAL_DLQ_RETRY_SECRET` are optional allowlisted secrets; each absent value is
returned explicitly in `unavailableProviderBindings` and cannot be reported as
available. Values remain in managed server custody and never enter Git, chat,
request payloads, evidence or logs.

## Impact and decision

- Tenant authority remains server-only and exact.
- Canonical migrations, schema, RLS, grants and types are unchanged.
- Lovable performs no GitHub operation; Owner receives no Supabase secret.
- No Worker, Version, alias, route, DNS object, deployment, secret or fixture is created.
- PR #105, production and real tenant traffic remain untouched.

```text
PREVIEW_HOST_AUTHORITY_SUPPORTED=true
DEDICATED_MANAGED_BINDING_BRIDGE_SUPPORTED=true
EXACT_RUNTIME_BINDING_SET_FROZEN=true
REPOSITORY_COMPATIBILITY_READY=true
MATERIALIZATION_AUTHORIZED=false
CONTROLLED_HOMOLOGATION_AUTHORIZED=false
PRODUCTION_AUTHORIZED=false
NEXT_GATE=PCA-11R_PROTECTED_PUBLICATION_AND_DRAFT_PR
```
