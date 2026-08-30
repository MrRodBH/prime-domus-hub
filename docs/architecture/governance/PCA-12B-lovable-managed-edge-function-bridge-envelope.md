# PCA-12B governance envelope

## Authorized

- Add the Lovable-managed Supabase Edge Function and runtime-neutral PCA-11R parity core.
- Add closed-contract tests, Release Gate classification, deterministic evidence, and local commit.

## Prohibited

- GitHub push, PR, merge, Lovable agent call, Supabase link/deploy/secret mutation, Cloudflare write, preview, fixtures, or production change.
- Any deployment/route/DNS/cron operation in the Edge core.
- Any provisioner token in Git, logs, response bodies, Worker bindings, or owner messages.
- Modification of the frozen PCA-11R Node contract, helper, or route.

## Runtime invariants

The function accepts only POST with a verified authenticated global `super_admin`; the request chooses neither tenant nor arbitrary Worker. The bootstrap source fingerprint and zero-ingress state must match. A non-secret inactive canary precedes the inactive final version. Only version creation is writable, and results expose identifiers and binding names, never binding values.

## Deferred owner-assisted sequence

After a protected repository merge, a separate gate may authorize Lovable to materialize the exact function without custom secrets and prove it fails before provider access. Only a later gate may request that the owner enter the provisioner/configuration values in Lovable's secure secret UI. No secret may be pasted into chat.
