# Round63 — Submission read parity and broker review

## Confirmed source / live catalog evidence

On 2026-09-09, the owner supplied four scanner warnings and an enabled Publish
button. No publication success or clean scan is inferred. Live catalog read
confirmed form_submissions_tenant_read permits any tenant member. The server
listarSubmissoes instead calls authorizeTenantFormOperation(read), requiring
cms.formularios/visualizar, then uses its server client with tenant filtering.

The committed SQL alters only that permissive SELECT predicate. It requires the
resolved tenant and a private boolean helper delegating to the existing
resolve_tenant_permission. Actor/tenant are derived, never supplied as function
arguments. Super/anonymous/unresolved membership are denied. The read operation
accepts valid proprio/equipe/global scopes just as the server does; this change
must not invent a narrower role list. Existing restrictive policies remain.
The helper grants EXECUTE only to authenticated, has an empty search_path, and
returns no records. No existing function grants or public submission policies
are changed. Catalog drift aborts the transaction.

Native isolated PostgreSQL tests cover same-tenant allowed reads for all valid
scopes, foreign tenant, revoked permission/membership, null/malformed context,
Super denial, anon read denial, valid published-form insertion, draft and
mismatched-tenant insertion denial, unchanged policies and service access.
RBAC dependencies are controlled fixtures, not a complete live resolver audit.
No business rows are created or changed by this migration. Apply after checks.

## Broker field review — no blanket restriction

| Flow | Authority and fields found | Decision |
| --- | --- | --- |
| Broker directory | access_control/gerenciar with global scope; identity, contact, CPF, CRECI, photo and bio | Preserve authorized directory management. |
| CRM assignee selectors | CRM authorization and own/team/global member filtering; UI renders user_id and name; server currently also returns contact/CPF and profile fields | Excess projection identified; needs a dedicated DTO change with callers/compatibility tests, not table-wide column revocation. |
| Dashboard | Broker IDs and tenant/scoped aggregates | Does not establish a need for unrestricted broker PII. |
| Public blog/catalog | Curated public server responses with explicit field selection | Do not expose raw table or change public contracts incidentally. |

The secretaria policy now scopes the tenant (PR253). Its full-row access remains
a separate least-privilege question; this review does not accept that risk or
claim the warning resolved. RLS filters rows, not columns. Revoking SELECT
columns from authenticated affects every application role sharing that database
role and could break legitimate directory/update paths. No such blanket change
is made. PR-M3-SEC-02 explicitly asserts the existing authorized broker policies.

## 0028 evidence boundary and owner guidance

The supplied advisor text contains generic examples (public.my_priv_op and
public.f), not project function identities. The historical 0029 ignore dated
2026-06-24 followed agent guidance; it is not owner error and does not cover 0028.
The prior provider refusal remains respected: no alternate scanner invocation.
The owner can use the visible Reference in chat control to inspect whether it
attaches finding-specific context, without requesting automatic fixes. If it
still exposes only the generic summary, the provider support channel must supply
the finding's schema/function/identity arguments and effective anon grant; do
not ask the owner to repeatedly open the documentation link. No secrets needed.

Official reference: https://docs.lovable.dev/features/security documents the
project Security view and Basic scan refresh. The enabled Publish button is not
proof of scan clearance. No new deployment, UI/menu/theme/roadmap changes,
user changes or ownership transfer. Public functional homologation is separate.
