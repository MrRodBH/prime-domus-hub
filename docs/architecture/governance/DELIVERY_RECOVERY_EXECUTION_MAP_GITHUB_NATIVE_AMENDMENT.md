# DELIVERY RECOVERY EXECUTION MAP — GITHUB-NATIVE AMENDMENT

## Status

**Binding amendment pending merge to `main`**

**Baseline:** `2c55f8f70ab6560a3929d60542b49d9157c35f5a`  
**Authority:** explicit product-owner clarification that prompt budgets apply only to Lovable  
**Related governance:** `GITHUB_NATIVE_EXECUTION_GOVERNANCE_AMENDMENT.md`

---

## 1. Purpose

This document reconciles the post-FRP delivery recovery path after the PPR-01 principal and corrective GitHub-native attempts were incorrectly terminalized through a Lovable-specific prompt-budget rule.

It does not reopen PR #33 and does not accept its branch as technical authority.

---

## 2. Historical disposition

### PPR-01

```text
PPR01_PROCESS_CLASSIFICATION = Superseded
PPR01_PR_33_STATE = Closed — Unmerged
PPR01_PR_33_REOPEN_AUTHORIZED = false
PPR01_PR_33_MERGE_AUTHORIZED = false
PPR01_BRANCH_ACCEPTED_AS_AUTHORITY = false
PPR01_TECHNICAL_OBJECTIVE_COMPLETED = false
```

Reason for `Superseded`:

- the prior `Rejected — terminal` decision relied on a prompt-budget rule that is not applicable to direct GitHub-native execution;
- the PR #33 Release Gate remained red;
- its code was never merged;
- its technical findings remain diagnostic history only.

The supersession changes the process classification. It does not retroactively accept the implementation.

---

## 3. Accepted predecessor state

```text
PSC01_STATE = Accepted
PSC01_RUNTIME_HEAD = e5032890c7cc44dd03990d4e462ec3b3bb723be0
PSC01_ACCEPTANCE_HEAD = 871b5aa962e71cf3da5c585392f32b4cbca987e6
CURRENT_MAIN_BASELINE = 2c55f8f70ab6560a3929d60542b49d9157c35f5a
```

The current `main` remains the sole implementation baseline.

---

## 4. Replanned sequence

| Order | Stage | State | Executor | Control model |
|---:|---|---|---|---|
| 1 | DRA-01 | Accepted | direct GitHub audit | complete |
| 2 | GNR-01 | Accepted | GitHub-native | Release Gate |
| 3 | PTC-01 | Accepted | GitHub-native | Release Gate |
| 4 | PSC-01 | Accepted | GitHub-native | Release Gate |
| 5 | PPR-01 | Superseded | historical GitHub-native PR #33 | closed unmerged; diagnostic only |
| 6 | PPR-GN-01 — Public Page GitHub-Native Completion | Planning authorized by this amendment; implementation blocked until planning PR acceptance | GitHub-native | evidence-driven corrections; no Lovable prompt budget |
| 7 | PTW-01 | Planned — Blocked by PPR-GN-01 | GitHub-native | no implementation authorization |
| 8 | PSG-01 | Planned — Blocked by PTW-01 | GitHub-native | no implementation authorization |
| 9 | HVP-01 | Planned — Blocked by PSG-01 | runbook/operator | evidence gate |
| 10 | VSP-01 | Optional — Not authorized | Lovable only when triggered by HVP-01 | Lovable-specific budget |
| 11 | Controlled Homologation | Blocked | operator/product team | acceptance gate |

---

## 5. PPR-GN-01 governance

```text
STAGE_ID = PPR-GN-01
PREDECESSOR = PSC-01 Accepted
EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
LOVABLE_PROMPT_BUDGET = 0
GITHUB_NATIVE_PROMPT_BUDGET = not_applicable
MAX_PARALLEL_IMPLEMENTATION_PRS = 1
IMPLEMENTATION_STARTED = false
MERGE_AUTHORIZED = false
```

PPR-GN-01 is not a renamed third Lovable prompt and is not a reopening of PR #33.

It is a new execution envelope created because:

1. the applicable executor-governance rule changed by explicit product-owner decision;
2. the implementation must restart from the audited `main` rather than the rejected branch;
3. the known CI findings must be incorporated before implementation begins;
4. every correction will be controlled by concrete GitHub evidence rather than prompt count.

---

## 6. Factual baseline for PPR-GN-01

At `main` baseline `2c55f8f...`:

- public tenant authority is resolved server-side through `requirePublicTenantFromRequest()`;
- the public page query already uses `.eq("tenant_id", tenant.id)` before slug lookup;
- the input validator already uses the inherited PTR-compatible literal shape `.strict().parse(d)`;
- the query still uses `maybeSingle()` and does not prove 0/1/N cardinality;
- the returned row is not transformed through a validated serializable public DTO;
- `tenant_id` is returned to the route-level data contract;
- the route uses unsafe local casts for page, SEO and blocks;
- the route retains an RM Prime hardcoded canonical fallback.

Therefore the remaining work is concrete and release-blocking.

---

## 7. Binding implementation order

```text
1. Merge and accept this governance/planning amendment.
2. Open exactly one PPR-GN-01 implementation PR from the accepted main.
3. Preserve PTR-compatible production shapes from the first commit:
   - .eq("tenant_id", tenant.id)
   - .strict().parse(d)
4. Run inherited PTC/PTR/PSC suites before the full Release Gate.
5. Apply only evidence-driven corrections inside the same PR.
6. Complete direct final audit before merge.
7. Authorize PTW-01 only after PPR-GN-01 acceptance.
```

---

## 8. Binding next action

Before this planning amendment is merged:

```text
NEXT_STAGE_AUTHORIZED = PPR-GN-01 planning only
PPR_GN_01_IMPLEMENTATION_AUTHORIZED = false
PTW01_AUTHORIZED = false
PSG01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

After a green Release Gate and direct acceptance of the planning PR:

```text
NEXT_STAGE_AUTHORIZED = PPR-GN-01 implementation
AUTHORIZED_EXECUTOR = GitHub-native
MAX_ACTIVE_IMPLEMENTATION_PRS = 1
PTW01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```
