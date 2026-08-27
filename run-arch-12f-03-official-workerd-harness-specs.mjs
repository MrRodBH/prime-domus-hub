import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const config = read("scripts/arch-12f-03/workerd-single-dispatch.capnp");
const worker = read("scripts/arch-12f-03/workerd-single-dispatch-worker.mjs");
const runner = read("scripts/run-arch-12f-03-workerd-single-dispatch-harness.mjs");
const workflow = read(".github/workflows/release-gate.yml");

assert.equal(pkg.devDependencies.workerd, "1.20260825.1");
assert.match(read("bun.lock"), /workerd@1\.20260825\.1/);
assert.equal(
  execFileSync("node_modules/workerd/bin/workerd", ["--version"], {
    encoding: "utf8",
  }).trim(),
  "workerd 2026-08-25",
);

assert.match(config, /compatibilityDate = "2026-07-29"/);
assert.match(config, /globalOutbound = "deny"/);
assert.match(config, /network = \(allow = \[\]\)/);
assert.doesNotMatch(config, /account_id|workers_dev|route|cron|secret/i);

assert.match(worker, /request\.method !== "POST"/);
assert.match(worker, /seenRequestIds\.has\(requestId\)/);
assert.match(worker, /status: replay \? 409 : 200/);
assert.equal(
  worker.match(/fetch\s*\(/g)?.length,
  1,
  "the fixture may contain only its Worker fetch handler, never outbound fetch",
);

assert.match(runner, /createConnection/);
assert.match(runner, /"Connection: close"/);
assert.match(runner, /runPhase\("positive", \[positiveId\]\)/);
assert.match(runner, /runPhase\("negative-replay", \[replayId, replayId\]\)/);
assert.doesNotMatch(runner, /wrangler|fetch\s*\(|https?:\/\//i);

assert.equal(
  pkg.scripts["test:arch-12f-03"],
  "node ./run-arch-12f-03-official-workerd-harness-specs.mjs",
);
assert.match(pkg.scripts["verify:release"], /bun run test:arch-12f-03/);
assert.match(workflow, /Verify ARCH-12F-03 official workerd single-dispatch harness/);

const base = process.env.ARCH_12F_03_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  assert.deepEqual(changed, [
    ".github/workflows/release-gate.yml",
    "bun.lock",
    "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/arch-12f-03-official-workerd-single-dispatch-harness.md",
    "package.json",
    "run-arch-12f-01-config-hygiene-specs.ts",
    "run-arch-12f-03-official-workerd-harness-specs.mjs",
    "scripts/arch-12f-03/workerd-single-dispatch-worker.mjs",
    "scripts/arch-12f-03/workerd-single-dispatch.capnp",
    "scripts/run-arch-12f-03-workerd-single-dispatch-harness.mjs",
  ]);
}

execFileSync(process.execPath, ["scripts/run-arch-12f-03-workerd-single-dispatch-harness.mjs"], {
  stdio: "inherit",
});

console.log("ARCH-12F-03 official workerd harness specifications: PASS");
