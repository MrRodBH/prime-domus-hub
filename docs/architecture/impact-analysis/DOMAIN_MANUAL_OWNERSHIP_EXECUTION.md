# Manual domain ownership execution — 2026-09-13

Baseline main `c26103f91b88b8981fc020e1626cb18535a9b213`; owner authorizes real domain connection and correction of blocking runtime behavior.

## Observed failure

The owner issued proof version 2 from the authenticated RM Prime tenant session. Its digest matched the supplied plaintext and DNS TXT was created and independently resolved. Clicking Verificar DNS twice created jobs `104cc1a9-b0e8-4eb7-9596-62423eb976ca` and `a50e3d42-97eb-4cd2-9d28-1ca897d5abde`; both remained pending with zero attempts. The request handler only enqueued, while the existing consumer was reachable only from the scheduled Worker export. A cron invoking that export is not established in the current published hosting runtime. The toast correctly reported a queue write but did not perform verification.

## Frozen corrective contract

Manual TXT verification runs during the authenticated server request, bounded by the existing 10-second DNS timeout. Extract the existing ownership operation into one server module shared by the manual request and scheduled job consumer. Both use the existing `verify_domain_ownership_challenge` SQL authority, its domain lock, generation/challenge/digest/expiry validation and audit trail. No alternate resolver, direct status patch, client proof value, background browser task, service key exposure or new database function is introduced.

The manual handler retains requireTenant, strict domainId-only input, active Admin/owner authorization and tenant-scoped lookup. Super Admin/impersonation and mismatched tenant authority are refused again at the shared operation. DNS is fetched server-side from the canonical challenge name. Success means ownership_verified only, never domain active or SSL ready. The existing DNS-preparation queue receives the continuation after successful verification.

Repeated old TXT jobs recognize a verified proof for the same generation and do not regress the domain or enqueue another continuation. A concurrent success is accepted only for the exact proof ID and generation; rotation, missing/expired proof, DNS failure and database failure remain failures. The UI presents observed success or an unconfirmed TXT result instead of the enqueue-only toast.

## Scope, tests and limits

Allowed changes: shared ownership module, existing domain request/job entry points, verification toast, isolated tests, this document and the existing exact-path access CI scope. No migration, RLS, grant, membership, credentials, DNS write or commercial content changes are needed for this corrective. Add mandatory shared-verifier tests to the existing access/release workflows; retain membership tests, domain activation invariants, typecheck, build and isolated access/security tests.

This fixes the manual ownership step without depending on support or a new runtime secret. Automatic scheduled consumption, production Cloudflare provider credentials/mapping, managed CNAME configuration, apex flattening evidence and SSL remain prerequisites for the following connection stages. Do not run a global consumer from a tenant request, fabricate a tenant session, set active manually or claim full domain connection from this correction. The owner must initiate the corrected handler through the existing session after publication; if the proof expires before then, rotate it once at that point and update the exact DNS record.
