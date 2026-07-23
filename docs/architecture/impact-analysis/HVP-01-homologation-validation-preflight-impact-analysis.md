# HVP-01 — Homologation Validation Preflight Impact Analysis

## Status

**Planning and preparation only — Ready for Direct External Audit**

```text
STAGE_ID = HVP-01
STAGE_TYPE = evidence and operator preflight gate
BASELINE_MAIN = c140f44afc8b3d46d15d920acee2bb120c86251c
CANONICAL_ISSUE = 5
PREDECESSOR = PSG-01 Accepted with Non-Blocking Backlog — Merged
AUTHORIZED_EXECUTOR = GitHub-native runbook + authorized operator
PLANNING_AUTHORIZED = true
PLANNING_STARTED = true
LIVE_EXECUTION_AUTHORIZED = false
FIXTURES_AUTHORIZED = false
MUTATIONS_AUTHORIZED = false
VSP01_AUTHORIZED = false
LSV03_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
MAX_ACTIVE_PLANNING_PRS = 1
```

---

## 1. Purpose

HVP-01 is the Architecture First gate that determines whether the current pre-homologation backend is factually eligible for a controlled Same-Backend Homologation Cell and freezes the operator evidence contract required before any live validation run.

This planning artifact does not execute probes, acquire sessions, create tenants, create users, insert data, alter Auth, write Storage objects, suspend traffic, invoke teardown or change runtime behavior.

HVP-01 is not a reopening of LSV-02, LSR-01, LSR-02, FRP-01 or any other terminal stage. It is a new GitHub-native planning envelope based on the current audited `main`. Preserved historical findings are inputs only; historical deliverables and acceptance claims are not transferred.

---

## 2. Authority and predecessor state

Authority order for this planning gate:

1. audited GitHub `main` at `c140f44afc8b3d46d15d920acee2bb120c86251c`;
2. accepted GitHub-native execution governance amendment;
3. PSG-01 accepted implementation and squash-merge evidence;
4. canonical issue #5;
5. preserved Same-Backend Homologation Cell architectural constraints;
6. this Impact Analysis after direct audit and protected merge.

Predecessor state:

```text
PSG01_IMPLEMENTATION_PR = 48
PSG01_IMPLEMENTATION_HEAD = 7d8e3faae1ab188576c23deb03b6f41aa2e82f6a
PSG01_SQUASH_MERGE_COMMIT = c140f44afc8b3d46d15d920acee2bb120c86251c
PSG01_IMPLEMENTATION_STATE = Accepted with Non-Blocking Backlog
PSG01_IMPLEMENTATION_MERGED = true
PSG01_NON_BLOCKING_BACKLOG_OWNER = HVP-01 evidence gate
```

---

## 3. Roadmap reconciliation

The current executable chain is frozen as:

```text
PPR-GN-01    Accepted
PTW-01       Accepted
PSG-01       Accepted with Non-Blocking Backlog — Merged
HVP-01       Planning and preparation authorized
VSP-01       Optional — Not authorized
Controlled Homologation  Blocked by HVP-01 acceptance
Production                Blocked until controlled homologation acceptance
```

The stage-specific reconciliation is recorded in:

`docs/architecture/governance/HVP-01-roadmap-reconciliation.md`.

No terminal historical stage is reopened. No rejected or superseded artifact regains authority.

---

## 4. Architectural decision

The Same-Backend Homologation Cell remains binding.

The homologation proof may use the current primary backend only while factual evidence proves that the product remains pre-homologation and that the controlled run cannot affect real customers, real subscriptions, real payments, real leads, real external users, real personal data or uncontrolled public traffic.

Isolation is achieved through:

- exact backend lock;
- protected baseline registry by canonical IDs;
- synthetic-only fixtures;
- at least two distinct synthetic tenant contexts;
- one per-run manifest;
- deterministic manifest-scoped teardown;
- zero-residue evidence;
- explicit operator authorization and controlled window.

A separate Supabase project is neither required nor a canonical fallback. Historical references to an external project have no current operational authority.

---

## 5. HVP-01 objective

HVP-01 must produce one auditable eligibility decision before any controlled homologation execution:

```text
ELIGIBLE_FOR_SAME_BACKEND_CELL
OR
BLOCKED_EXTERNAL
```

`ELIGIBLE_FOR_SAME_BACKEND_CELL` requires every mandatory precondition to be proven.

`BLOCKED_EXTERNAL` is required when repository planning is complete but an operational prerequisite is absent, stale, ambiguous or unverifiable. Missing prerequisites do not authorize implementation loops or speculative mutations.

---

## 6. Planning scope

Current planning scope:

1. reconcile the roadmap after PSG-01 merge;
2. freeze HVP-01 authority, exclusions and state transitions;
3. define the no-write eligibility preflight;
4. define the protected baseline contract;
5. define the future live-probe matrix;
6. define fixture, manifest, teardown and residue requirements;
7. define evidence schemas and redaction rules;
8. define operator and auditor responsibilities;
9. define `FILES_ALLOWED`, tests, Release Gate and Definition of Done;
10. leave live execution explicitly unauthorized.

---

## 7. Eligibility preflight — mandatory no-write evidence

Before any future live execution authorization, the operator must prove all of the following through read-only or administrative evidence:

1. the exact `main` SHA authorized for the run;
2. a successful Release Gate bound to that SHA;
3. formal pre-homologation status;
4. no external customer tenant is operating in the target backend;
5. no real commercial subscription is active in the test scope;
6. no real payment or billing event will be touched;
7. no real client lead will be used, modified or deleted;
8. no real imóvel or media asset will be used as fixture;
9. no real external user is operating in the test scope;
10. no real personal datum will be copied into fixture data;
11. public write traffic can be suspended or strictly controlled during the authorized window;
12. a current backup/restore point exists and the recovery mechanism is understood;
13. Storage has a separate backup or an explicit factual determination that no protected Storage object can be affected;
14. the RM Prime tenant and every protected preexisting entity are registered by canonical ID;
15. at least two synthetic tenant contexts can be created without reusing preexisting objects;
16. an authorized operator is available to supervise the run and teardown;
17. all required secrets can be supplied only at execution time without entering logs or persisted evidence;
18. the exact backend/project identity can be resolved and locked without heuristic fallback.

Any missing, divergent or ambiguous item fails closed to `Blocked External` before the first mutation.

---

## 8. Hard guards

- **HVP-HG-01 — Explicit execution authorization:** planning acceptance does not authorize live execution.
- **HVP-HG-02 — Exact backend lock:** unresolved or divergent backend identity stops the run.
- **HVP-HG-03 — Audited code lock:** the execution SHA and successful Release Gate must be recorded before sessions or fixtures.
- **HVP-HG-04 — Protected baseline registry:** RM Prime and all protected entities are registered by canonical ID before any write.
- **HVP-HG-05 — Synthetic-only fixtures:** every created object is synthetic and bound to the run manifest.
- **HVP-HG-06 — Two-tenant minimum:** the run uses at least two distinct synthetic tenants.
- **HVP-HG-07 — No preexisting mutation:** no preexisting tenant, user, membership, role, lead, imóvel, event, content, domain or Storage object may be reused or modified as fixture.
- **HVP-HG-08 — No destructive global operation:** database reset, schema/table drop, truncate, unscoped delete and prefix-only cleanup are prohibited.
- **HVP-HG-09 — Controlled traffic window:** uncontrolled external writes stop the run.
- **HVP-HG-10 — Manifest authority:** only IDs and exact Storage paths recorded by the run may be removed.
- **HVP-HG-11 — Cleanup always:** teardown executes on success, failure, interruption or partial fixture creation.
- **HVP-HG-12 — Zero residue:** any remaining fixture prevents acceptance.
- **HVP-HG-13 — Protected baseline unchanged:** before/after protected counts and invariants must match.
- **HVP-HG-14 — Secret redaction:** no secret, JWT, password, full access token or service-role key enters evidence.
- **HVP-HG-15 — Fail closed:** ambiguity in environment, data classification, tenant authority, manifest or cleanup stops execution.
- **HVP-HG-16 — Post-real-operation prohibition:** Same-Backend execution is prohibited after real operation begins.

---

## 9. Protected baseline contract

The protected baseline registry must contain, at minimum:

- canonical RM Prime tenant ID;
- canonical IDs of protected memberships and users;
- protected domain and settings identifiers;
- protected data categories and factual counts;
- protected Storage buckets and exact object sets when applicable;
- known preexisting internal-test residue classifications that must not be cleaned by HVP-01;
- baseline timestamp and source of evidence.

Name, slug, prefix, email domain or textual convention is never sufficient authority.

Protected objects:

- cannot be fixtures;
- cannot appear in the deletion set;
- cannot be modified by the harness;
- must be proven present and unchanged after teardown.

---

## 10. Future Homologation Cell composition

The future run requires at least:

- synthetic tenant A for legitimate context;
- synthetic tenant B for adversarial and cross-tenant context;
- distinct synthetic Auth identities;
- synthetic memberships and roles;
- synthetic public-read and public-write resources required by the probe matrix;
- synthetic Storage objects only when a probe explicitly requires them;
- one immutable `run_id` and one authoritative fixture manifest.

Human-readable labels are diagnostic only. Authority remains in generated IDs captured in the manifest.

---

## 11. Future probe matrix

The accepted live-execution envelope must cover at least:

### 11.1 Framework and public-surface security

- **HVP-CSRF-01:** same-origin serverFn request is accepted when otherwise authorized;
- **HVP-CSRF-02:** cross-origin serverFn request is rejected;
- **HVP-CSRF-03:** malformed `Origin` is rejected;
- **HVP-CSRF-04:** missing `Origin` is rejected by the secure framework default;
- **HVP-CSRF-05:** intentionally public file routes remain reachable under their own server authority;
- **HVP-CONTENT-01:** persisted unsafe HTML is sanitized before public execution;
- **HVP-CONTENT-02:** unsafe navigation/media/embed destinations fail closed;
- **HVP-CONTENT-03:** unknown embed providers are rejected.

### 11.2 Tenant, identity and impersonation

- **HVP-TENANT-01:** tenant A session resolves tenant A only;
- **HVP-TENANT-02:** tenant B session resolves tenant B only;
- **HVP-TENANT-03:** forged `x-tenant-id` cannot select another tenant;
- **HVP-TENANT-04:** forged path or payload tenant identifiers do not gain authority;
- **HVP-TENANT-05:** foreign-tenant resources are denied;
- **HVP-TENANT-06:** missing or ambiguous tenant context fails closed;
- **HVP-IMP-01:** Super Admin without explicit impersonation cannot access tenant-scoped resources;
- **HVP-IMP-02:** explicit impersonation is revalidated by the server and remains bounded to the accepted tenant;
- **HVP-IMP-03:** impersonation state cannot leak across sessions or tenant switches.

### 11.3 Public tenant-bound operations

- **HVP-PTW-01:** public lead writes derive tenant authority from accepted server context;
- **HVP-PTW-02:** forged tenant input cannot redirect a public write;
- **HVP-PTW-03:** portal immediate ingestion and DLQ replay preserve the same accepted tenant-bound mutation path;
- **HVP-PSG-01:** residual public reads return only accepted-tenant rows and tenant-free DTOs;
- **HVP-PSG-02:** public document/media signing begins only after accepted tenant and resource authority.

The final live probe inventory may add factual cases discovered during planning audit, but it may not silently remove any mandatory case above.

---

## 12. Manifest and evidence contract

The execution manifest must record, at minimum:

```text
run_id
execution_main_sha
release_gate_run_id
release_gate_conclusion
redacted_backend_identifier
protected_registry_digest
synthetic_tenant_ids
synthetic_user_ids
membership_and_role_ids
synthetic_resource_ids
exact_storage_paths
expected_fixture_counts
created_fixture_counts
cleanup_attempted
cleanup_removed_counts
residual_counts
protected_baseline_changed
rm_prime_tenant_preserved
residue_scan_passed
final_state
```

The manifest and evidence artifacts must never contain passwords, JWTs, service-role keys, refresh tokens, unredacted secrets or full synthetic-user credentials.

---

## 13. Deterministic teardown and residue scan

Teardown authority is limited to the manifest. Required sequence:

1. validate `run_id`, backend lock and manifest integrity;
2. stop test clients and revoke/close synthetic sessions where applicable;
3. remove exact synthetic Storage objects;
4. remove manifest-registered child records;
5. remove manifest-registered leads, imóveis, events and auxiliary data;
6. remove manifest-registered memberships and roles;
7. remove manifest-registered synthetic Auth users;
8. remove manifest-registered synthetic tenants;
9. persist per-category cleanup counts;
10. execute residue scan;
11. compare protected baseline invariants;
12. fail acceptance on any residue or protected-baseline change.

Generic cascades, name-based cleanup, prefix-only cleanup and deletion of objects not present in the manifest are prohibited.

---

## 14. Planning `FILES_ALLOWED`

Exactly four repository files are authorized in this planning PR:

```text
docs/architecture/governance/HVP-01-roadmap-reconciliation.md
docs/architecture/impact-analysis/HVP-01-homologation-validation-preflight-impact-analysis.md
docs/runbooks/hvp-01-homologation-validation-preflight.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/hvp-01-planning-submission.md
```

Issue #5 may be updated as canonical metadata and is not a repository-file mutation.

No other repository path is authorized.

---

## 15. Absolute prohibitions for this planning PR

- no runtime source change;
- no test runner or harness implementation;
- no dependency or lockfile change;
- no workflow change;
- no generated route change;
- no migration, schema, RLS, grants, policy, trigger or function change;
- no Auth user, role or membership mutation;
- no Storage mutation;
- no cron, queue, webhook or outbound integration change;
- no environment-secret change;
- no live HTTP probe against the operational backend;
- no fixture creation;
- no cleanup execution;
- no VSP-01, LSV-03 or Controlled Homologation start;
- no Lovable invocation;
- no reopening of terminal stages.

---

## 16. Planning validation and Release Gate

The planning PR must prove:

```text
BASELINE_MAIN_EXACT = true
ACTIVE_HVP01_PLANNING_PRS = 1
CHANGED_REPOSITORY_FILES = 4
FILES_OUTSIDE_ALLOWED = 0
RUNTIME_FILES_CHANGED = 0
WORKFLOW_CHANGED = 0
DEPENDENCY_LOCKFILE_CHANGED = 0
DATABASE_AUTH_STORAGE_CHANGED = 0
LIVE_EXECUTION_PERFORMED = false
```

Required validation:

1. direct diff inspection of all four documents;
2. consistency between roadmap reconciliation, Impact Analysis, runbook and submission evidence;
3. verification that every live action is explicitly gated behind future authorization;
4. complete repository Release Gate using the canonical workflow;
5. evidence artifact bound to the exact final PR HEAD;
6. direct external planning audit before merge.

A green Release Gate is necessary but not sufficient. Merge remains unauthorized until direct audit acceptance.

---

## 17. Definition of Done — planning

Planning is complete only when:

- the four allowed documents exist and are mutually consistent;
- PSG-01 is recorded as accepted and merged;
- HVP-01 is recorded as planning-only with live execution false;
- terminal stages remain closed and non-authoritative;
- Same-Backend Homologation Cell is preserved without external Supabase fallback;
- eligibility preconditions are complete and fail closed;
- protected baseline, manifest, teardown and residue contracts are explicit;
- the future probe matrix includes PSG-01 CSRF/public-route evidence and tenant/impersonation/public-writer cases;
- tests and Release Gate requirements are explicit;
- the complete Release Gate is green on the exact planning HEAD;
- direct external planning audit returns `Accepted`;
- the planning PR is merged by a separately authorized protected merge.

Planning acceptance does not satisfy the live HVP-01 evidence gate.

---

## 18. State transition

Current transition:

```text
HVP-01 Planned — Blocked by PSG-01
→
HVP-01 Planning and Preparation Authorized — Live Execution Not Authorized
```

Possible post-audit planning state:

```text
HVP-01 Planning Accepted — Live Execution Pending Explicit Authorization
```

No subsequent stage is authorized by this planning transition.
