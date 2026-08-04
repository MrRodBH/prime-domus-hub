# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — PR-M2 implementation Accepted / Merged; terminal reconciliation in progress
**Authority:** Single Source of Future Evolution
**Current main:** `ec06a19af44cc988e602d7bc8d0dc7a627db1619`

## Current authority

```text
PRM2_IMPLEMENTATION_STATE = Accepted
PRM2_MERGED = true
PRM2_MERGE_METHOD = squash
PRM2_IMPLEMENTATION_PR = 60
PRM2_IMPLEMENTATION_HEAD = ef9e22c239c7ce7e5d937bd06c7452ebde47f096
PRM2_MERGE_SHA = ec06a19af44cc988e602d7bc8d0dc7a627db1619
PRM2_PREMERGE_EXACT_HEAD_RELEASE_GATE = success
PRM2_PREMERGE_CORRECTIVE_GATE = success
POST_IMPLEMENTATION_MERGE_MAIN_HEAD = ec06a19af44cc988e602d7bc8d0dc7a627db1619
POST_IMPLEMENTATION_MERGE_TREE_EQUIVALENCE = true
POST_IMPLEMENTATION_MERGE_RELEASE_GATE_DIRECT_RUN_BINDING = unavailable_in_current_connector
POST_IMPLEMENTATION_MERGE_VALIDATION = Accepted by immutable exact-tree equivalence
DCA01_STATE = Planned — Blocked pending explicit authorization
DCA01_STARTED = false
DCA01_AUTHORIZED = false
BCA01_STATE = Planned — Blocked by DCA-01
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
AUTO_MERGE_ENABLED = false
```

## Executable sequence

```text
PR-M2 terminal post-merge reconciliation
→ no automatic successor
→ DCA-01 only after explicit Product Owner authorization
→ BCA-01 only after DCA-01 Accepted
→ PR-M3 only after BCA-01 Accepted
→ Pre-Homologation Release Candidate
→ TH-M1
→ TH-M2
→ LSV-03
→ Formal Homologation
→ Production
```

## Permanent invariants

- Server is the sole tenant, authorization, storage and commercial authority.
- Client headers, paths, filenames and signed URLs are not primary authority.
- Ambiguity fails fast and closed.
- Super Admin requires explicit impersonation for tenant-scoped access.
- No heuristic fallback, tenant default, dual path or first-row authority.
- Same-Backend Homologation Cell remains binding.

## Historical authority

The complete pre-merge roadmap remains immutably preserved at commit `ec06a19af44cc988e602d7bc8d0dc7a627db1619`. All pre-merge status statements conflicting with this document are historical and superseded for current execution state.
