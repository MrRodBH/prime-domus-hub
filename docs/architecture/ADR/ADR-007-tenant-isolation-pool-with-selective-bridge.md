# ADR-007 — Tenant Isolation: Pool with Selective Bridge

## Status
Proposed

- **Date:** 2026-08-22

## Context

RM Prime SaaS currently uses one shared Supabase project, one PostgreSQL
database and one shared schema. Tenant-owned records carry an explicit
`tenant_id`, while Row Level Security (RLS), explicit grants and server-side
authorization boundaries enforce isolation. This is the **Pool** deployment and
persistence model.

The Pool model must not be confused with the immutable per-request tenant
snapshot required by the Architecture Constitution. That snapshot is an
in-process authority invariant; it does not create a separate database,
schema, Worker or deployment for each tenant.

Without a recorded tenancy decision, environment work and future scale choices
could introduce implicit routing, client-selected authority or an accidental
mix of Pool, Bridge and Silo semantics. This ADR formalizes the current model
without changing runtime code, schema, migrations, RLS policies or provider
resources.

## Decision

The current authority is:

```text
TENANT_ISOLATION_MODEL=POOL
DATABASE_MODEL=SHARED_DATABASE_SHARED_SCHEMA_WITH_TENANT_BOUND_ROWS
TENANT_AUTHORITY=SERVER_RESOLVED_FAIL_CLOSED
ROW_ISOLATION=RLS_PLUS_EXPLICIT_GRANTS_AND_SERVER_BOUNDARIES
SELECTIVE_BRIDGE=FUTURE_ADR_AND_IA_REQUIRED
SILO=NOT_CURRENT_MODEL
```

The following rules are normative:

1. Tenant identity is resolved and revalidated server-side and fails closed
   when absent, ambiguous, inactive or unauthorized.
2. Headers, client state, hostnames, query parameters and provider metadata may
   transport a tenant candidate but never establish tenant authority.
3. Tenant-bound tables use explicit `tenant_id` relations and RLS. Grants and
   server boundaries remain least-privileged and auditable.
4. `service_role` bypass is restricted to controlled server-side code. It must
   use an already resolved tenant scope, must not be exposed to the client and
   must leave an auditable operation boundary.
5. No automatic routing, hostname heuristic, client choice, dual authority or
   silent fallback may switch a tenant from Pool to another isolation model.
6. Silo is not the current model and is not authorized by this ADR.

A selective **Bridge** may be proposed for an individual tenant only when a
new impact analysis and a new ADR provide evidence for at least one of these
criteria and define the exact isolation boundary:

- a documented regulatory or data-residency obligation naming the required
  jurisdiction and data classes;
- a signed contractual requirement for dedicated data isolation;
- tenant-specific restore objectives whose measured RPO/RTO cannot be met by
  the Pool backup and restore design, supported by recovery-drill evidence;
- dedicated encryption or key-custody requirements with an identified KMS and
  operational owner;
- a measured noisy-neighbor or SLO breach, expressed through agreed p95/p99,
  saturation or availability indicators across at least three consecutive
  observation windows after Pool remediation has been attempted;
- a workload threshold defined by a capacity assessment and approved together
  with the new impact analysis and ADR.

Meeting a criterion starts an architecture review; it does not automatically
authorize Bridge. The successor ADR must define provisioning, routing,
identity, migrations, backup/restore, observability, failure handling,
rollback and return-to-Pool rules without creating dual authority.

## Consequences

**Positive**

- The deployed model is explicit and matches the current shared database and
  shared schema.
- RLS and server-resolved tenant authority remain the primary isolation
  boundaries.
- Operational cost and schema evolution remain centralized for the normal
  tenant population.
- Exceptional isolation has auditable, measurable entry criteria.

**Negative / trade-offs**

- Pool shares database capacity and blast-radius controls, so noisy-neighbor,
  restore and residency requirements require continuous measurement.
- `service_role` code needs stricter review because it bypasses RLS.
- A future Bridge tenant adds provisioning, migration, monitoring, recovery and
  lifecycle complexity and cannot be introduced as a transparent fallback.

**Neutral**

- This ADR changes no schema, migration, route, runtime, provider binding,
  deployment or production state.
- Existing tenant snapshots, RLS policies, grants and server authorization
  contracts remain binding and are not redefined here.

## Alternatives Considered

### Bridge as the default model

Rejected. The current repository and provider topology do not operate one
isolated data boundary per tenant, and default Bridge would add lifecycle and
recovery complexity without a demonstrated requirement.

### Silo per tenant

Rejected for the current stage. Dedicated full-stack deployments per tenant
would multiply release, secret, observability and recovery surfaces. A future
Silo proposal requires its own impact analysis and ADR.

### Implicit hybrid selection

Rejected. Hostname, client input, tenant size or provider metadata cannot
silently choose an isolation model because that would create non-auditable dual
authority and unsafe fallback behavior.

### Leave the model undocumented

Rejected. The absence of a canonical decision makes environment and tenancy
changes prone to contradictory assumptions.

## References

- [Architecture Constitution](../ARCHITECTURE_CONSTITUTION.md)
- [ADR governance and index](./README.md)
- [ADR-005 — Commercial Domain](./ADR-005-commercial-domain.md)
- [ADR-006 — Billing Provider Abstraction](./ADR-006-billing-provider-abstraction.md)
- [Canonical tenant resolver](../../../src/integrations/supabase/tenant-middleware.ts)
