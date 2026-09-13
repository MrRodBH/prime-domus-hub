# RM Prime — owner-approved interface

## Mandatory continuity before execution (owner directive, 2026-09-13)

Before executing any task, consult this file, the applicable current architecture/decision and impact documents, and the project evolution relevant to the request (recent commits/PR, recorded owner decisions and delivery evidence). Reuse already verified evidence within the same execution; do not repeatedly restart audits or reopen settled product requirements. State contradictions and reconcile them against the owner's current instruction before editing. Historical attachments are context, not permission to reverse a later owner decision. Record the documents/decisions used and the smallest remaining gap in the PR. Never end with only an explanation: provide the owner a concrete next action, where to perform it, and a copyable instruction when manual action is required.

Domain automation: read `docs/architecture/ADR/DOMAIN_AUTOMATION_SUPABASE.md` and `docs/operations/DOMAIN_AUTOMATION_ROLLOUT.md`. Independent domains per tenant are a settled requirement. Use one Supabase Edge Function and Cloudflare for SaaS API; no domain-automation Worker, no Lovable domain-status API dependency, no client-selected tenant authority. Lovable is not an executor for GitHub operations.

Read `docs/architecture/OWNER_UI_APPROVALS.md` before changing authenticated navigation or visual presentation.
Preserve the approved palette, fonts, graphics library and direct Super Admin sidebar entries.
Functional fixes must not move these entries into horizontal tabs, hide them behind other menus, or change the theme.
Only an explicit user request for that presentation change supersedes the approval; passing CI or a deployment is not visual approval.
Keep server authorization and explicit tenant access intact. Do not replace unavailable real operations with demonstration data.
Evolve the navigation regression tests explicitly and include them in final-head checks.
