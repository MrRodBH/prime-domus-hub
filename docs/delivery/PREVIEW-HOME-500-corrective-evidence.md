# Preview homepage 500 corrective

Authority consulted: root AGENTS.md, ARCHITECTURE_CONSTITUTION.md, PRM3-P0A frontend entry envelope, PPR-01 public-page impact analysis, current public-tenant-context tests and RM-PART4B delivery evidence. Historical gates are context; the current owner request authorizes this limited runtime corrective. No GitHub operations or PR performed.

Reproduction: GET / on localhost returned HTTP 500 and PublicTenantResolutionError (PUBLIC_TENANT_NOT_RESOLVED). The root loader required tenant settings on a development host without an explicit tenant binding. Selecting RM Prime by default would contradict the accepted host-only authority contract.

Correction: root beforeLoad asks a server function for the host-resolution reason and redirects only the unmapped development homepage to existing /auth. No tenant identity is returned. Mapped hosts, production domains, invalid/absent hosts, Workers preview restrictions, content paths and authorization remain unchanged. No DNS, secrets, database, publishing, campaign or visual changes.

Verification: fresh Chromium GET / resolves to /auth, HTTP 200; existing REAL ONE login is visible and no browser error was observed. Build telemetry: build OK. Five new entry tests, ten existing tenant-context specifications and eleven campaign tests pass. Round56 static approved-navigation checks pass; its historical controlled-DOM stage remains unavailable because ROUND52_JSDOM_MODULE is not supplied. No navigation was modified. Initial attempt to run Bun campaign tests with Vitest was corrected to the existing Bun runner.

Smallest remaining gap: this evidence proves the unbound preview entry, not a production deployment or an explicitly bound tenant homepage. No deployment was authorized or performed. Owner action: refresh the preview at / and use the existing platform login; company access remains /rmprime/auth.