# Round64 — CRM projection and RBAC profile read isolation

Owner refresh after PR255 reports two visible warnings: RBAC profile names across
tenants and 0028. This is owner-supplied scanner evidence, not independent proof
of absence of every other vulnerability. Do not reapply Round63.

## Changes

listTenantLeadAssignees (also exported as adminListarLeadAssignees) now selects
and returns only id, user_id, nome, sobrenome and email. CRM consumers use the
identity for assignment and names for display; CrmOperationsPanel uses email as
a missing-name fallback. CPF, phone, WhatsApp, photo, CRECI, bio, slug, status,
team and cargo are no longer fetched/returned by this selector. The query still
requires active brokers, resolved tenant, permitted assignee IDs and the existing
lead.assign authorization. The full broker directory with access_control/gerenciar
is unchanged. This is not a claim that all broker PII policies are resolved.

Live catalog confirmed rbac_profiles read auth uses true, and admin write is a
permissive ALL policy. A restrictive SELECT policy is necessary to constrain both.
It allows resolved tenant profiles plus global system templates (sistema=true,
tenant_id IS NULL), rejects unresolved/anonymous/Super context, and preserves
existing policies. Unclassified null-tenant and foreign profiles remain hidden,
including foreign rows marked sistema. No new Super tenant-access exception.
Existing mutation policies are not redesigned by this SELECT correction; this is
not a full RBAC write-path audit. No business row changes.

## Verification

The real CRM handler and its real authorization functions are bundled with
controlled Supabase/RPC boundaries. Tests exercise own/team/global scopes,
foreign tenant filtering, minimal response despite a fixture containing PII,
email fallback, permission denial before data access, Super and impersonation
denial. Native PostgreSQL tests verify both permissive policies cannot bypass
SELECT scope, own/system visibility, foreign/unclassified denial, revoked
membership, anonymous/unresolved/Super denial and service-role continuity.
Existing policies are compared unchanged; reapplication is tested in isolation.
The remaining CI checks cover compatibility/typecheck and theme/navigation.
Public UI homologation and refreshed scanner results remain separate evidence.

## 0028 — prepared request to Lovable support (not sent)

Subject: Lint 0028 provides no affected-function identities

Project: RM Prime SaaS, 982b91d8-946d-4103-8eb3-40ddbaeedbf4.
The Security screen reports Public Can Execute SECURITY DEFINER Function.
Expanding the finding, Read finding details and Reference in chat provide only
the generic summary/documentation; the owner has verified all three paths.
Please provide the finding-specific function schema, name, identity argument
signature, owner, effective EXECUTE grants for anon (including PUBLIC or inherited
grants), and the scanner timestamp/revision. If the UI is omitting this metadata,
please confirm the supported way to retrieve it. We are not requesting automatic
fixes, risk acceptance, blanket revocation, code changes or a deployment.
No credentials or tenant/business records are needed.

Earlier provider refusal is respected. No repeated agent request, alternate
scanner or raw API workaround. The historical 0029 ignore (24 June 2026) followed
prior agent advice and does not cover 0028. No new warning is suppressed.

After application, the owner can refresh the Basic scan in the project Security
view and provide the resulting findings. Do not infer publication or security
approval from the Publish button. No deployment requested here. Data, users,
ownership, menu, theme and roadmap remain unchanged.
