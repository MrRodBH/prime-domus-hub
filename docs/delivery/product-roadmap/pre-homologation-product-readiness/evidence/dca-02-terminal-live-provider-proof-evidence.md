# DCA-02 — Terminal Live Cloudflare Provider Proof Evidence

## Status

**Accepted with Non-Blocking Backlog / Terminal / Teardown Complete**

```text
STAGE_ID = DCA-02
EVIDENCE_TYPE = terminal_live_cloudflare_current_plan_provider_proof
AUDITED_BASELINE_MAIN = 1a66daf026614e6f57c2701e9a933be6bfaa9738
EXECUTION_DATE = 2026-08-12
SELECTED_STRATEGY = Strategy C — Server-Bound Provider Object Identity
DCA02_REPOSITORY_DATABASE_STATE = Accepted / Closed
DCA02_EXTERNAL_PROVIDER_PROOF = Accepted
DCA02_TERMINAL_ACCEPTED = true
DCA02_TERMINAL_STATE = Accepted with Non-Blocking Backlog
TEARDOWN_COMPLETE = true
GLOBAL_AUTHORITY_MODE = legacy
REAL_TENANT_MUTATION = false
PRODUCTION_CUTOVER = false
BCA01_STARTED = false
PRM3_STARTED = false
```

This terminal evidence supersedes the temporary Cloudflare MCP transport blocker recorded in the DCA-02 implementation evidence. It does not reopen DCA-01 and does not authorize any additional DCA-02 repository/database implementation. Principal and corrective implementation budgets remain consumed and closed.

## 1. Authoritative preflight

Direct GitHub audit before mutation confirmed:

```text
REPOSITORY = MrRodBH/prime-domus-hub
BASE_BRANCH = main
AUDITED_MAIN = 1a66daf026614e6f57c2701e9a933be6bfaa9738
PR_99 = merged / closed
PR_99_MERGE_SHA = 1a66daf026614e6f57c2701e9a933be6bfaa9738
RELEASE_GATE_RUN = 695
RELEASE_GATE_CONCLUSION = success
```

The official Cloudflare connector was validated read-only before any mutation. The target account/zone were resolved server-side from the accepted provider configuration:

```text
ACCOUNT_ID = 68ec853e6b04a038f09fca5712d6b26b
ZONE_ID = 90832d0006e9e630dbb73d33c551d836
ZONE_NAME = mrrod.com.br
ZONE_PLAN = Free Website
FALLBACK_ORIGIN = fallback.mrrod.com.br
FALLBACK_ORIGIN_STATUS = active
PRE_PROOF_CUSTOM_HOSTNAME_COUNT = 0
PRE_PROOF_SYNTHETIC_DNS_COUNT = 0
PRE_PROOF_PROVIDER_BINDING_COUNT = 0
GLOBAL_AUTHORITY_MODE = legacy
```

The real RM Prime tenant/domain remained excluded from the proof:

```text
REAL_TENANT_ID = 9664d189-4a12-4caa-8243-dc73383447e6
REAL_DOMAIN_ID = 6eda5a4e-be96-4756-b39b-746d886bc387
REAL_DOMAIN_HOSTNAME = rmprimeimoveis.com.br
REAL_DOMAIN_STATUS = pending_ownership_verification
REAL_DOMAIN_GENERATION = 1
REAL_DOMAIN_LOCK_VERSION = 0
REAL_DOMAIN_EXECUTION_MODE = manual_assisted
```

## 2. Synthetic canonical lifecycle

A new technical hostname was created under the existing technical tenant; the revoked DCA-01 generation was not reused.

```text
SYNTHETIC_TENANT_ID = 0246468a-ee84-402e-8fae-08f554daf0e1
SYNTHETIC_DOMAIN_ID = 310084d7-32f1-4581-aa00-64e9359ad6b8
SYNTHETIC_HOSTNAME = dca02-live-hml.mrrod.com.br
SYNTHETIC_GENERATION = 2
SYNTHETIC_EXECUTION_MODE = api_automated
```

The canonical lifecycle progressed through the existing server-owned state machine:

```text
draft
→ pending_ownership_verification
→ ownership_verified
→ pending_dns_configuration
→ pending_cloudflare_provisioning
→ pending_ssl
→ removal_pending
→ revoked
```

Ownership proof used an exact synthetic TXT record and current-generation challenge. Two initial challenge rotations were revoked after the connector security layer rejected the first public-looking proof payload before Cloudflare API execution. No Cloudflare write occurred for those blocked attempts. Challenge version 3 was then verified successfully through an intentionally non-sensitive synthetic public value.

```text
FINAL_CHALLENGE_VERSION = 3
FINAL_CHALLENGE_STATUS = verified
OWNERSHIP_TXT_RECORD_ID = 64082b71b2fa9b9e2873be090881bd30
OWNERSHIP_TXT_REMOVED = true
OWNERSHIP_PROOF_VALUE_PERSISTED_IN_EVIDENCE = false
```

Required DNS was materialized as an exact DNS-only CNAME and observed before provider provisioning:

```text
REQUIRED_CNAME_RECORD_ID = ce17bb98430bfe73c99dd41b329d1ff3
REQUIRED_CNAME_NAME = dca02-live-hml.mrrod.com.br
REQUIRED_CNAME_TARGET = fallback.mrrod.com.br
REQUIRED_CNAME_PROXIED = false
REQUIRED_DNS_OBSERVED = true
REQUIRED_CNAME_REMOVED = true
```

## 3. Claim-before-create and current-plan provider proof

Before the first provider POST, the Same-Backend claim RPC created exactly one generation-bound binding in `claimed` state:

```text
BINDING_ID = d1de82fb-9412-43bb-8ebb-18127f97e797
BINDING_STATE_BEFORE_POST = claimed
CUSTOM_HOSTNAME_ID_BEFORE_POST = null
PROVIDER_ACCOUNT_ID = e6bdc745-5370-4e72-ad46-deafc8be18b3
ZONE_ID = 90832d0006e9e630dbb73d33c551d836
EXACT_PROVIDER_COLLISION_COUNT_BEFORE_POST = 0
CLAIM_BEFORE_PROVIDER_POST = true
```

The controlled Cloudflare Custom Hostname POST used the accepted adapter contract:

```json
{
  "hostname": "dca02-live-hml.mrrod.com.br",
  "ssl": {
    "method": "txt",
    "type": "dv"
  }
}
```

`custom_metadata` was not present in the request body.

Cloudflare returned HTTP 201 on the account's current Free Website plan:

```text
CURRENT_PLAN_CREATE_WITHOUT_CUSTOM_METADATA = true
PROVIDER_CREATE_HTTP_STATUS = 201
RETURNED_CUSTOM_HOSTNAME_ID = 7a2cce68-6451-480a-b66c-389924148a8e
RETURNED_HOSTNAME = dca02-live-hml.mrrod.com.br
INITIAL_PROVIDER_STATUS = pending
INITIAL_SSL_STATUS = initializing
CUSTOM_METADATA_AUTHORITY = false
```

The returned provider ID was immediately persisted by the bind-once RPC before any subsequent provider mutation:

```text
BINDING_STATE_AFTER_BIND = bound
PERSISTED_CUSTOM_HOSTNAME_ID = 7a2cce68-6451-480a-b66c-389924148a8e
IDENTITY_BOUND = true
REBIND_BY_HOSTNAME = prohibited
HOSTNAME_ONLY_ADOPTION = false
```

## 4. Live idempotence and exact-ID observation

A repeated server binding claim for the same operation returned the already `bound` identity. No second Custom Hostname POST was issued.

```text
LIVE_NO_SECOND_CREATE_IDEMPOTENCE = true
SECOND_PROVIDER_POST_EXECUTED = false
REPEATED_CLAIM_BINDING_ID = d1de82fb-9412-43bb-8ebb-18127f97e797
REPEATED_CLAIM_CUSTOM_HOSTNAME_ID = 7a2cce68-6451-480a-b66c-389924148a8e
```

The provider object was then observed by exact persisted ID:

```text
LIVE_EXACT_ID_OBSERVATION = true
OBSERVED_CUSTOM_HOSTNAME_ID = 7a2cce68-6451-480a-b66c-389924148a8e
OBSERVED_HOSTNAME = dca02-live-hml.mrrod.com.br
OBSERVED_PROVIDER_STATUS = active
OBSERVED_SSL_STATUS = pending_validation
EXACT_HOSTNAME_PROVIDER_OBJECT_COUNT = 1
```

The provider exposed the expected SSL lifecycle/DCV state without any Custom Metadata authority. Two pending TXT validation records and one DCV delegation record were observable from the exact provider object. The proof did not require production activation or certificate completion; it established that SSL lifecycle observation remains available through the persisted object identity.

```text
LIVE_SSL_LIFECYCLE = true
SSL_LIFECYCLE_OBSERVABLE = true
SSL_TERMINAL_ACTIVATION_REQUIRED_FOR_DCA02_PROOF = false
PRODUCTION_CUTOVER = false
```

## 5. Exact-ID removal and terminal teardown

The synthetic domain transitioned to `removal_pending` before provider deletion. The provider object was revalidated by persisted ID and then deleted by that exact ID only.

```text
LIVE_EXACT_ID_REMOVAL = true
DELETE_CUSTOM_HOSTNAME_ID = 7a2cce68-6451-480a-b66c-389924148a8e
DELETE_HTTP_STATUS = 200
DELETE_RETURNED_ID_MATCH = true
POST_DELETE_GET_BY_ID = not_found
POST_DELETE_EXACT_HOSTNAME_COUNT = 0
```

The lifecycle then terminated canonically:

```text
SYNTHETIC_FINAL_STATUS = revoked
SYNTHETIC_FINAL_LOCK_VERSION = 9
SYNTHETIC_ENABLED = false
SYNTHETIC_REVOKED_AT = 2026-08-12T18:34:49.409381Z
SYNTHETIC_HOSTNAME_REUSABLE_AFTER = 2026-09-11T18:34:49.409381Z
```

Both proof-owned DNS objects were deleted by exact record ID. No SSL-validation DNS object was created.

## 6. Post-teardown Cloudflare audit

Direct provider audit after teardown proved:

```text
SYNTHETIC_CUSTOM_HOSTNAME_COUNT = 0
SYNTHETIC_DNS_COUNT_CONTAINING_DCA02_HOSTNAME = 0
ZERO_SYNTHETIC_CLOUDFLARE_ORPHANS = true

WORKER = rm-prime-wri01-hml
CORRECTIVE_WORKER_DEPLOYMENT = 2978ea57-3e26-4719-8e20-94e92ba3c690
CORRECTIVE_WORKER_VERSION = bf136552-62ab-4224-a606-0b3191c4f0d5
CORRECTIVE_WORKER_TRAFFIC = 100%
TEMPORARY_CRON_COUNT = 0
WORKER_ROUTE_COUNT_IN_ZONE = 0
FALLBACK_ORIGIN = fallback.mrrod.com.br
FALLBACK_ORIGIN_STATUS = active
```

Protected DNS remained present and was never targeted by a write:

```text
ROOT_MRROD_COM_BR_PRESENT = true
WWW_MRROD_COM_BR_PRESENT = true
NOTIFY_MRROD_COM_BR_PRESENT = true
ROOT_WWW_NOTIFY_MUTATION = false
```

## 7. Post-teardown Same-Backend audit

```text
DOMAIN_AUTHORITY_MODE = legacy
DOMAIN_AUTHORITY_LOCK_VERSION = 0
DOMAIN_AUTHORITY_ACTIVATED_AT = null
DOMAIN_AUTHORITY_ACTIVATED_BY = null
GLOBAL_AUTHORITY_CUTOVER = false

REAL_DOMAIN_STATUS = pending_ownership_verification
REAL_DOMAIN_GENERATION = 1
REAL_DOMAIN_LOCK_VERSION = 0
REAL_DOMAIN_EXECUTION_MODE = manual_assisted
REAL_TENANT_MUTATION = false

SYNTHETIC_BINDING_COUNT = 1
SYNTHETIC_BOUND_BINDING_COUNT = 1
SYNTHETIC_CLAIMED_OR_AMBIGUOUS_BINDING_COUNT = 0
SYNTHETIC_PENDING_LEASED_RETRY_JOB_COUNT = 0
OTHER_LIVE_NONREAL_DOMAIN_COUNT = 0
```

The single bound row is immutable terminal provider-identity history attached to the revoked synthetic domain and is not an orphan. Its persisted provider object no longer exists after exact-ID teardown, while its cross-system identity is retained as auditable historical evidence.

```text
LIVE_PROVIDER_TEARDOWN_ZERO_ORPHANS = true
ZERO_NONTERMINAL_BINDING_ORPHANS = true
ZERO_SYNTHETIC_JOB_ORPHANS = true
IMMUTABLE_TERMINAL_HISTORY_PRESERVED = true
```

## 8. Terminal decision

All mandatory live-provider predicates are now proven on the current Cloudflare plan:

```text
CURRENT_PLAN_CREATE_WITHOUT_CUSTOM_METADATA = true
LIVE_RETURNED_ID_BINDING = true
LIVE_NO_SECOND_CREATE_IDEMPOTENCE = true
LIVE_EXACT_ID_OBSERVATION = true
LIVE_SSL_LIFECYCLE = true
LIVE_EXACT_ID_REMOVAL = true
LIVE_PROVIDER_TEARDOWN_ZERO_ORPHANS = true

DCA02_EXTERNAL_PROVIDER_PROOF = Accepted
DCA02_TERMINAL_ACCEPTED = true
DCA02_TERMINAL_STATE = Accepted with Non-Blocking Backlog
GLOBAL_AUTHORITY_MODE = legacy
REAL_TENANT_MUTATION = false
PRODUCTION_CUTOVER = false
```

The following previously registered items remain non-blocking and are not started automatically:

```text
NB-DCA02-01 = Explicit Provider Orphan Recovery — Non-Blocking Backlog
NB-DCA02-02 = Provider Identity Disaster Recovery / Backup Verification — Non-Blocking Backlog
```

DCA-01 remains terminal and is not reopened. This evidence does not start BCA-01 or PR-M3. Any successor must be resolved from the then-current audited GitHub `main` and explicitly authorized under the finite roadmap governance.