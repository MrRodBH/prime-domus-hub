# DCA-01 — Domain Activation Operator Runbook

> Superseding owner decision 2026-09-13: use [DOMAIN_AUTOMATION_ROLLOUT.md](DOMAIN_AUTOMATION_ROLLOUT.md) and the Supabase automation ADR. Domain scheduling is exclusively a secret-authenticated Supabase Edge Function via pg_cron/pg_net. Older Worker scheduling guidance below is superseded. Super Admin impersonation is prohibited.

## Scope

This runbook governs custom-domain activation, reconciliation, replacement and removal. It does not authorize production deployment or provider operations by itself.

## Authority rules

- Tenant identity, lifecycle state, provider account, canonical host and cutover are server-owned.
- `x-tenant-id` is transport and is revalidated by `requireTenant`.
- Super Admin cannot impersonate or operate a tenant. Tenant mutations require the authenticated tenant administrator.
- Client or operator observations request a recheck; they never assert ownership, DNS, provider or SSL success.
- `manual_assisted` and `api_automated` are explicit modes. Provider failure never silently switches mode.

## Before activation

1. Confirm the exact release and migration are approved for the target environment.
2. Build the legacy import manifest with the canonical server normalizer.
3. Verify the manifest has exact legacy-row cardinality and no duplicate normalized hostname.
4. Confirm the provider account uses an opaque `env:VARIABLE` reference and has an explicit registrable-domain-to-zone map.
5. Confirm the sole executor is the dedicated-secret-authenticated Supabase Edge Function; no browser authorization or Worker cron. Follow DOMAIN_AUTOMATION_ROLLOUT.md.
6. Confirm the target is non-production unless a separate production authorization exists.

## Tenant lifecycle

1. Submit a hostname-only request and choose the execution mode explicitly.
2. Publish the server-generated ownership TXT value. The proof value is returned once and is not stored in plaintext.
3. Request verification. The scheduler independently observes DNS and atomically verifies the current challenge generation/version.
4. Apply or observe the required DNS plan.
5. Provision or observe the exact Cloudflare Custom Hostname.
6. Wait for independent provider and SSL observations.
7. Activation occurs only after the complete current-generation predicate is true.

## Degradation and recovery

- Any missing current-generation evidence moves an active domain to `degraded`.
- `degraded → active` requires the entire active predicate to be re-proved.
- A failed operation records a sanitized error and an explicit resume state.
- Retry first executes the explicit recovery transition, then enqueues the deterministic operation for the recovered state.

## Replacement

1. Create a new canonical candidate linked to the active incumbent.
2. Keep the incumbent active while the candidate completes ownership, DNS, provider and SSL checks.
3. The swap transaction retires the incumbent generation first and promotes the candidate in the same transaction.
4. Any transaction failure rolls back both effects.
5. After commit, the old generation remains `removal_pending`; direct reactivation is prohibited.
6. Cleanup jobs remove provider objects for the retired canonical and aliases.

## Removal

1. A removal request immediately transitions the domain to `removal_pending` and disables public authority.
2. Provider cleanup is idempotent and retryable.
3. Successful cleanup transitions to `revoked`.
4. A provider outage must not restore public authority.
5. A cancelled cleanup leaves the domain non-authoritative and requires an explicit retry.

## Cutover

The authoritative resolver cutover may run only after:

- legacy set cardinality is unchanged;
- every legacy tenant has one matching active canonical row;
- ownership, DNS, provider, SSL and reconciliation evidence are current;
- aliases have an active canonical in the same tenant and generation;
- the exact release is separately authorized.

The resolver deployed by DCA-01 contains no request-time legacy fallback. A failed preflight leaves the previously deployed release authoritative.

## Incident handling

- Preserve audit events, jobs and attempts.
- Never paste tokens, credential values or ownership proof values into logs or tickets.
- Disable the provider account explicitly when compromise is suspected.
- Follow `DCA-01-cloudflare-credential-incident-runbook.md` for credential incidents.
