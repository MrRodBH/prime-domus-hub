# P0 first journey recovery — after PR256

## Scope and evidence boundaries
No deploy, roadmap update, live business records, Auth users, roles or ownership changes. 0028 remains with support; the recorded provider refusal is respected. This work does not query its refused diagnostics or change unrelated EXECUTE grants.

ViaCEP keeps manual ownership of each address input across retries, including intentionally cleared values. Persisted nonempty fields are protected. Only empty untouched fields or previous automatic values can be filled. CEP edits cancel pending requests; version checks discard obsolete responses. Number/complement never come from ViaCEP. Both address sections share this behavior.

Membership list/invite accepts active tenant Admin or consistent active owner. Super Admin and impersonation remain rejected before privileged calls. The forward-only SQL replaces exactly two known membership routines, preserving ACLs, tenant lock, seat enforcement, target-owner prohibition and existing operations. It additionally denies Super Admin even at this SQL boundary. It does not modify transfer_tenant_ownership. Admin removes a membership through revocation; it does not delete a global Auth identity that might serve other tenants.

The member page no longer blocks member CRUD when optional RBAC profile reads are denied. Profile operations keep their own server authorization. Transfer is presented only with the server's owner capability. No approved menu/theme/layout is redesigned.

## Operational identity: concrete unresolved choice
Evidence recorded in PR256: real tenant 9664d189-4a12-4caa-8243-dc73383447e6 has one active member, zero non-Super active administrators. The existing owner identity also has the global Super Admin role. Historical test identities were deleted; they must not be restored or suggested as operators.

| Identity | Current authority | Consequence |
| --- | --- | --- |
| Existing owner (rodolfovaz882@gmail.com) | Global Super Admin + tenant owner | Platform administration allowed; tenant operation and member invitation denied |
| Separate tenant Admin | No active eligible account currently recorded | Code now supports own-tenant member CRUD/invites once an explicitly chosen identity legitimately has this role |
| Separate platform Super Admin | Not assumed or created | Candidate for separating responsibilities while preserving existing tenant ownership |

Concrete resolution requiring an explicit real-identity decision: keep the current owner UUID and ownership unchanged; designate and verify a separate platform-only identity for Super Admin, confirm its platform access, then remove only the global Super Admin role from the existing owner in an explicitly authorized administrative maintenance change. The existing owner can then enter its own tenant and invite the chosen Admin through tenant management. Never remove the last working platform administrator first. No automatic fallback, ownership transfer, or temporary Super impersonation is allowed. This sequence is a proposal, NOT an executed identity change. If the owner wants a different operational identity arrangement, it must be named explicitly; no guessed addresses are seeded.

## Required evidence before completion
- Controlled DOM: manual edits before/during lookup, empty manual field, retry, masked CEP, abort/stale result, manual completion and retained persisted fields.
- Integrated isolated journey: real login page and logout hook, actual auth middleware with simulated Auth transport, actual server validators/authorization, actual save SQL against isolated PostgreSQL, plan creation/edit, existing company edit, logout/cache clear/revoked session denial, independent DB connection/new login and reloaded values. Auth issuance is simulated; this is not live Supabase Auth or production proof.
- Native membership SQL: Admin permitted CRUD/invite, owner invite, foreign tenant/viewer/suspended/Super/impersonation/owner target denied, seat denial preserved and ACLs unchanged. Commercial resolver is a controlled dependency in this fixture.
- Final-head CI links and expected source content hash recorded in PR. SQL deployment, provider scanner and public homologation remain separate statuses.

## Short owner homologation script (after deploy restriction is lifted)
1. Confirm served release content matches the approved expected source scope/hash.
2. Login with platform Super Admin; create/edit the real plan and complete the existing tenant through the UI.
3. Enter a masked CEP; edit street before retry and another field during the request. Verify preservation, retry, manual completion and cancellation when CEP changes.
4. Logout/login; reopen plan/company and check saved values; confirm direct sidebar/theme and technical population exclusion.
5. After the real-identity decision and separately verified provisioning, verify tenant Admin member CRUD within its tenant and owner protection; Super must remain denied tenant operations.

No claim of production readiness is made by this document. Required current permission model follows https://supabase.com/docs/guides/database/postgres/row-level-security ; actual decisions are enforced by this repository's handlers and SQL.
