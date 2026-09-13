# Real domain execution preparation — 2026-09-13

Owner authorizes real connection preparation for `rmprimeimoveis.com.br`, including necessary Cloudflare operations. No website draft/content creation is requested. This supersedes the former no-DNS-write boundary for this task, without changing tenant/session authority, ownership, users or memberships.

Audited main: `a05b29af718865169ba672ac5a41187f17b4ba87`. Existing public source identity: `6adcd7388a23abd0d63adac9999de45b481bb3fd8622784ed52fb08e0bf7ff02`.

## Frozen preparation contract

- Cloudflare account: `68ec853e6b04a038f09fca5712d6b26b`.
- SaaS delivery zone: `realone.com.br` / `83a260abd9ca2683e6d29f66fc06e4cf`.
- Customer DNS zone: `rmprimeimoveis.com.br` / `fde8289185c48584bf9b2027d74bb28c`.
- Canonical tenant: `9664d189-4a12-4caa-8243-dc73383447e6`; existing domain row: `6eda5a4e-be96-4756-b39b-746d886bc387`, generation 1.
- Preserve existing apex and www A destinations `185.158.133.1`, DNS-only. Reduce only their TTL from 3600 to 300. Resolver caches populated earlier may retain the old TTL for up to one hour.
- Add `origin.realone.com.br` as proxied A `185.158.133.1`, the observed existing hosting address. Set it as the Cloudflare for SaaS fallback origin (infrastructure terminology, never a fallback tenant).
- Add proxied CNAME `sites.realone.com.br` to `origin.realone.com.br` as the future server-managed connection target. These names must not already exist with another configuration.
- Set the SaaS zone TLS mode from `full` to `strict` for verified origin certificates. Existing apex/www platform entries are DNS-only; this governs the staged proxied delivery path. The active universal certificate covers REAL ONE and its wildcard, not the future customer custom-hostname certificate. No SSL downgrade or fake certificate acceptance is permitted.
- Never overwrite an existing delivery origin. No customer A/CNAME cutover, hostname adoption or database activation before the prerequisites below pass. All existing mail/DKIM/SPF/DMARC/verification records remain exact.

Cloudflare's documented fallback-origin forwarding preserves the original Host and SNI. No rewriting to REAL ONE, supplied tenant header, fake identity or proxy bypass is allowed. The original host remains subject to the canonical server tenant resolver.

## Direct evidence and prerequisites

Both relevant zones are active. No Worker routes or custom hostnames exist in either zone. The SaaS fallback-origin GET returned resource-not-found before preparation. The only Worker scripts are historical HML scripts; settings expose no Supabase bindings. They are not touched or promoted.

The domain row was imported from the old tenant field and remains `pending_ownership_verification`, lock version 0, with zero challenges, provider bindings and jobs. The enabled database provider only maps `mrrod.com.br` and references `env:CLOUDFLARE_API_TOKEN_DCA01_HML`. Do not repurpose its credentials or infer production readiness from the connected operator MCP.

A direct HTTPS GET to the customer apex returned HTTP 500 before mutation. The application HTML contains `Public tenant authority could not be resolved`. This establishes that the current failure is at the application public-tenant boundary; it does not establish missing secret bindings or certificate acceptance through the future SaaS path. Earlier redirect observations are historical, not the current test result.

The current canonical processor also requires `DCA01_MANAGED_CNAME_TARGET` and a scheduled job executor. `src/server.ts` exports the processor, while the committed generic Worker config has no Cron. Operator MCP access is not a runtime credential or job executor.

One additional code compatibility prerequisite is explicit: `observeRequiredDns` currently accepts only public type-5 CNAME answers. Cloudflare apex flattening returns address records, so the apex requires provider-authoritative DNS configuration evidence plus external propagation evidence in the same canonical processor before the cutover can pass. Never accept matching shared IPs alone or force `required_dns_observed=true`.

## Execution sequence after infrastructure preparation

1. Obtain the pending Lovable names-only runtime/log report. Verify actual published Supabase bindings and execution environment; do not publish secret values or add keys to source.
2. Configure the production provider mapping to the SaaS zone, keeping the customer DNS zone distinct. Provision a least-privilege server credential through the protected runtime's supported secret channel and enable the canonical processor. Do not reuse the HML account mapping by assumption.
3. Complete the canonical apex DNS-evidence compatibility correction with controlled tests and reviewed PR.
4. The authorized tenant session issues its ownership TXT through `rotateDomainOwnershipChallenge`. Publish precisely the returned expiring proof in customer DNS and let the canonical verifier observe it. Never fabricate an actor or execute tenant commands as Super Admin.
5. After ownership verification, create the exact custom hostname in the SaaS delivery zone with the existing provider identity claim/bind protocol. Do not precreate it before ownership: manual-assisted adoption rejects objects predating the verified generation.
6. Observe hostname and SSL activation; apply the reviewed apex/www DNS cutover, preserving mail. Require public DNS, trusted TLS, preserved hostname, correct tenant resolution and real page/login behavior. Website content/publication is a separate owner action, not automatically created by connection preparation.

## Rollback and honest completion

Preparation rollback restores only the two modified TTLs to 3600. New origin/target records may be removed only by the exact recorded IDs if unchanged and unused; the new SaaS origin may be removed only if still equal to the recorded value and no dependent hostname exists. Never restore an entire zone snapshot over concurrent changes.

The original zone TLS mode was `full`; retain `strict` as the intended verified-origin contract. Do not weaken it automatically to mask a TLS failure. A complete authorized rollback must assess whether the staged resources are still unused before restoring the prior setting.

Record provider responses and post-change equality checks in the companion evidence JSON. Infrastructure preparation is not a connected website. Do not mark the tenant active, report tests passed or request another authorization merely because the runtime dependencies remain unavailable.

References: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/ ; https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/reference/connection-details/ ; https://developers.cloudflare.com/dns/cname-flattening/ .
