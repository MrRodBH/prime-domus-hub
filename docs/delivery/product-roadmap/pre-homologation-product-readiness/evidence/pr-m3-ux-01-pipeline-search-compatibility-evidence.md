# PR-M3-UX-01 — Pipeline Search Compatibility Evidence

## Execution identity

```text
STAGE = PR-M3-UX-01
BASE_MAIN = 3b70a96e535ef40ab0c246f4cf7b63d3bd3a6397
BASE_TREE = 32ab92df5a8a3e121525d4bfa3faf30f29352ea5
BRANCH = agent/pr-m3-ux-01-pipeline-search-compatibility
EXECUTION_MODEL = GitHub-native evidence-driven
```

## Exact changed-path contract

1. `src/routes/_authenticated.admin.leads.tsx`
2. `src/components/pipeline/search-schema.ts`
3. `src/components/workspace/CommandPalette.tsx`
4. `run-pr-m3-ux-01-pipeline-search-compatibility-specs.ts`
5. `package.json`
6. `docs/architecture/impact-analysis/PR-M3-UX-01-pipeline-search-compatibility-impact-analysis.md`
7. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-ux-01-pipeline-search-compatibility-evidence.md`

```text
EXACT_ALLOWLIST_COUNT = 7
BUN_LOCK_BYTE_IDENTICAL = required
NEW_DEPENDENCIES = false
```

## Implemented navigation contract

The active pipeline emits only validated `item`, `q`, `status` and `origem`
search state. Benign legacy and unknown presentation parameters are removed
before the route consumes them. Query parameters that attempt to carry tenant,
role, scope, command, action, user, membership or impersonation authority fail
closed.

The legacy leads route uses the same compatibility boundary explicitly.
`tab=descartados` is the only semantic migration and becomes
`status=descartado`. Retired broker, layout, tab and creation parameters are not
forwarded.

The Command Palette opens a lead with `item` only. The previous `view` and
`tab` payload is absent. `Novo lead` is disabled because the current pipeline
slice is read-only and no accepted server-authoritative creation workflow is
available.

## Focused deterministic proof

`run-pr-m3-ux-01-pipeline-search-compatibility-specs.ts` proves:

- exact seven-path scope and byte-identical `bun.lock`;
- unchanged dependency and override objects;
- canonical deep-link and saved-filter preservation;
- stripping of `new`, `view`, `tab` and unknown presentation state;
- deterministic handling of malformed presentation values;
- fail-closed rejection of authority-bearing query keys;
- explicit legacy redirect sanitization;
- canonical `item`-only lead navigation;
- disabled lead creation with zero mutation transport;
- preserved SEC-02 focused script and PRM3 release chain.

The focused runner is the active first step of `verify:release`; the standard
Release Gate, PRM3-P0A, typecheck and build remain the execution authority.

## Zero-write boundaries

```text
DATABASE_WRITE = false
DATABASE_DDL = false
DATABASE_DML = false
AUTH_MUTATION = false
STORAGE_MUTATION = false
TENANT_MEMBERSHIP_DOMAIN_MUTATION = false
PROVIDER_WRITE = false
SECRET_MUTATION = false
DEPLOY = false
PRODUCTION_PUBLISH = false
PRODUCTION_CUTOVER = false
ROADMAP_UPDATE = false
PR_105_MERGE = false
```

## Terminal interlock

Repository acceptance requires one exact PR head, successful focused and
canonical gates, squash merge, post-merge main requalification and successful
post-merge Release Gate.

The successor is `PR-M3-SEC-04_SECURITY_LINTER_FINDINGS_REQUALIFICATION`.
`LVR-01` remains suspended until that individual security requalification is
accepted. Lovable production publication remains Owner-only and is not part of
UX-01.
