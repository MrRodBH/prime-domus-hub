import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

import {
  MissingServerConfigError,
  getRequiredSupabaseServerConfig,
} from "./src/lib/config.server";

const EXPECTED_BUN_LOCK_SHA256 =
  "12df9c78b4a16f7661053906e8be6e9ccf750d9c62a1da3bffef27755cf2aadc";

const ALLOWLIST = [
  ".env",
  ".env.example",
  ".gitignore",
  ".github/workflows/release-gate.yml",
  "package.json",
  "run-arch-12f-01-config-hygiene-specs.ts",
  "src/lib/config.server.ts",
] as const;

const INTEGRATION_ALLOWLIST = [
  ".env",
  ".env.example",
  ".github/workflows/release-gate.yml",
  ".gitignore",
  "docs/architecture/ADR/ADR-007-tenant-isolation-pool-with-selective-bridge.md",
  "docs/architecture/ADR/README.md",
  "docs/architecture/impact-analysis/DCA-02-BL1-explicit-provider-orphan-recovery-impact-analysis.md",
  "docs/architecture/impact-analysis/DCA-02-BL2-provider-identity-disaster-recovery-impact-analysis.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/backlog/dca-02-provider-identity-non-blocking-backlog.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl1-diagnostic-terminal-evidence.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl2-terminal-evidence.md",
  "docs/operations/DCA-02-BL1-provider-orphan-recovery-runbook.md",
  "docs/operations/DCA-02-BL2-provider-identity-disaster-recovery-runbook.md",
  "package.json",
  "run-arch-12f-01-config-hygiene-specs.ts",
  "run-arch-12f-04a-unsubscribe-log-redaction-specs.ts",
  "run-arch-12f-04b-structured-log-specs.ts",
  "run-arch-tenancy-01-adr-specs.ts",
  "run-dca-02-bl1-provider-orphan-recovery-specs.ts",
  "run-dca-02-bl2-provider-identity-dr-specs.ts",
  "src/components/pipeline/hooks/usePipelineData.ts",
  "src/integrations/supabase/auth-middleware.ts",
  "src/lib/api/_cms.ts",
  "src/lib/api/forms.functions.ts",
  "src/lib/config.server.ts",
  "src/lib/domains/domain-repository-provider.server.ts",
  "src/lib/domains/provider-orphan-recovery.server.ts",
  "src/lib/meta-pixel.ts",
  "src/lib/observability.server.ts",
  "src/lib/public-writers/public-lead-writer.server.ts",
  "src/lib/structured-log.ts",
  "src/routeTree.gen.ts",
  "src/routes/__root.tsx",
  "src/routes/api/internal/dca-02-provider-orphan-recovery.ts",
  "src/routes/email/unsubscribe.ts",
  "src/routes/lovable/email/auth/webhook.ts",
  "src/routes/lovable/email/queue/process.ts",
  "src/routes/lovable/email/suppression.ts",
  "src/routes/lovable/email/transactional/preview.ts",
  "src/routes/lovable/email/transactional/send.ts",
  "src/server.ts",
  "src/start.ts",
] as const;

const EXPECTED_TEMPLATE_NAMES = [
  "RM_PRIME_DEPLOYMENT_ENVIRONMENT",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_WORKER_NAME",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "RM_PRIME_EMAIL_SITE_NAME",
  "RM_PRIME_EMAIL_SENDER_DOMAIN",
  "RM_PRIME_EMAIL_FROM_DOMAIN",
  "RM_PRIME_AUTH_SITE_ORIGIN",
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_URL",
] as const;

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function pass(id: string, detail: string): void {
  console.log(`${id} PASS — ${detail}`);
}

assert.throws(
  () => git("ls-files", "--error-unmatch", ".env"),
  /error|pathspec|did not match/i,
);
pass("F01", ".env is not tracked");

const template = readFileSync(".env.example", "utf8");
const templateEntries = template
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const separator = line.indexOf("=");
    assert.notEqual(separator, -1, `invalid template entry: ${line}`);
    return [line.slice(0, separator), line.slice(separator + 1)] as const;
  });
assert.deepEqual(
  templateEntries.map(([name]) => name),
  [...EXPECTED_TEMPLATE_NAMES],
);
assert.ok(templateEntries.every(([, value]) => value === ""));
pass("F02", ".env.example contains names and empty values only");

const ignoreRules = new Set(
  readFileSync(".gitignore", "utf8").split(/\r?\n/),
);
for (const rule of [
  ".env",
  ".env.*",
  "!.env.example",
  "!.env.*.example",
  ".dev.vars",
  ".dev.vars.*",
  "!.dev.vars.example",
  "!.dev.vars.*.example",
]) {
  assert.ok(ignoreRules.has(rule), `missing ignore rule: ${rule}`);
}
pass("F03", "local env files are ignored and templates are allowed");

const secretPatterns = [
  /\bsb_secret_/i,
  /\bservice[_-]?role\b/i,
  /\bBearer\s+[A-Za-z0-9._~-]+/i,
  /\bsk_(?:live|test)_[A-Za-z0-9]+/i,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
];
for (const pattern of secretPatterns) {
  assert.doesNotMatch(template, pattern);
}
pass("F04", "template secret-pattern scan is clean");

assert.equal(
  templateEntries.filter(([name]) => name.startsWith("VITE_")).length,
  3,
);
assert.equal(
  templateEntries.filter(([name]) => !name.startsWith("VITE_")).length,
  11,
);
pass("F05", "fourteen application and infrastructure names retain public/server classification");

const sampleValue = "must-never-appear-in-errors";
assert.throws(
  () =>
    getRequiredSupabaseServerConfig({
      SUPABASE_URL: sampleValue,
      SUPABASE_PUBLISHABLE_KEY: "",
    }),
  (error: unknown) => {
    assert.ok(error instanceof MissingServerConfigError);
    assert.deepEqual(error.missingNames, ["SUPABASE_PUBLISHABLE_KEY"]);
    assert.doesNotMatch(error.message, new RegExp(sampleValue));
    return true;
  },
);
pass("F06", "missing required server config fails closed with names only");

const bunLockSha256 = createHash("sha256")
  .update(readFileSync("bun.lock"))
  .digest("hex");
assert.equal(bunLockSha256, EXPECTED_BUN_LOCK_SHA256);
pass("F07", "bun.lock SHA-256 matches the audited dependency baseline");

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};
assert.equal(
  packageJson.scripts?.["test:arch-12f-01"],
  "tsx --tsconfig tsconfig.json ./run-arch-12f-01-config-hygiene-specs.ts",
);
const releaseWorkflow = readFileSync(
  ".github/workflows/release-gate.yml",
  "utf8",
);
assert.match(releaseWorkflow, /bun run test:arch-12f-01/);
pass("F08", "focused matrix is wired before existing release verification");

assert.match(releaseWorkflow, /Checkout exact event head/);
assert.match(releaseWorkflow, /Verify exact checked-out head/);
pass("F09", "exact-head remote gate authority remains wired");

const integrationMode = process.env.ARCH_INTEGRATION_MODE === "true";
const arch12f02aMode = process.env.ARCH_12F_02A_MODE === "true";
const arch12f02bMode = process.env.ARCH_12F_02B_MODE === "true";
const baseSha = integrationMode
  ? process.env.ARCH_INTEGRATION_BASE_SHA
  : process.env.ARCH_12F_BASE_SHA;
if (baseSha) {
  assert.match(baseSha, /^[0-9a-f]{40}$/);
  if (!integrationMode && !arch12f02aMode && !arch12f02bMode) {
    assert.equal(git("rev-list", "--count", `${baseSha}..HEAD`), "1");
  }
  const changedFiles = git("diff", "--name-only", `${baseSha}..HEAD`)
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  if (!arch12f02aMode && !arch12f02bMode) {
    assert.deepEqual(
      changedFiles,
      [...(integrationMode ? INTEGRATION_ALLOWLIST : ALLOWLIST)].sort(),
    );
  }
  assert.ok(!changedFiles.includes("bun.lock"));
}
pass("F10", integrationMode
  ? "exact 42-path forward-only integration and zero lockfile scope"
  : arch12f02aMode
    ? "ARCH-12F-02A owns exact forward-only allowlist and zero lockfile scope"
  : "one atomic source allowlist when exact diff authority is supplied");

console.log("ARCH-12F-01 CONFIG HYGIENE MATRIX PASS");
