# PR-M2 — Consolidated Pre-Merge Correction

## 1. Identificação

```text
EVIDENCE_TYPE = consolidated_pre_merge_correction
EVIDENCE_SCOPE = PR-M2 only
EXECUTION_MODEL = ChatGPT GitHub-native

REPOSITORY = MrRodBH/prime-domus-hub
BASE_BRANCH = main
IMPLEMENTATION_BRANCH = agent/pr-m2-functional-completion
PULL_REQUEST = 60

CORRECTION_START_HEAD = ba737b82cd878d83f539a6142db5612962421e29
AUDITED_MAIN_HEAD = ec05fd4edee94feabf8423a129154eb807c52a99
EXPECTED_MERGE_BASE = ec05fd4edee94feabf8423a129154eb807c52a99

CORRECTION_SCOPE =
canonical_authority_reconciliation_and_full_diff_evidence
```

Não é registrado `FINAL_HEAD` autorreferencial. O HEAD final e os resultados do gate são vinculados externamente pelos runs do GitHub Actions.

## 2. Entry gate de proteção

```text
PRM2_MAIN_PROTECTION_STATE = Accepted — Protection Materialized
RULESET_ENTRY_GATE_PASSED = true

RULESET_ID = 20308240
RULESET_NAME = RM Prime — main protected merge gate
RULESET_ENFORCEMENT = active
RULESET_TARGET = refs/heads/main
RULESET_MATCHING_ACTIVE_COUNT = 1
BYPASS_ACTOR_COUNT = 0
CURRENT_USER_CAN_BYPASS = never

PULL_REQUEST_REQUIRED = true
REQUIRED_CONVERSATION_RESOLUTION = true
STRICT_REQUIRED_STATUS_CHECKS = true
FORCE_PUSH_ALLOWED = false
DELETION_ALLOWED = false
```

Required checks:

```text
Consolidated corrective exact-head Release Gate
integration_id = 15368

Typecheck, build and deterministic route generation
integration_id = 15368
```

## 3. Estado de entrada

```text
PR_STATE = open
PR_DRAFT = true
PR_MERGED = false
PR_MERGEABLE = true

MAIN_HEAD = ec05fd4edee94feabf8423a129154eb807c52a99
PR_HEAD = ba737b82cd878d83f539a6142db5612962421e29
MERGE_BASE = ec05fd4edee94feabf8423a129154eb807c52a99
AHEAD_BY = 339
BEHIND_BY = 0
LINEAR_ANCESTRY = true
```

## 4. Arquivos da correção

```text
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
docs/architecture/impact-analysis/PR-M2-functional-completion-impact-analysis.md
docs/architecture/governance/PR-M2-functional-completion-execution-envelope.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-consolidated-pre-merge-correction.md
.github/workflows/pr-m2-consolidated-corrective-gate.yml
```

```text
RUNTIME_CHANGED = false
FRONTEND_CHANGED = false
MIGRATION_CHANGED = false
HISTORICAL_MIGRATION_CHANGED = false
RLS_CHANGED = false
POLICY_CHANGED = false
GRANT_CHANGED = false
DEPENDENCY_CHANGED = false
LOCKFILE_CHANGED = false
MANAGED_BACKEND_CHANGED = false
```

## 5. Reconciliação documental

```text
CANONICAL_DOCUMENTS_RECONCILED = true
CANONICAL_CURRENT_AUTHORITY_CONFLICT_COUNT = 0
HISTORICAL_PLANNING_STATE_PRESERVED = true
HISTORICAL_PLANNING_STATE_MARKED_SUPERSEDED = true

PRM2_IMPLEMENTATION_AUTHORIZED_CURRENT = true
PRM2_IMPLEMENTATION_EXECUTED_CURRENT = true
PRM2_IMPLEMENTATION_COMPLETED_CURRENT = true
PRM2_FINAL_CLOSURE_STATE = Accepted — Ready for Protected Merge Audit
CURRENT_PREMERGE_STATE = Corrected — Ready for Protected Merge Audit Rerun
```

A matriz original de 248 capacidades e os envelopes de planejamento são preservados integralmente no commit imutável `ba737b82cd878d83f539a6142db5612962421e29` e incorporados por referência, sem reclassificação retroativa.

## 6. Contrato da evidência integral

O workflow exact-head deve gerar:

```text
pr-m2-full-diff-evidence/
  exact-head-metadata.json
  compare-metadata.json
  changed-files.txt
  diff-stat.txt
  diff-name-status.z
  diff-numstat.z
  diff-raw.z
  pr-m2-full-index-binary.diff
  pr-m2-commit-range.bundle
  chunks/
  manifest.sha256
  evidence-manifest.json
  reconstruction-verification.txt
```

Requisitos:

```text
FULL_DIFF_BINARY_CAPABLE = true
FULL_DIFF_FULL_INDEX = true
FULL_DIFF_SHA256_REQUIRED = true
COMMIT_RANGE_BUNDLE_REQUIRED = true
COMMIT_RANGE_BUNDLE_VERIFY_REQUIRED = true
FULL_DIFF_CHUNKING_MAX_BYTES = 8388608
FULL_DIFF_RECONSTRUCTION_MATCH_REQUIRED = true

EXACT_HEAD_MATCH_REQUIRED = true
MERGE_REF_USED = false
MERGE_BASE_MATCH_REQUIRED = true
HEAD_IS_DESCENDANT_OF_BASE_REQUIRED = true
BEHIND_BY_REQUIRED = 0
```

Artifacts:

```text
pr-m2-consolidated-corrective-<EXACT_HEAD_SHA>
pr-m2-full-diff-evidence-<EXACT_HEAD_SHA>
RETENTION_DAYS = 14
```

## 7. Testes obrigatórios

```text
FROZEN_INSTALL_REQUIRED = true
CONSOLIDATED_SPECS_REQUIRED = true
VERIFY_RELEASE_REQUIRED = true
DIFF_CHECK_REQUIRED = true
YAML_PARSE_REQUIRED = true
JSON_MANIFEST_PARSE_REQUIRED = true
BUNDLE_VERIFY_REQUIRED = true
FULL_DIFF_RECONSTRUCTION_REQUIRED = true
```

Os resultados são provados pelo GitHub Actions no HEAD exato materializado após este documento.

## 8. Boundaries externos

```text
PRM2_MERGE_AUTHORIZED = false
PRM2_MERGED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false

DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
REAL_PROVIDER_EXECUTED = false
REAL_CREDENTIAL_USED = false
LIVE_TRAFFIC_TESTED = false

DCA01_START_AUTHORIZED = false
BCA01_START_AUTHORIZED = false
PRM3_START_AUTHORIZED = false
```

## 9. Estado máximo

```text
PRM2_PREMERGE_CORRECTION_STATE = Corrected — Ready for Protected Merge Audit Rerun
PRM2_PROTECTED_MERGE_AUDIT_AUTHORIZED = true
PRM2_PROTECTED_MERGE_EXECUTION_AUTHORIZED = false
PRM2_MERGE_AUTHORIZED = false
MERGE_EXECUTED = false
READY_FOR_PROTECTED_MERGE_AUDIT_RERUN = true
NEXT_AUTHORIZED_ACTION = PR-M2 — Full Protected Merge Audit Rerun
```
