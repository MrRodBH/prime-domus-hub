# Round61 — publication security findings

Owner supplied the expanded scanner findings and authorized targeted correction.
The ignored 0029 finding dates to 2026-06-24 and was ignored on an earlier agent's
instruction. This is not an owner error or acceptance of the distinct 0028
anonymous execution finding. No warning is suppressed by this delivery.

## Secretaria read policies

Catalog evidence obtained before the scanner refusal showed restrictive
tenant_isolation and round57_no_super_operation policies on both corretores and
imoveis. The scanner itself acknowledges this protection. Its titles do not
demonstrate cross-tenant disclosure. The authorized SQL adds the tenant equality
to the two permissive secretaria SELECT predicates as defense in depth.

The SQL requires RLS enabled and the expected policy types/roles and restrictive
policies to exist, otherwise the transaction fails. It changes only two USING
expressions; no roles, grants, rows or restrictive policies are changed. Repeated
application is safe. Native isolated PostgreSQL tests cover own-tenant reads,
foreign/malformed/missing context, revoked membership and Super Admin denial.
They also preserve restrictive expressions and exercise the inline check after
temporarily removing tenant_isolation only inside a rolled-back test transaction.

## Storage review — not declared resolved

Current application flow is intent -> createUploadTarget -> service-only
register_tenant_upload_target -> browser Storage upload -> consume target and
persist final metadata. The ledger binds actor, tenant, domain, path and expiry.
The registration function calls resolve_tenant_permission. The consumer checks
pending state, actor, origin, expiry, object existence and consumes atomically.
Sources: src/lib/api/uploads.functions.ts; src/lib/storage/upload-contract.ts;
supabase/migrations/20260803183000_pr_m2_storage_provenance_and_crm_attachment_corrective.sql.

| Flow | Resource before upload | Update behavior |
| --- | --- | --- |
| Property images | Property ID; metadata registered after upload | New path, upsert false |
| Launch cover/gallery/PDF | Launch ID; path uses slug and variant | New path; gallery/PDF consumers currently fail closed in lancamentos.functions.ts |
| CRM attachment | Lead ID and CRM permission/scope | New path, upsert false |
| Broker photo | Broker ID, access-control permission | New target then photo association |
| Media library | No media row yet; pending ledger | Metadata after upload, including derivatives |
| Blog/CMS | Target can precede final post/page metadata | Some components use upsert true |

The existing prefix/membership Storage policies are not equivalent to validating
the ledger or resource permissions. Arbitrary paths within one's tenant are a
different concern from cross-tenant isolation. A safe successor must bind inserts
to a valid pending target and recheck current permission; updates need USING and
WITH CHECK, select needed for upsert, and immutable tenant/resource destination.
Existing registered objects need an explicit read/update/delete authorization
path after targets are consumed/expired. A blanket final-metadata join would
break initial uploads and CMS; a pending-only rule would break existing reads.
Do not add a second bypass policy alongside the permissive prefix rules.

No Storage policy is changed here: the concrete review is complete, but a full
Storage correction and compatibility validation are not claimed. Do not reopen
unrelated launch backlogs as part of the two secretaria policy changes.

## 0028 — specific functions still required

The supplied screenshot names the linter, not function identities/signatures.
The Lovable scanner-details request was refused by its content policy (message
umsg_01m240xh40fjsaj03tv1pjh46m). This refusal is not bypassed using another
scanner/channel. The minimum missing evidence is the function list/signatures
from the finding detail, supplied by the owner.

Repository review identifies queue callers in src/lib/email/notify.server.ts,
src/routes/lovable/email/auth/webhook.ts, email/queue/process.ts and
email/transactional/send.ts. Migration
20260622205656_3c77471a-84d7-4996-bf71-52dab98ddb12.sql already revokes PUBLIC,
anon and authenticated from enqueue_email(text,jsonb),
read_email_batch(text,integer,integer), delete_email(text,bigint) and
move_to_dlq(text,text,bigint,jsonb), granting service_role. This is source history,
not proof of present grants or that these functions caused 0028. No global
EXECUTE revoke and no change to has_role or other RLS helpers is authorized by
this evidence alone. Fixed search_path is not caller authorization.

## Delivery boundary

Record CI, merge and SQL application independently in the PR. Source release
identity remains unaffected because only SQL/tests/documentation changed.
Publish is not declared unblocked: Storage and 0028 are unresolved, no new
scanner result or publish success exists. No customer registrations, ownership
transfers, roadmap, navigation or theme changes. Owner public validation of
ViaCEP/platform accounts remains separate from controlled security tests.
