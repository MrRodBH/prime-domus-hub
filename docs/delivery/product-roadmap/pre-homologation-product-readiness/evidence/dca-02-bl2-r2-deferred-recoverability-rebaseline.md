# DCA-02-BL2 — R2 Deferred Recoverability Rebaseline Evidence

## Repository implementation

```text
GATE = DCA-02-BL2_R2_POST_HOMOLOGATION_PRE_PRODUCTION_DEFERRED_RECOVERABILITY_REBASELINE_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN = 64510f51b73557dab3cc8c514d3eafd957308ee2
SOURCE_TREE = 45b26fcfa58c2556de08feb5d49dae319e5803e5
OBSERVED_AT_UTC = 2026-08-28T10:37:43Z
IMPLEMENTATION_MODE = repository_only
R2_SUBSCRIPTION_ENABLED = false
R2_BUCKET_COUNT = unavailable_until_subscription_activation
R2_BINDINGS_IN_SOURCE = 0
CLOUDFLARE_PROVIDER_WRITES = 0
DATABASE_WRITES = 0
LOVABLE_AGENT_CALLS = 0
DEPLOY = false
MERGE = false
PRODUCTION_CUTOVER = false
```

## Historical authority reconciliation

The repository preserves the Owner's binding decision:

```text
CLOUDFLARE_PAID_OR_ENTERPRISE_UPGRADE_BEFORE_HOMOLOGATION = not_planned
BACKLOG_CLASS = Non-Blocking
BACKLOG_ITEMS_BLOCK_DCA02_TERMINAL_ACCEPTANCE = false
BL2_EXECUTION_WINDOW = post_homologation_pre_production
PRM3_OR_FRONTEND_BLOCKED = false
CONTROLLED_TESTING_BLOCKED = false
FORMAL_HOMOLOGATION_BLOCKED = false
PRODUCTION_READINESS_BLOCKED_UNTIL_RECOVERY_PROOF = true
```

This resolves the apparent conflict: BL2 was intentionally non-blocking for
the completed DCA-02 proof and remains non-blocking during product construction
and homologation, while its recoverability proof is mandatory before production
cutover.

## Read-only R2 preflight

The official Cloudflare connector targeted account
`68ec853e6b04a038f09fca5712d6b26b` and executed GET operations only.

```text
R2_LIST_BUCKETS_HTTP_PATH = GET_/accounts/{account_id}/r2/buckets
R2_LIST_BUCKETS_RESULT_CODE = 10042
R2_LIST_BUCKETS_RESULT = Please_enable_R2_through_the_Cloudflare_Dashboard
ACCOUNT_SUBSCRIPTIONS_READ_RESULT_CODE = 10000
ACCOUNT_SUBSCRIPTIONS_READ_RESULT = authentication_error
TOKEN_PERMISSION_GROUPS_READ_RESULT_CODE = 9109
TOKEN_PERMISSION_GROUPS_READ_RESULT = unauthorized
TOKEN_VERIFY_RESULT_CODE = 1000
TOKEN_VERIFY_RESULT = invalid_api_token_for_introspection_endpoint
PREFLIGHT_STATUS = TERMINAL_BLOCKED_EXTERNAL_R2_NOT_ENABLED
```

The successful account-scoped transport to the R2 product boundary proves the
target account, but error `10042` proves that the subscription is not enabled.
Billing/IAM results prove that the current connector cannot confirm exact
subscription terms or enumerate token policy. No retry with broader credentials
was attempted.

## Current Lovable-managed ledger observation

The preceding authorized Lovable-only read-only impact analysis established:

```text
PROVIDER_BINDING_COUNT = 1
BOUND_COUNT = 1
LIVE_ACTIVE_BINDINGS = 0
BINDING_STATE = bound
ASSOCIATED_DOMAIN_STATUS = revoked
EXECUTION_MODE = api_automated
MANIFEST_ROW_COUNT = 1
MANIFEST_SHA256 = c57e34dcb35e79f90e6fce939111c9a34f834038ff3d8b9807f704c029a3f885
LOVABLE_SQL_READ_CALLS = 3
DATABASE_WRITES = 0
```

The row is retained synthetic history, not a current live production binding.
No identifier, hostname, token, secret, job command, URL, or customer payload
was copied into this evidence.

## Selected strategy and cost boundary

```text
SELECTED_STRATEGY = encrypted_external_generation_bound_ledger_snapshots
SNAPSHOT_MEDIUM = Cloudflare_R2_Standard_candidate
SNAPSHOT_RUNTIME_AUTHORITY = false
RPO_CEILING_SECONDS = 900
RTO_CEILING_SECONDS = 14400
R2_PRIVATE_BUCKET = required_before_first_snapshot
R2_NATIVE_BUCKET_LOCK = required_before_first_snapshot
R2_EXPORTER_SCOPE = Object_Read_and_Write_one_exact_bucket
R2_RECOVERY_READER_SCOPE = Object_Read_only_one_exact_bucket
R2_BUCKET_ADMIN_IN_APPLICATION_RUNTIME = prohibited
DOCUMENTED_STANDARD_FREE_TIER_GB_MONTH = 10
DOCUMENTED_STANDARD_FREE_TIER_CLASS_A = 1000000
DOCUMENTED_STANDARD_FREE_TIER_CLASS_B = 10000000
PROJECTED_LEDGER_COST_WITHIN_STANDARD_FREE_TIER_USD = 0
EXACT_ACCOUNT_SUBSCRIPTION_COST_CONFIRMED = false
```

The cost projection assumes Standard storage and the documented free tier. It
does not authorize checkout, does not replace exact account billing evidence,
and must be revalidated after homologation.

## Terminal result

```text
REPOSITORY_REBASELINE = implemented
R2_PROVIDER_IMPLEMENTATION = deferred
R2_SUBSCRIPTION_ACTIVATION = not_authorized
R2_BUCKET_CREATION = not_authorized
R2_TOKEN_CREATION = not_authorized
LOVABLE_EXPORTER_IMPLEMENTATION = not_authorized
CURRENT_DCA02_TERMINAL_STATE = Accepted_with_Non-Blocking_Backlog
PRODUCTION_CUTOVER_ALLOWED = false
NEXT_GATE = DCA-02-BL2_R2_DEFERRED_RECOVERABILITY_REBASELINE_FINAL_AUDIT_AND_PROTECTED_MERGE
```

Rollback before merge is branch/PR removal. After merge, rollback is one
audited GitHub revert. No compensating provider or database action exists
because this gate produced no external mutation.
