# DCA-02 — Provider Identity Non-Blocking Backlog

## Status and authority

```text
STAGE_ID = DCA-02
BACKLOG_CLASS = Non-Blocking
BACKLOG_STATE = Accepted with Non-Blocking Backlog
SOURCE_BASELINE_MAIN = ad024ec1c3bb0ef5b9d2da51ba85f801fdda28fa
DCA02_REPOSITORY_DATABASE_STATE = Accepted / Closed
DCA02_EXTERNAL_PROVIDER_PROOF = Blocked External — Cloudflare MCP transport unavailable
DCA02_TERMINAL_ACCEPTED = false
```

This document is the stage-specific non-blocking backlog register for the DCA-02 provider-identity architecture. It does not supersede the GitHub-audited `main`, the accepted DCA-02 Impact Analysis, Execution Envelope, implementation evidence, or terminal live-provider proof when that proof is completed.

The items below do **not** reopen DCA-01, do **not** authorize additional DCA-02 principal/corrective implementation, and do **not** block the mandatory current-plan Cloudflare synthetic proof. Any future implementation that changes runtime, persistence, authorization, recovery semantics, backup policy, or provider operations requires its own Architecture First / Impact Analysis gate against the then-current GitHub `main`.

## NB-DCA02-01 — Explicit Provider Orphan Recovery

```text
STATE = Non-Blocking Backlog
CLASS = Operational Recovery / Security
RUNTIME_IMPLEMENTATION_AUTHORIZED = false
AUTO_ADOPTION = prohibited
HOSTNAME_ONLY_AUTHORITY = prohibited
FAIL_CLOSED = required
```

Create a separate, server-owned and audited administrative recovery capability for provider objects associated with DCA-02 `ambiguous` outcomes.

Required future invariants:

- recovery must be an explicit administrative operation, never an automatic continuation of normal provisioning;
- the server must remain the only authority for tenant, domain, generation, provider account, zone and candidate provider object identity;
- a provider object found by hostname must never be automatically adopted;
- hostname search may be used only as diagnostic/collision evidence, never as ownership authority;
- recovery must require explicit evidence sufficient to establish one safe candidate or fail closed;
- conflicting, missing or multiple candidates must remain unresolved and fail closed;
- any adoption/bind, cleanup or delete action must be separately authorized, auditable and target an exact provider object ID;
- no blind retry of the original provider create operation is allowed after an ambiguous outcome;
- no client-supplied object ID, hostname, path, header or metadata may become authority;
- no silent `api_automated -> manual_assisted` fallback is permitted.

## NB-DCA02-02 — Provider Identity Disaster Recovery / Backup Verification

```text
STATE = Non-Blocking Backlog
CLASS = Disaster Recovery / Data Integrity
RUNTIME_IMPLEMENTATION_AUTHORIZED = false
PRIMARY_LEDGER = public.domain_provider_bindings
CROSS_SYSTEM_ANCHOR = custom_hostname_id
HEURISTIC_RECONSTRUCTION = prohibited
FAIL_CLOSED_ON_BINDING_LOSS = required
```

Verify and formalize backup/PITR recoverability for the authoritative provider-identity ledger because persisted `custom_hostname_id` is now the primary cross-system anchor between RM Prime and Cloudflare.

Required future invariants:

- verify that `public.domain_provider_bindings` is covered by the Same-Backend backup/PITR strategy and that recovery objectives are compatible with provider-identity integrity;
- define a deterministic restore-verification procedure for generation-bound bindings;
- preserve provider account, zone, domain, generation and immutable `custom_hostname_id` identity through recovery;
- loss or uncertainty of a binding must result in fail-closed state;
- never reconstruct ownership heuristically from hostname, provider search order, `ORDER BY/LIMIT 1`, Custom Metadata, or a client/operator hint alone;
- never automatically rebind an existing provider object after database restore without explicit server-side evidence and authorized recovery semantics;
- backup verification must not weaken RLS, grants, service-role least privilege or the DCA-02 SECURITY DEFINER RPC boundary;
- disaster recovery must preserve auditability of any post-restore reconciliation or recovery action.

## Scheduling rule

```text
CURRENT_PRIORITY = complete DCA-02 live Cloudflare current-plan synthetic proof and teardown
BACKLOG_ITEMS_BLOCK_CURRENT_GATE = false
BACKLOG_ITEMS_MAY_START_AUTOMATICALLY = false
NEXT_STAGE_AFTER_DCA02 = must be resolved from then-current audited GitHub authority
```

These items remain deferred until explicitly prioritized after DCA-02 terminal provider proof or when a new Architecture First gate determines that one of them has become blocking.