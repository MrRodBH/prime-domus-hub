# PCA-09 — Provider-agnostic product homologation entry execution envelope

## Authority and state

```text
SOURCE_AUTHORITY = EXACT_PROTECTED_GITHUB_MAIN_SHA_ONLY
CANONICAL_BACKEND = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
```

This is a repository-only, forward-only envelope. It does not reopen HVP-01,
HRC-01 or any terminal predecessor and does not amend their prompt budgets.

## Gate sequence

### Gate A — repository and authority lock

Require the protected GitHub `main` SHA/tree, active ruleset, exact-head checks,
post-merge Release Gate and frozen authority-source digests. Any drift stops the
sequence before a runtime or credential is considered.

### Gate B — runtime capability preflight

PCA-10 may inspect, read-only, whether an available non-production runtime can:

- build and serve the exact protected `main` SHA;
- expose a deterministic artifact digest and runtime identity;
- use the Lovable-managed Same-Backend without direct Owner Supabase access;
- preserve secrets outside repository, chat and client bundles;
- support a bounded operator window and deterministic teardown;
- avoid mandatory Stripe, Cloudflare paid-plan or production dependencies.

The current Lovable publication is not an eligible candidate because its
reported commit is the historical PR #105 head, not protected `main`.

### Gate C — candidate materialization

Candidate materialization requires a separate explicit authorization. It must
produce an exact-main non-production runtime, artifact digest and evidence. It
must not publish production, mutate DNS/providers, import PR #105 or instruct
Lovable to perform GitHub operations.

### Gate D — Same-Backend eligibility

After a candidate exists, Lovable-only SELECT inspection must revalidate the
exact backend identity, migration ledger, RLS/ACL, protected registry, safe-data
classification and zero drift. Direct Supabase fallback is prohibited.

### Gate E — controlled execution packet

The Owner must separately authorize one packet containing exact SHA/artifact,
runtime/backend identities, operator and time window, protected digest, traffic
control, fixture manifest, probe matrix, teardown and emergency-stop owner.

## Fixture contract

Live isolation proof requires minimum two synthetic tenants created for the
run, distinct synthetic Auth users, exact memberships and only the data needed
by the probe matrix. Every object must receive a canonical ID and `run_id`
before use. Preexisting state may be protected but never adopted as a fixture.

## Probe classes

The future live packet must cover, in deterministic order:

1. exact-main artifact/runtime identity;
2. authenticated host, tenant and membership resolution;
3. cross-tenant and forged-header/path/payload rejection;
4. explicit Super Admin impersonation and session isolation;
5. public read/write tenant derivation and persisted-content sanitization;
6. CMS, CRM, marketing, tracking, portal and Storage boundaries required by
   the release candidate;
7. provider-dependent features as explicit `unavailable`, never simulated
   success.

## Teardown contract

Teardown is mandatory in a finally-equivalent path and removes only
manifest-bound fixtures, from leaf dependencies to synthetic users and tenants.
It must stop clients/sessions, delete exact Storage objects, remove child rows,
scan every fixture category and compare protected invariants before the write
window is released.

Acceptance requires:

```text
fixtures_cleaned == fixtures_created
orphaned_fixtures == 0
protected_baseline_changed == false
zero_new_residue == true
```

Global deletion, prefix cleanup, broad cascade, schema reset and heuristic
tenant selection are prohibited.

## Fail-closed conditions

Stop before live action when exact-main runtime evidence, operator packet,
backend identity, safe-data classification, traffic control, protected digest,
two-tenant fixture manifest or teardown responsibility is absent or ambiguous.
During execution, any cross-tenant access, protected-ID collision, manifest
failure, secret risk, operator-window expiry or cleanup ambiguity enters
teardown and prevents acceptance.

## Deferred recoverability

DCA-02-BL2 R2 remains deferred and non-blocking for homologation. It remains a
mandatory, separately authorized post-homologation/pre-production gate. No
PCA-09 action may claim or simulate PITR acceptance.

## Current terminal boundary

```text
PCA09_STATE = REPOSITORY_ENVELOPE_IMPLEMENTED_NOT_EXECUTED
ENTRY_STATE = BLOCKED_EXTERNAL_EXACT_MAIN_RUNTIME_AND_OPERATOR_PACKET
NEXT_GATE = PCA-10_PROVIDER_AGNOSTIC_EXACT_MAIN_HOMOLOGATION_RUNTIME_READ_ONLY_CAPABILITY_PREFLIGHT
NEXT_GATE_AUTHORIZED = false
```
