# DCA-02-BL2 — Provider Identity Disaster Recovery Impact Analysis

## Status

```text
STAGE_ID = DCA-02-BL2
SOURCE_BACKLOG_ID = NB-DCA02-02
BASELINE_MAIN = e9176b4d3a8c4bac9c11c736d218313ec6273e8b
ANALYSIS_AUTHORITY_SHA256 = 85df4710f766263953020bcad369e145059a09709c5a15d772df7f9194bef703
SELECTED_STRATEGY = deterministic_generation_bound_ledger_restore_verification
REPOSITORY_PROOF = authorized
LIVE_PITR_RESTORE = prohibited
PRODUCTION_RESTORE = prohibited
PROVIDER_WRITES = 0
DATABASE_WRITES = 0
DEPLOY = false
MERGE = false
PRODUCTION_CUTOVER = false
```

This gate qualifies the recovery contract, an isolated synthetic reconstruction matrix, and the operational evidence required before a real non-production PITR exercise may be authorized. It does not claim that a live Same-Backend restore has occurred.

## Problem

`public.domain_provider_bindings` is the authoritative cross-system ledger between one tenant-domain generation and one immutable Cloudflare `custom_hostname_id`. Losing or heuristically reconstructing this row can create domain takeover, wrong-object deletion, or silent rebind risk.

The canonical recovery identity is the exact conjunction:

```text
tenant_id
provider_account_id
zone_id
domain_id
generation
custom_hostname_id
```

Hostname, Custom Metadata, result ordering, client input, operator hints, and provider search position are diagnostic evidence only and can never reconstruct ownership.

## Recovery objectives

The following are qualification ceilings, not unverified provider promises:

```text
RPO_CEILING = 15 minutes
RTO_CEILING = 4 hours
SCOPE_REQUIRED = public.domain_provider_bindings + schema + constraints + RLS + grants + guard trigger + DCA-02 RPCs
OUTSIDE_RPO_OR_RTO = fail_closed_and_escalate
```

Before any live recovery exercise, official Same-Backend evidence must prove that the configured backup/PITR capability meets or beats both ceilings for the exact environment. Missing, stale, ambiguous, or unverifiable provider evidence fails closed.

## Selected strategy

1. capture a read-only, canonical ledger manifest ordered only for serialization, never for authority;
2. hash the canonical manifest with SHA-256;
3. restore into a uniquely tagged, isolated non-production target under a separately authorized provider/database envelope;
4. compare exact generation-bound identity cardinality and manifest digest;
5. prove RLS, SELECT-only `service_role` table access, guard trigger, and SECURITY DEFINER RPC boundaries;
6. reconcile restored rows using persisted `custom_hostname_id` only;
7. leave any missing, duplicate, conflicting, or uncertain binding fail closed;
8. tear down the isolated target and persist the evidence ledger.

This repository gate implements steps 1, 2, 4, 5, and 7 as a deterministic synthetic proof. Steps 3, 6 against a live provider, and teardown of real infrastructure remain prohibited here.

## Mandatory fail-closed matrix

| Case | Expected result |
|---|---|
| One exact generation-bound row | Reconstruction accepted with byte-stable canonical manifest |
| Missing binding | Rejected; domain remains unavailable for provider mutation |
| Duplicate generation key | Rejected; no first-row selection |
| Duplicate provider object identity | Rejected; no adoption |
| Conflicting `custom_hostname_id` | Rejected; no provider search fallback |
| Blank tenant/account/zone/domain/generation/object ID | Rejected |
| Hostname or Custom Metadata offered as substitute | Rejected |
| Manifest SHA-256 mismatch | Rejected |
| RPO/RTO evidence absent or outside ceiling | Rejected |
| RLS/grants/trigger/RPC boundary drift | Rejected |

## Security invariants

- `service_role` retains SELECT only on `public.domain_provider_bindings`.
- Mutations remain behind the existing DCA-02 SECURITY DEFINER RPCs.
- `anon` and `authenticated` retain zero DCA-02 RPC execution authority.
- No historical migration is edited.
- No backup restore is executed against production.
- No provider object is created, adopted, rebound, cleaned, or deleted.
- No `ORDER BY ... LIMIT 1`, hostname-only, Custom Metadata, or client-authoritative recovery path exists.
- The subsequent DCA-02-BL1 gate may perform diagnostics only; provider writes remain blocked until a separate exact-object envelope and a real isolated restore proof are accepted.

## Acceptance decision

```text
REPOSITORY_RECOVERY_CONTRACT = qualified_when_exact_head_gates_succeed
SYNTHETIC_LEDGER_RECONSTRUCTION = mandatory
LIVE_BACKUP_SCOPE_ASSERTION = not_made
LIVE_PITR_PROOF = separately_authorized_non_production_gate_required
DCA-02-BL1_DIAGNOSTIC_MAY_FOLLOW = true
DCA-02-BL1_PROVIDER_WRITE_MAY_FOLLOW = false
ROLLBACK = one audited repository revert
OWNER_ACTION = NONE
```
