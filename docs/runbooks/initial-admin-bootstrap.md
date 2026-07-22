# Initial Administrator Provisioning — Operator Runbook

## Purpose

Provision the first platform administrator without exposing a public HTTP route, server function, deploy-secret endpoint, tenant fallback, or application-runtime bootstrap authority.

## Preconditions

- Operator has authorized access to the canonical Supabase project dashboard or an equivalent audited administrative console.
- Target environment is confirmed explicitly.
- No application client credential, publishable key, browser session, URL parameter, request body, or tenant header is used as authority.
- The operator records the change ticket, environment, timestamp, acting identity, and resulting user identifier.

## Procedure

1. In Supabase Auth administration, create or identify the intended administrator account.
2. Require a verified e-mail address and a credential-delivery process approved for the environment.
3. Record the immutable Auth user identifier.
4. In the database administrative console, insert the global role only after confirming that the identifier belongs to the intended account:

```sql
insert into public.user_roles (user_id, role)
values ('<AUTH_USER_UUID>', 'admin');
```

5. Treat a uniqueness conflict as an existing assignment. Do not select an arbitrary user or role row.
6. Verify the exact assignment:

```sql
select user_id, role
from public.user_roles
where user_id = '<AUTH_USER_UUID>'
  and role = 'admin';
```

7. Confirm that exactly one expected row is returned. Zero or multiple unexpected results require immediate stop and investigation.
8. Store only the audit metadata required by the organization. Do not place passwords, access tokens, service-role keys, recovery codes, or secret values in tickets or repository files.

## Prohibitions

- Do not recreate `/api/public/bootstrap-admin`.
- Do not recreate `bootstrapAdmin` as a TanStack server function.
- Do not add a shared-secret bootstrap endpoint.
- Do not use `ORDER BY`, `LIMIT 1`, first-row selection, default tenant, or e-mail similarity as identity authority.
- Do not allow Super Admin tenant access without explicit impersonation.

## Verification and rollback

If the role was assigned to the wrong user, remove only the exact mistaken tuple after preserving audit evidence:

```sql
delete from public.user_roles
where user_id = '<WRONG_AUTH_USER_UUID>'
  and role = 'admin';
```

Re-run the exact verification query. Any ambiguity remains fail-closed and must be escalated before homologation.
