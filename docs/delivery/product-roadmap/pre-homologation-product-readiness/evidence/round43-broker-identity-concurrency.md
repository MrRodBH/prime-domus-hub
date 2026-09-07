# Round 43 — Native PostgreSQL concurrency verification

Authorized baseline: `main@715f9f9ca071fa0e48a03792d7fc33517027f17b`.
Authorization: `P0_BROKER_IDENTITY_LINK_ISOLATED_CONCURRENCY_VERIFICATION_ROUND_43_END_TO_END`.

## Scope and reproducibility

Tests, fictional fixture, dedicated workflow, evidence and exact downstream regression scope only. No product code, production migrations, permission contracts, backend configuration or dependencies change. The workflow and test runner assert an empty production diff under `src/` and `supabase/` against the authorized baseline.

The dedicated CI job starts PostgreSQL **17.6** as an ephemeral service bound to the runner's loopback port **55443**, database `round43`. It uses no real password, token, Supabase connection or application environment. The driver is pinned to `pg@8.16.3` in a temporary prefix outside product dependencies. The runner accepts no database URL or configurable remote host and requires a fresh database. Product network fetch is forbidden. The service is destroyed with the CI job.

The local workspace has no native PostgreSQL service and previously rejects the CLI IPC socket used by the composite test launcher. Native concurrency evidence therefore comes from the dedicated CI service, not a local PGlite simulation. Round 42's isolated atomicity evidence remains preserved.

## Actual implementation under test

The runner loads the complete new Round 42 migration, unchanged. It extracts the actual latest repository definitions of `resolve_tenant_permission`, `assert_tenant_access_manager` and `mutate_tenant_membership`, asserting their source paths are still the latest definitions and recording exact SHA-256 hashes. It invokes the real membership writer for suspension and revocation. Positive-seat operations are outside scope; no fake commercial resolver is supplied.

The fixture includes the minimal relational substrate, active synthetic memberships, Auth foreign keys, RLS flags and existing global unique-index shape. It does not reproduce every production policy, trigger, extension or deployment setting. Fixture identities are SQL rows in the isolated test database, not remote Supabase Auth accounts.

The cadastral races execute the actual `adminSalvarCorretor` handler, input schema and TypeScript authority. Only the framework/middleware harness and database transport are substituted. That transport executes parameterized SQL in a real test session and records update keys; it does not emulate row locking or transaction semantics. No claim is made about live authentication middleware or HTTP transport.

## Matrix and acceptance

Three independent PostgreSQL sessions have distinct backend PIDs: observer, writer A and writer B. Each scenario holds the first operation's transaction open, starts the contender, and requires `pg_blocking_pids` plus a PostgreSQL `Lock` wait before releasing the first transaction. Fixed sleeps do not constitute evidence; bounded polling only waits for the server's observed blocking relation. Isolation is READ COMMITTED.

Fifteen scenarios cover:

- Identical links with first-writer commit and rollback: one committed audit, `already_linked` or a fresh `linked` result as appropriate.
- Different identities for the same broker with commit and rollback: safe conflict or successful surviving contender.
- Same identity in two tenant directories with commit and rollback: global unique-index arbitration, no cross-tenant conflict detail and no duplicate committed link.
- Canonical suspension and revocation before linking, with commit and rollback; linking before each membership change. An already committed link may remain after suspension/revocation, but a subsequent linking request revalidates membership and fails. Linking grants no access.
- Cadastral handler before linking and linking before the cadastral handler: row-lock contention, preserved identity and cadastral fields, no `user_id` in the update payload.
- Audit failure while a competing link waits: a test-only trigger pauses the failing writer inside audit insertion, allowing observation of both locks and absence of partial visible state. Releasing the barrier causes rollback, then the contender commits exactly one link/audit pair.

The JSON artifact records head, baseline, native PostgreSQL version, distinct PIDs, SQL source hashes, each scenario, actual blocking relations, update keys and terminal status. Acceptance requires all fifteen scenarios plus the applicable exact-head protected gates to pass. A fixture or harness problem may be corrected within this scope; a production defect must be reported without modifying the production contract.

Documentation for the observation mechanism: [PostgreSQL 17 session information functions](https://www.postgresql.org/docs/17/functions-info.html) and [explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html).

## Continuity

The existing PCA-12B, PCA-12C-R3 and PCA-15R cumulative scope checks are extended only with the eight exact Round 43 paths; their historical content, security and production-file assertions remain active. No new migration enters the repository and the PCA-05R migration inventory remains unchanged.

Preserved: #229 waiting for human Lovable support; synthetic identity `2f0a81d8-bf15-4b88-ae4a-1d893ca6a80f` and pca11-hml tenant `a212f9de-0364-427e-8473-2b0742a2d897` remain unrecovered; #231 without merge/deployment; #227 nonblocking; #230; demonstration and preview; LSR-02 `Rejected — Terminal`, budget `0/2`.

Passing this gate closes only the native multi-session validation dependency of Round 42. The migration is still unapplied to the canonical backend, and persistent same-backend homologation and identity recovery remain separate prerequisites. No frontend publication or remote execution is authorized by these tests.
