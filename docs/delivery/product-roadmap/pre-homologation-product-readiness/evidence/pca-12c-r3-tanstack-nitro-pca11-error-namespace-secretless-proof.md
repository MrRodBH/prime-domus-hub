# PCA-12C-R3 evidence — TanStack/Nitro namespace and secretless proof

Status: `ACCEPTED_REPOSITORY_ONLY`.

| Control             | Evidence                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Exact source        | `main 37c1e1d5893df1386b45512f8ad2aaad522a36db`; tree `44e71d411f3bf2d8b5c7f933dda7013456695c99` |
| Single runtime      | Existing TanStack Start/Nitro POST route; no second route or `createServerFn`                    |
| PCA-11 namespace    | Shared helper derives failures from target prefix and returns `pca11_*`                          |
| SPR-03 regression   | Historical entry continues to return `spr03_unauthorized` and retains `spr03_*` contract         |
| Secretless response | HTTP `503`, body code `pca11_missing_server_dependency`                                          |
| Provider isolation  | Network sentinel observed zero calls before the secretless failure                               |
| Secret state        | Provisioner absent; no value read, stored, emitted, or logged                                    |
| External effects    | GitHub remote 0; Lovable 0; Supabase 0; Cloudflare 0; deploy/preview/production false            |

Owner action: none. The provisioner token remains deferred until a later, separately authorized post-merge ceremony.
