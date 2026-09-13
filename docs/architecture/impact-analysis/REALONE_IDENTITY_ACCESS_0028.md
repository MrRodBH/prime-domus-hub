# REAL ONE identity, tenant access discovery and alert 0028

Date: 2026-09-13. Audited main: `7d51e2369bd92a6236575cb7783de5c6b255e261`.

## Owner request and minimal contract

The owner confirmed successful password recovery, could not find tenant user/permission management, and explicitly requested separation of REAL ONE platform branding from RM Prime company branding. The owner also supplied the Lovable support response acknowledging an alert-detail grouping defect.

Existing tenant membership and RBAC routes are reused. Administration opens membership management; its first two tabs are Users/access and Profiles/permissions. Invitations remain the only creation flow and are executed by the existing server-authorized membership manager. No user, invitation, ownership, permission, membership, plan, CMS or database row is created/changed by this corrective.

Functional cause found during navigation audit: the legacy `/admin` parent loader discarded child paths/query when redirecting to the canonical tenant URL. Thus links to `/admin/memberships` or `/admin/perfis` returned to the dashboard. Preserve the deep link through the existing safe-return-path validator, prefixing only the slug returned by `meuTenantWorkspace`. A denied resolver still fails closed; the requested path never supplies tenant authority. The regression invokes the actual loader for two tenant fixtures and checks nested pages/query preservation, unsafe paths and resolver failure.

Platform identity is presentation only, scoped by the existing authenticated `isSuperAdmin` result (or platform auth/recovery view), not by an untrusted tenant slug. Tenant authority, protected routes, API contracts and the eight direct platform navigation entries remain unchanged. No CMS-backed global theme, alternate tenant resolver, demonstration metrics or new auth provider is introduced.

Historical references were recovered to REAL ONE, `/demonstracao` and `/design-system`, including petroleum/coral and multicolor chart tokens. No exact approved burgundy token or original REAL ONE logo asset was recovered. The compact REAL ONE wordmark and orange #c2410c, burgundy #881337, petroleum #123f47 implementation follows the current owner clarification; it is not represented as a pixel-identical restoration. Tenant theme tokens and existing charts remain intact. Authenticated visual acceptance remains separate from automated tests.

## Read-only database evidence

Connected project: `982b91d8-946d-4103-8eb3-40ddbaeedbf4`, existing Supabase `stmcnvzuzlyqammyycxj`. Catalog inspection found 157 public SECURITY DEFINER functions, 13 executable by authenticated, **5 executable by anon**. `ANON_SECURITY_DEFINER_20260913.json` contains those five exact signatures, ACLs, settings and definitions. All five are owned by postgres, STABLE, and executable by postgres, anon, authenticated and service_role; PUBLIC is not present in their explicit ACLs. This is not the official advisor output and does not dismiss the warning.

| Function | Observed behavior | Per-function assessment |
|---|---|---|
| get_canonical_redirect_for_active_alias(text) | Exactly one active/enabled alias and canonical in the same tenant and generation | Intentional public redirect dependency in tenant.server.ts. Preserve until a tested equivalent exists. |
| resolve_public_tenant_by_host(text) | Resolves active/enabled domain and canonical relation, returns tenant/domain metadata | Intentional public website dependency in tenant.server.ts. Inspect public exposure contract; blanket revoke breaks resolution. |
| get_current_tenant_id() | Null auth.uid returns null before reading tenant header; active membership checked, ambiguous membership rejected, Super Admin returns null | Anonymous invocation appears unnecessary for direct RPC, but policies use this helper. Changing execution mode/grants requires policy dependency tests first. |
| is_super_admin() | Membership-independent platform role lookup for auth.uid; null uid does not match a role | Shared policy helper; anonymous result is false. Review grants with policy dependencies before any revoke. |
| resolve_public_tenant_by_slug(text) | Returns id/slug/name for exact slug with LIMIT 2, without publication, tenant status or technical classification filters | Priority review: guessed slugs can disclose tenant metadata, including unpublished/technical entries. No application callsite found in current src; absence there is not proof there are no external consumers. Define intended public metadata and inspect consumers before a targeted correction. |

197 public policies reference get_current_tenant_id/is_super_admin in USING or WITH CHECK, including policies applicable to anon. This rules out treating SECURITY INVOKER or bulk grant removal as a safe mechanical fix. No business-row enumeration or anonymous exposure exploit was performed; conclusions above derive from catalog/definition inspection, not evidence of a breach.

The supplied support email confirms the display defect on Lovable's side; this audit independently confirms the relevant effective execution grants, not the UI defect's implementation. Supabase's [official functions documentation](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker) distinguishes invoker/definer and documents function privileges and search_path. Elevated execution is not automatically an exploitable leak: callable roles, body guards, returned data and intended public contract must all be assessed.

## Validation and delivery boundaries

Extend actual navigation/auth DOM regressions to verify platform wordmark versus tenant logo, eight platform links, direct tenant users/profile navigation and preserved login/recovery. Run TypeScript/build and existing scoped release, tenant access/security and website tests. Do not send real invitations or emails. Production smoke is limited to public/auth redirects without an authenticated operator session; tenant invitation acceptance and permissions mutation are not claimed as production-tested.

No SQL migration, ACL/RLS modification, alert suppression, Cloudflare/DNS/domain change or support email is part of this work. Alert 0028 remains an explicit per-function remediation backlog, with slug metadata exposure the first review item. Source/build verification and deployment outcome are recorded on the PR.
