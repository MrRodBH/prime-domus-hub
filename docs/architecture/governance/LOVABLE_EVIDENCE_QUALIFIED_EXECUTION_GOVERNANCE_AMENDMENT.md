# LOVABLE EVIDENCE-QUALIFIED EXECUTION GOVERNANCE AMENDMENT

## Status

**Accepted by explicit Product Owner decision — normative amendment pending protected merge to `main`**

**Repository:** `MrRodBH/prime-domus-hub`
**Technical authority:** audited `main`
**Decision date:** 2026-08-12
**Product:** Plataforma SaaS White Label para corretores de imóveis e imobiliárias

---

## 1. Decision

For future Lovable-executed stages and explicitly authorized recovery stages created after this amendment becomes active, the fixed rule `1 principal + 1 consolidated corrective = 2 implementation prompts` is superseded by finite, evidence-qualified execution packets.

```text
PROMPT_COUNT_GOVERNANCE = superseded_for_future_Lovable_stages
EXECUTION_PACKET_GOVERNANCE = active

DEFAULT_MAX_MATERIALIZED_PACKETS = 4
HARD_MAX_MATERIALIZED_PACKETS = 6
DEFAULT_MAX_CORRECTIVE_PACKETS = 2
HARD_MAX_CORRECTIVE_PACKETS = 3

NO_MATERIALIZATION = no_budget_consumption
TRANSPORT_FAILURE = no_budget_consumption
DURABLE_PARTIAL_MUTATION = consumes_budget

NEW_SCOPE = prohibited
NEW_ARCHITECTURAL_DECISION = replan
SAME_ROOT_CAUSE_LOOP = stop_or_replan
```

The stage-specific packet ceiling MUST be frozen before its first implementation packet and MUST NOT grow during execution.

---

## 2. Supersession boundary

This amendment supersedes only the prospective Lovable prompt-count ceiling wherever it is repeated in `FINITE_DELIVERY_GOVERNANCE.md`, `FINITE_ROADMAP_EXECUTION_MAP.md`, future templates or future Execution Envelopes.

It does not supersede:

- Architecture First;
- mandatory Impact Analysis for structural/runtime-relevant changes;
- accepted ADRs and security invariants;
- server-only tenant, authorization and commercial authority;
- fail-fast and fail-closed behavior;
- `FILES_ALLOWED` and explicit generated-file allowances;
- RLS, grants and Same-Backend Homologation Cell boundaries;
- explicit Super Admin impersonation boundaries;
- secret custody rules;
- direct GitHub diff audit and Release Gate requirements;
- one active implementation flow per material stage;
- terminal-state semantics.

Historical terminal states remain factual. This amendment MUST NOT retroactively convert a rejected or exhausted Lovable implementation into an accepted one.

---

## 3. Execution Packet contract

An Execution Packet is one bounded Lovable Agent execution unit implementing a causally coherent subset of an already frozen Architecture First Execution Envelope.

Every packet MUST declare:

```text
PACKET_ID
PARENT_STAGE
AUDITED_BASELINE
OBJECTIVE
FILES_ALLOWED
GENERATED_FILES_ALLOWED
REPOSITORY_WRITE
DATABASE_DDL
DATABASE_DML
EXTERNAL_PROVIDER_WRITE
SECRET_MUTATION
DEPLOY
TESTS_REQUIRED
STOP_CONDITION
EVIDENCE_REQUIRED
PROHIBITED_SUCCESSORS
```

A packet MUST NOT:

- introduce a new architectural decision;
- enlarge the stage objective or global `FILES_ALLOWED`;
- authorize a successor;
- infer mutation authority not expressly declared.

The governing pattern is:

```text
frozen GitHub contract
→ bounded execution packet
→ terminal packet observation
→ direct audit
→ next packet or evidence-qualified corrective
```

The full architectural contract remains in GitHub. Packets SHOULD reference it instead of duplicating its complete narrative on every invocation.

---

## 4. Finite packet budget

Before implementation, planning MUST classify complexity and freeze the ceiling.

| Complexity | Materialized packets | Corrective packets | Use |
|---|---:|---:|---|
| S | 2 | 1 | Localized bounded change |
| M | 4 | 2 | Multi-file feature or bounded integration |
| L | 6 | 3 | Cross-boundary database/server/integration/UI work |
| XL | prohibited | prohibited | Must be decomposed before execution |

The values are maxima, not quotas.

Once the first implementation packet is sent:

- packet ceilings MUST NOT increase;
- new sublots or decimal identifiers MUST NOT bypass the ceiling;
- new scope is prohibited;
- a new architectural decision requires stop/replan;
- the hard maximum remains six materialized packets and three corrective packets.

---

## 5. Evidence-qualified budget consumption

Natural-language transmission alone does not consume implementation budget. Each invocation is classified only after factual observation.

### 5.1 TRANSPORT_NOT_ACCEPTED

```text
TRANSPORT_ACCEPTED = false
FILES_CHANGED = 0
DURABLE_MUTATION = 0
BUDGET_CONSUMED = false
```

This includes connector rejection before Lovable accepts an execution.

### 5.2 ACCEPTED_NO_MATERIALIZATION

An accepted request that stops because of executor time limits or another interruption does not consume budget only when direct evidence proves all applicable predicates:

```text
FILES_CHANGED = 0
GITHUB_COMMIT_OR_PR = absent
DATABASE_DDL = 0
DATABASE_DML = 0
PROVIDER_MUTATION = 0
SECRET_MUTATION = 0
DEPLOYMENT_MUTATION = 0
OTHER_DURABLE_SIDE_EFFECT = 0
BUDGET_CONSUMED = false
```

A textual Lovable statement such as `interrompi antes por limite de tempo desta execução` is not sufficient evidence. Repository, database and provider inspection control whenever available.

### 5.3 MATERIALIZED_EXECUTION

One materialized packet is consumed when any implementation artifact or durable side effect occurs, including:

- repository/workspace file changes;
- implementation commit or PR;
- database DDL or DML;
- provider mutation;
- secret/configuration mutation;
- deployment/version/routing mutation.

```text
MATERIALIZED_EXECUTION = true
BUDGET_CONSUMED = true
```

Partial implementation consumes budget. Out-of-scope durable mutation also consumes budget and separately fails scope compliance.

---

## 6. Timeout and duplicate-submission discipline

A connector/client timeout is not proof that the Lovable execution failed or completed.

```text
send packet
→ retain execution/message identity when exposed
→ on connector/client timeout, do not automatically resend
→ inspect original execution state
→ establish terminal factual observation
→ audit repository/database/provider materialization
→ classify budget consumption
```

```text
AUTOMATIC_DUPLICATE_RESUBMISSION = false
CLIENT_TIMEOUT_EQUALS_EXECUTOR_FAILURE = false
```

The same packet MUST NOT be resubmitted while its original accepted execution may still be running.

---

## 7. Evidence-qualified corrective packets

A corrective packet is not a generic retry. It is a bounded response to an audited defect inside frozen scope.

Every corrective MUST declare:

```text
OBSERVATION_ID
EXACT_FAILURE
ROOT_CAUSE_OR_BOUNDED_HYPOTHESIS
EXPECTED_CAUSAL_DELTA
FILES_ALLOWED
TEST_THAT_MUST_TURN_GREEN
PREVIOUSLY_GREEN_INVARIANTS_TO_PRESERVE
```

Generic instructions such as `try again`, `fix whatever is wrong` or `solve the remaining problems` are prohibited.

```text
NEW_SCOPE = prohibited
NEW_ARCHITECTURAL_DECISION = replan
SAME_ROOT_CAUSE_LOOP_WITHOUT_NEW_EVIDENCE = stop_or_replan
```

---

## 8. Durable mutation authority per packet

Every packet MUST explicitly declare:

```text
REPOSITORY_WRITE = true | false
DATABASE_DDL = true | false
DATABASE_DML = true | false
EXTERNAL_PROVIDER_WRITE = true | false
SECRET_MUTATION = true | false
DEPLOY = true | false
```

A repository packet may author a migration while `DATABASE_DDL = false`; in that case Same-Backend application is prohibited until a separately authorized packet declares database authority.

If Lovable performs a durable mutation declared `false`, that execution:

- consumes one materialized packet;
- fails scope compliance;
- triggers direct audit;
- MUST NOT be automatically compensated or rolled back when compensation is itself structural/runtime relevant; an accepted recovery decision is required.

---

## 9. Plan mode and executor selection

Architecture, roadmap, Impact Analysis, security boundaries and Execution Envelope design remain owned by the Architecture First process and audited GitHub state.

```text
LOVABLE_PLAN_MODE_DEFAULT = false
```

Lovable planning/exploration MAY be used only when an unresolved question depends specifically on Lovable/platform capability and cannot be answered by direct repository/provider inspection or read-only capability preflight.

Increasing Lovable packet budget does not make Lovable the mandatory executor for every surface. Default routing is:

| Surface | Preferred execution path |
|---|---|
| Architecture / IA / ADR / governance | ChatGPT + GitHub-native |
| Complex migrations / RLS / grants | GitHub-native when feasible |
| Server authorization / repositories / security boundaries | GitHub-native when feasible |
| Deterministic tests / Release Gate | GitHub-native when feasible |
| Direct repository audit | ChatGPT + GitHub |
| UI / UX | Lovable |
| UI integration against frozen backend contracts | Lovable |
| External provider operations | Dedicated authorized connector/provider path when available |

`GITHUB_NATIVE_EXECUTION_GOVERNANCE_AMENDMENT.md` remains controlling for GitHub-native evidence-driven correction mechanics.

---

## 10. Capability preflight

`CAPABILITY_PREFLIGHT_AND_CI_SCOPE_GOVERNANCE_AMENDMENT.md` remains active.

An unproved mandatory external capability MUST NOT be discovered by consuming a materialized packet when read-only proof is possible.

Its existing capability-mismatch exception remains valid. This amendment generalizes the zero-materialization classifier without weakening stricter security predicates.

---

## 11. Mandatory audit after materialization

After every materialized packet, direct audit MUST determine:

```text
BASELINE_MATCH
FILES_ALLOWED_COMPLIANCE
PROHIBITED_MUTATIONS
REQUIRED_DELIVERABLES
TEST_RESULT
DURABLE_SIDE_EFFECTS
PACKET_STATE
NEXT_PACKET_AUTHORIZED = true | false
```

The next packet may execute without a new Product Owner message when all are true:

- the Product Owner already authorized end-to-end execution for the parent stage/sequence;
- the packet stayed inside the frozen envelope;
- no new architectural decision is required;
- no unsafe factual divergence exists;
- no physical Owner action or unavailable mandatory connector is required.

This preserves delegated `EXECUTION_MODE = END-TO-END` while retaining fail-closed audit gates.

---

## 12. Terminal states and anti-loop boundary

Terminal states remain:

- `Accepted`;
- `Accepted with Non-Blocking Backlog`;
- `Blocked External`;
- `Rejected`;
- `Superseded`.

If a stage reaches its frozen hard ceiling without proving Definition of Done, no additional Lovable packet may be invented. The audit MUST stop/reject, classify `Blocked External` when appropriate, or explicitly replan/supersede only when a genuinely new Architecture First decision is required.

Packet exhaustion does not itself prove acceptance or rejection; the audited technical state controls.

---

## 13. Historical BCA-01 boundary

The existing terminal evidence remains authoritative:

```text
BCA01_PLANNING = Accepted / Merged / Closed
BCA01_IMPLEMENTATION = Rejected
BCA01_TERMINAL_STATE = Rejected
BCA01_THIRD_IMPLEMENTATION_PROMPT = historically_prohibited
```

This amendment MUST NOT adopt the rejected Lovable workspace or reclassify the historical executions.

An authorized BCA recovery is a new Architecture First recovery stage with its own non-decimal identifier, audited baseline, Impact Analysis, Execution Envelope and finite packet budget. This is not an artificial sublot because its predecessor is terminally Rejected and the recovery addresses a documented GitHub/Same-Backend divergence under new prospective governance.

---

## 14. Adoption state

Before protected merge:

```text
AMENDMENT_STATE = pending_merge
CURRENT_MAIN_GOVERNANCE = unchanged
```

After protected merge and successful post-merge Release Gate:

```text
AMENDMENT_STATE = Accepted / Merged / Active
PROMPT_COUNT_GOVERNANCE = superseded_for_future_Lovable_stages
EXECUTION_PACKET_GOVERNANCE = active
```

The first authorized consumer is the new Architecture First recovery successor of terminally Rejected BCA-01.
