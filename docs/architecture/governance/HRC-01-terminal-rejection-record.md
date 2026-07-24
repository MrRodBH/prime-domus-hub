# HRC-01 — Terminal Rejection Record

## Decision

```text
STAGE_ID = HRC-01
FINAL_STATE = Rejected — Terminal
FINAL_EXTERNAL_AUDIT_ACCEPTED = false
PRINCIPAL_PROMPT_CONSUMED = true
CORRECTIVE_PROMPT_CONSUMED = true
REMAINING_PROMPT_BUDGET = 0/2
ADDITIONAL_PROMPT_AUTHORIZED = false
SUCCESSOR_AUTO_AUTHORIZED = false
```

## Audited baseline

```text
HRC01_FINAL_HEAD = bc996d084932dea3c96877d5d597d9dcc3b3afb1
HRC01_REJECTION_GATE = f9326691f561b958c2a4ed7230dd5bf6059a8df4
ANCESTRY = bc996d08 is 9 commits ahead of f9326691 and 0 behind
```

## Terminal reason

The HRC-01 execution envelope prohibited changes to `src/**` and did not list
`src/routeTree.gen.ts` in `FILES_ALLOWED`.

The final HRC-01 commit changed `src/routeTree.gen.ts` by removing the generated
TanStack Start Register augmentation.

```text
FILES_OUTSIDE_ALLOWED = 1
OUTSIDE_ALLOWED_PATH = src/routeTree.gen.ts
SCOPE_COMPLIANCE = false
RUNTIME_PRESERVATION_CLAIM_PROVEN = false
```

This finding is sufficient to reject HRC-01 independently of whether the
resulting route tree is buildable.

## Current technical state preserved as finding

```text
ROUTE_TREE_REGISTER_FOOTER_PRESENT = false
DEDICATED_REGISTER_DECLARATION_PRESENT = false
CANONICAL_REGISTER_AUTHORITY_PROVEN = false
```

These fields are findings only. They do not authorize runtime repair in
HRC-01 or HRR-01.

## Historical document treatment

The following remain historical planning inputs only:

```text
docs/architecture/impact-analysis/HRC-01-homologation-readiness-closure-impact-analysis.md
docs/architecture/governance/HRC-01-roadmap-reconciliation.md at commits before HRR-01
docs/architecture/impact-analysis/HVP-01-homologation-validation-preflight-impact-analysis.md
docs/architecture/governance/HVP-01-roadmap-reconciliation.md
```

Any prior status text stating `Planning — Ready for Direct External Audit` is
superseded by this terminal record and by HRR-01 roadmap reconciliation.

## Strategy preservation

```text
GNR01_STATE = Accepted
STRATEGY_B_REACTIVATION_AUTHORIZED = false
AUTHORED_REGISTER_DECLARATION_AUTHORIZED = false
GENERATED_ROUTE_TREE_REWRITER_AUTHORIZED = false
```

## Successor control

```text
HRR01_STATE = Planning — Ready for Direct External Audit
HRI01_STATE = Planned — Not Authorized
LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
```

HRC-01 cannot be reopened, corrected again or used as an implementation
authority.