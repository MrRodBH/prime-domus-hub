# Round62 — Storage operation authority

Continuation of PR253. Its secretaria policies are not reapplied. Owner supplied
a documentation link with lint=0029_authenticated_security_definer_function_executable;
this is not the project-specific 0028 function list. Web reader refused that URL;
no alternate fetch or provider-scanner bypass was attempted. 0028 signatures and
the scanner recheck remain dependent on evidence supplied by the owner.

## Authorization

Four restrictive policies are ANDed with the existing authenticated Storage
policies and the existing Super Admin denial. No new permissive policy or grant
widens access. A non-exposed schema rm_storage_auth contains a SECURITY DEFINER
boolean helper, with empty search_path, qualified relations and caller-derived
auth.uid/get_current_tenant_id. PUBLIC/anon cannot execute it. Authenticated may
execute this RLS helper; it exposes no rows, credentials or actor parameter.
The existing 0029 acceptance is not generalized and no existing function's
EXECUTE privilege is changed. Service-only server Storage operations remain as
before; this correction addresses the direct authenticated Storage path.

Every call rejects anonymous/unresolved tenant, Super Admin, malformed namespace
or an unsupported bucket/path. Resource ID or launch slug must belong to the
resolved tenant. Namespace determines the domain; a caller-supplied domain cannot
reinterpret a CRM file as public media. Invalid UUID text fails closed.

Pending upload requires the exact server-issued target (tenant/bucket/path/domain/
entity), matching actor, unexpired pending state and a non-impersonation origin.
Current permission is re-evaluated through resolve_tenant_permission. CRM also
uses crm_scope_allows_lead; CMS operations require global scope, as current CMS
server boundaries already do. Broker photo uses access_control/gerenciar.

SELECT of a pending target is allowed for its authorized creator to support
upload retries. UPDATE additionally needs edit permission. INSERT into a new
path requires a pending target; INSERT/upsert into a registered path requires
edit permission. The latter preserves replacement after targets are consumed.
DELETE needs delete permission (broker management uses gerenciar). A BEFORE
UPDATE trigger prevents authenticated clients from changing bucket or name;
updating object bytes/metadata at the same destination remains allowed.

## Registered resource mapping

| Namespace | Durable evidence after pending expires |
| --- | --- |
| imoveis / property ID | Existing property plus image row URL or cover path |
| lancamentos / slug / variant | Existing launch plus cover, image or PDF path |
| site / media | Media-library original, medium or thumbnail path |
| site / corretores / ID | Existing broker with matching photo path |
| site / crm / lead ID | Existing lead and CRM attachment bucket/path |
| site / blog | Blog cover path; inline path referenced in stored content |
| site / sobre or anuncie | Path referenced in CMS blocks/site settings |

Consumed server-issued inline/CMS targets also retain durable asset provenance
where these flows do not create a separate media row. HTML/JSON legacy references
are recognized by path presence in tenant content; no raw HTML/JSON is returned.
These content scans are tenant-filtered compatibility paths, not claimed O(1)
lookups. Orphan/unregistered files receive no direct-client fallback based only
on a folder prefix. Existing service-authorized signed URL paths are unchanged.

## Native verification and application

The existing PostgreSQL CI runs tests/round62/storage.mjs in its own database.
It exercises all ten upload domains, new upload and upsert retry before metadata,
registered reads/upserts after consumption/expiry, cross-tenant and pending-actor
denials, expired/mismatched target, revoked permission/membership, Super Admin,
immutable path, deleted parent, authorized delete and service-role bypass.
RBAC decisions in that fixture are controlled dependencies; this is not public
browser acceptance or a complete live RBAC audit. Existing restrictive and
permissive expressions are compared before/after. Reapplication is exercised.

Apply only the committed SQL after final-head checks, then verify policy catalog,
private helper ACL/search_path and trigger presence. No business rows, user roles,
ownership, menu/theme or roadmap changes. Do not claim the scanner cleared or
Publish unblocked without a new provider/owner result. No frontend redeploy is
needed for this database-only correction; the approved source hash is unchanged.
