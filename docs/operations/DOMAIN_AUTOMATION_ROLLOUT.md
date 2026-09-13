# Domain automation — concrete managed-backend rollout

Status: implementation/review package; these instructions were NOT applied to live infrastructure. PR #281 is not a published website. No automatic merge or production cutover is included. The owner authorized code/tests only. Do not send a generic hosting-support questionnaire or ask again whether independent tenant domains are required.

## Responsibility and order

| Order | Responsible/access | Action and acceptance |
| --- | --- | --- |
| 1 | Codex/GitHub reviewer | Review PR #281, its exact-head tests and all failing CI logs. Merge only under the appropriate release instruction. Keep theme, menus and memberships unchanged. |
| 2 | Cloudflare account operator | Use SSL for SaaS Basic already subscribed. Verify delivery zone/origin below; prepare zone-scoped API tokens through the secure runtime secret channel. A Workers upgrade is unnecessary. |
| 3 | Managed backend operator (Lovable Cloud for canonical project) | Configure the existing Supabase backend and protected function secrets below; never create a substitute Supabase project. Prepare provider mappings after inventorying all existing provider assignments; do not overwrite the HML mapping or bind customer DNS as delivery. |
| 4 | Deployment operator | Run `node scripts/domains/build-edge.mjs` in the reviewed checkout. Deploy `supabase/functions/domain-processor/index.ts` WITH its generated sibling using the managed project's supported Edge Function deployment capability. Function config has `verify_jwt=false`: its dedicated secret is mandatory and tested before any I/O. Initially keep `DOMAIN_PROCESSOR_ENABLED=false`. No domain Worker cron. |
| 5 | Application publication operator | Publish the reviewed application including the signed `/.well-known/rm-prime-domain-routing` responder, with the same `DOMAIN_ROUTING_PROOF_SECRET` in server-only runtime storage. This endpoint reveals no tenant content and cannot activate a domain. |
| 6 | Backend operator | Verify unauthorized/wrong-secret requests return 401 and disabled authorized requests return 503; neither may lease/enqueue jobs. Verify runtime support for the bundled Node HTTPS transport (address pinning, certificate/SNI validation), not just TypeScript compilation. |
| 7 | Tenant administrator | For existing RM Prime `ownership_verified` / manual_assisted: select **Conexão automática**, then **Alterar modo**, once. This uses the existing versioned, audited command, preserves verified TXT, and makes old-mode jobs obsolete. Future requests default to automatic. Super Admin must not impersonate the tenant. |
| 8 | Backend operator | Inspect all pending jobs and active domains before enabling: scheduling is global. Set `DOMAIN_PROCESSOR_ENABLED=true` only after steps 1–7 and install the exact schedule below. The processor leases one job per invocation; obsolete generations/phases/proofs are cancelled individually with history preserved. Never bulk-delete or select newest as authority. |
| 9 | Tenant/DNS administrator | Copy the generated CNAME plan from the Domains screen; replace only conflicting A/AAAA/CNAME for that hostname after provider preparation is understood. Use DNS only and preserve email TXT/MX. Root requires CNAME flattening support. www is a separately reserved/verified alias; add it as **Alternativo**, tied by server rules to the same tenant canonical generation. |
| 10 | Homologation operator | Require current TXT proof, exact server-bound Cloudflare object, public DNS+authoritative flattened config, managed certificate active and nonce-bound HTTPS origin/alias proof. Then let reconciliation activate through existing RPC. Test real canonical website, www redirect preserving path/query, login/logout and cross-tenant rejection. Publish tenant content as a separate website action. |

## Exact configuration, without secret values

Canonical backend project ref: `stmcnvzuzlyqammyycxj`; managed Lovable project: `982b91d8-946d-4103-8eb3-40ddbaeedbf4`.

| Name | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Managed Edge runtime, existing platform bindings | Existing RPC/database authority; never in browser or Git. |
| `DOMAIN_PROCESSOR_SECRET` | Edge secret and Vault entry `domain_processor_secret`, identical random value >=32 characters | Dedicated scheduler authentication. A publishable key/browser JWT is insufficient. |
| `DOMAIN_PROCESSOR_ENABLED` | Edge environment | `false` until rollout ready, then `true`; emergency stop is `false`. |
| `DCA01_MANAGED_CNAME_TARGET` | Edge environment | `sites.realone.com.br`, after confirming existing target. |
| `DOMAIN_ROUTING_PROOF_SECRET` | Edge AND published app server secret, identical random value >=32 characters | HMAC binding nonce, tenant, domain id, generation, exact hostname and canonical hostname. Never expose as VITE/NEXT_PUBLIC. |
| `CLOUDFLARE_API_TOKEN_DOMAINS` | Edge secret | `SSL and Certificates Write` for the assigned SaaS delivery zone(s); exact list/get/create/delete objects. Ensure access covers all preserved assignments using this provider row before changing its reference. |
| `CLOUDFLARE_DNS_READ_TOKEN` | Edge secret | `Zone Read` and `DNS Read` restricted to explicitly registered customer zones. No DNS Write is used by this code. |
| `domain_processor_url` | Vault | `https://stmcnvzuzlyqammyycxj.supabase.co/functions/v1/domain-processor` |

The existing API token reference in the provider row is `env:NAME`; configure the matching Edge secret. Do not repurpose the HML token by assumption. Tokens are provisioned by the operator via secure secret input, not pasted into chat, SQL history or source.

## Delivery versus customer configuration

Cloudflare account `68ec853e6b04a038f09fca5712d6b26b`.

- Delivery zone `realone.com.br`: `83a260abd9ca2683e6d29f66fc06e4cf`.
- Existing fallback origin: `origin.realone.com.br`, observed active; existing target `sites.realone.com.br`.
- RM Prime customer DNS zone: `fde8289185c48584bf9b2027d74bb28c`.
- Add `capabilities.zones["rmprimeimoveis.com.br"] = "83a260abd9ca2683e6d29f66fc06e4cf"`. The historical key `zones` is the DELIVERY assignment used by DCA-02 SQL; preserve that compatibility and existing keys.
- Separately add `capabilities.customer_dns_zones["rmprimeimoveis.com.br"] = {"zone_id":"fde8289185c48584bf9b2027d74bb28c","credential_reference":"env:CLOUDFLARE_DNS_READ_TOKEN"}` through privileged managed configuration, preserving the rest of capabilities. This exact DNS zone's name is checked against the server domain before reading a record. An A record matching the shared hosting IP is rejected as configuration evidence.
- The existing registration RPC accepts only delivery `_zones` and replaces capabilities; do NOT use it after adding customer metadata without preserving/reapplying that metadata in the same reviewed configuration transaction. Register/merge exact provider configuration with the existing server boundary or privileged operator SQL, with snapshot, exact-row check and audit event; never expose provider configuration to tenant clients.

New custom hostnames use managed DV with HTTP validation, after DNS observation, avoiding a second certificate TXT for the normal flow. Existing manual-assisted objects remain explicit; no silent mode switch or adoption. Cloudflare supports HTTP validation and the API requires SSL and Certificates Write. If an existing hostname requires validation restart, inspect its exact error/status and use an explicitly reviewed provider recovery action; do not repeatedly create objects.

## Installing the single schedule (later authorized operation)

1. In the managed backend secure secret interface, create the two Vault entries above. Ensure exactly one of each name exists; do not display decrypted values.
2. Complete the invocation checks, global queue inventory and provider mapping review above.
3. In the canonical managed SQL editor, run `SET rmprime.domain_rollout_approved = 'yes';` followed by the reviewed contents of `scripts/domains/schedule-managed-processor.sql` in the same session. This creates/replaces only `rmprime-domain-processor`, every minute. Other cron jobs remain intact.
4. Confirm `cron.job` contains that name and the function logs show successful authenticated invocations. The HTTP request has `{}` only: no caller-selected domain or tenant. `pg_net` timeout must cover the bounded function invocation; see script.
5. Monitor `domain_operation_attempts`, exact job ids, function logs and the screen's automatically refreshed state. Never include scheduler or Cloudflare secrets in evidence.

## Concrete failure actions

| Evidence | Action |
| --- | --- |
| 401 from processor | Match the Vault scheduler secret to the Edge secret; do not disable authentication. |
| 503 processor_not_configured / processor_disabled | Configure the names above or keep disabled until deployment is ready. No leases occur during these preflight failures. |
| Cloudflare 403 | Correct token zone scope and SSL/DNS permissions; operator MCP access is not proof of runtime access. |
| Missing customer DNS configuration | Add the exact customer-zone read mapping; do not guess from delivery zone. |
| DNS mismatch / private or absent public address | Correct the displayed exact record and wait for real propagation; do not claim activation by matching IP. |
| Pending SSL | Inspect exact Cloudflare hostname/certificate validation error; preserve binding. HTTP-validation readiness is distinct from successful certificate issuance. |
| TLS error / 404 routing proof / incorrect signature | Confirm app release, shared proof secret and origin acceptance of the original Host/SNI. Correct origin configuration using the observed error. This is a precise hosting compatibility issue only if the deployed origin cannot serve that host; do not reopen multi-tenancy or bypass TLS. |
| Redirect to REAL ONE or another tenant | Correct the same-tenant canonical mapping/origin redirect. Reconciliation refuses activation. |
| Ambiguous provider mutation | Use existing DCA-02 orphan-recovery inspection; automatic create/adoption remains blocked. |

Emergency stop: disable this Edge processor and unschedule only `rmprime-domain-processor`. Preserve queue/history. Do not re-enable Worker scheduling. Reverting application code and DNS requires an explicit, separately reviewed rollback because active customer authority must not be guessed.

Sources: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/ ; https://developers.cloudflare.com/api/resources/custom_hostnames/methods/create/ ; https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/reference/connection-details/ ; https://supabase.com/docs/guides/functions/schedule-functions ; https://supabase.com/docs/guides/functions/auth ; https://docs.deno.com/runtime/reference/node_apis/ .
