# PCA-09 — Provider-agnostic product homologation entry exact-main execution envelope

## Status

**Repository envelope implemented — live execution not authorized**

```text
GATE = PCA-09_PROVIDER_AGNOSTIC_PRODUCT_HOMOLOGATION_ENTRY_EXACT_MAIN_EXECUTION_ENVELOPE_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN = 6f1fa580863a3f4e3e936912bacfce74e1d4bb01
SOURCE_TREE = 5db1410e26b093bb7a4ac345641f3a03126b3443
PCA08_RESULT = ACCEPTED_READ_ONLY
PCA09_STATE = REPOSITORY_ENVELOPE_IMPLEMENTED_NOT_EXECUTED
HOMOLOGATION_ENTRY_STATE = BLOCKED_EXTERNAL_EXACT_MAIN_RUNTIME_AND_OPERATOR_PACKET
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
```

## 1. Decision

The protected repository and Lovable-managed Same-Backend are structurally
ready for the next qualification step. The release candidate is not ready for
live controlled homologation because no runtime is proven to execute the exact
protected `main` SHA and no bounded operator/fixture packet exists.

The published Lovable surface reports commit
`9d64c7ac6c1259652a70022db08583139cb368af`, the preserved historical head of
closed, draft and unmerged PR #105. It is not GitHub authority and cannot be
used as a release candidate. Repository inspection found four validation
workflows and no GitHub deployment workflow for the exact `main` release.

This is an external execution-capability gap, not permission to synchronize
GitHub through Lovable, deploy opportunistically or revive PR #105.

## 2. Current authorities

- GitHub `main` is the sole code and release authority.
- The canonical database is the backend managed by Lovable project
  `982b91d8-946d-4103-8eb3-40ddbaeedbf4`.
- The Owner has no direct Supabase execution path; database inspection or
  application remains Lovable-only under an explicit gate.
- HRR-01 remains the current Product Readiness authority. HVP-01/HRC-01 remain terminal
  and are not reopened by this forward-only envelope.
- The HVP-01 runbook is historical evidence only. PCA-09 absorbs its safe
  exact-SHA, synthetic-fixture, teardown and zero-residue controls without
  restoring its stage identity or authorization state.

## 3. Audited release evidence

```text
PR_176_MERGED = true
PR_176_HEAD = a40a86e59a6223300494e5757c22ff42a3722fe1
PR_176_REQUIRED_CHECKS = 2/2_SUCCESS
MERGE_SIGNATURE_VERIFIED = true
RULESET_ID = 20308240
RULESET_BYPASS_ACTORS = 0
POST_MERGE_RELEASE_RUN = 33272399627
POST_MERGE_RELEASE_JOB = 99153144208
POST_MERGE_RELEASE_RESULT = success
```

The post-merge job checked out the exact merge SHA, verified it, installed with
the frozen lockfile, passed the PCA-07 terminal gate and the complete release
verification, then uploaded evidence.

## 4. Same-Backend snapshot

Read-only SELECTs through Lovable confirmed:

- migration ledger integrity `3/3/3/2/8/1` for W1–W6;
- 15/15 W5 tables present with RLS and 17/17 W5 functions present;
- three W6 functions and one W6 trigger;
- zero `anon`/`authenticated` exposure on the W5 tables and functions;
- exact target baseline `1/7–4/4/4–3/3/36/1`;
- zero target leads, properties, form submissions and subscriptions;
- protected baseline of 74 tenants, 444 portal connectors, 888 retained
  sensitive fields and 22 Storage objects / 15,826,788 bytes.

Existing Auth users or sessions are protected preexisting state. They are not
reclassified as homologation fixtures or operator authorization.

## 5. Provider-agnostic boundary

PCA-09 does not depend on Stripe checkout, Cloudflare paid capabilities,
Custom Hostnames, production DNS, provider diagnostics or PR #105. Provider
dependent actions remain explicitly unavailable. A future candidate may use an
approved non-production runtime only after read-only capability qualification;
the candidate must be built from the exact protected GitHub SHA.

The current Lovable publication is not an eligible candidate. Lovable may not
receive GitHub instructions, rebase the historical project head or be treated
as release authority.

## 6. Required external packet

Before any live session, fixture or write, a single separately authorized
packet must bind:

1. exact protected `main` SHA and artifact digest;
2. non-production runtime identity and URL;
3. exact Lovable-managed backend identity;
4. operator identity and bounded start/end window;
5. protected-registry digest by canonical IDs;
6. factual safe-data classification and public-write control;
7. manifest for at least two new synthetic tenants and distinct Auth users;
8. deterministic teardown order, residue scan and emergency-stop owner.

No existing tenant, membership, user, session, domain, Storage object or
business row may be adopted as a fixture.

## 7. Recoverability disposition

DCA-02-BL2 R2 remains deferred, non-blocking for product testing and formal
homologation, and mandatory after homologation before production readiness or
cutover. PCA-09 neither activates R2 nor weakens transactional execution,
manifest-bound cleanup, protected-baseline comparison or fail-closed response.

## 8. Definition of Done

PCA-09 repository implementation is complete only when:

- the deterministic manifest is byte-stable and the frozen authorities match;
- the execution envelope records exact-main/runtime separation;
- the stale Lovable/PR #105 candidate is explicitly rejected;
- the operator, fixture, teardown and zero-residue requirements are complete;
- Release Gate integration tests the exact nine-file allowlist;
- no `src/**`, `supabase/**`, `wrangler.jsonc`, provider, backend or deploy
  mutation occurs.

## 9. Successor

```text
NEXT_GATE = PCA-10_PROVIDER_AGNOSTIC_EXACT_MAIN_HOMOLOGATION_RUNTIME_READ_ONLY_CAPABILITY_PREFLIGHT
NEXT_GATE_AUTHORIZED = false
```

PCA-10 may inspect candidate runtime capabilities and cost only. It may not
deploy, synchronize Lovable, create fixtures, open sessions or start controlled
homologation without a later explicit authorization.
