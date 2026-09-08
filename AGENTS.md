# RM Prime — owner-approved interface

Read `docs/architecture/OWNER_UI_APPROVALS.md` before changing authenticated navigation or visual presentation.
Preserve the approved palette, fonts, graphics library and direct Super Admin sidebar entries.
Functional fixes must not move these entries into horizontal tabs, hide them behind other menus, or change the theme.
Only an explicit user request for that presentation change supersedes the approval; passing CI or a deployment is not visual approval.
Keep server authorization and explicit tenant access intact. Do not replace unavailable real operations with demonstration data.
Evolve the navigation regression tests explicitly and include them in final-head checks.
