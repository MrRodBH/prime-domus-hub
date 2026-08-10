# Capability Preflight & CI Scope Governance Amendment

**Status:** Normativo e vinculante após merge protegido em `main`  
**Scope:** RM Prime SaaS / RM Prime OS  
**Authority:** amendment to `FINITE_DELIVERY_GOVERNANCE.md`  
**Baseline:** `main@d0f120d9ffad018a9d1d944cf34e3266c8ca5c71`

## 1. Mandatory Capability Preflight

Before an implementation strategy is frozen as executable, every external executor or managed platform primitive on the critical path MUST be checked against the exact current project.

The gate MUST answer all applicable questions:

```text
CAPABILITY_CREATE_PRIMITIVE = proven true | not applicable
CAPABILITY_SERVER_ENV_ACCESS = proven true | not applicable
CAPABILITY_PUBLISH_OR_MATERIALIZE = proven true | not applicable
CAPABILITY_SECOND_RUNTIME_OR_DEPLOY_AUTHORITY = false | explicitly accepted by architecture decision
```

The factual questions are:

1. Can the selected executor create the required primitive in this exact project?
2. Can the primitive access the required environment/secret names server-side without exposing values?
3. Can the selected executor publish or materialize it through the intended managed path?
4. Does the primitive introduce another runtime, deploy authority or secret custodian?

Unknown capability is not acceptance evidence.

A strategy that depends on an unproved mandatory capability MUST remain planning-only or `Blocked External`; it MUST NOT consume the principal implementation prompt merely to discover executor feasibility.

Capability inspection MUST be read-only whenever the platform supports read-only inspection.

## 2. CAPABILITY_MISMATCH_EXCEPTION

### 2.1 Eligibility

The exception applies only when direct evidence proves all conditions:

```text
FILES_CHANGED = 0
PROVIDER_MUTATION = 0
SECRET_EXPOSED = false
FAILURE_CLASS = factual executor/platform capability mismatch
```

`FILES_CHANGED = 0` means zero repository implementation files were created, modified or deleted by the failed attempt.

`PROVIDER_MUTATION = 0` means zero externally durable provider mutation occurred, including deployments, versions, DNS, routes, managed migrations, secrets or comparable resources.

### 2.2 Effect

When eligible:

```text
CONSOLIDATED_CORRECTIVE_PROMPT = not consumed by the capability mismatch
REPLACEMENT_WITHIN_SAME_STAGE = permitted
SHORT_REPLACEMENT_IMPACT_ANALYSIS = mandatory
MAX_REPLACEMENT_STRATEGIES_AFTER_MISMATCH = 1
```

The replacement IA MUST:

- identify the disproved capability;
- identify the replacement primitive;
- prove the replacement capability before implementation;
- preserve the original stage objective and security invariants;
- state whether runtime, deploy or secret-custody authority changes;
- keep the original implementation scope from growing.

### 2.3 Non-eligibility

The exception MUST NOT apply when:

- repository files were mutated by the implementation attempt;
- a provider mutation occurred;
- a secret value was exposed or transported outside its authorized custodian;
- the failure is a coding/design defect within an otherwise supported primitive;
- the replacement changes the stage objective;
- more than one replacement strategy has already been attempted under the exception.

In those cases, normal finite-delivery prompt-budget rules remain authoritative.

## 3. CI Scope Classification

Every pull request to `main` MUST be classified using the exact base/head diff.

```text
DOCS_ONLY = changed_file_count > 0 AND every changed path starts with docs/
TECHNICAL_CHANGE = NOT DOCS_ONLY
```

`.github/**`, `scripts/**`, `src/**`, `supabase/**`, package/config files and every other path outside `docs/**` are technical changes.

### 3.1 Documentation-only contract

For `DOCS_ONLY = true`:

```text
REQUIRED_STATUS_CHECKS = preserved
DOCUMENTATION_GOVERNANCE_VALIDATION = required
PRODUCTION_BUILD = skipped
WORKERD_PROOF = skipped
WRANGLER_DRY_RUN = skipped
APPLICATION_TEST_SUITE = skipped unless a future governance rule explicitly requires a docs-dependent test
```

The lightweight documentation validator MUST prove:

- exact base/head identities;
- docs-only scope;
- clean `git diff --check`;
- no unresolved merge-conflict markers in changed Markdown files;
- balanced fenced Markdown code blocks in changed Markdown files;
- machine-readable evidence of the validation.

### 3.2 Technical-change contract

For `TECHNICAL_CHANGE = true`:

```text
EXISTING_FULL_REQUIRED_GATES = mandatory
```

No runtime/build assertion is weakened by this amendment.

### 3.3 Branch-protection contract

The protected `main` required check contexts MUST remain stable unless a separate governance decision explicitly changes the repository ruleset.

At adoption time the required contexts are:

```text
Consolidated corrective exact-head Release Gate
Typecheck, build and deterministic route generation
```

The workflows producing those contexts MUST still run for docs-only PRs and MUST return the lightweight documentation result under the same required context names.

A required workflow MUST NOT be suppressed by path filtering if suppression would leave a required context absent.

## 4. Specialized WRI-01 Runtime Gate

The WRI-01 Worker Runtime Gate is a specialized technical gate and is not a protected-branch required context at adoption time.

Documentation paths MUST NOT trigger WRI-01.

Its technical trigger set remains authoritative for Worker/runtime-affecting changes, and its runtime/build/workerd/Wrangler assertions remain unchanged when the gate applies.

## 5. Governance Priority

This amendment changes delivery mechanics only. It MUST NOT override:

- server-only tenant/authorization authority;
- fail-fast/fail-closed behavior;
- RLS or grant boundaries;
- explicit Super Admin impersonation boundaries;
- secret custody rules;
- Same-Backend Homologation Cell;
- Impact Analysis requirements for structural/runtime changes;
- protected GitHub audit and exact-head merge requirements.

## 6. Adoption state

Until this amendment and its CI implementation are protected-merged into `main`:

```text
AMENDMENT_STATE = implementation branch only
MAIN_GOVERNANCE_UNCHANGED = true
```

After protected merge:

```text
AMENDMENT_STATE = Accepted / Merged / Active
CAPABILITY_PREFLIGHT_REQUIRED = true
CAPABILITY_MISMATCH_EXCEPTION = active
DOCS_ONLY_LIGHTWEIGHT_CI = active
```
