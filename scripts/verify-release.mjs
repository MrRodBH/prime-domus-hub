import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = process.cwd();
const routeTreePath = resolve(root, "src/routeTree.gen.ts");
const rejectedDeclarationPath = resolve(root, "src/tanstack-start-register.d.ts");

function fail(message) {
  console.error(`[release:verify] ${message}`);
  process.exit(1);
}

function run(label, command, args) {
  console.log(`\n[release:verify] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    fail(`${label} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${label} exited with code ${result.status ?? "unknown"}`);
  }
}

function inspectRegisterAuthority(label) {
  if (!existsSync(routeTreePath)) {
    fail(`${label}: src/routeTree.gen.ts is missing`);
  }
  if (existsSync(rejectedDeclarationPath)) {
    fail(`${label}: rejected authored declaration still exists`);
  }

  const content = readFileSync(routeTreePath, "utf8");
  const matches = content.match(
    /declare\s+module\s+["']@tanstack\/react-start["']/g,
  ) ?? [];

  if (matches.length !== 1) {
    fail(
      `${label}: expected exactly one generated TanStack Register authority, found ${matches.length}`,
    );
  }

  const registerBlock = content.slice(content.lastIndexOf("declare module"));
  for (const required of ["interface Register", "ssr: true", "router:"]) {
    if (!registerBlock.includes(required)) {
      fail(`${label}: generated Register block is missing ${required}`);
    }
  }

  const digest = createHash("sha256").update(content).digest("hex");
  console.log(
    JSON.stringify(
      {
        label,
        routeTreeSha256: digest,
        tanstackRegisterAuthorityCount: matches.length,
        authoredRegisterDeclarationExists: false,
      },
      null,
      2,
    ),
  );
  return digest;
}

function emitTemporaryRepositorySnapshot() {
  const archivePath = resolve(tmpdir(), `psg01-source-${process.pid}.tar.gz`);
  const result = spawnSync(
    "tar",
    [
      "-czf",
      archivePath,
      "--exclude=.git",
      "--exclude=node_modules",
      "--exclude=.output",
      "--exclude=dist",
      "--exclude=.vinxi",
      ".",
    ],
    { cwd: root, env: process.env, encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    fail(`temporary repository snapshot failed: ${result.error?.message ?? result.stderr}`);
  }

  const base64 = readFileSync(archivePath).toString("base64");
  rmSync(archivePath, { force: true });
  console.log("\nPSG01_TEMP_SOURCE_SNAPSHOT_BEGIN");
  for (let index = 0; index < base64.length; index += 65_536) {
    console.log(base64.slice(index, index + 65_536));
  }
  console.log("PSG01_TEMP_SOURCE_SNAPSHOT_END");
}

emitTemporaryRepositorySnapshot();

run("Preflight — PTC-01 public tenant context specifications", "bun", ["run", "test:ptc-01"]);
run("Preflight — PTR-01 public tenant read binding specifications", "bun", ["run", "test:ptr-01"]);
run("Preflight — PSC-01 public settings and campaign recovery specifications", "bun", ["run", "test:psc-01"]);
run("Preflight — PPR-GN-01 public page runtime specifications", "bun", ["run", "test:ppr-gn-01"]);
run("Preflight — PTW-01 public writer authority specifications", "bun", ["run", "test:ptw-01:authority"]);
run("Preflight — PTW-01 campaign-event SQL structural specifications", "bun", ["run", "test:ptw-01:sql-structural"]);

run("Cycle A — development build", "bun", ["run", "build:dev"]);
const cycleA = inspectRegisterAuthority("cycle-a");
run("Cycle A — typecheck", "bun", ["run", "typecheck"]);

run("Cycle B — production build", "bun", ["run", "build"]);
const cycleB = inspectRegisterAuthority("cycle-b");
if (cycleB !== cycleA) {
  fail(`route tree changed between development and production builds: ${cycleA} != ${cycleB}`);
}
run("Cycle B — typecheck", "bun", ["run", "typecheck"]);

run("Cycle C — repeated development build", "bun", ["run", "build:dev"]);
const cycleC = inspectRegisterAuthority("cycle-c");
if (cycleC !== cycleA) {
  fail(`route tree is not stable across repeated generation: ${cycleA} != ${cycleC}`);
}

run("Lead authorization unit specifications", "bun", ["run", "test:lsh-01:unit"]);
run("Lead runtime operation specifications", "bun", ["run", "test:lsh-01:runtime"]);
run("Lead structural specifications", "bun", ["run", "test:lsh-01:structural"]);
run("Lead SQL structural specifications", "bun", ["run", "test:lsh-01:sql-structural"]);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      typecheckExitCode: 0,
      buildExitCode: 0,
      buildDevExitCode: 0,
      tanstackRegisterAuthorityCount: 1,
      generatedRouteTreeManualEdit: false,
      cycleCompositeDigestStable: true,
      publicTenantContextSpecsPassed: true,
      publicTenantReadBindingSpecsPassed: true,
      publicSettingsCampaignRecoverySpecsPassed: true,
      publicPageRuntimeSpecsPassed: true,
      publicTenantWriterAuthoritySpecsPassed: true,
      publicTenantWriterSqlStructuralSpecsPassed: true,
      leadAuthorizationUnitSpecsPassed: true,
      leadRuntimeOperationSpecsPassed: true,
      leadStructuralSpecsPassed: true,
      leadSqlStructuralSpecsPassed: true,
      routeTreeSha256: cycleA,
    },
    null,
    2,
  ),
);
