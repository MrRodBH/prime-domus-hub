# HVP-01 — Roadmap Reconciliation

## Status

**Planning-only reconciliation — Ready for Direct External Audit**

```text
STAGE_ID = HVP-01
BASELINE_MAIN = c140f44afc8b3d46d15d920acee2bb120c86251c
PREDECESSOR = PSG-01 Accepted with Non-Blocking Backlog — Merged
AUTHORIZED_EXECUTOR = GitHub-native runbook + authorized operator
PLANNING_AUTHORIZED = true
LIVE_EXECUTION_AUTHORIZED = false
VSP01_AUTHORIZED = false
LSV03_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
HG14_TRIGGERED = false
```

## 1. Purpose

This document reconciles the executable Product Readiness chain after the protected squash merge of PSG-01. It is an additive stage-specific governance artifact. It does not rewrite historical evidence, reopen terminal stages or convert rejected/superseded deliverables into accepted authority.

## 2. Current executable chain

```text
DRA-01       Accepted
GNR-01       Accepted
PTC-01       Accepted
PSC-01       Accepted
PPR-01       Superseded — historical PR remains closed and unmerged
PPR-GN-01    Accepted
PTW-01       Accepted
PSG-01       Accepted with Non-Blocking Backlog — Merged
HVP-01       Planning and preparation authorized — live execution not authorized
VSP-01       Optional — Not authorized
Controlled Homologation  Blocked by HVP-01 acceptance
Production                Blocked until controlled homologation acceptance
```

## 3. PSG-01 closure authority

```text
PSG01_IMPLEMENTATION_PR = 48
PSG01_IMPLEMENTATION_HEAD = 7d8e3faae1ab188576c23deb03b6f41aa2e82f6a
PSG01_SQUASH_MERGE_COMMIT = c140f44afc8b3d46d15d920acee2bb120c86251c
PSG01_IMPLEMENTATION_STATE = Accepted with Non-Blocking Backlog
PSG01_IMPLEMENTATION_MERGED = true
PSG01_CANONICAL_ISSUE = 4 — Closed / Completed
```

The only preserved PSG-01 backlog is deployed Same-Backend Homologation Cell evidence for the framework CSRF boundary and intentionally public file-route reachability. That backlog is owned by HVP-01 as evidence collection. It does not authorize a PSG-01 code correction.

## 4. Terminal-stage boundary

The following stages remain terminal and MUST NOT be reopened:

```text
PR-M1
LSO-01
LSV-01
LSV-02
LSR-01
LSR-02
FRP-01
```

Historical branches, PRs, reports and implementation claims from those stages are diagnostic history only unless already merged and independently accepted as a predecessor of the current chain.

The GitHub-native governance amendment removes Lovable prompt-count applicability from direct repository work, but it does not erase technical rejection, strategic supersession or terminal status. A still-valid objective must be materialized through a new explicit envelope based on the audited current `main`; the historical PR or stage is not reopened.

## 5. Relationship to LSV-02

HVP-01 is not LSV-02 reopened, renamed or resumed.

LSV-02 remains `Superseded — terminal`. Its operational deliverables were not auto-transferred. The following items may be used only as mandatory planning inputs because they remain architecturally coherent and were explicitly preserved:

- Same-Backend Homologation Cell;
- exact backend/project lock;
- protected RM Prime baseline registry by canonical ID;
- synthetic-only fixture policy;
- minimum two distinct synthetic tenants;
- per-run manifest;
- deterministic manifest-scoped teardown;
- zero-residue acceptance;
- fail-fast and fail-closed behavior;
- permanent post-real-operation prohibition;
- no external Supabase as canonical fallback.

The 73 tenants matching `scp0121_*` remain classified as `PREEXISTING_INTERNAL_TEST_RESIDUE`. They are protected preexisting objects for HVP-01 purposes: they are not fixtures, must not enter the deletion manifest and must not be cleaned by name, prefix or broad query.

`HG14_TRIGGERED = false` remains factual. The post-real-operation prohibition is prospective and becomes binding only after real operation begins; this planning does not claim that event has occurred.

No historical LSV-02 execution result, fixture claim, live-session claim or acceptance claim is transferred to HVP-01.

## 6. Legacy roadmap interpretation

`FINITE_ROADMAP_EXECUTION_MAP.md` preserves the earlier finite chain and terminal records. It remains historical authority for those terminal dispositions, but it is not the executable post-PSG sequence.

For the current GitHub-native delivery path, the controlling sequence is:

1. `GITHUB_NATIVE_EXECUTION_GOVERNANCE_AMENDMENT.md`;
2. `DELIVERY_RECOVERY_EXECUTION_MAP_GITHUB_NATIVE_AMENDMENT.md` together with this HVP-01 reconciliation;
3. the accepted PSG-01 merge state;
4. the HVP-01 Impact Analysis and runbook after direct audit and protected merge.

Any stale row that still describes PSG-01 as blocked or HVP-01 as blocked by PSG-01 is superseded by the exact merged state recorded in this document.

## 7. HVP-01 stage boundary

Current authorization is limited to planning and preparation:

```text
HVP01_PLANNING_AUTHORIZED = true
HVP01_PLANNING_STARTED = true
HVP01_LIVE_PROBES_AUTHORIZED = false
HVP01_FIXTURES_AUTHORIZED = false
HVP01_DATABASE_MUTATIONS_AUTHORIZED = false
HVP01_AUTH_MUTATIONS_AUTHORIZED = false
HVP01_STORAGE_MUTATIONS_AUTHORIZED = false
HVP01_OPERATOR_WINDOW_AUTHORIZED = false
```

No planning merge may implicitly start HVP-01 live execution. A separate product-owner authorization is required after direct planning audit and protected merge.

## 8. Successor control

HVP-01 may terminate as:

- `Accepted`;
- `Accepted with Non-Blocking Backlog`;
- `Blocked External`;
- `Rejected`;
- `Superseded`.

Only `Accepted` or an explicitly compatible `Accepted with Non-Blocking Backlog` may permit a later decision about Controlled Homologation.

`VSP-01`, `LSV-03` and Controlled Homologation remain unauthorized by this reconciliation.
