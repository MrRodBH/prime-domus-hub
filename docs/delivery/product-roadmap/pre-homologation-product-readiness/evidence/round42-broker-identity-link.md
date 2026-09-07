# Round 42 — Dedicated broker identity link contract

Authorization: `P0_AUTHENTICATED_BROKER_IDENTITY_LINK_CONTRACT_IMPLEMENTATION_ROUND_42_END_TO_END`.
Baseline: `main@baca22b1f5ede8dfbbf2fbabf9bd15285fe08fac` (Round 40 / PR #232).
Scope: repository implementation only. This evidence does not authorize or record a remote migration, frontend publication, function deployment, identity creation or remote backend access.

## Round 41 decision implementation

The supplied Round 41 contract is the impact-analysis input; its completed analysis is not reopened.

- `adminSalvarCorretor` keeps its strict input schema. Updates omit `user_id`; creation explicitly inserts `user_id: null`. It no longer reads an identity value to reapply it later.
- `adminVincularCorretorIdentidade({ corretorId, userId })` is a POST server function behind `requireTenant` and the existing `access_control / gerenciar / global` authorization. Tenant, actor and origin come exclusively from canonical middleware context. No client-supplied actor, tenant, role or permission is accepted.
- The privileged client remains a dynamic server import. The SQL function is `SECURITY INVOKER`, has an empty search path, requires `current_user = service_role`, revokes PUBLIC/anon/authenticated execution and grants only its own execution to the existing service role. No table privileges or user permissions change.
- The versioned migration adds only `public.link_tenant_broker_identity(uuid,uuid,text,uuid,uuid)`. It does not redefine canonical authority functions, tables, policies, indexes or existing contracts.
- The transaction first locks the tenant, matching canonical membership/access writers, then revalidates `assert_tenant_access_manager`, locks and validates active target membership, and locks the tenant-scoped broker. Existing Auth foreign keys guarantee identity existence; no new Auth-table grant is needed.
- Only initial `null → UUID` linkage is supported. The same pair is `already_linked` without another audit, after authorization and membership revalidation. A different or globally occupied link fails with a safe conflict. There is no relink or unlink operation.
- The existing global `corretores_user_id_uniq` remains authoritative. No cross-tenant conflict details leave the command. This does not introduce support for one identity in multiple tenant directories.
- Broker update and `audit_log` insertion execute in the same SQL call. Audit errors propagate and roll back the link.
- `listTenantMemberships` and its owner/administrative contract are unchanged. No linking UI or selection permission expansion is included.

## Validation and boundaries of evidence

`run-round-42-broker-identity-link-specs.mjs` bundles and executes the production server wrapper and canonical TypeScript authority. Only the server-function harness, tenant-middleware marker and database transport are controlled. The real Supabase client is excluded from the bundle and network fetch is rejected. It tests invalid/extra input, missing or inconsistent tenant context, denied/limited scopes, owner/delegated/explicit super-admin context, trusted RPC parameters, repeated result, safe provider/conflict/audit errors, malformed responses, and cadastral link preservation. It does not retest real authentication middleware or prove remote authorization.

`run-round-42-broker-identity-sql-specs.mjs` executes the exact new migration in PGlite 0.3.14, an isolated in-memory PostgreSQL engine. It loads the actual canonical SQL permission resolver and access-manager assertion from the latest repository definition (`20260828160617_pca_07r2_w1_forensic_forward_only_ledger_reconciliation.sql`), with a minimal fictitious relational substrate, foreign keys, global unique index and RLS-enabled tables. It tests execution ACL/channel, null context, denied actors/scopes, impersonation, absent/external targets, all inactive membership states, initial linkage, idempotence, changed-link and global conflicts, revalidation on repetition, audit contents, transactional audit rollback and subsequent retry. Catalog comparison verifies that the new migration does not change fixture tables, RLS flags, table grants or indexes.

Local wrapper tests, SQL tests (40 cases), the evolved existing access-control regression and TypeScript typecheck pass. The prior regression assertions remain active; Round 42 adds explicit assertions for unlinked creation, omission of linkage on update, canonical command authority and absent linking UI. Round 40 code, tests and evidence are preserved. The new CI gate runs both new suites plus the evolved regression and typecheck on the exact PR head. Existing applicable protected gates remain required; final CI/merge evidence is recorded by the PR checks and merge metadata.

**Limit:** PGlite serializes its client; these tests prove isolated transactional rollback, not multi-session lock contention or persistent concurrency. A native PostgreSQL multi-session fixture is a remaining validation dependency. The minimal fixture is not a replay of the complete production schema and proves no same-backend or persistent remote homologation. No backend migration has been applied, so the new RPC is not available there as a result of this round.

The initial PR head passed the Round 42 and Round 40 CI gates. Both protected composite gates stopped on the same exact-inventory assertion: the newly added migration was not classified in the PCA-05R prerequisite manifest. The consolidated correction explicitly appends it as `POST_REHEARSAL_ROUND42_REPOSITORY_ONLY_IDENTITY_LINK / EXCLUDED_FROM_PCA05R_CELL`, with its SHA-256, and evolves the exact inventory counts from 131/9 to 132/10 (total/excluded). The 105 prerequisites, 17 rehearsal migrations, their digests, historical source references, decisions and prohibited replay operations remain unchanged. The focused diff check permits precisely this new migration for the Round 42 test change; unclassified migrations still fail. This is maintenance of the existing regression inventory, not reopening or executing PCA-05R.

## Preserved continuity and successor

- Round 37 / #229 remains blocked on human Lovable support for synthetic identity `2f0a81d8-bf15-4b88-ae4a-1d893ca6a80f`, tenant pca11-hml `a212f9de-0364-427e-8473-2b0742a2d897`. Recovery did not occur.
- PR #231 remains without merge or deployment; supplied audited head `a961097cc2a979c0a9abb9981a178a8fc4207ce5`. No denied recovery request is retried.
- #227 mobile/200% zoom remains nonblocking. #230 controlled Round 38 evidence, demonstration and preview are preserved.
- LSR-02 stays `Rejected — Terminal`, budget `0/2`. July attachments are historical, not operational authorization.
- Suggested next gate: isolated native PostgreSQL multi-session verification of the implemented contract, including simultaneous identical/different links, global-unique contention across synthetic tenants, canonical membership suspension/revocation versus linking, and cadastral update versus linking. No remote migration, UI, identity recovery or deployment is implied. This successor requires its own explicit user authorization.
