# PTW-01 — Planning Acceptance Evidence

## Status

**Accepted — effective after merge of planning PR #41**

```text
STAGE_ID = PTW-01
PLANNING_STATE = Accepted
CANONICAL_ISSUE = 16
DUPLICATE_ISSUE = 12 — Closed as duplicate
BASELINE_MAIN = 87acb309c0102a096f65d0c420061012edb5899e
PLANNING_PR = 41
AUDITED_PLANNING_CONTENT_HEAD = 84e9834afa9c30d42e60e7f79c13a12052685676
EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
PTW01_IMPLEMENTATION_AUTHORIZED_AFTER_PLANNING_MERGE = true
PSG01_AUTHORIZED = false
```

## 1. Direct audit result

The PTW-01 planning envelope is accepted after direct inspection of the current GitHub `main`, all identified public writer implementations, their public consumers, generated database types, accepted Lead SQL evidence and the complete planning diff.

The planning PR changes documentation only.

Accepted planning documents:

```text
docs/architecture/impact-analysis/PTW-01-public-tenant-bound-writers-impact-analysis.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/ptw-01-public-writer-authority-inventory.md
```

No runtime, migration, RLS, grant, Auth, Storage, dependency, lockfile, workflow or writer change was introduced by planning.

## 2. Release Gate evidence

```text
RELEASE_GATE_RUN = 29853391455
RELEASE_GATE_JOB = 88711618102
RELEASE_GATE_CONCLUSION = success
ARTIFACT_ID = 8504351243
ARTIFACT_DIGEST = sha256:bcf74ef966248f43271b93c32a5c3ff2bfb18a76b2aabc8e9dfbaa48aaadc91b
RELEASE_GATE_ARTIFACT_UPLOADED = true
```

The complete canonical verification command, including inherited public-tenant and Lead regressions, build, build:dev, typecheck and deterministic route-tree generation, completed successfully.

## 3. Accepted material findings

```text
PUBLIC_WRITER_AUTHORITY_CURRENTLY_ACCEPTABLE = false
HOST_BOUND_SITE_LEADS = false
HOST_BOUND_FORM_SUBMISSIONS = false
HOST_BOUND_CAMPAIGN_EVENTS = false
HOST_BOUND_META_CAPI = false
PORTAL_TOKEN_CARDINALITY_EXPLICIT = false
PORTAL_DIRECT_PROPERTY_TENANT_BOUND = false
DLQ_REPLAY_SINGLE_WRITER_PATH = false
ANON_CAMPAIGN_EVENT_BYPASS_CLOSED = false
```

The findings are implementation requirements, not accepted runtime behavior.

## 4. Binding schema clarification

Direct schema audit confirms:

- `cms_forms` contains `tenant_id`;
- `cms_form_fields` contains `tenant_id` and `form_id`;
- `form_submissions.tenant_id` is required on insert;
- `cms_campaigns` and `cms_campaign_events` contain `tenant_id`;
- `cms_campaign_events.tenant_id` is currently optional in generated insert typing, consistent with the legacy header/default-dependent write path that PTW-01 must remove.

Therefore, the following clarification is binding on implementation:

```text
PUBLIC_FORM_FIELD_QUERY = tenant_id + form_id
PUBLIC_FORM_FIELD_TENANT_POST_VALIDATION = required
PUBLIC_FORM_FIELD_GLOBAL_FORM_ID_ONLY_QUERY = prohibited
```

The accepted form identity referenced in the Impact Analysis means the composite server authority:

```text
accepted tenant.id + accepted form.id
```

Fields, lead creation, submission, notification and webhook configuration must all remain inside that composite authority.

## 5. Accepted implementation architecture

Implementation must create the frozen boundaries:

```text
public-writer-authority.server.ts
public-lead-writer.server.ts
portal-writer.server.ts
public-campaign-writer.server.ts
```

Required architecture:

- Host-derived authority for direct site leads, forms, campaign events and Meta CAPI;
- exact connector credential cardinality for portal operations;
- explicit 0/1/N decisions;
- resource ownership validation before service-role use;
- explicit tenant ID on every tenant-scoped write;
- one shared public lead writer across direct, form and portal channels;
- one portal business mutation path for immediate and DLQ replay;
- one restricted migration closing direct anonymous campaign-event DML;
- no change to authenticated `create_manual_lead` or accepted LSH boundaries.

## 6. Frozen implementation controls

The Impact Analysis `FILES_ALLOWED`, prohibitions, tests and Definition of Done are accepted with this clarification.

Implementation must also inspect and record the exact effective campaign-event grants and policy names before writing the restricted migration. Generated TypeScript types prove the table shape, but do not prove effective database privileges.

The migration may change only objects proven to support the legacy anonymous campaign-event write path. Broad or guessed policy deletion is prohibited.

## 7. Governance decision

After this planning PR is merged and the final planning Release Gate remains green:

```text
PTW01_PLANNING_STATE = Accepted
PTW01_IMPLEMENTATION_AUTHORIZED = true
AUTHORIZED_EXECUTOR = GitHub-native
MAX_ACTIVE_IMPLEMENTATION_PRS = 1
PSG01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

Implementation is not started by this acceptance record.

No PSG-01 planning or implementation is authorized until PTW-01 implementation is merged, reconciled and accepted through direct final audit.
