# Round54 — navigation context correction
Base main fb1d47bb972c769149ccec9b5558f89708b78254.

Owner reported root error boundary at /admin. Source reproduction: global Super Admin had a Dashboard link to /admin, whose loader calls tenant-required meuAcessoAdmin; requireTenant explicitly rejects Super Admin without an impersonated tenant. This is a verified code path, not an assertion that every screenshot failure has this cause.

Fix: shared desktop/mobile/palette navigation presents SaaS Dashboard for global Super Admin. Direct /admin checks canonical server role and returns to /super when no explicit tenant is selected; ordinary or impersonated access continues through the unchanged server tenant authorization. No local role or tenant value grants access. Unknown role shows no navigation yet. Palette avoids tenant requests and cached tenant matches in global mode. Tenant list offers Acessar empresa through the existing explicit impersonation path. Route error boundary offers retry and return to login without exposing raw errors.

No API, migration, RLS, credentials, database or Twelve-Factor config changes. Existing theme retained. Controlled tests execute actual route loader and shared menu selector, including role lookup failure, denied membership and invalid target; Round52 DOM evolves to assert the selected tenant callback while retaining save/remount/failure cases. All applicable final-head gates required. Remote browser acceptance remains outstanding; no actual login or tenant data write is performed by these tests.

#229 support pending; #231 unmerged/undeployed; #227/#230 and Round45 backlog retained. LSR02 Rejected — Terminal, budget 0/2.
