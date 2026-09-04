# PCA-15R — managed custody, source reconciliation, and repository corrective

## Decision

`ACCEPTED_REPOSITORY_CORRECTIVE_PENDING_PROTECTED_MERGE`.

This gate starts from GitHub `main@3897936276a0760fe4594bb5e2420ec0cbba2adb`
(tree `792210f61ad54265c46b7d931e6cebeff63a9817`) and does not promote any byte from
the divergent Lovable head. It adds the supported TanStack server route, makes the
managed Auth proof an ordering prerequisite for the future Cloudflare version call,
and adds an independent GET-only terminal reconciliation.

The active continuity authority ingested for this decision is
`RM_PRIME_CANONICAL_CONTINUITY.md` v4, updated 2026-09-04, SHA-256
`ad21e9c6eb7356d8b9c31f3cc1b42398ae39b00bd82eff7026a76fdcae27a17d`.
The restart handoff records a clean checkpoint: no interrupted-run main mutation,
open PR, PCA-15R branch, Cloudflare mutation, or provider residue.

LSR-02 remains `Rejected — Terminal`, implementation budget `0/2`, reopening
unauthorized. No LSR-02 path is part of this diff. PR-M3/frontend remains unblocked.

## Lovable support intake

The 2026-09-04 support response resolves the platform-capability question:

- creation of a new Supabase Edge Function is intentionally and permanently blocked
  for TanStack Start projects; existing functions remain editable;
- the supported replacement is `createServerFn` or a TanStack server route;
- Lovable-managed Supabase server credentials are injected automatically;
- server-only credentials and custom secrets must be read from `process.env` inside
  the handler execution, not exported and not captured at module scope.

The response is capability evidence, not repository authority and not a provider-write
authorization. This corrective therefore selects a raw TanStack server route and does
not create or deploy a Supabase Edge Function. The support references are Lovable's
[Edge Functions](https://docs.lovable.dev/features/edge-functions) and
[Secrets](https://docs.lovable.dev/features/secrets) documentation.

## Source-head reconciliation

`Lovable@b48ebd7905b9fcc1d496d69df0e2ff46abb6c1f9` descends from the exact GitHub base
but is 26 commits ahead in seven Lovable merge cycles. Its final diff touches 11 paths
with 7,647 additions and 1,917 deletions. It includes tracked server environment
variables, a dependency upgrade, a preview-token broker, generated type replacement,
an unexpected migration, and a tenant fallback that reuses the only mapped slug for
an otherwise unmapped host. That fallback is heuristic authority and is incompatible
with the fail-closed tenant contract.

### Classification of all 26 commits

|   # | Commit         | Classification                            | Disposition                                                                                 |
| --: | -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
|   1 | `6cbb8f01f093` | `REJECTED_UNAUTHORIZED_RUNTIME_DRIFT`     | Preview auth broker, tracked server env, dependency and generated-type drift; not promoted. |
|   2 | `b65a17e1bd12` | `REJECTED_DERIVED_LOCK_DRIFT`             | Lockfile consequence of commit 1; not promoted.                                             |
|   3 | `412f0e72b5e9` | `REJECTED_MERGE_SNAPSHOT`                 | Integrates commits 1–2 as “auth restore” without GitHub audit authority.                    |
|   4 | `03c25537e28a` | `SUPERSEDED_PARTIAL_REVERT`               | Removes part of the first runtime drift; not independently promotable.                      |
|   5 | `ad75f82e7e26` | `SUPERSEDED_LOCK_REVERT`                  | Lockfile counterpart to commit 4.                                                           |
|   6 | `ac9ec770d731` | `SUPERSEDED_MERGE_SNAPSHOT`               | Partial return toward the canonical tree; still historical only.                            |
|   7 | `3a31413a9f64` | `REJECTED_REPEATED_RUNTIME_DRIFT`         | Reintroduces preview auth/env/dependency changes.                                           |
|   8 | `47926219c644` | `REJECTED_TYPES_AND_LOCK_DRIFT`           | Regenerated types and lockfile without accepted schema authority.                           |
|   9 | `2d23cb64acd0` | `SUPERSEDED_PARTIAL_REVERT`               | Removes the repeated preview changes.                                                       |
|  10 | `98a1e2f3a350` | `SUPERSEDED_LOCK_REVERT`                  | Lockfile cleanup only.                                                                      |
|  11 | `0ad545776b88` | `SUPERSEDED_ZERO_NET_TREE`                | Merge tree equals canonical `main` tree; no byte to promote.                                |
|  12 | `24acb93e5fb2` | `REJECTED_REPEATED_RUNTIME_DRIFT`         | Third preview auth/env/dependency/type attempt.                                             |
|  13 | `f99ae74f5702` | `REJECTED_DERIVED_LOCK_DRIFT`             | Lockfile consequence of commit 12.                                                          |
|  14 | `a8facd3cbcda` | `REJECTED_UNEXPECTED_SCHEMA_DRIFT`        | Adds an unapproved migration and broad generated-type replacement.                          |
|  15 | `518ae34b4e46` | `REJECTED_UNQUALIFIED_RUNTIME_DEPENDENCY` | Makes preview resolution depend on the unexpected RPC.                                      |
|  16 | `3b2c4179f2c8` | `REJECTED_HOST_AUTHORITY_EXPANSION`       | Adds a new development-host suffix without the PCA-11 exact-host contract.                  |
|  17 | `860f567f1469` | `REJECTED_HEURISTIC_TENANT_FALLBACK`      | Reuses one slug for an unmapped host; violates fail-closed authority.                       |
|  18 | `650d7c3ba736` | `REJECTED_MERGE_SNAPSHOT`                 | Integrates commits 12–17 as a home-route fix; source remains rejected.                      |
|  19 | `ec7acdfff56d` | `HISTORICAL_PLAN_ONLY`                    | Lovable plan mutation; no product or corrective authority.                                  |
|  20 | `85809aadabaf` | `HISTORICAL_PLAN_MERGE`                   | Merge snapshot of commit 19.                                                                |
|  21 | `44ae41a0f634` | `HISTORICAL_PLAN_AND_ROADMAP_ONLY`        | Unreviewed plan/roadmap material; not promoted.                                             |
|  22 | `2354b7f0b9ee` | `HISTORICAL_PLAN_MERGE`                   | Merge snapshot of commit 21.                                                                |
|  23 | `afd0c2b9923f` | `PRESERVED_SUPPORT_EVIDENCE_ONLY`         | Records the blocked secret-export approach; facts ingested, bytes not promoted.             |
|  24 | `48b90876b656` | `HISTORICAL_PLAN_MERGE`                   | Merge snapshot of commit 23.                                                                |
|  25 | `7fdf6a21d56a` | `PRESERVED_ABORT_RECORD_ONLY`             | Archives the blocked plan; no executable authority.                                         |
|  26 | `b48ebd7905b9` | `PRESERVED_TERMINAL_ABORT_MERGE`          | Records expired exchange usage; terminal historical evidence only.                          |

The selected source is therefore one-way and unambiguous: GitHub `main` is the base,
zero Lovable commits are cherry-picked, and the future request must match the exact
accepted GitHub head stored server-side in `PCA15R_ACCEPTED_SOURCE_HEAD`.

## Corrective design

The selected endpoint is:

```text
POST /api/internal/pca-15r-managed-custody-provision
```

The request carries only non-secret ceremony, Worker, bootstrap-version, source
fingerprint, accepted-source-head, and phase fields. Unknown fields fail closed.
`x-tenant-id` remains prohibited on this global infrastructure route.

The server-only custody document is stored under
`PCA15R_SYNTHETIC_AUTH_CUSTODY_JSON`. It is a strict two-subject contract: exactly one
synthetic global Super Admin and one synthetic active tenant member, both bound to the
exact synthetic tenant slug `pca11-hml`. Emails and passwords never appear in the
request or response.

Before the Cloudflare credential is read, the route performs:

1. authenticated operator JWT validation and exact global `super_admin` check;
2. exact synthetic tenant lookup;
3. real password grant for both configured synthetic identities;
4. exact global-role and active-membership checks;
5. `get_current_tenant_id()` under the Super Admin token plus exact `x-tenant-id`,
   proving explicit impersonation;
6. the same RPC under the tenant-member token, proving tenant selection/membership;
7. immediate local-scope session revocation.

Only after those checks may the route read
`CLOUDFLARE_API_TOKEN_PCA15R_PROVISIONER` and delegate to the frozen PCA-11 inactive
version core. The historical environment name
`CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER` is not selected for future configuration.

## GET-only terminal reconciliation

After an idempotent inactive-version result, the route independently re-reads:

- candidate Worker versions, deployments, Workers.dev/previews and Cron schedules;
- account Access applications, reusable policies and service tokens;
- Workers custom-domain records;
- every account zone and its Workers routes.

The implementation uses the current Cloudflare list endpoints for
[Worker versions](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/list/),
[deployments](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/),
[custom domains](https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/list/),
and [zone routes](https://developers.cloudflare.com/api/resources/workers/subresources/routes/methods/list/).

Acceptance requires the created/reconciled version to be observable and all ingress,
deployment, Cron, Access, reusable-policy, service-token, custom-domain and route
counts to be zero. Pagination is bounded and complete; malformed or inaccessible GET
evidence fails closed. Responses expose counts and SHA-256 fingerprints only, never
credentials, emails, passwords, tokens or raw subject/tenant identifiers.

## Impact and non-impact

- Repository code, tests, manifest, CI classification and PCA-15R documentation only.
- No `.env`, generated Supabase types, migration, tenant resolver or PR-M3/frontend file.
- No GitHub `main` mutation or merge in this gate.
- No Lovable, Supabase or Cloudflare provider call, write, deployment, preview,
  restore, publish, DNS, Custom Domain, production or real-tenant action.
- Package v2.1.1 remains rejected for reuse and is not executed.

## Successor boundary

After protected merge and direct audit of the accepted head, a separate authorization
may configure the server-only custody values and a new ephemeral PCA-15R Cloudflare
provisioner, then invoke only the selected route. The future ceremony remains blocked
until the merged head is pinned and the synthetic Auth prerequisite is executable.
