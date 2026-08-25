# PR-M3-SEC-02 — Public Surface Security Evidence

## Execution identity

```text
STAGE = PR-M3-SEC-02
BASE_MAIN = 2072e7cc97cd2583feb6d7e3acae169c173d86e5
BASE_TREE = 05c24a82421ff10134dc1ff8a383d927ab4c56bf
TRACKING_ISSUE = #129
BRANCH = agent/pr-m3-sec-02-public-surface-security-hardening
EXECUTION_MODEL = GitHub-native evidence-driven
```

## Exact changed-path contract

1. `src/lib/public-property-address-projection.server.ts`
2. `src/lib/api/catalogo.functions.ts`
3. `src/routes/imovel.$slug.tsx`
4. `supabase/migrations/20260825213000_pr_m3_sec_02_public_surface_security_hardening.sql`
5. `src/lib/__tests__/public-property-address-projection.spec.ts`
6. `src/lib/__tests__/public-surface-security-sql-structural.spec.ts`
7. `run-pr-m3-sec-02-public-surface-security-specs.ts`
8. `package.json`
9. `.github/workflows/release-gate.yml`
10. `docs/architecture/impact-analysis/PR-M3-SEC-01-public-surface-security-requalification-impact-analysis.md`
11. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-sec-02-public-surface-security-evidence.md`

```text
EXACT_ALLOWLIST_COUNT = 11
BUN_LOCK_BYTE_IDENTICAL = required
NEW_DEPENDENCIES = false
```

## Address-projection evidence

The public property detail invokes a server-only projection before return. The
projection creates a fresh DTO, removes every raw address and visibility field,
and emits only presentation fields owned by the server.

| Mode | Public output | Prohibited output |
|---|---|---|
| `hidden` | neighborhood/city/state approximation | street, number, complement, postal code, exact coordinates, raw flags |
| `street` | dedicated street plus approximate context | number, complement, postal code, exact coordinates, raw address and flags |
| `full` | explicitly authorized complete public fields | raw source fields and visibility flags |

Unknown flags, missing dedicated street authority and inconsistent coordinate
pairs fail closed to `hidden`. Public catalog search retains title/code and
removes `endereco`. The client route consumes only projected fields and cannot
reconstruct visibility from raw values.

## Forward-only migration evidence

The SEC-02 migration is repository-only and transactional. It verifies expected
tables, RLS, restrictive tenant policies, retained administrative policies,
privileged-role grants and required public resolvers before changing metadata.

The intended final state is:

- `events_public_insert` absent;
- anon has no direct privilege on `cms_campaign_events`;
- authenticated has SELECT only on `cms_campaign_events`;
- `corretores self update` absent;
- authenticated has SELECT only on `corretores`;
- `lead_origens public read ativo` absent;
- anon has no direct privilege on `lead_origens`;
- anon cannot execute `user_belongs_to_tenant(uuid)`;
- required host/RLS resolver execution remains available;
- `service_role` and `postgres` privileges remain intact;
- no row DML occurs.

```text
MIGRATION_APPLIED_TO_SAME_BACKEND = false
DATABASE_DDL = false
DATABASE_DML = false
```

## Focused deterministic proof

`run-pr-m3-sec-02-public-surface-security-specs.ts` proves:

- exact 11-path diff and byte-identical `bun.lock`;
- unchanged dependency/toolchain objects;
- hidden, street and full projection behavior;
- raw address and exact-coordinate non-serialization;
- server projection before return;
- public search exclusion of hidden address;
- route consumption of projected fields only;
- exact policy/grant/function SQL contract;
- no row DML, function rewrite or sandbox mutation;
- canonical campaign, broker and lead-source server boundaries retained;
- FVS3, FVS4, FVS5 and FVS6 terminal paths unchanged.

The focused runner is wired into `package.json` and the Release Gate with exact
base-SHA transport. Canonical `verify:release` continues to execute PRM3-P0A,
architecture gates, PSG, PTW, PR-M2, DCA, builds, typecheck and lead suites.

## Prohibitions and zero-write evidence

```text
SAME_BACKEND_APPLICATION = false
AUTH_MUTATION = false
STORAGE_MUTATION = false
TENANT_MEMBERSHIP_DOMAIN_MUTATION = false
PROVIDER_WRITE = 0
SECRET_MUTATION = false
DEPLOY = false
PRODUCTION_PUBLISH = false
PRODUCTION_CUTOVER = false
ROADMAP_UPDATE = false
PR_105_MERGE = false
```

## Terminal acceptance criteria

Repository acceptance requires all checks on one exact PR head, squash merge,
post-merge main requalification and Release Gate success. PR/CI metadata is the
authority for the resulting implementation head and terminal run IDs.

After acceptance, PR-M3-SEC-03 is emitted. SEC-03 alone may apply the migration
to the Same-Backend under explicit DDL authorization; it must preserve row
counts and produce post-application evidence before any Lovable environment
reconciliation.
