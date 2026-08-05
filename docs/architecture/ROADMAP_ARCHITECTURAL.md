# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — DCA-01 repository implementation merged; controlled external proof Blocked External
**Authority:** Single Source of Future Evolution
**Audited repository implementation merge:** `e807b76f4428dd34fbdb01a9e547a8dd8c90f68b`

## Current authority

```text
PRM2_STATE = Accepted / Merged / Closed
PRM2_IMPLEMENTATION_PR = 60
PRM2_IMPLEMENTATION_HEAD = ef9e22c239c7ce7e5d937bd06c7452ebde47f096
PRM2_IMPLEMENTATION_MERGE_SHA = ec06a19af44cc988e602d7bc8d0dc7a627db1619

DCA01_PLANNING_STATE = Accepted / Merged / Closed
DCA01_PLANNING_PR = 64
DCA01_PLANNING_MERGE_SHA = 623f94f98174478af19b130cda9896c64f256f14
DCA01_INITIAL_REJECTED_PLANNING_HEAD = b6974aaccc11fbc4118a2af8c15320e2e665233e
DCA01_INITIAL_REJECTED_PLANNING_AUTHORITY = historical only
DCA01_INTEGRATION_MODEL = HYBRID
DCA01_SUPPORTED_MODES = manual_assisted, api_automated

DCA01_IMPLEMENTATION_STATE = Accepted / Merged / Closed — repository implementation
DCA01_IMPLEMENTATION_STARTED = true
DCA01_IMPLEMENTATION_BRANCH = agent/dca-01-domain-cloudflare-activation
DCA01_IMPLEMENTATION_PR = 65
DCA01_IMPLEMENTATION_PR_DRAFT = false
DCA01_IMPLEMENTATION_BASELINE = 623f94f98174478af19b130cda9896c64f256f14
DCA01_LAST_EXACT_HEAD_VALIDATED = c6a5b93c0869d38b1e03eba903e88513879e9402
DCA01_LAST_EXACT_HEAD_RELEASE_GATE = success
DCA01_LAST_EXACT_HEAD_CONSOLIDATED_GATE = success
DCA01_PREMERGE_AUDIT = Accepted
DCA01_IMPLEMENTATION_MERGE_AUTHORIZED = executed
DCA01_EXTERNAL_PROOF_STATE = Blocked External — prerequisites and live authorization absent
DCA01_TERMINAL_STATE = Blocked External

BCA01_STATE = Planned — Blocked by DCA-01 terminal acceptance
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = controlled external non-production proof only after explicit prerequisite authorization

CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
TXT_RECORD_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
SSL_PROVISIONING_EXECUTED = false
REAL_SECRET_USED = false
LIVE_DOMAIN_VERIFIED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
PRODUCTION_CUTOVER_EXECUTED = false
AUTO_MERGE_ENABLED = false
```

## DCA-01 materialized implementation authority

The principal implementation PR materializes the accepted planning contract through:

- one closed 12-state TypeScript and SQL lifecycle;
- symmetric `degraded → active` recovery gated by the complete current-generation predicate;
- atomic, generation-bound ownership challenge issuance, rotation and anti-replay verification;
- one forward migration with RLS, explicit grants, server RPCs and append-only audit evidence;
- deterministic IDNA and public-suffix normalization from the pinned official PSL snapshot;
- a mandatory server-generated legacy import manifest instead of SQL hostname heuristics;
- one server-only domain repository boundary with explicit version and generation checks;
- idempotent jobs, leases, attempt records, bounded retries and scheduled reconciliation;
- explicit `manual_assisted` and `api_automated` operation modes without silent fallback;
- a narrow Cloudflare adapter with exact-hostname cardinality, opaque credentials and generation-bound metadata;
- one production resolver over active `tenant_domains`, with no request-time legacy fallback;
- a separate explicit development host map outside production authority;
- canonical alias redirect before SSR and the platform-native `scheduled` executor;
- atomic replacement that preserves the incumbent until commit and prohibits post-commit direct reactivation;
- removal that closes public authority before asynchronous provider cleanup;
- tenant and Super Admin operational surfaces that request operations but cannot assert external success;
- two operational runbooks and deterministic DCA-01 Release Gate specifications.

## Deterministic evidence

```text
DCA01_SPEC_ASSERTIONS = 149
PSL_VERSION = 2026-07-25_14-20-03_UTC
PSL_SOURCE_COMMIT = e1b8015c3b2f0f4f8c18659c2480fc1a22c07b20
PSL_RULE_COUNT = 10239
PSL_DUPLICATE_COUNT = 0
REQUEST_TIME_DUAL_AUTHORITY = false
CLIENT_TENANT_AUTHORITY = false
DIRECT_CLIENT_STATUS_MUTATION = false
PLAINTEXT_CREDENTIAL_PERSISTENCE = false
BUILD_DEV = passed
BUILD = passed
TYPECHECK = passed
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
GENERATED_ROUTE_TREE_SHA256 = 00ea348d4032a9619fd033fe1d794abc177a74a0f830a8645dcae1c4055d13d8
```

The generator-owned `src/routeTree.gen.ts` remains unedited in the branch. Exact builds generated the tenant and Super Admin domain routes deterministically and produced the same route-tree digest across all release cycles.

## Executable sequence

```text
PR-M2 — Accepted / Merged / Closed
→ DCA-01 planning — Accepted / Merged / Closed
→ DCA-01 implementation — complete in principal PR #65
→ final exact-head Release Gate after documentation reconciliation
→ concise direct pre-merge audit
→ protected implementation merge only if the pre-merge audit is Accepted
→ controlled external non-production proof only when safe prerequisites exist
→ terminal DCA-01 audit
→ Accepted, Accepted with Non-Blocking Backlog, Blocked External or Rejected
→ no automatic successor
→ BCA-01 only after DCA-01 Accepted and explicit Product Owner authorization
→ PR-M3 only after BCA-01 Accepted
→ Pre-Homologation Release Candidate
→ TH-M1
→ TH-M2
→ LSV-03
→ Formal Homologation
→ Production
```

## Permanent invariants

- Server is the sole tenant, domain, authorization, storage and commercial authority.
- Client headers, hostnames, paths, account IDs, zone IDs and provider statuses are not authority.
- Ambiguity fails fast and closed.
- Super Admin tenant-scoped mutation requires explicit impersonation.
- No heuristic fallback, default tenant, dual path or first-row authority.
- Only `active` domain rows are publicly authoritative after cutover.
- An incumbent remains active while a replacement candidate is prepared.
- A committed replacement swap cannot be reversed by `removal_pending → active`.
- `www` and apex are explicit bindings; neither is inferred as the other.
- External provider, DNS or SSL success is never inferred from local configuration state.
- Plaintext provider secrets are prohibited in database, tenant configuration, CI, client payloads and logs.
- Same-Backend Homologation Cell remains binding.
- Fases 2, 3 and 4, LSH-01, LSV-01, LSV-02 and LSR-01 remain closed or superseded and are not reopened.

## External proof boundary

Repository implementation evidence does not prove an external domain lifecycle. DCA-01 cannot reach a terminal accepted state until the authorized non-production proof covers migration application, DNS, Cloudflare Custom Hostname, SSL, activation, degradation/recovery, replacement and removal. Production cutover remains separately prohibited.

## Historical authority

The PR-M2 terminal roadmap is preserved at commit `fad8874bfeef85683445f52d21611e7d8760c1a0`.

The original DCA-01 planning submission at `b6974aaccc11fbc4118a2af8c15320e2e665233e` remains rejected historical evidence. The corrected accepted planning was merged at `623f94f98174478af19b130cda9896c64f256f14` and is the binding implementation contract.

## DCA-01 post-merge reconciliation

```text
DCA01_IMPLEMENTATION_PR = 65
DCA01_CORRECTIVE_BASE_HEAD = 7dc42c163c0ab5bca415f3f689c2dc9617a06f19
DCA01_CORRECTIVE_HEAD = c6a5b93c0869d38b1e03eba903e88513879e9402
DCA01_IMPLEMENTATION_MERGE_SHA = e807b76f4428dd34fbdb01a9e547a8dd8c90f68b
DCA01_REPOSITORY_IMPLEMENTATION_AUDIT = Accepted
DCA01_EXTERNAL_PROOF_STATE = Blocked External
BCA01_STARTED = false
PRM3_STARTED = false
NO_AUTOMATIC_SUCCESSOR = true
```

The repository implementation is merged and closed. No managed migration, deploy, DNS mutation, Cloudflare API call, real credential, live-domain proof or production cutover was executed.
