# LVR-02A — GitHub-native governance and baseline corrective evidence

## Status

```text
GATE=LVR-02A_GITHUB_NATIVE_GOVERNANCE_AND_BASELINE_CORRECTIVE
STATE=Accepted_for_review
EXECUTION_PATH=GitHub-native_only
AUDITED_MAIN=aae99f6df7bea5e0b9ba25714428bb836f5f92c6
AUDITED_MAIN_TREE=ff82edbf2d21a83487c3032f3f1bd64aeeda1a83
BASELINE_BRANCH=agent/lvr-02a-github-native-governance-baseline-corrective
BASELINE_PARENT=aae99f6df7bea5e0b9ba25714428bb836f5f92c6
```

## Context

The Owner reaffirmed two historical binding rules:

1. every response is limited to ten real textual lines;
2. Lovable is limited to explicitly authorized Same-Backend Supabase operations and advanced UX/UI rules, and must never receive GitHub/repository instructions.

The existing governance already routed repository, architecture, security and CI work through GitHub-native execution. This corrective makes the executor boundary and output ceiling explicit in the canonical continuity file.

## LVR-01 incident reconciliation

A Lovable request was sent in `plan_mode` with explicit read-only and no-repository-write instructions. Lovable nevertheless replaced `.lovable/plan.md` and synchronized the result to the draft BCR branch.

```text
PR=105
PR_STATE=open/draft/unmerged
PRE_INCIDENT_HEAD=37d047849696c5cbea2a8d9f971b09ea4375e8d6
POST_INCIDENT_HEAD=6cf945b98bee584093633fc6d7678fbc5e1861c5
UNEXPECTED_PATH=.lovable/plan.md
MAIN_MUTATION=false
PRODUCTION_PUBLISH=false
BACKEND_MUTATION=false
VARIANT_CREATED=false
```

The incident is reconciled forward-only by this evidence. LVR-02A does not mutate, merge, rebase, force-push, revert or reconstruct PR #105. Its divergent contents remain non-authoritative and cannot be used as a future rebaseline source.

## Changes authorized and materialized

- canonical continuity governance updated on a branch created from the exact audited main;
- absolute ten-line response ceiling made explicit;
- Lovable/GitHub executor boundary made explicit;
- Lovable `plan_mode` classified as not guaranteeing read-only;
- PR #105 incident recorded without compensating mutation.

## Prohibited effects verified by construction

```text
LOVABLE_CALLS=0
PR_105_MUTATION=0
PR_105_MERGE=false
PR_105_REBASE=false
CREATE_VARIANT=false
EXECUTE_REBASELINE=false
BACKEND_MUTATION=false
PRODUCTION_PUBLISH=false
PRODUCTION_CUTOVER=false
```

## Definition of Done

LVR-02A is ready for direct GitHub diff audit. Merge is not authorized by this record. A later private-variant/rebaseline gate remains fail-closed until the canonical Lovable project can prove recognition of an exact main-derived baseline without using Lovable for GitHub operations.
