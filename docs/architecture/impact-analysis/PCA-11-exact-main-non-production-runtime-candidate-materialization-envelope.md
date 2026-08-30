# PCA-11 — Exact-main non-production runtime candidate materialization envelope

## Status

**Repository envelope implemented — candidate not materialized**

```text
GATE = PCA-11_EXACT_MAIN_NON_PRODUCTION_RUNTIME_CANDIDATE_MATERIALIZATION_ENVELOPE_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN = 43eb3ff63123e3b0a02b779121e398fec107938f
SOURCE_TREE = 21a0d13bd0c4620dcdb46c00fe69a23ef779d738
PCA10_RESULT = ACCEPTED_READ_ONLY
CANDIDATE = CLOUDFLARE_WORKERS / rm-prime-pca11-hml
CANDIDATE_QUALIFICATION = CONDITIONALLY_ELIGIBLE_NOT_MATERIALIZED
ENTRY_STATE = BLOCKED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY
```

## 1. Authority lock

The protected GitHub `main` SHA/tree is the only source authority. PR #177 was
merged as `43eb3ff63123e3b0a02b779121e398fec107938f`; its tree is byte-identical to
the exact-head WRI proof tree. Post-merge Release Gate `33275785259` and WRI run
`33274097926` both completed successfully.

The canonical database remains the same Lovable-managed Supabase project. The
Owner has no direct Supabase execution or secret-custody path. PCA-11 performs
no database query, schema action or Supabase transport fallback.

## 2. PCA-10 facts absorbed

PCA-10 inspected authenticated provider state read-only and selected a new,
dedicated Cloudflare Worker as the only available exact-main candidate path.
The existing Lovable publication is on historical commit
`9d64c7ac6c1259652a70022db08583139cb368af`; the existing Worker
`rm-prime-wri01-hml` contains historical DCA/WRI/BCR state. Neither may be
reclassified or reused as the candidate.

The exact-main WRI proof reported:

```text
COMPILED_MODULES = 379
STATIC_ASSETS = 161
UPLOAD_KIB = 8455.96
GZIP_KIB = 1745.22
WRANGLER_DRY_RUN = success
LOCAL_WORKERD_PROOF = success
```

The compressed script and asset count fit the published Workers Free
dimensional limits. This does not prove the Free CPU allowance of 10 ms per
request. Paid Workers remains a post-test contingency, not a prerequisite;
the authenticated API did not expose an authoritative billing-tier assertion.

Official capability references:

- <https://developers.cloudflare.com/workers/platform/limits/>
- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/>
- <https://developers.cloudflare.com/workers/runtime-apis/nodejs/>
- <https://supabase.com/changelog>

## 3. Selected candidate boundary

```text
ACCOUNT = existing authorized RM Prime Cloudflare account
WORKER = rm-prime-pca11-hml
ENVIRONMENT = homologation
SOURCE = exact protected main SHA/tree only
MODE = INACTIVE_VERSIONED_PREVIEW_ONLY
WORKERS_DEV = false
ROUTES = []
CRONS = []
DNS_MUTATION = false
ACTIVE_DEPLOYMENT = prohibited
PRODUCTION = prohibited
REAL_TRAFFIC = prohibited
```

The target Worker must be absent before creation and must begin with zero
deployments and zero secrets. The source and static assets must be built from
the exact authorized SHA, accompanied by deterministic artifact digests. Any
created version remains inactive. Preview exposure stays disabled until exact
host authority, managed bindings and traffic control are proven.

## 4. Final compatibility findings

### 4.1 Preview-host authority

The application accepts localhost and `.lovable.app` only as explicit
development hosts. A versioned Cloudflare preview uses a `.workers.dev` host,
which current code classifies as a canonical product domain. Because that host
is not in the Same-Backend domain registry, public tenant resolution cannot be
claimed functional. Broad `.workers.dev` acceptance would weaken tenant
authority and is prohibited.

The corrective must accept only one provider-resolved, exact preview hostname
through an external allowlist and map it to an explicitly authorized synthetic
tenant slug. No suffix-wide heuristic, forwarded-host trust or real tenant
mapping is allowed.

### 4.2 Managed-binding bridge

The accepted SPR-03 bridge is hard-coded to historical Worker
`rm-prime-wri01-hml`. It cannot safely provision the dedicated candidate.
Its frozen binding set also does not represent the complete PCA-11 runtime
classification. Reusing it would risk placing exact-main secrets on historical
provider state and therefore fails closed.

The corrective must bind an exact expected account, Worker, bootstrap version,
source fingerprint and binding-name allowlist. Target selection must be
validated external input, never arbitrary request data. Secret values remain
inside Lovable-managed server custody and Cloudflare encrypted bindings; they
must never enter Git, chat, browser, artifacts or logs.

### 4.3 Runtime bindings

Required plain server bindings are `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `RM_PRIME_AUTH_SITE_ORIGIN` and the three
`RM_PRIME_EMAIL_*` identity values. `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` are public build-time inputs.
`SUPABASE_SERVICE_ROLE_KEY` is a required server secret and remains
Lovable-custodied. `LOVABLE_API_KEY`, `CLOUDFLARE_API_TOKEN_DCA01_HML` and
`PORTAL_DLQ_RETRY_SECRET` may remain unavailable only when their feature probes
are explicitly reported unavailable rather than successful.

## 5. Impact

- Product and schema behavior are unchanged.
- `wrangler.jsonc`, migrations, application code and canonical types are unchanged.
- No Worker, version, preview URL, route, DNS record, deployment or secret is created.
- No Lovable agent or database operation is performed.
- HVP-01/HRC-01 and PR #105 remain terminal/historical.
- DCA-02-BL2 R2 remains deferred for post-homologation/pre-production.

## 6. Decision and successor

PCA-11 safely reduces the runtime blocker to two repository compatibility
corrections plus later external proof. Candidate materialization is not ready
and homologation remains unauthorized.

```text
NEXT_GATE = PCA-11R_CLOUDFLARE_DEDICATED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION
NEXT_GATE_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
```
