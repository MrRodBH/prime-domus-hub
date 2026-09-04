# PCA-15R managed custody and source reconciliation envelope

## Authorized in this repository corrective

- Ingest the 2026-09-04 Lovable support answer as capability evidence.
- Classify the 26 commits between GitHub `main@3897936...` and
  Lovable `b48ebd7...` without merging or cherry-picking them.
- Add one TanStack server route backed by Lovable-managed server credentials.
- Make exact synthetic Auth, membership and impersonation proof a hard prerequisite
  to the future inactive-version creation path.
- Add independent, exhaustive GET-only terminal reconciliation.
- Add deterministic tests, CI scope, manifest, evidence and an updated restart handoff.
- Publish a dedicated GitHub branch and open an auditable PR against `main`.

## Prohibited

- Lovable for GitHub; any Lovable, Supabase or Cloudflare provider write.
- Cloudflare deployment, route, DNS, Custom Domain, Cron, Workers.dev, preview,
  Access exposure, production or protected-Worker mutation.
- Supabase migration, Auth mutation, secret export or real-tenant access.
- Exporting or returning `SUPABASE_SERVICE_ROLE_KEY`, passwords, emails, access tokens,
  refresh tokens, Cloudflare tokens or the raw custody document.
- Executing or reusing `RM_PRIME_PCA15_SAFE_CONNECTOR_WINDOWS_2.1.1.zip`.
- Modifying LSR-02 or consuming its exhausted `0/2` budget.
- Blocking PR-M3/frontend.

## Source authority

```text
BASE = GitHub main@3897936276a0760fe4594bb5e2420ec0cbba2adb
BASE_TREE = 792210f61ad54265c46b7d931e6cebeff63a9817
LOVABLE_SNAPSHOT = b48ebd7905b9fcc1d496d69df0e2ff46abb6c1f9
LOVABLE_COMMITS_CLASSIFIED = 26/26
LOVABLE_COMMITS_PROMOTED = 0
SOURCE_SELECTION = GitHub main plus this auditable corrective only
```

Future execution must supply `expected_source_head` and it must equal the server-only
`PCA15R_ACCEPTED_SOURCE_HEAD`. No moving branch name is accepted as runtime authority.

## Custody contract

All environment reads occur during request execution. The platform-managed
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain
server-side. Custom synthetic credentials remain in
`PCA15R_SYNTHETIC_AUTH_CUSTODY_JSON`, never under a `VITE_` name.

The server requires exactly two distinct synthetic identities and the exact synthetic
tenant slug `pca11-hml`. Password grants, exact role/membership rows and actual tenant
context resolution must all pass before the Cloudflare provisioner is read. Errors
return only stable codes.

## Provider boundary

The only future provider mutation reachable through the selected route is the frozen
PCA-11 `POST .../versions` inactive-version operation. The route does not expose a
deployment, DNS, route, domain, schedule, preview or Access mutation method.

The terminal phase is GET-only and requires zero deployments, routes, custom domains,
Crons, Access apps, reusable policies and service tokens, with Workers.dev and preview
URLs disabled. The expected inactive version must be independently observable.

## Current gate result

```text
REPOSITORY_CORRECTIVE = implemented
PROVIDER_CALLS = 0
PROVIDER_WRITES = 0
PACKAGE_2_1_1_EXECUTED = false
LSR_02 = Rejected — Terminal / budget 0/2 / diff 0
PR_M3_FRONTEND_BLOCKED = false
MERGE_AUTHORIZED = false
```
