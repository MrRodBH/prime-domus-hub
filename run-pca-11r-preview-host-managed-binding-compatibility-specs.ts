import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  buildContract,
  MANIFEST_PATH,
  SOURCE_MAIN,
} from "./scripts/build-pca-11r-preview-host-managed-binding-compatibility.mjs";
import {
  PCA11_DEDICATED_WORKER,
  PCA11_PREVIEW_ALIAS,
  PCA11_SYNTHETIC_TENANT_SLUG,
  materializeManagedBindings,
  resolveManagedInactiveVersionTarget,
} from "./src/lib/cloudflare/managed-inactive-version-contract.server";
import { parseExactPreviewHostMap, resolvePublicHostAuthority } from "./src/lib/tenant.server";

const read = (path: string) => readFileSync(path, "utf8");
const exactHost = `${PCA11_PREVIEW_ALIAS}-${PCA11_DEDICATED_WORKER}.rmprime.workers.dev`;
const exactMap = JSON.stringify({ [exactHost]: PCA11_SYNTHETIC_TENANT_SLUG });

const parsed = parseExactPreviewHostMap(exactMap);
assert.equal(parsed.size, 1);
assert.equal(parsed.get(exactHost), PCA11_SYNTHETIC_TENANT_SLUG);
assert.deepEqual(resolvePublicHostAuthority(exactHost, undefined, exactMap), {
  kind: "preview_slug",
  host: exactHost,
  slug: PCA11_SYNTHETIC_TENANT_SLUG,
});
assert.deepEqual(
  resolvePublicHostAuthority(
    `adjacent-${PCA11_DEDICATED_WORKER}.rmprime.workers.dev`,
    undefined,
    exactMap,
  ),
  { kind: "none", reason: "unmapped_preview_host" },
);
assert.throws(
  () => parseExactPreviewHostMap(JSON.stringify({ [exactHost]: "real-tenant" })),
  /synthetic tenant/,
);
assert.throws(
  () =>
    parseExactPreviewHostMap(
      JSON.stringify({
        [exactHost]: PCA11_SYNTHETIC_TENANT_SLUG,
        [`${PCA11_PREVIEW_ALIAS}-${PCA11_DEDICATED_WORKER}.other.workers.dev`]:
          PCA11_SYNTHETIC_TENANT_SLUG,
      }),
    ),
  /exactly one preview host/,
);
assert.throws(
  () =>
    parseExactPreviewHostMap(
      JSON.stringify({
        [`.${PCA11_DEDICATED_WORKER}.workers.dev`]: PCA11_SYNTHETIC_TENANT_SLUG,
      }),
    ),
  /non-PCA-11 preview host/,
);

const target = resolveManagedInactiveVersionTarget(PCA11_DEDICATED_WORKER);
assert.ok(target);
assert.equal(target.workerId, PCA11_DEDICATED_WORKER);
assert.equal(target.expectedActiveDeploymentCount, 0);
assert.equal(target.expectedPreviewsEnabled, false);
assert.equal(target.requireSourceFingerprint, true);
assert.equal(resolveManagedInactiveVersionTarget("attacker-selected-worker"), null);
assert.deepEqual(
  target.canaryBindings.map(({ name, kind }) => ({ name, kind })),
  [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "RM_PRIME_AUTH_SITE_ORIGIN",
    "RM_PRIME_EMAIL_SITE_NAME",
    "RM_PRIME_EMAIL_SENDER_DOMAIN",
    "RM_PRIME_EMAIL_FROM_DOMAIN",
  ].map((name) => ({ name, kind: "plain_text" })),
);

const requiredEnvironment = Object.fromEntries(
  [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "RM_PRIME_AUTH_SITE_ORIGIN",
    "RM_PRIME_EMAIL_SITE_NAME",
    "RM_PRIME_EMAIL_SENDER_DOMAIN",
    "RM_PRIME_EMAIL_FROM_DOMAIN",
    "SUPABASE_SERVICE_ROLE_KEY",
  ].map((name) => [name, `managed-${name.toLowerCase()}`]),
) as NodeJS.ProcessEnv;
const final = materializeManagedBindings(target.finalBindings, requiredEnvironment);
assert.deepEqual(final.unavailableOptionalBindings, [
  "CLOUDFLARE_API_TOKEN_DCA01_HML",
  "LOVABLE_API_KEY",
  "PORTAL_DLQ_RETRY_SECRET",
]);
assert.equal(final.bindings.filter(({ type }) => type === "plain_text").length, 6);
assert.deepEqual(
  final.bindings.filter(({ type }) => type === "secret_text").map(({ name }) => name),
  ["SUPABASE_SERVICE_ROLE_KEY"],
);

const helper = read("src/lib/spr-03/managed-secret-provisioning.server.ts");
const route = read("src/routes/api/internal/pca-11-managed-binding-provision.ts");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const environmentTemplate = read(".env.example");
const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract());
assert.match(helper, /CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER/);
assert.match(helper, /"workers\/alias": PCA11_PREVIEW_ALIAS/);
assert.match(helper, /pca11_source_fingerprint_mismatch/);
assert.match(helper, /target\.expectedActiveDeploymentCount === 0/);
assert.match(helper, /target\.workerId/);
assert.match(helper, /unavailableProviderBindings/);
assert.doesNotMatch(helper, /CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER.*bindings:/s);
assert.match(route, /createFileRoute\("\/api\/internal\/pca-11-managed-binding-provision"\)/);
for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
  assert.match(route, new RegExp(`${method}: methodNotAllowed`));
}
assert.match(route, /request\.headers\.has\("x-tenant-id"\)/);
assert.match(route, /executePca11ManagedBindingProvisioning/);
assert.equal(wrangler.workers_dev, false);
assert.equal(wrangler.preview_urls, false);
assert.deepEqual(wrangler.routes, []);
assert.deepEqual(wrangler.triggers.crons, []);
assert.match(environmentTemplate, /PUBLIC_TENANT_PREVIEW_HOST_MAP=/);

const baseSha = process.env.PCA_11R_BASE_SHA?.trim();
if (baseSha) {
  assert.match(baseSha, /^[0-9a-f]{40}$/);
  assert.equal(baseSha, SOURCE_MAIN);
  const changed = execFileSync("git", ["diff", "--name-only", `${baseSha}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  const allowed = new Set([
    ".env.example",
    ".github/workflows/release-gate.yml",
    "docs/architecture/governance/PCA-11R-cloudflare-dedicated-preview-host-managed-binding-compatibility-envelope.md",
    "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md",
    "docs/architecture/impact-analysis/PCA-11R-cloudflare-dedicated-preview-host-managed-binding-compatibility-corrective.md",
    "docs/architecture/impact-analysis/manifests/PCA-11R-preview-host-managed-binding-compatibility-manifest.json",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-11r-preview-host-managed-binding-compatibility.md",
    "package.json",
    "run-pca-11r-preview-host-managed-binding-compatibility-specs.ts",
    "run-spr-03-worker-bootstrap-managed-secret-recovery-specs.ts",
    "scripts/build-pca-11-exact-main-runtime-candidate-envelope.mjs",
    "scripts/build-pca-11r-preview-host-managed-binding-compatibility.mjs",
    "src/lib/cloudflare/managed-inactive-version-contract.server.ts",
    "src/lib/spr-03/managed-secret-provisioning.server.ts",
    "src/lib/tenant.server.ts",
    "src/routeTree.gen.ts",
    "src/routes/api/internal/pca-11-managed-binding-provision.ts",
  ]);
  assert.ok(changed.length > 0, "PCA-11R exact diff must not be empty");
  assert.deepEqual(
    changed.filter((path) => !allowed.has(path)),
    [],
    "PCA-11R diff exceeded its closed allowlist",
  );
}

console.log("PCA-11R dedicated preview-host and managed-binding compatibility: PASS");
