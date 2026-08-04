# PR-M2 — Marketing Channels & Lead Ingestion — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = Marketing Channels, Campaign Attribution & Automatic Lead Ingestion
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current adapter state

```text
META_ADS_ADAPTER = implemented
GOOGLE_ADS_ADAPTER = implemented
META_ADS_EXTERNAL_VERIFICATION = not_live_verified
GOOGLE_ADS_EXTERNAL_VERIFICATION = not_live_verified
DEFAULT_PROVIDER_AVAILABILITY = credential_required
EXTERNAL_PROVIDER_EXECUTED = false
EXTERNAL_DELIVERY_PROVED = false
FAKE_PROVIDER_SUCCESS = false
```

Meta verifies `X-Hub-Signature-256` through HMAC-SHA256. Google uses a configured webhook key with constant-time comparison. Both adapters use strict payload schemas, exact connector/form mapping, provider payload idempotency, replay protection, closed field mapping and the canonical CRM writer.

Activation remains fail-closed until a credential reference, current mapping, explicit ingestion actor/origin and live verification are present.

Current code and SQL:

- `src/lib/marketing/marketing-channel-registry.ts`;
- `src/lib/marketing/marketing-provider-ingestion.server.ts`;
- `src/lib/api/tenant-marketing.functions.ts`;
- `src/routes/_authenticated.admin.marketing.tsx`;
- `supabase/migrations/20260729233000_pr_m2_marketing_channels_lead_ingestion.sql`;
- `supabase/migrations/20260730051500_pr_m2_marketing_adapter_activation.sql`;
- `supabase/migrations/20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql`.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:marketing-channels-lead-ingestion-functional-completion
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
FIXTURES = deterministic Meta and Google webhook fixtures
NETWORK_CALLS_IN_TEST = false
PROOF_BOUNDARY = repository + deterministic provider/mapping/idempotency tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
REAL_META_CREDENTIAL_USED = false
REAL_GOOGLE_CREDENTIAL_USED = false
REAL_PROVIDER_WEBHOOK_EXECUTED = false
DEPLOY_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
