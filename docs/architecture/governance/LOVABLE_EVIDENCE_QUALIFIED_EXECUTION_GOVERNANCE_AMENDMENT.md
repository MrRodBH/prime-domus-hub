# LOVABLE EVIDENCE-QUALIFIED EXECUTION GOVERNANCE AMENDMENT

## Status

**Accepted by explicit Product Owner decision — normative amendment pending protected merge to `main`**

**Repository:** `MrRodBH/prime-domus-hub`  
**Technical authority:** audited `main`  
**Decision date:** 2026-08-12  
**Product:** Plataforma SaaS White Label para corretores de imóveis e imobiliárias

---

## 1. Decision

The fixed Lovable rule of `1 principal + 1 consolidated corrective = 2 implementation prompts` is superseded prospectively for future Lovable-executed stages and for explicitly authorized recovery stages created after this amendment becomes active.

This amendment changes the unit of finite-delivery control from **message count** to **evidence-qualified materialized execution packets**.

It does not make Lovable execution unlimited. Every stage remains finite, scope-frozen, auditable and Architecture First.

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

The stage-specific packet budget MUST be frozen before the first implementation packet. The hard maximum MUST NOT be increased during execution.

---

## 2. Supersession boundary

This amendment supersedes, for applicable future Lovable stages only, every clause that treats the number of natural-language implementation prompts as the controlling finite-delivery budget.

It specifically supersedes the prospective Lovable applicability of:

```text
principal: 1
corrective: 1
total maximum: 2
```

where the same requirement is expressed in:

- `FINITE_DELIVERY_GOVERNANCE.md`;
- `FINITE_ROADMAP_EXECUTION_MAP.md`;
- stage templates or future Execution Envelopes;
- historical prompt-budget language copied into future planning documents.

This amendment does **not** supersede:

- Architecture First;
- mandatory Impact Analysis for structural or runtime-relevant change;
- accepted ADRs;
- architectural and security invariants;
- server-only tenant, authorization and commercial authority;
- fail-fast and fail-closed behavior;
- `FILES_ALLOWED` and explicit generated-file allowances;
- migration, RLS and grant boundaries;
- Same-Backend Homologation Cell;
- explicit Super Admin impersonation boundaries;
- secret custody requirements;
- direct GitHub diff audit;
- Release Gate requirements;
- one active implementation flow per material stage;
- prohibition of concurrent competing implementations;
- terminal-state semantics.

Historical stage states remain factual. This amendment MUST NOT retroactively convert an exhausted/rejected historical Lovable attempt into an accepted implementation.

---

## 3. Execution Packet

### 3.1 Definition

An **Execution Packet** is a bounded Lovable Agent execution unit that implements one causally coherent subset of an already frozen Execution Envelope.

A packet MUST declare:

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

A packet MUST NOT introduce a new architectural decision, enlarge the stage objective, enlarge the global stage `FILES_ALLOWED`, or authorize a successor.

### 3.2 Frozen contract, bounded execution

The complete Architecture First contract remains in GitHub and is the authority. Lovable packets SHOULD reference that frozen contract rather than restating its complete narrative on every invocation.

The intended pattern is:

```text
long-lived frozen contract
→ small bounded execution packet
→ terminal packet result
→ direct audit
→ next packet or evidence-qualified correction
```

This prevents both failure modes:

- one oversized prompt asking the executor to reason about architecture, database, backend, UI, tests and evidence simultaneously;
- underspecified short prompts that transfer design authority to the executor.

---

## 4. Packet budget

### 4.1 Complexity classes

Before implementation, the planning gate MUST classify the stage complexity and freeze a packet ceiling.

Recommended ceilings:

| Complexity | Materialized execution packets | Corrective packets | Meaning |
|---|---:|---:|---|
| S | 2 | 1 | Localized bounded change |
| M | 4 | 2 | Multi-file feature or bounded integration |
| L | 6 | 3 | Database + server + integration/UI or equivalent cross-boundary work |
| XL | prohibited | prohibited | Must be decomposed before execution |

The values above are maxima, not quotas.

```text
DEFAULT_MAX_MATERIALIZED_PACKETS = 4
HARD_MAX_MATERIALIZED_PACKETS = 6
DEFAULT_MAX_CORRECTIVE_PACKETS = 2
HARD_MAX_CORRECTIVE_PACKETS = 3
```

### 4.2 No dynamic expansion

Once the first implementation packet is sent:

- the materialized packet ceiling MUST NOT increase;
- the corrective packet ceiling MUST NOT increase;
- new sublots, decimal stages or artificial successor identifiers MUST NOT be created to bypass the ceiling;
- scope reduction is allowed only when it preserves the stage's accepted objective and Definition of Done;
- a new architectural decision requires stop/replan.

---

## 5. Evidence-qualified consumption

Natural-language transmission alone does not consume implementation budget.

Every Lovable invocation MUST be classified after a terminal factual observation.

### 5.1 `TRANSPORT_NOT_ACCEPTED`

Examples:

- connector invocation fails before the platform accepts the message;
- no Lovable message/execution identifier exists;
- platform transport rejects the request before execution begins.

```text
TRANSPORT_ACCEPTED = false
FILES_CHANGED = 0
DURABLE_MUTATION = 0
BUDGET_CONSUMED = false
```

### 5.2 `ACCEPTED_NO_MATERIALIZATION`

A Lovable request may be accepted but terminate because of execution-time limits or another executor-side interruption.

It does **not** consume implementation budget only when direct evidence proves all applicable conditions:

```text
FILES_CHANGED = 0
GITHUB_COMMIT_OR_PR = absent
DATABASE_DDL = 0
DATABASE_DML = 0
PROVIDER_MUTATION = 0
SECRET_MUTATION = 0
DEPLOYMENT_MUTATION = 0
OTHER_DURABLE_SIDE_EFFECT = 0
```

Then:

```text
EXECUTION_STATE = ACCEPTED_NO_MATERIALIZATION
BUDGET_CONSUMED = false
```

A textual Lovable statement such as `interrompi antes por limite de tempo desta execução` is not sufficient evidence by itself. Direct repository/provider/database inspection controls the classification whenever available.

### 5.3 `MATERIALIZED_EXECUTION`

An invocation consumes one materialized execution packet when any authorized implementation artifact or durable side effect is produced, including:

- repository file creation/modification/deletion;
- workspace or GitHub commit containing implementation changes;
- database DDL or DML;
- durable external provider mutation;
- secret/configuration mutation;
- deployment/version/routing mutation.

```text
MATERIALIZED_EXECUTION = true
BUDGET_CONSUMED = true
```

### 5.4 Partial or out-of-scope materialization

Partial implementation still consumes budget.

Out-of-scope durable mutation also consumes budget and is additionally a governance/security defect.

```text
DURABLE_PARTIAL_MUTATION = consumes_budget
OUT_OF_SCOPE_DURABLE_MUTATION = consumes_budget_and_requires_audit
```

The consumption rule measures execution occurrence, not implementation quality.

---

## 6. Timeout and transport discipline

A connector/client timeout MUST NOT be interpreted as proof that the Lovable execution itself failed or completed.

After a request is accepted:

```text
send packet
→ retain exact Lovable execution/message identity when exposed
→ if transport/client times out, do not resend automatically
→ inspect the original execution state
→ wait for or observe a terminal factual state
→ audit repository/database/provider materialization
→ only then classify budget consumption
```

Repeated submission of the same packet while the original accepted execution may still be running is prohibited.

```text
AUTOMATIC_DUPLICATE_RESUBMISSION = false
CLIENT_TIMEOUT_EQUALS_EXECUTOR_FAILURE = false
```

---

## 7. Corrective packets

A corrective packet is not a generic retry. It is a bounded implementation response to a concrete audited defect inside the frozen scope.

Every corrective packet MUST declare:

```text
OBSERVATION_ID
EXACT_FAILURE
ROOT_CAUSE_OR_BOUNDED_HYPOTHESIS
EXPECTED_CAUSAL_DELTA
FILES_ALLOWED
TEST_THAT_MUST_TURN_GREEN
PREVIOUSLY_GREEN_INVARIANTS_TO_PRESERVE
```

A corrective packet MUST NOT be authorized with instructions equivalent to:

- `try again`;
- `continue from where you stopped` without materialized-state audit;
- `fix whatever is wrong`;
- `solve the remaining problems` without exact observations.

If the same root cause recurs after a correction without new diagnostic evidence:

```text
SAME_ROOT_CAUSE_LOOP = stop_or_replan
```

If the correction requires a new architectural decision:

```text
NEW_ARCHITECTURAL_DECISION = replan
```

If the correction requires new scope:

```text
NEW_SCOPE = prohibited
```

---

## 8. Mutation authority per packet

Every packet MUST explicitly declare its durable mutation authority.

Example:

```text
REPOSITORY_WRITE = true
DATABASE_DDL = false
DATABASE_DML = false
EXTERNAL_PROVIDER_WRITE = false
SECRET_MUTATION = false
DEPLOY = false
```

A database migration file may be authored in a repository-write packet while Same-Backend application remains prohibited until a separately authorized packet declares the relevant database authority.

No hidden or implied mutation authority exists.

If Lovable performs a durable mutation declared `false`, the packet:

- consumes one materialized packet;
- fails scope compliance;
- triggers direct audit;
- MUST NOT be automatically compensated or rolled back without an accepted recovery decision when compensation itself is structural/runtime relevant.

---

## 9. Plan mode and implementation mode

For RM Prime, architecture, roadmap, Impact Analysis, security boundaries and execution-envelope design remain owned by the Architecture First process and audited GitHub state.

```text
LOVABLE_PLAN_MODE_DEFAULT = false
```

Lovable planning/exploration MAY be used only when an unresolved question depends specifically on Lovable/platform capability and cannot be answered by direct repository inspection, provider inspection or read-only capability preflight.

A planning-only interaction does not consume a materialized implementation packet unless it causes a durable implementation mutation, in which case it is classified by Section 5.

---

## 10. Executor selection

Increasing Lovable packet budget does not make Lovable the mandatory executor for every surface.

The planning gate MUST choose executors according to capability, auditability and risk.

Default preference:

| Surface | Preferred execution path |
|---|---|
| Architecture / IA / ADR / governance | ChatGPT + GitHub-native |
| Complex migrations / RLS / grants | GitHub-native when feasible |
| Server authorization / repositories / security boundaries | GitHub-native when feasible |
| Deterministic tests / Release Gate integration | GitHub-native when feasible |
| Direct repository audit | ChatGPT + GitHub |
| UI / UX | Lovable |
| UI integration against frozen backend contracts | Lovable |
| External provider operations | Dedicated authorized connector/provider path when available |

This table is a default routing policy, not a ban on an executor. Any deviation on a security-critical surface SHOULD be justified in the Execution Envelope.

Existing `GITHUB_NATIVE_EXECUTION_GOVERNANCE_AMENDMENT.md` remains controlling for GitHub-native evidence-driven correction mechanics.

---

## 11. Capability preflight integration

`CAPABILITY_PREFLIGHT_AND_CI_SCOPE_GOVERNANCE_AMENDMENT.md` remains active.

An unproved mandatory external capability MUST NOT be discovered by consuming a materialized execution packet when read-only capability proof is possible.

The existing capability mismatch exception remains valid and is generalized by this amendment's zero-materialization classifier without weakening its stricter security predicates.

---

## 12. Audit gate after every materialized packet

No materialized packet automatically authorizes the next one.

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

The next packet may execute end-to-end without Product Owner re-prompting only when:

- the Product Owner already authorized end-to-end execution for the parent stage/sequence;
- the audit proves the packet stayed inside the frozen envelope;
- no new architectural decision is required;
- no unsafe factual divergence exists;
- no physical Owner action or unavailable mandatory connector is required.

This preserves delegated end-to-end execution while retaining fail-closed gates.

---

## 13. Terminal states

Terminal states remain:

- `Accepted`;
- `Accepted with Non-Blocking Backlog`;
- `Blocked External`;
- `Rejected`;
- `Superseded`.

Packet exhaustion alone is not evidence of acceptance or rejection. The technical state controls.

When a stage reaches its frozen hard packet ceiling without proving the Definition of Done, the audit MUST choose one of:

- stop and `Rejected`;
- `Blocked External` when repository implementation is complete and only an external dependency remains;
- `Superseded` through a genuinely new accepted Architecture First decision;
- executor change inside the same frozen architecture only when explicitly permitted by the Execution Envelope and governance.

No additional Lovable packet may be created beyond the frozen hard ceiling.

---

## 14. Historical boundary and BCA-01

The historical BCA-01 terminal evidence remains authoritative:

```text
BCA01_PLANNING = Accepted / Merged / Closed
BCA01_IMPLEMENTATION = Rejected
BCA01_TERMINAL_STATE = Rejected
BCA01_THIRD_IMPLEMENTATION_PROMPT = historically_prohibited
```

This amendment MUST NOT reclassify those historical executions or adopt the rejected Lovable workspace as canonical implementation.

An explicitly authorized BCA recovery MUST be a new Architecture First recovery stage with its own stage identifier, audited baseline, accepted Impact Analysis, frozen Execution Envelope and packet budget.

Creating that recovery stage is not an artificial sublot because its predecessor is terminally Rejected and the recovery addresses a documented GitHub/Same-Backend divergence under a new prospective governance regime.

---

## 15. Adoption state

Before protected merge:

```text
AMENDMENT_STATE = pending_merge
CURRENT_MAIN_GOVERNANCE = unchanged
```

After protected merge and successful Release Gate:

```text
AMENDMENT_STATE = Accepted / Merged / Active
PROMPT_COUNT_GOVERNANCE = superseded_for_future_Lovable_stages
EXECUTION_PACKET_GOVERNANCE = active
```

The first authorized stage to use this amendment is the new Architecture First recovery successor of the terminally Rejected BCA-01.
