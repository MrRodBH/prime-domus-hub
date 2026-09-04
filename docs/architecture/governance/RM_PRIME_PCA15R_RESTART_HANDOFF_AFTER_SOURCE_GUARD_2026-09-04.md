# RM Prime PCA-15R restart handoff after source guard — updated repository record

## Clean interruption checkpoint

```text
INTERRUPTED_RUN_MAIN_MUTATION=false
INTERRUPTED_RUN_OPEN_PR=false
INTERRUPTED_RUN_PCA15R_BRANCH=false
INTERRUPTED_RUN_CLOUDFLARE_MUTATION=false
INTERRUPTED_RUN_PROVIDER_RESIDUE=0
SAFE_TO_RESTART_FROM_GATE_BEGINNING=true
CHECKPOINT_MAIN=3897936276a0760fe4594bb5e2420ec0cbba2adb
```

These facts describe the interrupted run before this new authorized corrective. The
current dedicated branch/PR created by the corrective is not an interrupted-run residue.

## Active authority

- GitHub `main` is the technical source of truth.
- Continuity input: `RM_PRIME_CANONICAL_CONTINUITY.md` v4, 2026-09-04,
  SHA-256 `ad21e9c6eb7356d8b9c31f3cc1b42398ae39b00bd82eff7026a76fdcae27a17d`.
- Lovable snapshot `b48ebd7905b9fcc1d496d69df0e2ff46abb6c1f9` is historical evidence only.
- LSR-02: `Rejected — Terminal`, budget `0/2`, reopening false.

## Corrective disposition

- All 26 divergent Lovable commits are classified in the PCA-15R impact analysis.
- Zero Lovable commits are promoted.
- The selected source is GitHub `main@3897936...` plus the dedicated corrective PR.
- The supported replacement for the unavailable Edge Function creation is the TanStack
  server route `POST /api/internal/pca-15r-managed-custody-provision`.
- Supabase service role, identity passwords and session tokens remain server-side.
- Auth, membership and explicit impersonation precede any future Cloudflare version call.
- Terminal reconciliation independently re-reads every required Cloudflare surface by GET.

## Current restrictions

No Lovable, Supabase or Cloudflare provider write; no package v2.1.1 execution; no
deployment, preview, restore, publish, production, DNS, Custom Domain or real tenant.
No use of Lovable for GitHub. PR-M3/frontend remains unblocked.

## Files to carry into a later chat

1. This updated handoff from the accepted PR head.
2. The active continuity file by persistent identity/hash.
3. The PCA-15R impact analysis, governance envelope, manifest and evidence from the PR.
4. The Lovable support response only as capability evidence.

Do not attach historical LSR-02 prompts or the package v2.1.1 as execution authority.
The package may be retained only for forensic comparison and must not be rerun.

## Successor

First complete protected merge/audit of the corrective PR under separate authorization.
Only then can a separately authorized synthetic ceremony pin the merged SHA, configure
new server-only custody values and an ephemeral PCA-15R Cloudflare provisioner, invoke
the selected route, and verify terminal GET-only cleanup. Production remains separate.
