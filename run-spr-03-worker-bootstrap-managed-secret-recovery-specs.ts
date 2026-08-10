import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const md5 = (value: string) => createHash("md5").update(value).digest("hex");
let assertions = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); assertions += 1; };
const equal = (actual: unknown, expected: unknown, message: string) => { assert.equal(actual, expected, message); assertions += 1; };
const match = (value: string, pattern: RegExp, message: string) => { assert.match(value, pattern, message); assertions += 1; };

const wrangler = JSON.parse(read("wrangler.jsonc")) as Record<string, any>;
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
const wri = read("run-wri-01-cloudflare-worker-runtime-specs.ts");
const helper = read("src/lib/spr-03/managed-secret-provisioning.server.ts");
const route = read("src/routes/api/internal/spr-03-managed-secret-provision.ts");
const migration1 = read("supabase/migrations/20260810220152_1ee179b2-60f0-4ce1-b259-06762002733b.sql");
const migration2 = read("supabase/migrations/20260810220939_b80a4010-1d42-48a9-bbcd-7d2d9e0ea84b.sql");

// Bootstrap-safe single deploy authority.
equal(wrangler.name, "rm-prime-wri01-hml", "Canonical Worker name must remain frozen");
equal(wrangler.main, "dist/server/index.mjs", "Canonical Nitro Worker entry must remain frozen");
equal(wrangler.workers_dev, false, "workers.dev must be disabled before bootstrap");
equal(wrangler.preview_urls, false, "Preview URLs must be explicitly disabled before bootstrap");
equal(wrangler.routes?.length, 0, "Worker Routes must remain zero during SPR-03");
equal(wrangler.triggers?.crons?.length, 0, "Cron triggers must remain zero during SPR-03");
equal(wrangler.no_bundle, true, "Wrangler must preserve the WRI-01 no_bundle artifact authority");
equal(wrangler.assets?.directory, "dist/client", "Static asset directory must preserve WRI-01 authority");
equal(wrangler.assets?.binding, "ASSETS", "Static asset binding must preserve WRI-01 authority");
const wranglerAuthorities = readdirSync(root).filter((name) => /^wrangler\.(?:jsonc|json|toml)$/i.test(name));
equal(JSON.stringify(wranglerAuthorities.sort()), JSON.stringify(["wrangler.jsonc"]), "Exactly one versioned Wrangler deploy authority is allowed");

// WRI-01 regression keeps runtime/build authority but follows SPR-03 activation policy.
match(wri, /wrangler\.workers_dev, false/, "WRI-01 specs must assert workers.dev disabled");
match(wri, /wrangler\.preview_urls, false/, "WRI-01 specs must assert Preview URLs disabled");
match(wri, /wrangler\.triggers\?\.crons\?\.length, 0/, "WRI-01 specs must assert zero Cron triggers");
equal(wri.includes('"*/5 * * * *"'), false, "Historical Cron activation must not remain as a current WRI assertion");
match(wri, /@lovable\.dev\/vite-tanstack-config/, "WRI-01 build authority assertion must remain present");
match(wri, /wri-01-cloudflare-nitro-plugin\.server\.ts/, "WRI-01 Nitro bridge assertion must remain present");

// R2: repository files must byte-match the exact already-applied migration statements.
equal(md5(migration1), "fc5049e9d04a8ed9c88cf371a2a8515f", "First historical migration must exactly match live migration history");
equal(md5(migration2), "66b234196163d12edb8a32fe18f5e15e", "Second historical migration must exactly match live migration history");
match(migration1, /ENABLE ROW LEVEL SECURITY/, "Historical control table must preserve RLS enablement");
match(migration1, /REVOKE ALL ON public\.spr02_managed_secret_ceremonies FROM anon/, "Historical migration must preserve anon revoke");
match(migration1, /REVOKE ALL ON public\.spr02_managed_secret_ceremonies FROM authenticated/, "Historical migration must preserve authenticated revoke");
match(migration1, /GRANT SELECT, INSERT, UPDATE ON public\.spr02_managed_secret_ceremonies TO service_role/, "Historical migration must preserve service-role-only operations");
equal(/(api[_ -]?key|bearer\s+[A-Za-z0-9._-]{16,}|eyJ[A-Za-z0-9_-]{12,})/i.test(migration1 + migration2), false, "Parity migrations must contain no credential values");

// One-shot authenticated server boundary.
match(route, /createFileRoute\("\/api\/internal\/spr-03-managed-secret-provision"\)/, "SPR-03 route path must be exact");
for (const method of ["GET", "PUT", "PATCH", "DELETE"]) match(route, new RegExp(`${method}: methodNotAllowed`), `${method} must return 405`);
match(route, /request\.headers\.has\("x-tenant-id"\)/, "Global ceremony must explicitly reject x-tenant-id");
match(route, /authorization\.startsWith\("Bearer "\)/, "Route must require Bearer transport");
match(route, /executeSpr03Provisioning/, "Route must delegate sensitive logic to server-only helper");
equal(route.includes("SUPABASE_SERVICE_ROLE_KEY"), false, "Route file must not handle the service-role secret directly");

// Server-side authorization and fail-closed request schema.
match(helper, /authClient\.auth\.getClaims\(token\)/, "Bearer token must be cryptographically validated through canonical Supabase Auth");
match(helper, /\.from\("user_roles"\)[\s\S]*\.eq\("user_id", userId\)[\s\S]*\.eq\("role", "super_admin"\)/, "Exact global super_admin must be proven server-side");
match(helper, /allowed = new Set\(\["ceremony_id", "expected_worker_id", "expected_bootstrap_version_id", "phase"\]\)/, "Request body must use a closed sanitized allowlist");
match(helper, /\(tenant\|secret\|token\|authorization\|role\|user\|key\)/i, "Secret-like and authority-like request fields must be rejected");
equal(helper.includes("ORDER BY"), false, "No first-row heuristic authority may be introduced");
equal(helper.includes("LIMIT 1"), false, "No LIMIT 1 authority may be introduced");

// Managed provisioner must be server-only and required before provider access.
const provisionerIndex = helper.indexOf('requireEnv("CLOUDFLARE_API_TOKEN_SPR03_PROVISIONER")');
const providerIndex = helper.indexOf("assertBootstrapProviderState(provisioner");
ok(provisionerIndex >= 0 && providerIndex > provisionerIndex, "Missing SPR-03 provisioner must fail before Cloudflare access");
equal(JSON.stringify(wrangler).includes("CLOUDFLARE_API_TOKEN_SPR03_PROVISIONER"), false, "Provisioner must never be a Worker binding");

// Provider ceremony: one active bootstrap, one inactive canary, at most one inactive final version.
match(helper, /deployments\.length !== 1/, "Provider state must require exactly one bootstrap deployment");
match(helper, /versions\.length !== 1 \|\| versions\[0\]\?\.percentage !== 100/, "Bootstrap deployment must pin exactly one version at 100%");
match(helper, /subdomain\?\.enabled !== false \|\| subdomain\?\.previews_enabled !== false/, "Provider revalidation must require workers.dev and Preview URLs disabled");
match(helper, /scheduleList\.length !== 0/, "Provider revalidation must require zero Cron schedules");
match(helper, /spr03-canary-\$\{input\.ceremony_id\}/, "Canary must carry deterministic reconciliation annotation");
match(helper, /spr03-final-\$\{input\.ceremony_id\}/, "Final version must carry deterministic reconciliation annotation");
match(helper, /\/versions`,[\s\S]*method: "POST"/, "Canary/final ceremony must use the version-only upload endpoint");
match(helper, /active === versionId[\s\S]*spr03_inactive_version_deployed/, "Canary/final versions must fail closed if deployed");
match(helper, /keep_assets = true/, "Version-only source preservation must retain the bootstrap asset set");
match(helper, /content\/v2/, "Version uploads must clone current canonical Worker source rather than introduce a second source authority");

const expectedSecrets = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CLOUDFLARE_API_TOKEN_DCA01_HML"].sort();
const helperSecretNames = [...helper.matchAll(/"(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN_DCA01_HML)"/g)].map((match) => match[1]);
for (const name of expectedSecrets) ok(helperSecretNames.includes(name), `Final secret allowlist must include ${name}`);
match(helper, /secrets\.map\(\(\{ name, text \}\) => \(\{ type: "secret_text", name, text \}\)\)/, "Final secrets must use one complete version-upload transaction");
match(helper, /JSON\.stringify\(names\) !== JSON\.stringify\(\[\.\.\.FINAL_SECRET_NAMES\]\.sort\(\)\)/, "Final provider evidence must match the exact secret-name allowlist");

// No Cloudflare SDK or second deploy dependency was introduced.
equal("cloudflare" in (pkg.dependencies ?? {}), false, "Cloudflare SDK dependency must not be introduced");
equal("cloudflare" in (pkg.devDependencies ?? {}), false, "Cloudflare SDK dev dependency must not be introduced");
equal("@cloudflare/vite-plugin" in (pkg.devDependencies ?? {}), false, "Second Worker build authority remains prohibited");
ok(pkg.scripts["test:spr-03"], "SPR-03 deterministic test script must be registered");

console.log(`SPR-03 bootstrap and managed-secret recovery specs passed: ${assertions} assertions`);
