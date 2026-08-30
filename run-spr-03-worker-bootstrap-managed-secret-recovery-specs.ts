import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const diagnosticPath = resolve(root, ".wri01-bundle-audit-diagnostic.json");
process.on("uncaughtExceptionMonitor", (error) => {
  try {
    writeFileSync(
      diagnosticPath,
      JSON.stringify(
        {
          schema_version: 1,
          producer: "spr-03-spec-preflight",
          phase: "test:spr-03",
          error_name: error instanceof Error ? error.name : "UnknownError",
          assertion_message: error instanceof Error ? error.message : "unknown_preflight_failure",
        },
        null,
        2,
      ),
    );
  } catch {
    // Diagnostic persistence must never mask the original fail-closed test failure.
  }
});
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const canonicalSql = (value: string) => value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trimEnd();
let assertions = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); assertions += 1; };
const equal = (actual: unknown, expected: unknown, message: string) => { assert.equal(actual, expected, message); assertions += 1; };
const match = (value: string, pattern: RegExp, message: string) => { assert.match(value, pattern, message); assertions += 1; };

const wrangler = JSON.parse(read("wrangler.jsonc")) as Record<string, any>;
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
const wri = read("run-wri-01-cloudflare-worker-runtime-specs.ts");
const vite = read("vite.config.ts");
const helper = read("src/lib/spr-03/managed-secret-provisioning.server.ts");
const managedContract = read("src/lib/cloudflare/managed-inactive-version-contract.server.ts");
const route = read("src/routes/api/internal/spr-03-managed-secret-provision.ts");
const migration1 = read("supabase/migrations/20260810220152_1ee179b2-60f0-4ce1-b259-06762002733b.sql");
const migration2 = read("supabase/migrations/20260810220939_b80a4010-1d42-48a9-bbcd-7d2d9e0ea84b.sql");

const EXPECTED_MIGRATION_1 = `CREATE TABLE public.spr02_managed_secret_ceremonies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ceremony_id text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'executing' CHECK (state IN ('executing','reconciling','completed','failed')),
  expected_git_head text NOT NULL,
  expected_worker_id text NOT NULL,
  expected_source_version_id text,
  expected_source_digest text,
  canary_version_id text,
  final_version_id text,
  classification text,
  annotation text,
  lease_started_at timestamp with time zone NOT NULL DEFAULT now(),
  lease_expires_at timestamp with time zone NOT NULL DEFAULT now() + interval '15 minutes',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM PUBLIC;
REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM anon;
REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.spr02_managed_secret_ceremonies TO service_role;

ALTER TABLE public.spr02_managed_secret_ceremonies ENABLE ROW LEVEL SECURITY;`;

const EXPECTED_MIGRATION_2 = `REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM PUBLIC;
REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM anon;
REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.spr02_managed_secret_ceremonies TO service_role;
ALTER TABLE public.spr02_managed_secret_ceremonies ENABLE ROW LEVEL SECURITY;`;

// Bootstrap-safe single deploy template. Provider identity is injected only
// after the ARCH-12F-02A preflight succeeds.
equal(wrangler.name, "__CLOUDFLARE_WORKER_NAME_REQUIRED__", "Versioned Worker name must remain a non-deployable sentinel");
equal("account_id" in wrangler, false, "Cloudflare account identity must remain outside versioned configuration");
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
match(wri, /CLOUDFLARE_WORKER_NAME/, "WRI-01 specs must bind the resolved Worker name to external configuration");
equal(wri.includes('"*/5 * * * *"'), false, "Historical Cron activation must not remain as a current WRI assertion");
match(vite, /@lovable\.dev\/vite-tanstack-config/, "WRI-01 build authority must remain the canonical Lovable/TanStack Vite config");
match(wri, /wri-01-cloudflare-nitro-plugin\.server\.ts/, "WRI-01 Nitro bridge assertion must remain present");

// R2: exact SQL semantics are frozen against the live history captured read-only.
// Git checkout/storage layers may normalize line endings; only BOM/line-ending/final-newline
// normalization is tolerated. SQL tokens, order, grants and effects must remain byte-identical otherwise.
equal(canonicalSql(migration1), canonicalSql(EXPECTED_MIGRATION_1), "First historical migration must exactly match live migration history after transport-only newline normalization");
equal(canonicalSql(migration2), canonicalSql(EXPECTED_MIGRATION_2), "Second historical migration must exactly match live migration history after transport-only newline normalization");
equal(Buffer.byteLength(canonicalSql(migration1), "utf8"), 1143, "First historical migration canonical byte length must match live history");
equal(Buffer.byteLength(canonicalSql(migration2), "utf8"), 368, "Second historical migration canonical byte length must match live history");
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
const executeBoundaryStart = helper.indexOf("async function executeManagedInactiveVersionProvisioning");
const executeBoundary = executeBoundaryStart >= 0 ? helper.slice(executeBoundaryStart) : "";
const provisionerIndex = executeBoundary.indexOf("const provisioner = requireEnv(provisionerName)");
const providerIndex = executeBoundary.indexOf("assertBootstrapProviderState(provisioner, target");
ok(executeBoundaryStart >= 0 && provisionerIndex >= 0 && providerIndex > provisionerIndex, "Missing stage-specific provisioner must fail before Cloudflare access");
match(helper, /CLOUDFLARE_API_TOKEN_SPR03_PROVISIONER/, "Historical SPR-03 provisioner remains stage-specific");
equal(JSON.stringify(wrangler).includes("CLOUDFLARE_API_TOKEN_SPR03_PROVISIONER"), false, "Provisioner must never be a Worker binding");

// Provider ceremony: latest active deployment is authoritative; older deployment rows are history only.
match(helper, /deployments\.length === 0/, "Provider state must require at least one deployment record");
match(helper, /const latestDeployment = deployments\[0\]/, "Provider state must use Cloudflare's first/latest deployment as active authority");
equal(helper.includes("deployments.length !== 1"), false, "Historical deployment rows must not be misclassified as active cardinality");
match(helper, /versions\.length !== 1 \|\| versions\[0\]\?\.percentage !== 100/, "Active deployment must pin exactly one version at 100%");
match(helper, /subdomain\?\.enabled !== false \|\| subdomain\?\.previews_enabled !== target\.expectedPreviewsEnabled/, "Provider revalidation must require target-specific preview authority");
match(helper, /scheduleList\.length !== 0/, "Provider revalidation must require zero Cron schedules");

// Provider version-list reconciliation: Cloudflare returns result.items, never a silent empty fallback.
match(helper, /const items = result\?\.items/, "Version list parser must read exact Cloudflare result.items authority");
match(helper, /if \(!Array\.isArray\(items\)\)/, "Unknown version list shape must fail closed");
match(helper, /spr03_version_list_shape/, "Version list shape failure must have an explicit fail-closed error code");
match(helper, /spr03_version_list_item_shape/, "Version list entries must be validated before reconciliation");
match(helper, /return versionListItems\(result\)/, "listVersions must use the validated provider response parser");
equal(helper.includes("return Array.isArray(result) ? result : []"), false, "Version-list provider drift must never degrade to an empty reconciliation set");

// Provider source snapshot reconstruction: no multipart metadata heuristic is allowed.
match(helper, /const SOURCE_MAIN_MODULE = "index\.mjs"/, "Cloudflare source main module must be frozen to the exact provider part name");
match(helper, /content\/v2/, "content/v2 must remain the source-module authority");
equal(helper.includes('form.get("metadata")'), false, "content/v2 must not be assumed to contain a metadata part");
match(helper, /versionDetail\(target, expectedBootstrapVersionId, provisioner\)/, "Pinned bootstrap Version Detail must be the runtime metadata authority");
match(helper, /bootstrapDetail\?\.resources\?\.script_runtime/, "Runtime metadata must come from resources.script_runtime");
match(helper, /runtime\?\.compatibility_date/, "compatibility_date must come from bootstrap script_runtime");
match(helper, /runtime\?\.compatibility_flags/, "compatibility_flags must come from bootstrap script_runtime");
ok(helper.includes("bootstrapDetail?.resources?.bindings"), "Bindings must come from bootstrap Version Detail");
match(helper, /sourceBindings\.length !== 1[\s\S]*bindingName\(sourceBindings\[0\]\) !== "ASSETS"[\s\S]*sourceBindings\[0\]\?\.type !== "assets"/, "Bootstrap binding must be exactly ASSETS/assets");
match(helper, /sourceBindings\.some\(\(binding: any\) => binding\?\.type === "secret_text" \|\| binding\?\.type === "secret_key"\)/, "Bootstrap secret bindings must fail closed");
match(helper, /mainModuleMatches = parts\.filter\(\(part\) => part\.field === SOURCE_MAIN_MODULE && part\.filename === SOURCE_MAIN_MODULE\)/, "Main module resolution must use exact field+filename equality");
match(helper, /mainModuleMatches\.length !== 1/, "Main module exact match must have cardinality exactly one");
equal(helper.includes('endsWith("index.mjs")'), false, "Suffix-based main-module selection is prohibited");
equal(helper.includes('includes("index.mjs")'), false, "Substring-based main-module selection is prohibited");
equal(helper.includes("path.basename"), false, "Basename heuristic main-module selection is prohibited");
match(helper, /main_module: source\.mainModule/, "Version upload metadata must explicitly set main_module from the validated snapshot");
match(helper, /compatibility_date: source\.compatibilityDate/, "Version upload metadata must explicitly set compatibility_date");
match(helper, /compatibility_flags: source\.compatibilityFlags/, "Version upload metadata must explicitly set compatibility_flags");
match(helper, /keep_assets: true/, "Version-only source preservation must retain the bootstrap asset set");
equal(helper.includes("source.metadata"), false, "Version upload metadata must not spread an untrusted downloaded metadata object");

match(helper, /\$\{target\.tagPrefix\}-canary-\$\{input\.ceremony_id\}/, "Canary must carry deterministic reconciliation annotation");
match(helper, /\$\{target\.tagPrefix\}-final-\$\{input\.ceremony_id\}/, "Final version must carry deterministic reconciliation annotation");
match(helper, /\/versions`,[\s\S]*method: "POST"/, "Canary/final ceremony must use the version-only upload endpoint");
match(helper, /active === versionId[\s\S]*spr03_inactive_version_deployed/, "Canary/final versions must fail closed if deployed");

const expectedSecrets = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CLOUDFLARE_API_TOKEN_DCA01_HML"].sort();
const helperSecretNames = [...managedContract.matchAll(/"(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN_DCA01_HML)"/g)].map((match) => match[1]);
for (const name of expectedSecrets) ok(helperSecretNames.includes(name), `Final secret allowlist must include ${name}`);
match(helper, /materializeManagedBindings/, "Final bindings must use the closed managed contract");
match(helper, /JSON\.stringify\(bindingNames\) !== JSON\.stringify\(expectedNames\)/, "Final provider evidence must match the exact binding-name allowlist");

// No Cloudflare SDK or second deploy dependency was introduced.
equal("cloudflare" in (pkg.dependencies ?? {}), false, "Cloudflare SDK dependency must not be introduced");
equal("cloudflare" in (pkg.devDependencies ?? {}), false, "Cloudflare SDK dev dependency must not be introduced");
equal("@cloudflare/vite-plugin" in (pkg.devDependencies ?? {}), false, "Second Worker build authority remains prohibited");
ok(pkg.scripts["test:spr-03"], "SPR-03 deterministic test script must be registered");

console.log(`SPR-03 bootstrap and managed-secret recovery specs passed: ${assertions} assertions`);
