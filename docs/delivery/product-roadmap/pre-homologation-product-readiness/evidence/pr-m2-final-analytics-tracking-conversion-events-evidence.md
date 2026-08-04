# PR-M2 — Analytics, Tracking & Conversion Events — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = Analytics, Tracking, Conversion Events & Tag Governance
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current contract

```text
PROVIDER_REGISTRY = META_PIXEL / GOOGLE_ANALYTICS / GOOGLE_TAG_MANAGER
EVENT_REGISTRY = closed
PUBLIC_TENANT_AUTHORITY = Host-derived
ADMINISTRATIVE_TENANT_AUTHORITY = requireTenant + Tenant Access Control
CONSENT_MODEL = explicit opt-in for analytics and marketing
PROVIDER_LOAD_BEFORE_CONSENT = false
TENANT_ARBITRARY_JAVASCRIPT = false
GTM_ACTIVATION = CSP-blocked until an auditable closed contract exists
PII_IN_PROVIDER_PAYLOAD = prohibited
EXTERNAL_DELIVERY_PROVED = false
```

Current code and SQL:

- `src/lib/tracking/tracking-registry.ts`;
- `src/lib/tracking/public-tracking-runtime.ts`;
- `src/components/site/PublicTrackingRuntime.tsx`;
- `src/lib/api/tenant-tracking-authority.server.ts`;
- `src/lib/api/tenant-tracking.functions.ts`;
- `src/routes/_authenticated.admin.tracking.tsx`;
- `supabase/migrations/20260730010000_pr_m2_analytics_tracking_conversion_events.sql`.

Meta Pixel and Google Analytics browser adapters are governed by consent, exact provider origins and closed event payloads. Local `dispatch_attempted` is not provider receipt or conversion attribution proof.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:analytics-tracking-conversion-events-functional-completion
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic consent/CSP/provider/event tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
REAL_BROWSER_PROVIDER_DELIVERY_VERIFIED = false
REAL_CONVERSION_ATTRIBUTION_VERIFIED = false
PRODUCTION_TRAFFIC_TESTED = false
DEPLOY_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
