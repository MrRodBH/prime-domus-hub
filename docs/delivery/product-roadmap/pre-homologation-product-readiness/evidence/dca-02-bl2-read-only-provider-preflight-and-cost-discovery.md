# DCA-02-BL2 — Read-Only Provider Preflight and Cost Discovery

> **Current authority notice:** the direct-provider observations from PR #161
> are retained below as historical evidence for the connector that produced
> them. They are not authority for the RM Prime backend. The binding state is
> the Lovable-managed corrective recorded at the end of this document.

## Exact authority

~~~text
GATE = DCA-02-BL2_READ_ONLY_PROVIDER_PREFLIGHT_AND_COST_DISCOVERY
SOURCE_MAIN = e1ba6dc76d4ed60fa2b74d973a848b8604c9cd59
SOURCE_TREE = 148777cc059f5bcc73e7c43591ffaefd708a1f13
OBSERVED_AT_UTC = 2026-08-27T21:20:34.581Z
SOURCE_PROJECT_REF = stmcnvzuzlyqammyycxj
MODE = live_control_plane_read_only_fail_closed
~~~

## Direct provider observations

~~~text
CONNECTED_ORGANIZATION_ID = brsnxonzbrukxpyogqcq
CONNECTED_ORGANIZATION_NAME = MrRod
CONNECTED_ORGANIZATION_PLAN = free
LIST_PROJECTS_COUNT = 0
DIRECT_PROJECT_LOOKUP_RESULT = permission_denied
DIRECT_PROJECT_LOOKUP_ERROR = You do not have permission to perform this action
GENERIC_NEW_PROJECT_COST_AMOUNT_USD = 0
GENERIC_NEW_PROJECT_COST_RECURRENCE = monthly
EXACT_RESTORE_TO_NEW_PROJECT_COST_DISCOVERED = false
COST_CONFIRMATION_REQUESTED = false
COST_CONFIRMATION_ID_CREATED = false
~~~

The generic zero-dollar project quote belongs to the visible Free organization
and is not a quote for Restore to a New Project. It must never be presented as
the clone cost. The source project could belong to another organization or
account that this connector cannot see; therefore its plan cannot be inferred
from the visible organization.

## Qualification result

~~~text
SOURCE_PROJECT_AUTHORITY_VERIFIED = false
BACKUP_SCOPE_VERIFIED = false
PHYSICAL_BACKUPS_VERIFIED = false
PITR_ENABLED_VERIFIED = false
EARLIEST_RECOVERY_POINT = unknown
LATEST_RECOVERY_POINT = unknown
SELECTED_RECOVERY_POINT = none
RPO_SECONDS = unknown
RESTORE_TO_NEW_PROJECT_ELIGIBILITY = not_proven
EXTERNAL_EFFECT_INVENTORY_EXECUTED = false
EXTERNAL_EFFECT_CONTAINMENT_PROVEN = false
EXACT_CLONE_COST_CONFIRMED = false
PREFLIGHT_QUALIFIED = false
~~~

Current Supabase documentation states that Restore to a New Project is Beta,
creates a database-only copy, is restricted to paid plans with physical
backups, and presents the additional monthly cost before creation. Storage
objects/settings, Edge Functions, Auth settings/API keys and Realtime settings
are not copied. Extensions capable of external operations create an isolation
risk.

Because exact source authority failed at P0, the envelope required a hard stop.
No SQL inventory, backup query, PITR query, project creation or cost
confirmation was attempted.

## Fail-closed classification

~~~text
FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED
FAIL_CLOSED_RESTORE_TO_NEW_UNAVAILABLE
FAIL_CLOSED_PHYSICAL_BACKUP_REQUIRED
FAIL_CLOSED_PITR_WINDOW_INVALID
FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED
FAIL_CLOSED_COST_UNCONFIRMED
~~~

FAIL_CLOSED_RESTORE_TO_NEW_UNAVAILABLE means unavailable through the current
authenticated authority, not proof that the source project itself lacks the
feature.

## Zero-mutation ledger

~~~text
SUPABASE_CONTROL_PLANE_READ_CALLS = 5
SUPABASE_DOCS_SEARCH_CALLS = 1
SQL_QUERY_CALLS = 0
PROJECT_CREATION_CALLS = 0
RESTORE_CALLS = 0
COST_CONFIRMATION_CALLS = 0
SUPABASE_WRITE_CALLS = 0
DATABASE_WRITES = 0
SAME_BACKEND_MUTATION = false
CLOUDFLARE_PROVIDER_CALLS = 0
CLOUDFLARE_PROVIDER_WRITES = 0
DEPLOY = false
PR_105_MUTATION = false
LOVABLE_AGENT_CALLS = false
~~~

## Required recovery

The connector must be authenticated with an account or organization that has
read authority over exact project ref stmcnvzuzlyqammyycxj, or the Owner must
grant that authority through the Supabase access-control plane. The retry must
first prove that list/get resolve the same exact ref before any SQL or backup
inspection.

~~~text
PREFLIGHT_STATUS = TERMINAL_FAIL_CLOSED_AUTHORITY_MISMATCH
NEXT_GATE = DCA-02-BL2_SUPABASE_PROJECT_AUTHORITY_REBIND_AND_READ_ONLY_PREFLIGHT_RETRY
LIVE_RESTORE_AUTHORIZED = false
PROJECT_CREATION_AUTHORIZED = false
~~~

## Lovable-managed canonical authority corrective

~~~text
CORRECTIVE_GATE = DCA-02-BL2_LOVABLE_MANAGED_AUTHORITY_REBASELINE_REPOSITORY_CORRECTIVE_IMPLEMENTATION
CORRECTIVE_SOURCE_MAIN = c1bfa87da8abaafbcdd3bbabf67be9ebdfa79069
CORRECTIVE_OBSERVED_AT_UTC = 2026-08-28T09:45:23Z
CANONICAL_LOVABLE_PROJECT_ID = 982b91d8-946d-4103-8eb3-40ddbaeedbf4
CANONICAL_LOVABLE_PROJECT_NAME = prime-domus-hub
CANONICAL_SUPABASE_PROJECT_REF = stmcnvzuzlyqammyycxj
CANONICAL_SOURCE_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
DIRECT_SUPABASE_MCP = false
DIRECT_PROVIDER_OBSERVATION_AUTHORITY = historical_noncanonical_for_rm_prime
LOVABLE_DATABASE_ENABLED = true
LOVABLE_DATABASE_STACK = supabase
SOURCE_PROJECT_AUTHORITY_VERIFIED = true
~~~

The Lovable project metadata and its protected `supabase/config.toml` bind the
RM Prime project directly to ref `stmcnvzuzlyqammyycxj`. The failed direct
provider lookup from PR #161 therefore disqualifies only that external
connector as RM Prime authority. It does not disqualify the Lovable-managed
backend and does not create an Owner obligation to acquire direct Supabase
access.

### Canonical backend read-only inventory

~~~text
DATABASE_VERSION = 17.6
DATABASE_SIZE_BYTES = 449580179
PUBLIC_TABLES = 81
PUBLIC_TABLES_WITH_RLS = 81
AUTH_USERS = 4
STORAGE_BUCKETS = 3
STORAGE_OBJECTS = 22
MIGRATION_LEDGER_RELATIONS = 1
PG_CRON_INSTALLED = true
PG_NET_INSTALLED = true
HTTP_EXTENSION_INSTALLED = false
CRON_TOTAL_JOBS = 1
CRON_ACTIVE_JOBS = 1
CRON_NETWORK_COMMAND_JOBS = 1
EXTERNAL_EFFECT_ROUTINE_CANDIDATES = 2
EXTERNAL_EFFECT_ROUTINE_NAMES = email_queue_dispatch,email_queue_wake
VAULT_SECRET_COUNT = 1
NET_QUEUED_REQUESTS = 0
NET_RESPONSE_ROWS = 72
~~~

No secret value, URL, payload, job command or personal row was read or
persisted. Zero queued requests at the observation instant is not containment:
one active network cron job, two network-capable routines and copied Vault
material independently prevent P2 qualification.

### Corrected qualification

~~~text
BACKUP_SCOPE_VERIFIED = false
PHYSICAL_BACKUPS_VERIFIED = false
PITR_ENABLED_VERIFIED = false
EARLIEST_RECOVERY_POINT = unknown
LATEST_RECOVERY_POINT = unknown
RESTORE_TO_NEW_PROJECT_VISIBILITY = unavailable_in_lovable_project_runtime
EXACT_CLONE_COST_CONFIRMED = false
EXTERNAL_EFFECT_INVENTORY_EXECUTED = true
EXTERNAL_EFFECT_CONTAINMENT_PROVEN = false
PREFLIGHT_QUALIFIED = false
FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED
FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED
FAIL_CLOSED_COST_UNCONFIRMED
~~~

Lovable is the sole admissible backend access plane for the Owner, but its
project runtime does not expose physical-backup state, PITR window,
Restore-to-a-New-Project control or exact clone cost. The approved envelope
also rejects creation-first remediation because disabling cron, network
routines or secrets after target activation has a race window.

### Corrective zero-mutation ledger and terminal decision

~~~text
LOVABLE_METADATA_READ_ONLY = true
LOVABLE_SQL_READ_CALLS = 2
LOVABLE_AGENT_CALLS = 0
DIRECT_SUPABASE_CALLS = 0
DATABASE_WRITES = 0
PROJECT_CREATION_CALLS = 0
RESTORE_CALLS = 0
COST_CONFIRMATION_CALLS = 0
SAME_BACKEND_MUTATION = false
PROVIDER_MUTATION = false
DEPLOY = false
PR_105_MUTATION = false
CORRECTIVE_GATE_STATUS = ACCEPTED
RESTORE_QUALIFICATION = BLOCKED_EXTERNAL
PR_161_HISTORICAL_EVIDENCE_PRESERVED = true
PR_161_NEXT_GATE_SUPERSEDED = true
SUPERSEDED_NEXT_GATE = DCA-02-BL2_SUPABASE_PROJECT_AUTHORITY_REBIND_AND_READ_ONLY_PREFLIGHT_RETRY
NEXT_GATE = DCA-02-BL2_LOVABLE_MANAGED_RECOVERABILITY_STRATEGY_IMPACT_ANALYSIS
LIVE_RESTORE_AUTHORIZED = false
PROJECT_CREATION_AUTHORIZED = false
~~~
