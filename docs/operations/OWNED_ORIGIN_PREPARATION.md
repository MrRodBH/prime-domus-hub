# Owned tenant origin — verified delta and next action

2026-09-14. PR286 starts at e32b2fbdca06d5b56071714b2219d88d078d51c4, based on main 18f6a8e7eece84e542df926295b7049f721094ae. This revision contains preparation/tests, not a live deployment. No DNS, queue, provider, cron, production secret or publication was changed during this verification.

## Evidence reused and added

- Read AGENTS.md, architecture constitution/security, current domain decisions/rollout, WRI-01 runtime/runbook, SPR-03 and PCA-15 custody limitations and the attached historical continuity. Historical July and HML gates do not supersede the current owner instruction. Old impersonation/provisioning helpers are not reused.
- GitHub recursive PR tree: 1,512 tracked blobs, all SHA-1 values matched the isolated local source copy. Existing HML Workers preserved; proposed production name is `rm-prime-sites-prod`, not yet created.
- Existing provider binding, canonical Supabase project, verified TXT, Edge processor and domain queue are retained; PR285 contains their live evidence. They are not presumed missing.
- Local build succeeded: Vite 7.3.2; reused installed dependencies, not a claimed fresh frozen install. It used a deliberately fake publishable key, so **do not deploy this local artifact**. Release source SHA-256: `0a55613c273ee20b461107ee87f3088d5985c4149e2fd71ca262eec854559624` (application source before this documentation/test addition; local release commit is null, not a fabricated SHA).
- Built server: 446 JavaScript modules, 9,389,255 total server bytes; estimated concatenated JS gzip 1,897,925 bytes. Client: 234 files; largest asset 965,081 bytes. Actual provider upload/CPU/startup limits still require live measurement.
- Existing materializer succeeded for the canonical project and new production name. Existing bundle audit passed: compiled bootstrap, assets, no configured routes/cron, workers.dev and previews disabled; no domain queue leasing in application bundle.
- `node scripts/verify-owned-origin-workerd.mjs` passed on workerd 1.20260825.1. It loads the actual compiled application and independent synthetic backend service with network denied. Three tenant roots and three aliases are checked twice; HMAC is independently calculated with Node crypto. Unknown hostname, unverified ownership, orphan alias, backend HTTP503, invalid nonce and spoofed tenant/forwarding headers are rejected. Pending SSL proof is diagnostic, never activation. This is not a live certificate, browser login, content or static-assets delivery acceptance test.

## Verified connector/custody boundary

Continuation, 2026-09-14 17:25 UTC: owner saved `CLOUDFLARE_ORIGIN_PROVISIONING_TOKEN`. Protected execution verified HTTP200/token active and HTTP200/Workers account access. Expiry: 2026-09-14T23:59:59Z. Managed audit messages `umsg_01m2gf7vxbfjjrpzjzvadahn5t` and `umsg_01m2gfb51wehyv1es5gddd21df` establish that the existing protected execution can read the canonical service-role, publishable, URL, matching proof and auth/email bindings internally. **No new public credential-transfer Edge Function is needed.** Use this existing server-to-server execution with an exact new Worker target; do not expose values or reuse historical HML helpers. The former credential-access prerequisite below is now fulfilled and retained as history.

Historical CI correction retains the original PCA-12B Supabase prefix hash and accepts only the exact already-approved PR281 domain-processor suffix. A test-only scope helper verifies the accepted main's ancestry and an explicit list of PR286 review files; new application/SQL/secret paths are rejected. Archived tests retain their behavioral assertions while distinguishing accepted past changes from this PR's delta. Negative controls cover unauthorized paths, disabling the old bridge's JWT, wrong project and extra function sections.

CI follow-up: on preparation commit `28d84abbe572ec0b3b6789b5bbc76b0ede1f4b45`, WRI-01 (including the new compiled-origin test) passed. Both composite Release gates failed at the same pre-existing PCA-05R manifest cardinality assertion: migrations dated September 11, 12 and 13 were present but unclassified. The follow-up adds only three explicit post-rehearsal exclusions and their hashes, changing repository/excluded counts from 134/12 to 137/15. All prerequisite/rehearsal entries, replay prohibitions, hard stops, prior exclusions and every migration file are unchanged. The closure specification passes locally after the correction. This does not reopen or execute a historical PCA environment.

Managed capability audit: Lovable message `umsg_01m2gdm3vffypab9xfjq08z3qn`, completed read-only. Native tools support tracked Edge Function deployment and runtime secret reads inside handlers. The earlier historical statement that no new Edge Function can ever be deployed is not a current capability finding.

`SUPABASE_SERVICE_ROLE_KEY` is an automatic managed binding: neither the owner nor a tool can retrieve its value. `DOMAIN_ROUTING_PROOF_SECRET` also must stay private. Both can be read by authorized server code inside the managed runtime. Do not ask the owner to paste either into chat or manually reconstruct them.

The managed environment has zero connected Cloudflare accounts in its own connector inventory and no native transfer-to-Worker binding tool. ChatGPT's Cloudflare MCP is a different connection; it does not make its OAuth credential available inside the managed runtime. A reviewed one-time server-to-server provisioning operation needs a Cloudflare credential reachable in that runtime. No transfer implementation or successful credential delivery is claimed yet.

Cloudflare MCP successfully read Workers account settings (`default_usage_model=standard`). The separate subscriptions endpoint returned API code `10000` authentication error. This does not invalidate the working Workers read capability and does not establish a paid subscription. The last owner screenshot lists Workers Free and SSL for SaaS Basic.

## Exact external action — owner, no support ticket

1. Open Cloudflare **My Profile → API Tokens → Create Token → Create Custom Token**.
2. Name: `RM Prime - temporary origin provisioning`.
3. Permission: **Account → Workers Scripts → Edit**. Account resources: **Include → Specific account**, select account ID `68ec853e6b04a038f09fca5712d6b26b`. Do not add DNS, billing or global-key permissions. This is an account-scoped Workers permission, not a claim of per-script token restriction; subsequent provisioning code must pin the exact new Worker name. Set an expiry of one day.
4. Create the token. Copy its value directly into the managed project's **Cloud → Secrets → Add secret**, name **`CLOUDFLARE_ORIGIN_PROVISIONING_TOKEN`**, then save. Project: `982b91d8-946d-4103-8eb3-40ddbaeedbf4`. This is a new secret; no edit of an existing secret is required. Do not send its value in chat. If this name already exists, do not assume Add updates it; report only that it exists so the runtime can verify it without exposing the value.
5. Report only that the named secret was saved. No app publication, DNS switch, upgrade, new Supabase project, credential rotation or re-registration of domains is part of this owner action.

This credential enables implementation/verification of a server-to-server custody operation; merely saving it does not deploy or connect the domain. Native audit found no prohibition on such a server-side operation. The operation must authenticate independently, pin account + Worker + intended version, reject unknown targets, produce only names/statuses, and leave no public secret-export endpoint or generic impersonation capability. Remove the temporary runtime token and revoke it in Cloudflare after successful provisioning.

## Remaining sequence — Codex after that configuration

1. Preserve the current PR head and final CI evidence. Implement/review the bounded custody operation using current managed deployment tools; no historical HML helper, synthetic operator or second domain scheduler.
2. Inventory required runtime bindings, including auth/email configuration, and build a release with real canonical **public** values. Transfer service-role and matching proof secret only server-to-server. Retain source SHA, bundle/asset manifest and deployed Worker version.
3. Prepare the separate application Worker and assets with no tenant/platform traffic. Verify missing-secret rejection, signed proof via protected test ingress, actual static asset delivery, origin TLS, server auth and representative CPU/startup limits. Local test success does not replace these acceptance checks.
4. Verify Cloudflare for SaaS Worker-origin route semantics in the delivery zone; snapshot exact records/routes first. Scope the first tenant explicitly and prove `realone.com.br` remains on its existing hosting. No generic catch-all route before exclusions are proven. Preserve email, TXT and existing provider object.
5. Only after readiness, apply the smallest ingress/fallback delta, then run the existing eligible Supabase domain operation. Its DNS/provider/TLS/HMAC evidence must activate the root through the current state machine.
6. After root active, the authenticated tenant administrator adds www as its alias. Apply only its generated hostname record and verify certificate plus same-tenant canonical redirect, path and query. Do not impersonate the tenant or create an alias before the existing active-canonical prerequisite.
7. Validate canonical site, tenant login/logout, platform owner entry and tenant isolation. Review the global queue and enable only the already documented Supabase scheduling path if still absent. Retain rollback to the snapshotted ingress configuration; never roll back canonical data or evidence.

## Provider documentation and cost boundary

- [Cloudflare O2O compatibility](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/saas-customers/product-compatibility/): does not support chaining one custom-hostname zone into another.
- [Worker as SaaS origin](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/): supports the selected owned application origin.
- [Worker limits](https://developers.cloudflare.com/workers/platform/limits/), consulted 2026-09-14: current page lists 64 MiB Worker size, 128 MB memory, 1 second startup, Free CPU 10 ms and 100,000 daily requests; static assets have independent limits. Measured package size alone does not prove CPU suitability.
- [Worker pricing](https://developers.cloudflare.com/workers/platform/pricing/): Paid starts at US$5/month plus applicable excess usage. No upgrade purchased or assumed authorized; disclose measured need and cost first.
- [Token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/) and [creation](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/): Workers Scripts Edit belongs to account permissions.
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/): secret bindings are hidden after configuration. Verified API schema for `PUT /accounts/{account_id}/workers/scripts/{script_name}/secrets` accepts `name`, `type=secret_text`, `text`; no secret values were read or written in this audit.
