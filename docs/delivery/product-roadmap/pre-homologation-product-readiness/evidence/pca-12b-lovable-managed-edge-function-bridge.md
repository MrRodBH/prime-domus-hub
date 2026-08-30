# PCA-12B evidence — Lovable-managed Edge Function bridge

Status: `ACCEPTED_REPOSITORY_ONLY`.

| Control             | Evidence                                                                               |
| ------------------- | -------------------------------------------------------------------------------------- |
| Exact source        | protected `main` `ba70d12...`, tree `f8204bc1...`; local base has identical tree       |
| Backend authority   | Lovable-managed Supabase only; local config retains `rm-prime-local` and no remote ref |
| Authentication      | `verify_jwt = true`, `getClaims`, exactly one `super_admin`, tenant header prohibited  |
| Provider capability | GET preconditions plus POST inactive `/versions` only                                  |
| Secretless safety   | missing PCA-11 provisioner causes zero provider calls                                  |
| Secret isolation    | provisioner excluded from Worker bindings, logs, and response values                   |
| Workflow            | Release Gate classifier and focused `test:pca-12b`                                     |
| External effects    | GitHub 0; Lovable 0; Supabase 0; Cloudflare 0; deploy/preview/production false         |

The deterministic contract is `PCA-12B-lovable-managed-edge-function-bridge-manifest.json`. Owner action: none at this gate.
