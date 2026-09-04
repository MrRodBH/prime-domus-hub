# PCA-15R managed custody and source reconciliation evidence

## Repository baseline

- Base: `3897936276a0760fe4594bb5e2420ec0cbba2adb`.
- Base tree: `792210f61ad54265c46b7d931e6cebeff63a9817`.
- Divergent Lovable snapshot: `b48ebd7905b9fcc1d496d69df0e2ff46abb6c1f9`.
- Merge-base: exact repository base.
- Lovable commits audited: `26/26`; promoted: `0`.
- Active continuity input: v4 / 2026-09-04 /
  SHA-256 `ad21e9c6eb7356d8b9c31f3cc1b42398ae39b00bd82eff7026a76fdcae27a17d`.

## Implemented controls

- Supported TanStack raw server route; no new Edge Function.
- Exact accepted-source-head pin.
- Strict non-secret request allowlist.
- Server-only two-identity custody schema.
- Real password grant for both synthetic identities.
- Exact global Super Admin, active membership and synthetic tenant checks.
- Real `get_current_tenant_id()` proof for explicit impersonation and member selection.
- Cloudflare provisioner read only after every Auth prerequisite passes.
- GET-only terminal re-read of all required Cloudflare surfaces.
- Sanitized evidence with counts/fingerprints only.

## Negative controls

- Auth failure prevents reading the Cloudflare credential and prevents the provider executor.
- Source-head mismatch fails before provider access.
- `x-tenant-id` on the global infrastructure route is rejected.
- Unknown or sensitive request fields are rejected.
- Any residual Access app, reusable policy, service token, route, Custom Domain,
  deployment, Cron, Workers.dev or preview state rejects terminal reconciliation.
- No `.env`, migration, generated Supabase types or tenant-host fallback is admitted.

## Execution evidence for this gate

This gate runs tests against injected gateways and an in-memory Cloudflare HTTP mock.
No test is allowed to contact Lovable, Supabase or Cloudflare. Provider calls and
provider writes for the repository corrective are both zero.

The final CI/run results and PR URL are GitHub-native evidence attached to the branch
and pull request. Protected merge is deliberately outside this authorization.

## State

`ACCEPTED_REPOSITORY_CORRECTIVE_PENDING_PROTECTED_MERGE`.

LSR-02 remains `Rejected — Terminal`, budget `0/2`, and is absent from the diff.
PR-M3/frontend remains unblocked. A future synthetic ceremony is not authorized by
this record.
