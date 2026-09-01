# PCA-12C-R3 governance envelope

## Authorized

- Correct the PCA-11 error namespace in the existing TanStack/Nitro server path.
- Add a deterministic secretless route proof and SPR-03 regression coverage.
- Add focused Release Gate classification, evidence, manifest, and local commit.

## Binding invariants

- Runtime: existing TanStack Start/Nitro only.
- Endpoint: existing POST route only; no `createServerFn` or parallel implementation.
- Authorization: verified Bearer JWT plus exactly one global `super_admin` role row.
- Tenant authority: `x-tenant-id` prohibited; request allowlist remains closed.
- Secret: `CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER` remains server-only and mandatory before provider access.
- Fail closed: missing provisioner returns `503 pca11_missing_server_dependency` with zero outbound calls.
- Compatibility: SPR-03 continues to emit `spr03_*`.

## Prohibited

GitHub push/PR/merge, Lovable agent call, Supabase deployment or secret mutation, Cloudflare request/write, deployment, route, DNS, cron, preview, fixture, production, or secret disclosure.

The next gate requires separate authorization for protected publication and draft PR; it still authorizes no materialization.
