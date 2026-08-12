# DCA-01 — Terminal Teardown Evidence

## Status

**Blocked External / Terminal / Teardown Complete**

```text
STAGE_ID = DCA-01
EVIDENCE_TYPE = terminal_external_proof_teardown
AUDITED_BASELINE_MAIN = c90ad26daf41af10e8221096145ef79af23d32ab
EXECUTION_DATE = 2026-08-12
DCA01_REPOSITORY_IMPLEMENTATION = Accepted / Merged / Closed
DCA01_CONTROLLED_EXTERNAL_PROOF = failed_closed_at_provider_capability
DCA01_TERMINAL_STATE = Blocked External
TEARDOWN_COMPLETE = true
ZERO_SYNTHETIC_CLOUDFLARE_ORPHANS = true
GLOBAL_AUTHORITY_CUTOVER = false
SUCCESSOR_ARCHITECTURE_FIRST_REQUIRED = true
```

This evidence closes the original DCA-01 controlled external proof factually. The repository implementation remains historical Accepted / Merged / Closed. The live proof progressed through ownership verification and required DNS observation, then failed closed at Cloudflare Custom Hostname provisioning because the active account/zone does not have Custom Metadata access. The Product Owner explicitly rejected a paid/Enterprise Cloudflare upgrade as a pre-homologation resolution. DCA-01 therefore terminates as `Blocked External`, with all synthetic proof artifacts removed and a separate Architecture First successor required.

## 1. Binding Owner decision

```text
CLOUDFLARE_PAID_OR_ENTERPRISE_UPGRADE_BEFORE_HOMOLOGATION = not_planned
PLAN_UPGRADE_AS_DCA01_RESOLUTION = rejected
REMOVE_CUSTOM_METADATA_WITHOUT_NEW_IMPACT_ANALYSIS = prohibited
REAL_TENANT_MUTATION = prohibited
ROOT_WWW_NOTIFY_MUTATION = prohibited
CORRECTIVE_WORKER_REMOVAL = prohibited
```

The external blocker must not be bypassed by silently changing the adapter or weakening generation-bound ownership.

## 2. Pre-teardown authoritative state

Direct GitHub audit confirmed `main` exactly at:

```text
c90ad26daf41af10e8221096145ef79af23d32ab
```

Direct Cloudflare audit confirmed:

```text
ACCOUNT_ID = 68ec853e6b04a038f09fca5712d6b26b
ZONE_ID = 90832d0006e9e630dbb73d33c551d836
ZONE_NAME = mrrod.com.br
WORKER = rm-prime-wri01-hml
CORRECTIVE_WORKER_VERSION = bf136552-62ab-4224-a606-0b3191c4f0d5
CORRECTIVE_WORKER_TRAFFIC = 100%
TEMPORARY_CRON = */5 * * * *
SYNTHETIC_HOSTNAME = dca01-hml.mrrod.com.br
SYNTHETIC_CUSTOM_HOSTNAME_COUNT = 0
WORKER_ROUTE_COUNT_IN_ZONE = 0
FALLBACK_ORIGIN = fallback.mrrod.com.br
FALLBACK_ORIGIN_STATUS = active
```

The synthetic database domain was:

```text
SYNTHETIC_TENANT_ID = 0246468a-ee84-402e-8fae-08f554daf0e1
SYNTHETIC_DOMAIN_ID = 1d800a0d-b0b4-4f03-b75e-d9c6534a80e1
SYNTHETIC_DOMAIN_GENERATION = 1
SYNTHETIC_DOMAIN_STATUS_BEFORE_TEARDOWN = failed
SYNTHETIC_DOMAIN_LOCK_VERSION_BEFORE_TEARDOWN = 7
SYNTHETIC_DOMAIN_RESUME_STATE = pending_cloudflare_provisioning
SYNTHETIC_PROVIDER_BINDING_COUNT = 0
```

The failed provider job returned Cloudflare HTTP `403`, error code `1413`, reporting that Custom Metadata access had not been allocated for the zone/account. No `domain_provider_bindings` row and no Cloudflare Custom Hostname object were created.

## 3. Teardown ordering

The teardown respected the Product Owner's required sequence.

### 3.1 Cron removed first

The temporary Worker schedule was removed before any other teardown mutation:

```text
CRON_BEFORE = */5 * * * *
CRON_UPDATE = PUT schedules []
CRON_AFTER_COUNT = 0
CRON_REMOVED_FIRST = true
```

### 3.2 Synthetic DNS removed by exact proof ownership

Only DNS records directly attributable to DCA-01 were removed:

```text
CNAME_RECORD_ID = d8204424719defbdacc300ab366b0f42
CNAME_NAME = dca01-hml.mrrod.com.br
CNAME_TARGET = fallback.mrrod.com.br
CNAME_COMMENT = RM Prime DCA-01 controlled synthetic required DNS
CNAME_REMOVED = true

OWNERSHIP_TXT_RECORD_ID = a3f94300d980c13f10bb01cece702be7
OWNERSHIP_TXT_NAME = _rm-prime.dca01-hml.mrrod.com.br
OWNERSHIP_TXT_COMMENT = RM Prime DCA-01 controlled synthetic ownership proof
OWNERSHIP_TXT_REMOVED = true
OWNERSHIP_PROOF_VALUE_PERSISTED_IN_EVIDENCE = false
```

No broad DNS deletion or suffix-based mutation was performed.

### 3.3 Synthetic Custom Hostname absence

Before and after teardown:

```text
CUSTOM_HOSTNAME_EXACT_QUERY = dca01-hml.mrrod.com.br
CUSTOM_HOSTNAME_COUNT = 0
CUSTOM_HOSTNAME_DELETE_REQUIRED = false
```

## 4. Canonical domain lifecycle teardown

The synthetic domain was closed through the DCA-01 state-machine RPC rather than by direct status mutation.

```text
TRANSITION_1 = failed -> removal_pending
TRANSITION_1_AUTHORITY_ORIGIN = impersonation
LOCK_VERSION_AFTER_TRANSITION_1 = 8
PUBLIC_AUTHORITY_CLOSED = true

TRANSITION_2 = removal_pending -> revoked
TRANSITION_2_AUTHORITY_ORIGIN = platform
LOCK_VERSION_AFTER_TRANSITION_2 = 9
REVOKED_AT = 2026-08-12T12:49:03.183573Z
HOSTNAME_REUSABLE_AFTER = 2026-09-11T12:49:03.183573Z
FINAL_FAILURE_CODE = null
FINAL_RESUME_STATE = null
```

Because the Owner-required ordering removed the Cron before the domain cleanup job could be scheduled, the cleanup ledger was reconciled only for the exact synthetic job, without global leasing or execution of unrelated tenant work.

```text
CLEANUP_JOB_ID = 31971850-7763-44f8-8bf6-29df5d012e12
CLEANUP_OPERATION = cleanup_domain
CLEANUP_ATTEMPT_COUNT = 1
CLEANUP_FINAL_STATUS = succeeded
PROVIDER_OBJECT_REMOVED = false
PROVIDER_OBJECT_ABSENT = true
GLOBAL_JOB_LEASE = false
OTHER_TENANT_JOB_MUTATION = false
```

The prior synthetic job chain is retained as immutable operational history: ownership observation succeeded, DNS preparation succeeded, required DNS observation succeeded, provider provisioning failed closed, and cleanup succeeded.

## 5. Post-teardown Cloudflare audit

Direct post-teardown Cloudflare observation proved:

```text
TEMPORARY_CRON_COUNT = 0
SYNTHETIC_DNS_RECORD_COUNT_CONTAINING_DCA01_HML = 0
SYNTHETIC_CUSTOM_HOSTNAME_COUNT = 0
WORKER_ROUTE_COUNT_IN_ZONE = 0
CORRECTIVE_WORKER_VERSION = bf136552-62ab-4224-a606-0b3191c4f0d5
CORRECTIVE_WORKER_TRAFFIC = 100%
CORRECTIVE_WORKER_PRESERVED = true
FALLBACK_ORIGIN = fallback.mrrod.com.br
FALLBACK_ORIGIN_STATUS = active
```

The following protected records remained present and were not mutated:

```text
ROOT_MRROD_COM_BR_PRESENT = true
WWW_MRROD_COM_BR_PRESENT = true
NOTIFY_MRROD_COM_BR_PRESENT = true
```

## 6. Authority and real-tenant preservation

Final database audit proved:

```text
DOMAIN_AUTHORITY_MODE = legacy
DOMAIN_AUTHORITY_LOCK_VERSION = 0
DOMAIN_AUTHORITY_ACTIVATED_AT = null
DOMAIN_AUTHORITY_ACTIVATED_BY = null
GLOBAL_CUTOVER_EXECUTED = false
```

The protected real tenant remains:

```text
REAL_TENANT_ID = 9664d189-4a12-4caa-8243-dc73383447e6
REAL_TENANT_SLUG = rm-prime
REAL_TENANT_DOMAIN = rmprimeimoveis.com.br
REAL_TENANT_MUTATED_BY_TEARDOWN = false
```

## 7. Terminal orphan audit

```text
SYNTHETIC_CRON_ORPHANS = 0
SYNTHETIC_DNS_ORPHANS = 0
SYNTHETIC_CUSTOM_HOSTNAME_ORPHANS = 0
SYNTHETIC_PROVIDER_BINDING_ORPHANS = 0
SYNTHETIC_PENDING_CLEANUP_JOB_ORPHANS = 0
SYNTHETIC_LEASED_JOB_ORPHANS = 0
SYNTHETIC_RETRY_WAIT_JOB_ORPHANS = 0
ZERO_SYNTHETIC_ORPHANS = true
```

Historical audit events, completed/failed jobs, attempts and the terminal revoked domain row are intentionally retained as evidence and are not classified as orphans.

## 8. Terminal decision

```text
DCA01_TERMINAL_STATE = Blocked External
DCA01_TEARDOWN = Accepted
DCA01_REOPEN_FOR_PLAN_UPGRADE = prohibited
DCA01_ADAPTER_CUSTOM_METADATA_REMOVAL_WITHOUT_IA = prohibited
BCA01 = blocked
PRM3 = blocked
NEXT_GATE = DCA-02 Architecture First — Cloudflare Custom Metadata Independence & Provider Object Identity Binding
DCA02_IMPLEMENTATION_STARTED = false
```

DCA-01 is closed. Any resolution of the provider capability dependency belongs to DCA-02 and must preserve the server-owned domain authority model rather than weaken it.