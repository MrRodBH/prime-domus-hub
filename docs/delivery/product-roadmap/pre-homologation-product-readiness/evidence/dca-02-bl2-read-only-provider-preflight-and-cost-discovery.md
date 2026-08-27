# DCA-02-BL2 — Read-Only Provider Preflight and Cost Discovery

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
