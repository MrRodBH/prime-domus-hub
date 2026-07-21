# PPR-GN-01 — GOVERNANCE REPLANNING RECORD

## State

```text
BASELINE_MAIN = 2c55f8f70ab6560a3929d60542b49d9157c35f5a
PPR01_PR_33 = Closed — Unmerged
PPR01_PRIOR_CLASSIFICATION = Rejected — terminal
PPR01_RECONCILED_CLASSIFICATION = Superseded
PPR_GN_01_IMPLEMENTATION_STARTED = false
PTW01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

## Product-owner clarification

The principal/corrective prompt budget is a Lovable interaction and financial-control mechanism. It does not apply to direct GitHub-native commits, PR revisions, CI corrections or direct audit.

## Factual remaining failure incorporated into the new envelope

The rejected PR #33 first failed the inherited PTR regression because production used `tenantId` instead of the literal accepted shape `tenant.id`.

Its corrective restored `tenant.id` but then failed because the production input validator used a shared strict schema while the inherited PTR regression required the literal `.strict().parse(d)` shape inside `pages.functions.ts`.

The current audited `main` already preserves both inherited shapes:

```text
.eq("tenant_id", tenant.id)
.strict().parse(d)
```

The new PPR-GN-01 envelope requires both shapes from the first implementation commit and runs the inherited PTC/PTR/PSC suites before the full Release Gate.

## Authority boundary

The PR #33 branch is diagnostic history only. No implementation file from it is accepted or transferred automatically.

All implementation claims must be re-derived from audited `main` in a new, single GitHub-native implementation PR after planning acceptance.
