# PCA-12C-R3 — TanStack/Nitro PCA-11 namespace and secretless proof

## Decision

`ACCEPTED_REPOSITORY_ONLY`. The existing TanStack Start/Nitro route remains the single selected runtime. No route, `createServerFn`, Edge runtime, provider capability, or external state was added.

## Source authority

- Protected `main`: `37c1e1d5893df1386b45512f8ad2aaad522a36db`.
- Tree: `44e71d411f3bf2d8b5c7f933dda7013456695c99`.
- Endpoint: `POST /api/internal/pca-11-managed-binding-provision`.
- Deno PCA-12B artifact: repository-only and not selected for execution.

## Corrective

The shared historical helper now derives infrastructure failure codes from the selected target namespace. SPR-03 continues to return `spr03_*`; PCA-11 now returns `pca11_*` for authentication, role, missing dependency, provider-response, precondition, source, version, and inactive-version failures.

The route handler was extracted from the existing file route only to permit deterministic invocation. Production still delegates the same POST handler and the same server-only helper.

## Negative proof

An authenticated global `super_admin` dependency is simulated without network access. With `CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER` absent, the exact route returns HTTP `503` with `pca11_missing_server_dependency`. A network sentinel proves zero outbound calls, therefore zero Cloudflare access, before the failure.

No token was created, read, logged, committed, or configured. No GitHub publication, Lovable/Supabase mutation, Cloudflare request, deploy, preview, fixture, or production action occurred.
