# Company first, independent initial administrator

Owner instruction: company registration precedes administrator registration regardless of sales origin. This change replaces the live new-company dialog's dependency on an existing Auth owner. It retains existing tenant ownership and the prohibition on Super Admin tenant operation.

## Behavior
1. Super Admin registers company name, slug and sale origin/reference. An idempotency UUID prevents duplicate company creation when a response is retried. No Auth identity or membership is created in this step. A new company's owner remains unassigned; existing companies are never recreated.
2. The company editor retains all existing fields and persistent plan selection. Saving opens the independent Admin setup. The same action is available on the existing company row.
3. Super Admin enters the intended Admin name/email. Service-only SQL rechecks actor, customer classification, active company/plan, any prior non-Super owner/Admin (including suspended/revoked) and optimistic invitation revision. It reserves an expiring invitation before calling Auth. It cannot replace an existing operational Admin or recover revoked memberships.
4. A new/unconfirmed identity receives the official Auth invitation. Delivery failure is stored and retryable after one minute; nothing is deleted as compensation. A confirmed existing identity uses its own login; no password reset or false email-sent message.
5. After email confirmation and password setup/login, pending activation appears in Invitations. Service-only SQL matches the current verified Auth identity to the current unexpired invitation. Under a tenant lock, it inserts exactly one non-owner Admin membership and tenant-scoped assignments to the existing system Admin profile and a tenant-owned access-management profile, then records activation. Concurrent/repeated acceptance is idempotent. Revocation never becomes reactivation through replay.

The initial Admin is a foundational setup grant; ordinary member growth remains behind existing invitation/seat controls. No plan entitlement, real user, owner, UUID or commercial record is seeded by this implementation. Sales-platform provenance is recorded in the same company-first flow; a payment-confirmation webhook is not invented or claimed.

## Validation
- Actual server-handler test covers authority before privileged calls, preparation before email delivery, normalized identity, server-derived actor/redirect, existing-account preservation, provider failure and rejection of injected role/redirect.
- Controlled DOM covers company-first sequence, independent editable Admin fields, retained fields on send failure, truthful existing-account status and read-only completed setup.
- Native PostgreSQL CI exercises positive and negative calls, service-only grants, two sale origins, verified-email acceptance, foreign/Super/unconfirmed/expired/replaced/revoked rejection, concurrent/replayed acceptance, scoped RBAC assignment and retained existing ownership.
- Existing integrated company/plan persistence, login/logout, governance and navigation checks remain enabled. Their transport fixtures explicitly isolate this new API; dedicated setup tests cover its real handlers.

## Homologation
In Tenants, select the existing company → save its complete data with an active plan → Configure Admin → enter the actual intended operator. For a new identity, open its Auth invitation and define a password; for an existing confirmed identity, use its normal login. Accept company activation, verify company workspace, logout/login and verify the same company access. This procedure must be performed with the chosen real mailbox, not an agent-invented account.

0028 remains an unresolved separate support item. No catalog workaround, historical EXECUTE change, suppression, extension removal or ownership transfer is part of this change. CI/deployment/live results are recorded in the associated PR; this document does not claim they passed before execution.

Runtime privilege check found service_role has auth schema USAGE but no SELECT on auth.users. The two new identity-checking routines therefore use SECURITY DEFINER with fixed search_path, explicit actor/tenant/identity authorization and EXECUTE revoked from PUBLIC/anon/authenticated in the same creation transaction. Company registration stays SECURITY INVOKER. Native fixture reproduces denied direct Auth reads. No broad Auth table grant or existing function ACL change.

Additional live dependency found: access_control was missing from the module catalogue, although server authorization requires it. The migration adds that catalogue entry only. Activation creates a tenant-owned access-management profile with gerenciar/global (global inside that tenant), assigned solely to the verified first Admin. Existing global profiles and their grants remain unchanged. The native test verifies the second tenant receives no assignment.
