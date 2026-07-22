# Portal DLQ Retry — Operator Runbook

## Security contract

The endpoint accepts only:

```text
Authorization: Bearer <PORTAL_DLQ_RETRY_SECRET>
```

The server reads `PORTAL_DLQ_RETRY_SECRET`, requires exactly one Bearer credential, compares SHA-256 digests with constant-time equality, and denies all requests when the server secret is missing or empty.

The following are not authorization mechanisms:

- `SUPABASE_PUBLISHABLE_KEY`;
- `apikey`;
- `CRON_SECRET`;
- `x-cron-secret`;
- query-string or request-body secrets;
- signed URLs;
- client tenant identifiers.

## Secret generation and configuration

1. Generate a high-entropy random secret using the organization-approved secret manager or cryptographic generator.
2. Store it only in the environment secret store under `PORTAL_DLQ_RETRY_SECRET`.
3. Configure the external scheduler, when one is formally selected, to send the standard `Authorization` header.
4. Never commit, log, print, e-mail, or place the value in an issue, runbook, screenshot, URL, query parameter, or request body.
5. The repository does not create or infer a scheduler/provider. Homologation enablement requires separate operator evidence of the selected caller and its supported header transport.

## Negative verification

Before enabling replay, confirm all cases:

```text
missing server secret       -> 401
missing Authorization       -> 401
wrong authentication scheme -> 401
multiple credentials        -> 401
wrong secret                -> 401
publishable-key header      -> 401
legacy x-cron-secret        -> 401
query/body secret           -> 401
correct dedicated bearer    -> authenticated boundary
```

Authentication denial must occur before service-role import, DLQ reads, connector resolution, replay, retry-state mutation, or observability data containing sensitive values.

## Rotation

1. Pause the external scheduler.
2. Generate and store the replacement secret.
3. Update the scheduler's Bearer credential.
4. Execute the negative matrix and one controlled authenticated invocation.
5. Resume scheduling only after evidence is attached to the homologation gate.
6. Revoke the previous value.

The endpoint deliberately has no dual-secret fallback. Rotation must be coordinated as a controlled cutover.

## Incident response

On suspected exposure:

1. pause the caller;
2. replace the environment secret;
3. inspect invocation and DLQ transition logs without copying credential values;
4. execute the negative verification matrix;
5. document the incident and decision before resuming.
