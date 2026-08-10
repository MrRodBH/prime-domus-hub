# WRI-01 — Cloudflare Worker Runtime Runbook

## Scope

This runbook governs the accepted Strategy A Worker runtime and the boundary between repository proof and later external Cloudflare operations.

## Repository authority

```text
BUILD_AUTHORITY = @lovable.dev/vite-tanstack-config + Nitro cloudflare-module
WORKER_ENTRY = dist/server/index.mjs
ASSETS_DIRECTORY = dist/client
ASSETS_BINDING = ASSETS
WRANGLER_AUTHORITY = wrangler.jsonc
WRANGLER_ENVIRONMENT_AUTHORITY = resolved top-level homologation configuration
WRANGLER_NAMED_ENVIRONMENTS = prohibited for redirected generated configuration
SCHEDULED_HOOK_CONSUMER_COUNT = 1
CRON_EXPRESSION = */5 * * * * UTC
MAX_JOBS_PER_CYCLE = 20
```

## Current merged authority

```text
WRI01_IMPLEMENTATION_STATE = Accepted / Merged / Closed
WRI01_IMPLEMENTATION_PR = 70
WRI01_IMPLEMENTATION_HEAD = 8d03b1cc4fcf023224fc198f897008905956b5d6
WRI01_IMPLEMENTATION_MERGE_SHA = 81bfd7ba821187861dd1e183ac1c99198afdd43e
WRI01_POST_MERGE_RECONCILIATION = completed
WRI01_PRIOR_POST_MERGE_RECONCILIATION_PR = 71
WRI01_PRIOR_POST_MERGE_RECONCILIATION_SHA = 7d24bc22346a664b846c8345ffe172d73f52f11b
WRI01_CORRECTION_STATE = Accepted / Merged / Closed
WRI01_CORRECTION_PR = 72
WRI01_CORRECTION_HEAD = 61893694c00ceb846d3de3e0cf6862c94dc386a4
WRI01_CORRECTION_MERGE_SHA = 2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a
WRI01_CORRECTION_AUDIT = Accepted
WRI01_POST_CORRECTION_RECONCILIATION = completed
PR72_CORRECTION_REQUIRED = false
NEXT_STAGE_AUTHORIZED = none
```

Do not add `@cloudflare/vite-plugin`, a second Worker entry, a second assets/bindings authority, a public application scheduler route or a second Wrangler configuration authority.

## Repository verification

Run from the exact candidate HEAD:

```bash
bun install --frozen-lockfile
bun run test:wri-01
bun run test:dca-01
bun run build
bun run typecheck
bun run wri01:bundle-audit
bun run wri01:dry-run
```

The top-level `wrangler.jsonc` is already the resolved homologation authority for `rm-prime-wri01-hml`. The dry-run must not pass `--env`, and both the root and generated redirected Wrangler configurations must omit `env`. The CI gate must invoke the same root package script and must not bypass the redirect with a direct generated-config shortcut. This preserves one deployment authority and keeps `dist/server/wrangler.json` valid for Wrangler's generated-configuration redirect.

Repository acceptance also requires the WRI-01, Release Gate and PR-M2 workflows to succeed on the same exact HEAD. The local workerd artifact must prove readiness, the development scheduled event, DCA-01 delegation, controlled fail-closed behavior and zero orphan processes.

## Fail-closed interpretation

- Missing or malformed Cloudflare request runtime context returns sanitized `503`.
- Ambiguous or unavailable canonical domain resolution returns sanitized `503` before SSR.
- A scheduled event that cannot reach the deliberately unavailable local backend must emit the DCA-01 fail-closed log and Wrangler `outcome=exception`.
- A generic HTTP code, missing log, missing event or residual process is not proof.
- Local non-Cloudflare execution preserves its existing path and does not fabricate provider context.

## External prerequisites not completed by WRI-01

```text
WORKER_DEPLOY = not executed
REMOTE_CRON_TRIGGER = not created
ZONE_ROUTE = not created
FALLBACK_ORIGIN = not configured
CUSTOM_HOSTNAME = not created
DCA01_MANAGED_MIGRATION = not executed
```

The last repository-recorded fallback observation is `Pending Deployment (Error)`. Before any Custom Hostname proof, a separately authorized operator must:

1. inspect Cloudflare directly and remove or confirm absence of the failed fallback designation;
2. deploy and prove the non-production Worker on `workers.dev`;
3. prove the more-specific no-Worker exclusions for `mrrod.com.br`, `www.mrrod.com.br` and `notify.mrrod.com.br`;
4. create only `fallback.mrrod.com.br AAAA 100::` as proxied and originless;
5. designate that hostname as fallback and wait for `active`;
6. add and prove the wildcard Worker route;
7. only then execute the separately authorized DCA-01 Custom Hostname proof.

Do not allow A/AAAA/CNAME coexistence at `fallback`, DNS-only fallback, self-reference, apex/`www` as fallback, or Custom Hostname creation before the prerequisites.

## Runtime bindings and secrets

Required binding names are:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

The deploy credential `CLOUDFLARE_DEPLOY_API_TOKEN_WRI01_HML` is separate from the runtime provider credential. Never print, persist or return secret values. Account ID and zone ID are transport inputs, never tenant or domain authority.

## Rollback

Repository rollback is Git reversion. External rollback, when separately authorized, must execute in this order:

1. disable the remote Cron Trigger;
2. remove the wildcard Worker route;
3. re-prove apex, `www` and `notify` bypass;
4. remove the fallback designation;
5. delete only the WRI-01-created `fallback.mrrod.com.br AAAA 100::` record;
6. remove the non-production Worker;
7. preserve sanitized evidence;
8. leave backend data and unrelated DNS unchanged.

Rollback must never restore tenant default, request-time legacy fallback, dual path or client authority.

## Protected exact-head merge and post-merge reconciliation

```text
WRI01_IMPLEMENTATION_STATE = Accepted / Merged / Closed
WRI01_IMPLEMENTATION_PR = 70
WRI01_IMPLEMENTATION_HEAD = 8d03b1cc4fcf023224fc198f897008905956b5d6
WRI01_IMPLEMENTATION_MERGE_SHA = 81bfd7ba821187861dd1e183ac1c99198afdd43e
WRI01_IMPLEMENTATION_AUDIT = Accepted
WRI01_STRATEGY_A_PRESERVED = true
WRI01_POST_MERGE_RECONCILIATION = completed
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
FALLBACK_ORIGIN_CONFIGURED = false
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
AUTO_MERGE_ENABLED = false
```

Custom Hostname and Fallback Origin remain unproved and unconfigured. The last canonical provider observation remains `Pending Deployment (Error)`. This merge and reconciliation authorize no deploy, managed migration, DNS, Worker Route, remote Cron Trigger, provider API operation, DCA-01 external proof, BCA-01 or PR-M3.

## Terminal redirected-Wrangler correction and proof

```text
WRI01_IMPLEMENTATION_PR = 70
WRI01_IMPLEMENTATION_HEAD = 8d03b1cc4fcf023224fc198f897008905956b5d6
WRI01_IMPLEMENTATION_MERGE_SHA = 81bfd7ba821187861dd1e183ac1c99198afdd43e
WRI01_PRIOR_POST_MERGE_RECONCILIATION_PR = 71
WRI01_PRIOR_POST_MERGE_RECONCILIATION_SHA = 7d24bc22346a664b846c8345ffe172d73f52f11b
WRI01_CORRECTION_STATE = Accepted / Merged / Closed
WRI01_CORRECTION_PR = 72
WRI01_CORRECTION_HEAD = 61893694c00ceb846d3de3e0cf6862c94dc386a4
WRI01_CORRECTION_MERGE_SHA = 2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a
WRI01_CORRECTION_AUDIT = Accepted
WRI01_GATE_RUN = 31175025946
WRI01_GATE_RESULT = success
RELEASE_GATE_RUN = 31175025588
RELEASE_GATE_RESULT = success
PRM2_GATE_RUN = 31176940812
PRM2_GATE_RESULT = success
WRI01_LOCAL_POWERSHELL_PROOF = PASS
WRI01_LOCAL_PROOF_HEAD = 2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a
WRI01_REDIRECTED_WRANGLER_CONFIG_PROVED = true
WRI01_ROOT_DRY_RUN_PARITY_PROVED = true
WRI01_POST_CORRECTION_RECONCILIATION = completed
PR72_CORRECTION_REQUIRED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
FALLBACK_ORIGIN_CONFIGURED = false
SSL_PROVISIONING_EXECUTED = false
PRODUCTION_CUTOVER_EXECUTED = false
AUTO_MERGE_ENABLED = false
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
NO_AUTOMATIC_SUCCESSOR = true
```

The local PowerShell proof on the correction merge HEAD passed `bun install --frozen-lockfile`, `bun run build`, `bun run wri01:bundle-audit` and `bun run wri01:dry-run`. The next operation is not part of this runbook execution: a separately authorized DCA-01 controlled `workers.dev` proof after current Cloudflare prerequisites are confirmed.
