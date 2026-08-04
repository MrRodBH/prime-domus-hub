# DCA-01 — Planning Acceptance and Protected Merge Submission

## Status

**Accepted — Protected Planning Merge Authorized**

```text
STAGE_ID = DCA-01
SUBMISSION_TYPE = exceptional narrow planning correction and acceptance
EXECUTION_MODEL = GitHub-native
MAIN_BASELINE = fad8874bfeef85683445f52d21611e7d8760c1a0
REJECTED_PLANNING_HEAD_HISTORICAL = b6974aaccc11fbc4118a2af8c15320e2e665233e
PLANNING_BRANCH = agent/dca-01-planning
PLANNING_PR = 64
INITIAL_EXTERNAL_PLANNING_AUDIT = Rejected
ORDINARY_CORRECTIVE_BUDGET = consumed
EXCEPTIONAL_NARROW_CORRECTION = authorized and executed
FINAL_INTERNAL_PLANNING_AUDIT = Accepted
PLANNING_MERGE_READY = true
PLANNING_MERGE_AUTHORIZED = true
IMPLEMENTATION_AUTHORIZED = conditionally_after_planning_merge
NEXT_STAGE_AUTHORIZED = DCA-01 implementation after protected planning merge
```

The rejected HEAD remains immutable historical evidence. This accepted correction supersedes its planning authority without restoring any rejected statement as operative authority.

## 1. Authorized scope

This execution changes exactly five planning documents:

```text
docs/architecture/impact-analysis/DCA-01-domain-cloudflare-activation-impact-analysis.md
docs/architecture/governance/DCA-01-domain-cloudflare-activation-execution-envelope.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-01-planning-submission.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

No file is created outside this list. No runtime, frontend, migration, RLS, policy, grant, RPC, job, queue, workflow, dependency, lockfile, generated route, deploy configuration, Cloudflare configuration or secret is changed by the planning correction.

## 2. Entry gate

Before mutation, direct GitHub verification confirmed:

```text
MAIN_HEAD = fad8874bfeef85683445f52d21611e7d8760c1a0
PR64_STATE = open
PR64_DRAFT = true
PR64_MERGED = false
PR64_MERGEABLE = true
PR64_HEAD_BEFORE_EXCEPTION = a6586bfaa8da7268d3123beb5f9eb65f8b903d98
MERGE_BASE = fad8874bfeef85683445f52d21611e7d8760c1a0
FILES_CHANGED = 5
FILES_OUTSIDE_PLANNING_SCOPE = 0
```

No competing `main` commit, implementation branch, external DCA operation or scope expansion was observed.

## 3. Historical rejected findings

The first planning authority was rejected for eight material reasons:

1. an undefined imported state existed outside the persisted enum;
2. cutover did not guarantee continuity for every incumbent public hostname;
3. replacement conflated the active incumbent with the candidate generation;
4. predecessor expressions were open rather than explicitly enumerable;
5. `FILES_ALLOWED` omitted deliverables already required by the Definition of Done;
6. canonical redirect had no request-level consumer;
7. periodic reconciliation had no repository-owned executable entrypoint;
8. production resolution and the explicit development-host map were not separated precisely enough.

The consolidated correction closed those eight findings, but direct re-audit identified three final contradictions in the state machine. The Product Owner then authorized one exceptional narrow correction limited strictly to those three items.

## 4. Exceptional narrow corrections

### 4.1 Symmetric `degraded → active`

```text
DEGRADED_SUCCESSORS_INCLUDES_ACTIVE = true
ACTIVE_PREDECESSORS_INCLUDES_DEGRADED = true
RESTORATION_REQUIRES_FULL_CURRENT_GENERATION_ACTIVE_PREDICATE = true
```

Direct restoration is permitted only after current ownership, DNS, provider binding, SSL, canonical/alias validity and reconciliation are independently re-proved. It restores the same generation and is not replacement rollback.

### 4.2 Ownership rotation preserves status

```text
PENDING_OWNERSHIP_SELF_TRANSITION = removed
CHALLENGE_ISSUANCE = status-preserving audited command
CHALLENGE_ROTATION = status-preserving audited command
INCONCLUSIVE_OBSERVATION = status-preserving audited command
CHALLENGE_VERSION_INCREMENTED = true
ANTI_REPLAY = required
```

The transition graph contains no artificial `pending_ownership_verification → pending_ownership_verification` edge. Commands mutate challenge and observation metadata, append audit events and preserve the domain status until verified evidence permits a real transition.

### 4.3 Replacement rollback boundary

```text
POST_SWAP_DIRECT_REACTIVATION = prohibited
ROLLBACK = transaction abort before commit only
POST_COMMIT_RECOVERY = new explicit replacement generation
REMOVAL_PENDING_TO_ACTIVE = prohibited
```

Before commit, any mismatch aborts the complete atomic swap and keeps the incumbent active. After commit, the former incumbent remains `removal_pending`; a later recovery must create a new candidate generation and repeat every required verification.

## 5. Consolidated accepted planning authority

The accepted planning now contains:

- a closed twelve-state model with explicit edges;
- valid legacy import only into `pending_ownership_verification`;
- a current-generation composite active predicate;
- server-only tenant, domain, provider account, transition, canonical and cutover authority;
- distinct incumbent and candidate generations;
- atomic swap with pre-commit abort only;
- global fail-closed cutover with no request-time dual query;
- exact `src/server.ts::fetch` redirect integration;
- exact `src/server.ts::scheduled` reconciliation integration;
- production/development resolver separation;
- opaque credential references and secret redaction;
- two mandatory runbooks;
- deterministic tests covering the three final contradictions.

## 6. Binding invariants preserved

```text
DOMAIN_AND_CLOUDFLARE_INTEGRATION_MODEL = HYBRID
SUPPORTED_MODES = manual_assisted, api_automated
SERVER_IS_DOMAIN_AUTHORITY = true
CLIENT_IS_DOMAIN_AUTHORITY = false
SERVER_IS_CLOUDFLARE_ACCOUNT_AUTHORITY = true
FAIL_CLOSED_ON_AMBIGUITY = true
HEURISTIC_FALLBACK = prohibited
SILENT_MODE_FALLBACK = prohibited
SUPER_ADMIN_TENANT_MUTATION_REQUIRES_IMPERSONATION = true
SAME_BACKEND_HOMOLOGATION_CELL = binding
```

## 7. Non-execution evidence

```text
RUNTIME_CHANGED = false
FRONTEND_CHANGED = false
MIGRATION_CREATED_OR_EXECUTED = false
RLS_CHANGED = false
GRANTS_CHANGED = false
WORKFLOW_CHANGED = false
DEPENDENCY_CHANGED = false
CLOUDFLARE_CONFIGURATION_CHANGED = false
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
TXT_RECORD_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
SSL_PROVISIONING_EXECUTED = false
REAL_SECRET_USED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
EXTERNAL_PROOF_EXECUTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

## 8. Accepted state

```text
DCA01_PLANNING_STATE = Accepted
DCA01_IMPLEMENTATION_STATE = Planned — Blocked until protected planning merge
DCA01_PLANNING_MERGE_READY = true
DCA01_PLANNING_MERGE_AUTHORIZED = true
DCA01_IMPLEMENTATION_AUTHORIZED = conditionally_after_planning_merge
DCA01_IMPLEMENTATION_STARTED = false
PR64_DRAFT = true before ready transition
PR64_MERGED = false before protected merge
NEXT_STAGE_AUTHORIZED = DCA-01 implementation after protected planning merge
```

The current Product Owner instruction authorizes marking PR #64 ready, executing its protected squash merge, confirming the resulting `main` HEAD and then starting the finite DCA-01 implementation. BCA-01 and PR-M3 remain blocked.
