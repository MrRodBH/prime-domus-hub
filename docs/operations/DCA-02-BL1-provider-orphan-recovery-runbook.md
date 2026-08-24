# DCA-02-BL1 — Provider Orphan Recovery Diagnostic Runbook

## Preconditions

1. Confirm DCA-02-BL2 exact-head repository proof is terminal SUCCESS.
2. Confirm the caller is authenticated and has exactly one global `super_admin` role.
3. Confirm no tenant/domain/provider identity header is present.
4. Confirm the request body contains only one canonical `domain_id`.
5. Confirm this execution is dry-run: no adoption, bind, update, cleanup, delete or provider-create retry.

## Request

```http
POST /api/internal/dca-02-provider-orphan-recovery
Authorization: Bearer <authenticated user token>
Content-Type: application/json

{"domain_id":"<uuid>"}
```

Tokens are never copied into evidence. The operation resolves tenant, domain hostname, generation, provider account, zone and existing binding from server-owned storage. It performs exactly one provider list GET filtered by the server hostname. Hostname search is collision evidence only; exact object IDs are the diagnostic anchor.

## Interpret outcomes

- `no_candidate`: provider returned no exact candidate; do not recreate automatically.
- `orphan_candidate_single`: one exact ID is evidenced; no action is authorized.
- `ambiguous_candidates`: more than one exact candidate; fail closed.
- `already_bound`: candidate and persisted exact ID agree; no orphan action exists.
- `bound_object_missing`: persisted exact ID was not found; fail closed.
- `binding_candidate_conflict`: provider and ledger IDs differ; fail closed.
- `binding_state_unresolved`: persisted ledger is ambiguous; fail closed.

HTTP 409 denotes a conflict/ambiguity requiring a future audited decision. Retrying provider create, switching execution mode, or accepting a client/operator object ID is prohibited.

## Evidence

Persist the exact repository head/tree, route response without credentials, audit event, candidate cardinality, exact provider object IDs, generation, evidence SHA-256 and all local/remote gate results. The diagnostic qualification itself does not call the live route and therefore performs zero provider/API/database mutation.

## Future provider-write envelope

Any adoption/bind/cleanup/delete must separately specify one exact object ID, tenant/domain/generation/account/zone tuple, pre/post snapshots, compensating action and provider/database write ledger. It must never broaden from one candidate to hostname order, metadata, first row, retry or fallback.
