# DCA-01 — Cloudflare Credential Incident Runbook

## Trigger conditions

Use this runbook when a Cloudflare API token may be exposed, unavailable, over-permissioned, revoked or associated with unexpected provider objects.

## Non-negotiable controls

- The database stores only references matching `env:VARIABLE`.
- Plaintext tokens are prohibited in database rows, configuration snapshots, client payloads, CI output, audit events and application logs.
- Never test a suspected token through a client-visible endpoint.
- Tenant-scoped remediation requires explicit impersonation; global account disablement remains a global Super Admin operation.

## Immediate containment

1. Disable the affected provider account through the audited global operation.
2. Stop new provider jobs for that account by preserving the disabled state; do not switch affected domains to `manual_assisted` silently.
3. Revoke the token at Cloudflare through an authorized out-of-band administrator.
4. Preserve sanitized job attempts, audit events and provider identifiers.
5. Search logs and CI artifacts for plaintext values without copying any discovered value into the incident record.

## Rotation

1. Create a least-privilege replacement token outside the application.
2. Store it in the approved runtime secret store.
3. Create or update an environment variable with a new reference name when practical.
4. Invoke the audited credential-reference rotation using only `env:VARIABLE`.
5. Re-enable the provider account explicitly.
6. Run a health check and exact-hostname observation before allowing new provisioning.

## Domain reconciliation

- Reconcile each affected current generation.
- Confirm provider object ownership through `tenant_id`, `domain_id` and `generation` custom metadata.
- Treat missing, duplicated or mismatched objects as fail-closed provider configuration errors.
- Active domains with incomplete evidence must transition to `degraded`; recovery requires the complete active predicate.

## Unexpected provider objects

1. Do not delete by hostname alone.
2. Require exact hostname cardinality and persisted provider-binding identity.
3. Confirm custom metadata belongs to the authoritative tenant/domain/generation.
4. Quarantine ambiguous objects for manual investigation.
5. Remove only objects whose identity and generation are proven.

## Closure criteria

- old token revoked;
- no plaintext secret retained in repository, logs or evidence;
- replacement reference audited;
- provider account explicitly re-enabled or intentionally disabled;
- current-generation reconciliation completed;
- affected domains have correct `active`, `degraded`, `failed`, `removal_pending` or `revoked` states;
- incident evidence contains sanitized identifiers only.
