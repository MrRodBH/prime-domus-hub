# PCA-05R — Lovable private synthetic schema rehearsal execution envelope

## 1. Authority

```text
SOURCE_MAIN=cb3f1a96c9609c67f4bed5e0e823ace8304cec01
SOURCE_TREE=446ef641c160325ccf820c41fdfe4fb521396890
STAGE_TYPE=Architecture First execution envelope
IMPLEMENTATION_TARGET=future_private_disposable_lovable_cloud_project
SAME_BACKEND_MUTATION=false
MIGRATION_FILE_MUTATION=false
PROVIDER_MUTATION=false
BACKEND_MUTATION=false
DEPLOY=false
PR_105_MUTATION=false
LOVABLE_AGENT_CALLS=false
```

This gate freezes documentation and test contracts only. It creates no Lovable
project or database and applies no SQL. GitHub remains the authority for the
approved migration bytes; Lovable may later execute only the separately
authorized database rehearsal and must never edit or synchronize GitHub.

## 2. Corrective decision

The original PCA-05 restore-to-new-project strategy is not available through
the Lovable Cloud surface. PCA-05R separates two claims that must not be
conflated:

1. `R2-R4_SCHEMA_REHEARSAL`: may be proved with synthetic identities and data
   in a new private Lovable project with its own managed backend.
2. `R1_BACKUP_PITR_RECOVERABILITY`: remains unproved and owned by DCA-02-BL2.

PCA-05R cannot satisfy, waive or relabel R1. PCA-06 and any Same-Backend write
remain blocked until their independent prerequisites and Owner gates complete.

## 3. Cell identity and non-reuse

The future cell must be a newly created private project dedicated to PCA-05R.
No current project, preview, visual gate, roadmap project or Same-Backend may be
reused. The execution record must capture project ID, creation time, backend
enabled state and an Owner-visible teardown reference without copying secrets
into GitHub.

```text
PROJECT_VISIBILITY=private
PROJECT_PUBLISHED=false
BACKEND_IDENTITY=new_and_distinct
REAL_TENANT_DATA=0
REAL_AUTH_USERS=0
REAL_STORAGE_OBJECTS=0
REAL_SECRETS=0
REAL_PROVIDER_IDS=0
```

## 4. Input authority and exact chain

The only admissible SQL inputs are bytes read from the then-current protected
GitHub `main`. Before execution, the runner must verify:

- the PCA-04 parity manifest and all 17 recorded SHA-256 values;
- the complete prerequisite migration closure required to establish the
  pre-PCA-04 synthetic schema substrate;
- PostgreSQL/Supabase managed-role compatibility;
- explicit transaction boundaries for every PCA-04 migration;
- zero unapproved file, live-only migration or PR #105 input.

The four live-only BCA/BCR versions remain quarantined and must not be
materialized. Lovable-assigned ledger names are evidence metadata, never proof
of equivalence to GitHub timestamps; statement hashes and physical postflight
are authoritative.

## 5. R2 — structural wave rehearsal

Apply corrected structural SQL in exact order and stop after the first failed
preflight, transaction or postflight:

| Wave | Scope |
|---|---|
| W1 | tenant lifecycle and access control |
| W2 | configuration and portal contracts |
| W3 | CMS and CRM workflows |
| W4 | marketing ingestion and analytics/tracking |
| W5 | consolidation, inventory, hardening, control plane, uploads and launch save |
| W6 | PCA-04 exact tenant product baseline |

There is no cross-wave atomicity. Each committed wave must produce an immutable
evidence packet before the next wave begins. Failure after a commit requires a
forward corrective plan; migration rewriting, blind repair, reset and down
migration are prohibited.

## 6. R3 — synthetic tenant rehearsal

Use deterministic UUIDs in the reserved synthetic namespace and Owner-approved
run manifest. Create only synthetic Auth identities through the cell's own
signup flow. Validate both future-tenant trigger and exact-manifest backfill:

- one published configuration baseline;
- one default pipeline with seven closed stages;
- four inactive marketing connectors and four versions/mappings;
- three inactive tracking connectors and three versions/mappings;
- thirty-six tracking event bindings;
- one consent configuration;
- idempotent replay produces no duplicate baseline;
- an injected mid-transaction fault leaves no partial baseline;
- an unknown or mismatched UUID/hash/authorization selects zero tenants.

## 7. R4 — security and data-boundary postflight

The cell must prove expected tables, columns, constraints, owners, RLS,
policies, grants and function privileges. Every exposed tenant table requires
RLS and tenant authorization; `TO authenticated` alone is insufficient.
`SECURITY DEFINER` functions must have constrained search paths, explicit
authorization and no unintended `PUBLIC`, `anon` or `authenticated` execution.

Storage tests use synthetic buckets and objects only. Missing objects, wrong
tenant provenance and cross-tenant IDs must fail closed. Auth, Storage,
Realtime, functions and secrets are not assumed cloned or equivalent.

## 8. External-effect containment

Lovable Cloud exposes no absolute network sandbox. PCA-05R therefore removes
all useful external capability by construction and verifies the boundary both
before and after rehearsal:

```text
SECRETS_PRESENT=0
PROVIDER_IDENTIFIERS_PRESENT=0
CRON_JOBS=0
HTTP_OR_NET_CALLERS=0
EDGE_FUNCTIONS_CREATED=0
PUBLIC_WEBHOOK_ROUTES_CREATED=0
REALTIME_BROADCAST_TESTS=0
DEPLOYED_SURFACES=0
```

Installed `pg_net`, `pg_cron` or wrappers alone are not evidence of an external
call, but every job, trigger, function or caller using them must be absent. Any
unexplained caller, secret, endpoint or provider identifier terminates the gate
fail-closed before SQL application continues.

## 9. Evidence contract

The future execution must record, without secrets or personal data:

- protected-main SHA/tree and migration/manifest hashes;
- cell identity, private/unpublished state and backend separation evidence;
- preflight inventory and zero-external-effect matrix;
- per-wave start/end, SQL hash, transaction result and physical postflight;
- synthetic UUID manifest hash and assertion totals;
- negative, idempotency and injected-fault results;
- security advisor findings and disposition;
- final purge result and Owner teardown confirmation.

No Lovable chat assertion alone proves a database property; catalog queries and
deterministic counts are required.

## 10. Teardown and residual-risk boundary

Before Owner deletion, purge synthetic objects and rows, confirm no job/caller,
and render the app non-published. Definitive backend/project deletion is an
Owner-manual action because the connected Lovable agent exposes no destructive
project-delete capability. The gate cannot be `ACCEPTED` until direct deletion
evidence is supplied. If deletion is unavailable, terminate as
`FAIL_CLOSED_INERT_RESIDUAL_CELL` and do not start PCA-06.

## 11. Hard stops

- any mutation of Same-Backend, existing Lovable projects or PR #105;
- missing exact prerequisite closure or hash mismatch;
- any real tenant, user, object, credential, endpoint or provider identifier;
- any external job/caller or public/deployed surface;
- migration outside the approved chain or adoption of live-only BCA/BCR;
- inability to prove physical postflight, synthetic purge or final deletion.

## 12. Ordered successor

1. protected audit/merge of this envelope under a separate Owner gate;
2. explicit PCA-05R cell creation and rehearsal authorization, including
   bounded Lovable backend writes and accepted Owner-manual teardown duty;
3. terminal teardown evidence;
4. DCA-02-BL2 remains separate for backup/PITR;
5. PCA-06 remains separately authorized and read-only until all prerequisites
   are requalified.

