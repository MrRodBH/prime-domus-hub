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
SCHEDULED_HOOK_CONSUMER_COUNT = 1
CRON_EXPRESSION = */5 * * * * UTC
MAX_JOBS_PER_CYCLE = 20
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
