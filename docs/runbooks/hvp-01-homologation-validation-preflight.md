# HVP-01 — Homologation Validation Preflight Runbook

## Status

**Planning artifact only — DO NOT EXECUTE**

```text
STAGE_ID = HVP-01
BASELINE_MAIN = c140f44afc8b3d46d15d920acee2bb120c86251c
PLANNING_AUTHORIZED = true
LIVE_EXECUTION_AUTHORIZED = false
FIXTURE_CREATION_AUTHORIZED = false
OPERATIONAL_MUTATIONS_AUTHORIZED = false
AUTHORIZED_EXECUTOR = GitHub-native runbook + authorized operator
LOVABLE_AUTHORIZED = false
```

This runbook defines the future operator procedure. Its presence in the repository does not authorize any live action.

---

## 1. Roles

### Product owner

- authorizes the exact HVP-01 execution window;
- authorizes the exact `main` SHA;
- confirms that no successor stage is started automatically;
- receives the final external audit decision.

### Authorized operator

- performs factual no-write preflight;
- verifies backup/recovery readiness;
- executes only the future explicitly authorized probe plan;
- supervises fixture lifecycle and teardown;
- prevents secret disclosure.

### GitHub-native executor

- prepares or updates auditable harness/runbook artifacts only within an accepted future execution envelope;
- runs deterministic repository checks and Release Gate;
- persists non-secret evidence;
- does not self-authorize operator actions.

### External auditor

- audits exact `main`, branch/PR diff, Release Gate and persisted evidence;
- verifies that protected baseline and zero-residue criteria are met;
- issues the terminal decision.

---

## 2. Current stop condition

Stop immediately because live execution is not yet authorized.

```text
CURRENT_ALLOWED_ACTIONS = documentation, planning validation, Release Gate, direct audit
CURRENT_FORBIDDEN_ACTIONS = sessions, live probes, fixtures, writes, teardown, operational window
```

The remaining sections are the frozen procedure for a future separately authorized run.

---

## 3. Required authorization packet

Before any execution, the operator must possess one explicit authorization packet containing:

```text
HVP01_EXECUTION_AUTHORIZED = true
AUTHORIZED_MAIN_SHA = <exact 40-character SHA>
AUTHORIZED_BACKEND_IDENTIFIER = <redacted exact identifier>
AUTHORIZED_WINDOW_START = <timestamp>
AUTHORIZED_WINDOW_END = <timestamp>
AUTHORIZED_OPERATOR = <identity>
PROTECTED_REGISTRY_DIGEST = <sha256>
BACKUP_RESTORE_POINT = <identifier and timestamp>
STORAGE_BACKUP_DECISION = <available | not-applicable-with-evidence>
PUBLIC_WRITE_WINDOW_CONTROL = <mechanism>
```

Absence or ambiguity of any field stops the run before credentials, sessions or writes.

---

## 4. Phase A — no-write eligibility preflight

### A1. Repository lock

Record:

- current `main` SHA;
- authorized execution SHA;
- comparison result;
- Release Gate run, job, conclusion, artifact ID and artifact digest;
- confirmation that the canonical workflow used `bun install --frozen-lockfile` and the complete release verification.

Required result:

```text
MAIN_SHA_MATCH = true
RELEASE_GATE_CONCLUSION = success
```

### A2. Product-operation classification

Obtain factual evidence for:

- pre-homologation status;
- absence of active external customer operation;
- absence of real subscriptions and payments in the test scope;
- absence of real customer leads in the test scope;
- absence of real external users in the test scope;
- absence of real personal data in fixture scope;
- ability to control public writes during the window.

Names, prefixes and assumptions do not constitute evidence.

### A3. Backend lock

Resolve the exact current backend identity through an authorized administrative source. Compare it to the authorized packet.

Required result:

```text
BACKEND_ID_RESOLVED = true
BACKEND_ID_MATCH = true
HEURISTIC_BACKEND_SELECTION_USED = false
EXTERNAL_SUPABASE_FALLBACK_USED = false
```

### A4. Recovery readiness

Record:

- latest backup/restore point;
- restore scope and destructive implications;
- responsible operator;
- recovery decision if the run is interrupted;
- separate Storage backup evidence or explicit not-applicable rationale.

A backup statement without timestamp or authoritative source fails closed.

### A5. Protected baseline registry

Register by canonical ID:

- RM Prime tenant;
- protected memberships and users;
- protected domains and settings;
- protected data categories and counts;
- protected Storage objects or protected bucket/path sets;
- known preexisting internal-test residue that must not be touched.

Compute a deterministic digest over the ordered protected registry.

Required result:

```text
PROTECTED_BASELINE_REGISTERED = true
PROTECTED_REGISTRY_DIGEST_PRESENT = true
NAME_BASED_PROTECTION_ONLY = false
```

### A6. Eligibility decision

If every required item is proven:

```text
HVP01_PREFLIGHT_DECISION = ELIGIBLE_FOR_SAME_BACKEND_CELL
```

Otherwise:

```text
HVP01_PREFLIGHT_DECISION = BLOCKED_EXTERNAL
LIVE_MUTATIONS_PERFORMED = false
```

Persist the decision and stop. A `BLOCKED_EXTERNAL` decision does not authorize corrective implementation or environmental guessing.

---

## 5. Phase B — execution preparation

Phase B is permitted only after a separately audited preflight and explicit live-execution authorization.

### B1. Generate run identity

Create one cryptographically strong, non-secret `run_id`.

### B2. Initialize manifest

Create the manifest before the first fixture. Record:

- run metadata;
- execution SHA and Release Gate evidence;
- redacted backend identifier;
- protected registry digest;
- zeroed fixture categories;
- cleanup state `not_started`.

Persist the manifest atomically. Failure to persist stops the run.

### B3. Credential handling

- credentials remain in authorized secret storage;
- credentials are injected only for the active process;
- no credential is echoed;
- logs redact authorization headers, cookies, JWTs and passwords;
- evidence stores identities and IDs only when non-secret and required.

### B4. Traffic control

Activate the authorized public-write control mechanism and verify it factually before fixture creation.

---

## 6. Phase C — synthetic fixture creation

Create only manifest-bound synthetic objects.

Minimum:

1. synthetic tenant A;
2. synthetic tenant B;
3. distinct synthetic Auth users;
4. memberships and roles required by the probe matrix;
5. synthetic public content/resources;
6. synthetic lead/write targets;
7. synthetic Storage objects only where required.

For each object:

- capture canonical ID immediately;
- bind it to `run_id`;
- record expected cleanup dependency;
- verify it is absent from the protected registry;
- fail and enter teardown on any discrepancy.

Preexisting objects cannot be adopted as fixtures.

---

## 7. Phase D — live probe execution

Execute probes in deterministic order and persist per-probe evidence.

### D1. Framework and public-surface security

| Probe | Expected result |
|---|---|
| HVP-CSRF-01 same-origin serverFn | accepted when otherwise authorized |
| HVP-CSRF-02 cross-origin serverFn | rejected |
| HVP-CSRF-03 malformed Origin | rejected |
| HVP-CSRF-04 missing Origin | rejected |
| HVP-CSRF-05 intentionally public file route | reachable under route authority |
| HVP-CONTENT-01 unsafe persisted HTML | sanitized before execution |
| HVP-CONTENT-02 unsafe destination | rejected or removed fail-closed |
| HVP-CONTENT-03 unknown embed provider | rejected |

### D2. Tenant and identity

| Probe | Expected result |
|---|---|
| HVP-TENANT-01 tenant A session | tenant A only |
| HVP-TENANT-02 tenant B session | tenant B only |
| HVP-TENANT-03 forged x-tenant-id | cannot select foreign tenant |
| HVP-TENANT-04 forged path/payload tenant | no authority |
| HVP-TENANT-05 foreign resource | denied |
| HVP-TENANT-06 missing/ambiguous tenant | fail closed |
| HVP-IMP-01 Super Admin without impersonation | tenant-scoped access denied |
| HVP-IMP-02 explicit impersonation | server-revalidated and bounded |
| HVP-IMP-03 session/switch isolation | no impersonation leakage |

### D3. Public tenant-bound operations

| Probe | Expected result |
|---|---|
| HVP-PTW-01 public lead write | accepted tenant derived by server |
| HVP-PTW-02 forged tenant write input | rejected/ignored as authority |
| HVP-PTW-03 portal immediate vs replay | same tenant-bound mutation path |
| HVP-PSG-01 public read | accepted-tenant rows, tenant-free DTO |
| HVP-PSG-02 public signing | after tenant/resource authority only |

Any unexpected success in a negative probe or unexpected denial in a required positive probe marks the run failed and enters teardown.

---

## 8. Phase E — teardown

Teardown executes in a `finally`-equivalent path.

Required order:

1. validate `run_id`, backend lock and manifest;
2. stop test clients and synthetic sessions;
3. remove exact synthetic Storage objects;
4. remove manifest-registered child records;
5. remove manifest-registered leads, imóveis, events and auxiliary records;
6. remove synthetic memberships and roles;
7. remove synthetic Auth users;
8. remove synthetic tenants;
9. persist cleanup counts and failures;
10. execute residue scan;
11. compare protected baseline invariants;
12. release the controlled traffic window only after operator review.

The operator must not use global delete, prefix cleanup, broad cascade, schema reset or any deletion not backed by the manifest.

---

## 9. Phase F — residue and protected-baseline verification

Required acceptance values:

```text
fixtures_cleaned == fixtures_created
orphaned_fixtures == 0
protected_baseline_changed == false
rm_prime_tenant_preserved == true
residue_scan_passed == true
```

The scan must cover:

- synthetic tenants;
- synthetic Auth users;
- memberships and roles;
- synthetic leads, imóveis, events and content;
- exact Storage objects;
- orphan references;
- all manifest-registered categories.

Any residue prevents acceptance, even when functional probes passed.

---

## 10. Evidence artifact

Persist one non-secret final artifact with:

```text
stage_id
run_id
execution_main_sha
release_gate_evidence
preflight_decision
redacted_backend_identifier
protected_registry_digest
operator_identity
window_timestamps
fixture_counts
probe_results
cleanup_counts
residual_counts
protected_baseline_changed
rm_prime_tenant_preserved
residue_scan_passed
final_outcome
```

Allowed final outcomes:

```text
Accepted
Accepted with Non-Blocking Backlog
Blocked External
Rejected
Superseded
```

No outcome may be declared `Accepted` when teardown, residue scan or protected-baseline comparison is incomplete.

---

## 11. Emergency stop conditions

Stop new actions and enter teardown when any of the following occurs:

- backend identity mismatch;
- unauthorized SHA or failed Release Gate;
- protected registry mismatch;
- evidence of real customer/user/personal data exposure;
- uncontrolled external traffic;
- manifest persistence failure;
- fixture ID missing from manifest;
- protected ID appears in a mutation set;
- secret disclosure risk;
- cross-tenant positive access;
- missing-Origin serverFn accepted unexpectedly;
- teardown dependency ambiguity;
- operator window expires.

---

## 12. Current Definition of Done — planning only

This runbook is planning-complete when:

- every live phase is gated behind explicit future authorization;
- the no-write preflight can terminate `Blocked External` before mutation;
- roles, guards, probe matrix, teardown, residue and evidence are explicit;
- no external Supabase fallback is introduced;
- no terminal historical stage is reopened;
- direct audit accepts the planning PR;
- the planning PR is merged through a separately authorized protected merge.

The runbook must remain marked `DO NOT EXECUTE` until that later authorization is recorded.
