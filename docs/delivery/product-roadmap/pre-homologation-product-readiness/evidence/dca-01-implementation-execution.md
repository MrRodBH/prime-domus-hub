# DCA-01 — Domain & Cloudflare Activation Implementation Evidence

## Status

**Implementation in progress — principal draft PR validation pending**

```text
STAGE_ID = DCA-01
IMPLEMENTATION_BASELINE_MAIN = 623f94f98174478af19b130cda9896c64f256f14
IMPLEMENTATION_BRANCH = agent/dca-01-domain-cloudflare-activation
IMPLEMENTATION_PR = pending creation
AUTO_MERGE = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
REAL_SECRET_USED = false
PRODUCTION_CUTOVER_EXECUTED = false
BCA01_STATE = Planned — Blocked by DCA-01
PRM3_STATE = Planned — Blocked by BCA-01
```

## Materialized repository scope

The branch materializes the accepted DCA-01 lifecycle through one forward migration, server-only domain authority modules, an official embedded PSL snapshot, tenant and global command surfaces, a narrow Cloudflare adapter, public active-domain resolution, canonical redirect before SSR and a platform-native scheduled executor.

Additional subordinate files below `src/lib/domains/` are implementation-time impact consequences of the accepted Definition of Done:

- generated Public Suffix List snapshot segments;
- split server-only repository modules preserving one exported repository boundary;
- deterministic legacy-import manifest builder required because SQL may not infer PSL/IDNA authority.

They do not create a new architectural decision, a second domain authority or a new stage.

## Current deterministic evidence

```text
PSL_VERSION = 2026-07-25_14-20-03_UTC
PSL_SOURCE_COMMIT = e1b8015c3b2f0f4f8c18659c2480fc1a22c07b20
PSL_RULE_COUNT = 10239
PSL_DUPLICATE_COUNT = 0
REQUEST_TIME_DUAL_AUTHORITY = false
CLIENT_TENANT_AUTHORITY = false
CLIENT_STATUS_AUTHORITY = false
CLIENT_PROVIDER_SUCCESS_AUTHORITY = false
PLAINTEXT_PROVIDER_SECRET_STORAGE = false
PUBLIC_HTTP_JOB_TRIGGER = false
```

The exact branch Release Gate is the authority for the final assertion count, typecheck and build status. Earlier local assertion counts are development evidence only and are not terminal acceptance evidence.

## Migration boundary

The single migration is:

```text
supabase/migrations/20260804180000_dca_01_domain_cloudflare_activation.sql
```

It creates the closed domain schema, RLS-enabled tables, explicit grants and server RPCs. A server-generated legacy import manifest is mandatory when `tenants.dominio_principal` contains non-empty values. The migration validates exact tenant cardinality, normalized-host uniqueness and a SHA-256 binding to each legacy source value. It does not derive registrable domains heuristically in SQL.

The migration has been committed to the implementation branch but has not been applied to a managed database.

## External operations

No external operation has been executed. The following remain separate gated proof work after repository acceptance and protected merge:

- controlled migration application;
- non-production DNS proof;
- Cloudflare Custom Hostname creation or observation;
- SSL observation;
- activation, degradation and recovery;
- atomic replacement;
- removal and cleanup;
- exact-release cutover preflight.

Production cutover remains unauthorized.
