# Domain origin chain correction — 2026-09-14

Status: confirmed documentation defect and reviewed migration proposal; replacement origin is NOT deployed or homologated.

## Evidence and supersession

Reused AGENTS.md, DOMAIN_AUTOMATION_SUPABASE.md, DOMAIN_AUTOMATION_ROLLOUT.md and PR285 live comments #5666549644 and #5667406750. Confirmed main once: 18f6a8e7eece84e542df926295b7049f721094ae (tree 34ed1e28891e3810f189633a37c78322cb628291). The owner declines Lovable support; do not send or require another support request as the next action.

The previous conclusion that hosting-side binding recovery was the necessary next step was incomplete. Cloudflare's official O2O compatibility documentation explicitly prohibits directing traffic from a custom hostname zone into another custom hostname zone:
https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/saas-customers/product-compatibility/
The page states that limitation separately from product-plan entitlements.

Our configured path is:
1. rmprimeimoveis.com.br (customer DNS-only CNAME) -> sites.realone.com.br (our SaaS delivery zone).
2. sites.realone.com.br -> origin.realone.com.br (proxied fallback).
3. origin.realone.com.br -> prime-domus-hub.lovable.app (Lovable SaaS hosting), with origin registered in Lovable proxy mode.

This topology attempts to chain our custom-hostname delivery into the hosting provider's custom-hostname delivery. It must not be treated as a supported production origin contract. This is a configuration/design defect in our integration, not evidence that the multi-tenant product requirement is invalid. Provider-side traces would be necessary to attribute every historical 403 to a particular hop, but are not necessary to stop relying on this documented-incompatible topology.

Managed evidence retained:
- 21312: direct origin HTTPS reaches app (HTTP500 / RM Prime title); registering origin removed direct-origin 1014, not tenant failure.
- 21313: original tenant routing-proof URL HTTP403 / error1014, Ray a3b0d2a3dc75a63b-SJC.
- 21314: TLS origin hostname + HTTP Host tenant gives Cloudflare403; no proof.
- Existing server-owned Cloudflare custom hostname d726c58a-2e56-4ffa-b54d-6e2f958056c6 and its SSL were active.
- Domain is pending_ssl, generation1, lock18; routing generation unverified.
- Native hosting connection status active/connected does not inspect provider certificate or moved error. Do not count it as activation evidence.
- No additional queue invocation, DNS, provider, publication or production data mutation was performed in this investigation.

## Concrete correction proposed

Serve the SAME reviewed TanStack/Nitro application directly from an application Worker in our Cloudflare account, behind the existing Cloudflare for SaaS delivery zone. Keep the SAME managed Supabase database, Auth, RLS, storage, queue and domain-processor Edge Function. Do not forward the tenant request through lovable.app, introduce a header-selected tenant, or create a second processor/scheduler.

Cloudflare documents Workers as the actual application origin:
https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/
This is application hosting, distinct from the prohibited Worker domain automation. It removes the second SaaS hostname zone; it is not a proxy bypass of another provider's access controls.

This changes where tenant websites are published. It requires a concrete owner decision on hosting responsibility before traffic cutover; the owner has not yet explicitly selected this relocation. It does not move the canonical backend or realone.com.br platform hosting. The existing code already has the Worker runtime/bootstrap/build contract; this is not proof that its present real deployment is ready.

Read-only account inventory:
- rm-prime-wri01-hml: no bindings returned.
- rm-prime-pca11-hml: ASSETS binding only; no application runtime secret bindings returned.
Both are historical HML resources. Neither is a prepared production origin. Preserve them and their terminal gate evidence. Do not resurrect PCA gates, overwrite their deployments, or claim a production runtime exists.

## Application sequence after hosting decision

1. Codex: prepare a separate production application deployment from current main, preserving later commits. Use a clearly separate production name (proposed rm-prime-sites-prod; not yet created). Reuse canonical build/materializer and current approved UI; no alternative tenant resolver.
2. Backend/Cloudflare operator: provide server-only runtime bindings through a secure configuration channel: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY and the SAME DOMAIN_ROUTING_PROOF_SECRET used by the Edge processor. The canonical project ref is stmcnvzuzlyqammyycxj and URL https://stmcnvzuzlyqammyycxj.supabase.co. Build-time public configuration uses VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Never copy service-role or proof keys into VITE variables, chat or source. Inventory remaining feature-specific runtime bindings from canonical bootstrap before deployment; do not assume this list proves complete application readiness. Connector Cloudflare access is not runtime Supabase credential provisioning.
3. Codex: build/package the complete server and assets with verifiable source identity; validate the NEW hosting boundary (runtime bootstrap, exact-host resolution, proof signature, static assets and same-tenant redirects). Reuse prior test evidence for unchanged behavior. Keep public traffic disconnected until these checks pass. Check actual bundle/account limits before deployment; do not assume SSL for SaaS subscription includes Workers Paid or purchase an upgrade silently.
4. Codex: apply the documented originless fallback/Worker routing contract only after the application is ready. Snapshot existing DNS/routes. Scope initial ingress to the tenant hostname; do not add an unqualified */* route that also captures realone.com.br. Use current Cloudflare route semantics and verify exact delivery-zone scope. Keep platform routes, email, ownership TXT and provider identity intact.
5. Codex: perform one existing eligible domain operation after the changed origin proves reachable. Activation must occur through the existing state machine with fresh DNS, exact provider binding, TLS and HMAC proof. No status UPDATE or weakened evidence.
6. Tenant administrator: once canonical is active, add www as Alternativo through authenticated tenant UI. Alias creation currently requires an active canonical (dca01_alias_requires_active_canonical); do not ask the owner to do it early or impersonate the tenant.
7. Codex: observe exact server-generated alias DNS and apply only its hostname record; verify its certificate, signed redirect to its own canonical, path/query preservation and isolation. The current www -> lovable.app record is hosting preparation, not the final SaaS alias contract.
8. Codex/backend operator: inventory global queue and install only the existing Supabase schedule after successful protected processing. Finish with real site, tenant login/logout, platform-host independence and content publication evidence.

## Alternatives deliberately not applied

Direct customer DNS -> Lovable could remove our SaaS hop but would abandon the selected API-automated Cloudflare provider contract and still leave internal activation requiring a legitimate alternative hosting-verification contract. Do not merely point DNS there and force active.

Adding more Lovable hostnames, rotating TXT, certificate refresh loops, substituting shared IPs, lowering TLS verification or changing SNI blindly does not repair the architectural incompatibility. A support ticket may provide provider-specific options but is not a prerequisite for preparing an owned application origin.

## Exit criteria

No claim of domain operational until actual canonical reconciliation, tenant website and alias acceptance pass on the selected origin. This document records a newly identified architectural gap; it is not a deployment, a ready production Worker, a permission upgrade or successful homologation.

