# Tenant brand, environment alert and domain audit — 2026-09-13

## Baseline and authority

Audited GitHub main: `c7d9514ff71bee55ff3360fee4c253869958014c`.
Owner requested readable tenant identity, supplied the original RM mark, asked to investigate the Lovable environment warning and prepare the domain connection. Full authenticated commercial write acceptance is explicitly deferred by the owner.

## Minimal UI delta

The former 24px mark and 10px name become a white identity card with a 56px mark and 16px name. Collapsed and mobile navigation retain accessible identity. The REAL ONE platform branch and all navigation entries stay as approved.

Identity comes from the existing authorized `meuTenantWorkspace` route loader after session/membership validation and slug comparison. The original supplied PNG is copied without transformation and mapped only to verified RM tenant UUID `9664d189-4a12-4caa-8243-dc73383447e6`. Other/unresolved tenants get their own name/initials or a neutral pending identity, never RM branding. This static presentation mapping grants no access and selects no tenant.

The scoped admin route uses this mark as its favicon. Public website favicon continues through the canonical published configuration/media resolver. Live RM configuration revision 1 has null `primary_logo` and `favicon`; the supplied asset must be selected through canonical media/CMS when configuring the website. No published snapshot is overwritten and no parallel CMS storage is introduced.

## Environment warning

The supplied email alleges missing server Supabase bindings based on the environment file. Tracked `.env` contains the public Vite bindings only; the inspected file history predates this UI change. `client.server.ts` requires server `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; authentication also requires `SUPABASE_PUBLISHABLE_KEY`. Missing names fail closed, without privileged client fallback.

Absence of privileged keys from the repository does not establish absence from deployed runtime bindings. No secret values were requested, read into reports or added to source. The attempted unauthenticated public server-function transport returned HTTP 403 at the edge, which is inconclusive for runtime environment health. The connector does not expose a runtime environment/log inspection endpoint. The warning remains unconfirmed pending names-only runtime binding and sanitized server-log inspection; it is not marked false or resolved. Supabase official key guidance: https://supabase.com/docs/guides/api/api-keys.

## Domain evidence, read-only

Cloudflare zone `rmprimeimoveis.com.br` is already active, with `aleena.ns.cloudflare.com` and `razvan.ns.cloudflare.com`. Apex and www have DNS-only A records to `185.158.133.1`, with existing Lovable verification records and email-related records. Preserve these until the canonical connection contract prescribes a reviewed cutover; no new nameserver migration is necessary.

The tenant domain row is enabled in `manual_assisted`, status `pending_ownership_verification`, no activation or failure code. Inspection found no joined ownership-challenge row for this domain. Public lookup observed a redirect to REAL ONE; this is not proof of an active tenant website. The existing tenant UI supports `Rotacionar TXT` to issue an expiring proof once through session-authorized server operations. Do not invent proof values, mark the domain active directly or impersonate the tenant.

## Validation and limits

Required navigation regression now checks the real brand component, expanded/collapsed identity and isolation from other/unresolved tenants without network or commercial records. Typecheck/build and existing navigation gates cover the changed UI. Real authenticated write/restore/publication acceptance remains deferred. No database, auth, memberships, RLS, configuration, DNS, Cloudflare or email changes are part of this patch.
