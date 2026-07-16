// LSV-01 · Lote A — Harness runner (structural + guard negatives).
//
// This runner ONLY exercises the pure-structural harness spec:
//   * environment guard negatives (including opaque-unknown-ref);
//   * identity matrix invariants;
//   * client factory session isolation;
//   * fingerprint + runId shape.
//
// The live execution path (real Auth users, real JWTs, Tenant Context
// smoke tests, cleanup, orphan check) lives in run-lsv-01-live-specs.ts
// and is invoked separately via `test:lsv-01:live`. The Lote A aggregate
// (`test:lsv-01:lot-a`) chains harness → live → LSH-01 regression, so it
// fails when no authorized non-production target is configured.

import { runLsvHarnessSpecs } from "./tests/security/lsv-01/harness-smoke.spec";

async function main() {
  const { passed, failed } = await runLsvHarnessSpecs();
  console.log(
    `lsv-01-harness: passed=${passed} failed=${failed}`,
  );
  if (failed > 0) process.exit(1);
}

void main();
