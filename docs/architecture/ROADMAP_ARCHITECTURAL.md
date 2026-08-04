# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — DCA-01 Architecture First planning submitted for direct external audit
**Authority:** Single Source of Future Evolution
**Audited main baseline:** `fad8874bfeef85683445f52d21611e7d8760c1a0`

## Current authority

```text
PRM2_STATE = Accepted / Merged / Closed
PRM2_IMPLEMENTATION_PR = 60
PRM2_IMPLEMENTATION_HEAD = ef9e22c239c7ce7e5d937bd06c7452ebde47f096
PRM2_IMPLEMENTATION_MERGE_SHA = ec06a19af44cc988e602d7bc8d0dc7a627db1619

DCA01_PLANNING_STATE = Ready for Direct External Audit
DCA01_PLANNING_BRANCH = agent/dca-01-planning
DCA01_PLANNING_BASELINE = fad8874bfeef85683445f52d21611e7d8760c1a0
DCA01_INTEGRATION_MODEL = HYBRID
DCA01_SUPPORTED_MODES = manual_assisted, api_automated
DCA01_IMPLEMENTATION_STATE = Planned — Blocked
DCA01_IMPLEMENTATION_AUTHORIZED = false
DCA01_IMPLEMENTATION_STARTED = false
DCA01_PLANNING_MERGE_AUTHORIZED = false

BCA01_STATE = Planned — Blocked by DCA-01
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none

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

## DCA-01 planning authority

The DCA-01 planning establishes one future authoritative lifecycle for custom domains and Cloudflare:

- one closed state machine for manual-assisted and API-automated modes;
- server-only tenant, domain, provider-account, transition and canonical-host authority;
- global normalized-hostname uniqueness and anti-takeover reservation;
- ownership challenge generation, expiry, rotation and replay prevention;
- independent DNS, provider and SSL observation;
- explicit canonical and alias bindings with same-tenant single-hop redirects;
- idempotent jobs, bounded retries, rollback and periodic reconciliation;
- opaque server-side provider credential references;
- atomic retirement of direct `tenants.dominio_principal` authority;
- no public resolver dual path;
- controlled external non-production proof before terminal DCA-01 acceptance.

## Executable sequence

```text
PR-M2 — Accepted / Merged / Closed
→ DCA-01 planning direct external audit
→ planning merge only after explicit authorization
→ DCA-01 implementation only after separate explicit authorization
→ controlled DCA-01 external proof only after separate explicit authorization
→ DCA-01 Accepted
→ no automatic successor
→ BCA-01 only after explicit Product Owner authorization
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
- `www` and apex are explicit bindings; neither is inferred as the other.
- External provider or DNS success is never inferred from local configuration state.
- Same-Backend Homologation Cell remains binding.
- Fases 2, 3 and 4, LSH-01, LSV-01, LSV-02 and LSR-01 remain closed or superseded and are not reopened.

## Historical authority

The PR-M2 terminal roadmap is preserved at commit `fad8874bfeef85683445f52d21611e7d8760c1a0`. This planning changes only the current DCA-01 planning state and does not authorize implementation or external operations.
