# DCA-02 — Provider Identity Non-Blocking Backlog

## Status and authority

```text
STAGE_ID = DCA-02
BACKLOG_CLASS = Non-Blocking
BACKLOG_STATE = Accepted with Non-Blocking Backlog
SOURCE_BASELINE_MAIN = ad024ec1c3bb0ef5b9d2da51ba85f801fdda28fa
TERMINAL_PROOF_BASELINE_MAIN = 1a66daf026614e6f57c2701e9a933be6bfaa9738
DCA02_REPOSITORY_DATABASE_STATE = Accepted / Closed
DCA02_EXTERNAL_PROVIDER_PROOF = Accepted
DCA02_TERMINAL_ACCEPTED = true
DCA02_TERMINAL_STATE = Accepted with Non-Blocking Backlog
```

This document is the stage-specific non-blocking backlog register for the DCA-02 provider-identity architecture. It does not supersede the GitHub-audited `main`, the accepted DCA-02 Impact Analysis, Execution Envelope, implementation evidence, or terminal live-provider proof. The terminal live-provider proof is recorded in `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-terminal-live-provider-proof-evidence.md`.

The items below do **not** reopen DCA-01, do **not** authorize additional DCA-02 principal/corrective implementation, and did **not** block the now-completed current-plan Cloudflare synthetic proof. Any future implementation that changes runtime, persistence, authorization, recovery semantics, backup policy, or provider operations requires its own Architecture First / Impact Analysis gate against the then-current GitHub `main`.

## NB-DCA02-01 — Explicit Provider Orphan Recovery

```text
STATE = Diagnostic Implementation Materialized — Exact-Head Gates Required
CLASS = Operational Recovery / Security
RUNTIME_IMPLEMENTATION_AUTHORIZED = diagnostic_dry_run_only
AUTO_ADOPTION = prohibited
HOSTNAME_ONLY_AUTHORITY = prohibited
FAIL_CLOSED = required
PROVIDER_WRITES = 0
DATABASE_WRITES = 0
ADOPTION_BIND_CLEANUP_DELETE = separately_authorized_future_envelope
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
STATE = R2 post-homologation recoverability rebaseline implemented / exact-head gates required
CLASS = Disaster Recovery / Data Integrity
RUNTIME_IMPLEMENTATION_AUTHORIZED = false
PRIMARY_LEDGER = public.domain_provider_bindings
CROSS_SYSTEM_ANCHOR = custom_hostname_id
HEURISTIC_RECONSTRUCTION = prohibited
FAIL_CLOSED_ON_BINDING_LOSS = required
REPOSITORY_PROOF_STATE = implemented / exact-head gates required
LIVE_BACKUP_SCOPE_VERIFIED = false
LIVE_PITR_RESTORE_EXECUTED = false
FULL_DATABASE_PITR_AS_DCA02_BL2_STRATEGY = superseded
SELECTED_RECOVERY_MEDIUM = Cloudflare_R2_Standard_candidate
R2_SUBSCRIPTION_ENABLED = false
R2_PROVIDER_IMPLEMENTATION = deferred_until_post_homologation
PRODUCTION_READINESS_BLOCKED_UNTIL_RECOVERY_PROOF = true
PROVIDER_WRITES = 0
DATABASE_WRITES = 0
NEXT_EXECUTION = DCA-02-BL1 diagnostic/dry-run only
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

The full-database PITR envelope remains historical general-database DR analysis
but is superseded for this narrow ledger. The current selected future strategy
is an encrypted, append-only logical snapshot in a private Cloudflare R2 bucket
with a native Bucket Lock configured before the first object. The snapshot is
recovery evidence only and never becomes runtime authority.

The account currently returns Cloudflare error `10042` requiring R2 activation
through the Dashboard. The Owner's decision not to require a paid/Enterprise
Cloudflare upgrade before homologation remains binding. R2 subscription,
bucket, lock, token, exporter, and recovery drill are therefore deferred to the
post-homologation/pre-production window and each requires a separate gate.

## Scheduling rule

```text
CURRENT_PRIORITY = qualify DCA-02-BL1 diagnostic exact head; preserve all mutations as future scope
BACKLOG_ITEMS_BLOCK_DCA02_TERMINAL_ACCEPTANCE = false
BACKLOG_ITEMS_BLOCK_PRM3_OR_FRONTEND = false
BACKLOG_ITEMS_BLOCK_CONTROLLED_TESTING = false
BACKLOG_ITEMS_BLOCK_FORMAL_HOMOLOGATION = false
BL2_BLOCKS_PRODUCTION_READINESS_UNTIL_RECOVERY_PROOF = true
BL2_EXECUTION_WINDOW = post_homologation_pre_production
BL2_TERMINAL_AUTHORITY = PR #112 head a8b41316e6998f1681a018d4ca8bc3e9e712e086 gates success
BL1_DIAGNOSTIC_MAY_START_AUTOMATICALLY = true
BL1_PROVIDER_MUTATION_MAY_START_AUTOMATICALLY = false
NEXT_STAGE_AFTER_BL1 = terminal exact-head audit and successor decision; no provider write implied
```

The Architecture First analysis identified by SHA-256 `85df4710f766263953020bcad369e145059a09709c5a15d772df7f9194bef703` authorized BL2 followed by BL1 diagnostic without an intermediate Owner handoff. BL2 does not authorize a live restore. No current authority permits adoption, bind, cleanup, delete, live provider probe during qualification, database mutation, deploy or production cutover.
