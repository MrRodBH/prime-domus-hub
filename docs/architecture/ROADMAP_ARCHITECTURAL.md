# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — DCA-01 planning Accepted for protected merge
**Authority:** Single Source of Future Evolution
**Audited main baseline:** `fad8874bfeef85683445f52d21611e7d8760c1a0`

## Current authority

```text
PRM2_STATE = Accepted / Merged / Closed
PRM2_IMPLEMENTATION_PR = 60
PRM2_IMPLEMENTATION_HEAD = ef9e22c239c7ce7e5d937bd06c7452ebde47f096
PRM2_IMPLEMENTATION_MERGE_SHA = ec06a19af44cc988e602d7bc8d0dc7a627db1619

DCA01_INITIAL_PLANNING_HEAD = b6974aaccc11fbc4118a2af8c15320e2e665233e
DCA01_INITIAL_PLANNING_AUDIT = Rejected
DCA01_INITIAL_PLANNING_HEAD_AUTHORITY = historical only
DCA01_ORDINARY_CORRECTIVE_BUDGET = consumed
DCA01_EXCEPTIONAL_NARROW_CORRECTION = authorized and executed
DCA01_PLANNING_STATE = Accepted
DCA01_PLANNING_BRANCH = agent/dca-01-planning
DCA01_PLANNING_PR = 64
DCA01_PLANNING_BASELINE = fad8874bfeef85683445f52d21611e7d8760c1a0
DCA01_INTEGRATION_MODEL = HYBRID
DCA01_SUPPORTED_MODES = manual_assisted, api_automated
DCA01_IMPLEMENTATION_STATE = Planned — Blocked until protected planning merge
DCA01_IMPLEMENTATION_AUTHORIZED = conditionally_after_planning_merge
DCA01_IMPLEMENTATION_STARTED = false
DCA01_PLANNING_MERGE_READY = true
DCA01_PLANNING_MERGE_AUTHORIZED = true

BCA01_STATE = Planned — Blocked by DCA-01
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = DCA-01 implementation after protected planning merge

CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
TXT_RECORD_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
SSL_PROVISIONING_EXECUTED = false
REAL_SECRET_USED = false
LIVE_DOMAIN_VERIFIED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
AUTO_MERGE_ENABLED = false
```

## DCA-01 accepted planning authority

The accepted planning defines one authoritative lifecycle for custom domains and Cloudflare:

- one closed 12-state machine with explicit predecessors, successors, commands, recovery and public-authority behavior;
- symmetric `degraded → active` recovery gated by the complete current-generation active predicate;
- ownership challenge issuance, rotation and non-conclusive observations as audited status-preserving commands, without a persisted self-transition;
- replacement rollback restricted to transaction abort before commit, with post-commit recovery requiring a new candidate generation;
- valid legacy import into `pending_ownership_verification` with server-owned metadata;
- one composite current-generation active predicate;
- distinct active incumbent and non-authoritative replacement candidate;
- atomic canonical/alias replacement swap;
- global cutover preflight preserving old authority on failure;
- one production active-domain resolver with no request-time dual query or fallback;
- explicit preservation of the development/preview host map outside production authority;
- server-only tenant, domain, provider-account, transition, canonical-host and cutover authority;
- ownership challenge expiry, rotation and anti-replay;
- independent DNS, provider and SSL observation;
- `src/server.ts::fetch` as the canonical redirect consumer before SSR;
- `src/server.ts::scheduled` as the platform-native job/reconciliation executor;
- idempotent jobs, leases, bounded retries and periodic reconciliation;
- opaque server-side provider credential references;
- two mandatory operational runbooks;
- controlled external non-production proof before terminal DCA-01 acceptance.

## Executable sequence

```text
PR-M2 — Accepted / Merged / Closed
→ DCA-01 planning Accepted
→ protected DCA-01 planning merge authorized
→ DCA-01 implementation authorized after planning merge
→ one principal implementation PR and at most one consolidated internal corrective pass
→ concise exact-head pre-merge audit
→ protected implementation merge when Accepted
→ controlled external non-production proof when safe prerequisites exist
→ terminal DCA-01 audit
→ DCA-01 Accepted, Accepted with Non-Blocking Backlog, Blocked External or Rejected
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

## Historical authority

The PR-M2 terminal roadmap is preserved at commit `fad8874bfeef85683445f52d21611e7d8760c1a0`.

The original DCA-01 planning submission at `b6974aaccc11fbc4118a2af8c15320e2e665233e` was externally audited as `Rejected`. Its exact-head evidence remains valid historical evidence, but its planning text is superseded by the accepted correction and cannot return as current authority.

This roadmap authorizes the protected planning merge and, after its confirmation, the finite DCA-01 implementation. It does not authorize BCA-01, PR-M3, formal homologation or production cutover.
