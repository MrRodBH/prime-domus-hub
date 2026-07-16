// LSV-01 · Lote A — Aggregator runner.
//
// Executes the mandatory command sequence for the Lote A completion
// contract and captures real exit codes:
//   * bunx tsgo --noEmit
//   * bun run build
//   * bun run test:lsv-01:harness
//   * bun run test:lsv-01:live
//   * bun run test:lsh-01
//
// Without an authorized non-production target, the live step MUST exit
// non-zero (that is the expected state until provisioning). The
// aggregator therefore exits non-zero in that case as well.

import { spawnSync } from "node:child_process";

interface Step {
  readonly name: string;
  readonly cmd: string;
  readonly args: readonly string[];
}

const STEPS: readonly Step[] = [
  { name: "typecheck", cmd: "bunx", args: ["tsgo", "--noEmit"] },
  { name: "build", cmd: "bun", args: ["run", "build"] },
  { name: "harness", cmd: "bun", args: ["run", "test:lsv-01:harness"] },
  { name: "live", cmd: "bun", args: ["run", "test:lsv-01:live"] },
  { name: "lsh-regression", cmd: "bun", args: ["run", "test:lsh-01"] },
];

const results: Record<string, number> = {};

for (const step of STEPS) {
  const r = spawnSync(step.cmd, step.args, {
    stdio: "inherit",
    env: process.env,
  });
  const code = r.status ?? (r.error ? 127 : 1);
  results[step.name] = code;
  console.log(`lsv-01-lot-a: step=${step.name} exit=${code}`);
}

const aggregate = Object.values(results).reduce((acc, c) => acc || c, 0);
console.log(`lsv-01-lot-a: aggregate_exit=${aggregate}`);
console.log(`lsv-01-lot-a: exits=${JSON.stringify(results)}`);
process.exit(aggregate);
