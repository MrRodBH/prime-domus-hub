# PCA-12B — Lovable-managed Edge Function bridge repository implementation

## Decision

`ACCEPTED_REPOSITORY_ONLY`. The PCA-11R provider bridge now has an additive Supabase Edge Function implementation suitable for the canonical Lovable-managed backend. This gate changes repository bytes only; it performs no GitHub publication, Lovable call, Supabase deployment, Cloudflare mutation, preview, fixture, or production action.

## Frozen authority

- Protected source: GitHub `main` `ba70d12ec8c5a2340d4399748ccd58c7d0ad432f`, tree `f8204bc1a2bf6df66db533a5fc00ff8213aabc01`.
- Local equivalent base: `23acdeba078d9797d48512e5def9b9ac9395b1fa`, with the exact same tree.
- Canonical backend: Lovable project `982b91d8-946d-4103-8eb3-40ddbaeedbf4`, managed Supabase ref `stmcnvzuzlyqammyycxj`.
- The three frozen PCA-11R Node authorities remain byte-identical to the base; the new path is additive.

## Implementation

The function `pca-11-managed-binding-provision` requires platform JWT verification, revalidates the JWT with `getClaims`, and requires exactly one global `super_admin` row. `x-tenant-id`, non-POST methods, unknown request fields, arbitrary worker selection, and source drift fail closed.

Its runtime-neutral core preserves the PCA-11R canary/final binding contract and exact source fingerprint. The only provider mutation it can issue is `POST .../versions`; deployments, routes, DNS, schedules, previews, and production remain outside the capability. Canary is non-secret, final requires the privileged Supabase binding, and tag reconciliation is idempotent.

## Secrets and execution boundary

Managed Supabase keys are resolved from `SUPABASE_PUBLISHABLE_KEYS.default` and `SUPABASE_SECRET_KEYS.default`, with the documented legacy automatic-key fallbacks. The Cloudflare provisioner is a future custom Edge secret, is required before any provider request, is never a Worker binding, and is never returned or logged.

No owner action is required at PCA-12B. Secure owner action begins only after repository publication/merge and a separately authorized Lovable secretless deployment/negative proof gate.
