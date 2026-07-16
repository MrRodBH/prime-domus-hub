// LSV-01 · Lote A — Aggregator runner.
//
// Executes the mandatory command sequence for the Lote A completion
// contract, captures real exit codes AND merges them into the same
// evidence JSON produced by the live runner. Silent evidence loss is
// not acceptable — the aggregator fails closed if the merged evidence
// cannot be persisted.

import { spawnSync } from "node:child_process";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  openSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";

const EVIDENCE_PATH =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsv-01-lot-a-live-execution.json";

interface Step {
  readonly name: string;
  readonly evidenceKey:
    | "typecheck_exit"
    | "build_exit"
    | "structural_harness_exit"
    | "live_harness_exit"
    | "lsh_regression_exit";
  readonly cmd: string;
  readonly args: readonly string[];
}

const STEPS: readonly Step[] = [
  { name: "typecheck", evidenceKey: "typecheck_exit", cmd: "bunx", args: ["tsgo", "--noEmit"] },
  { name: "build", evidenceKey: "build_exit", cmd: "bun", args: ["run", "build"] },
  { name: "harness", evidenceKey: "structural_harness_exit", cmd: "bun", args: ["run", "test:lsv-01:harness"] },
  { name: "live", evidenceKey: "live_harness_exit", cmd: "bun", args: ["run", "test:lsv-01:live"] },
  { name: "lsh-regression", evidenceKey: "lsh_regression_exit", cmd: "bun", args: ["run", "test:lsh-01"] },
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

// Merge exits into the evidence produced by the live runner. If the live
// runner never wrote a file (edge case), create a minimal skeleton so the
// exits are still persisted — never let typecheck/build/etc. exits vanish.
type Evidence = Record<string, unknown>;
let evidence: Evidence = {};
try {
  if (existsSync(EVIDENCE_PATH)) {
    evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8")) as Evidence;
  }
} catch {
  evidence = {};
}
evidence.typecheck_exit = results.typecheck;
evidence.build_exit = results.build;
evidence.structural_harness_exit = results.harness;
evidence.live_harness_exit = results.live;
evidence.lsh_regression_exit = results["lsh-regression"];
evidence.aggregate_exit = aggregate;

const persisted = writeEvidenceAtomic(EVIDENCE_PATH, evidence);
evidence.evidence_persisted = persisted.ok && evidence.evidence_persisted !== false ? true : persisted.ok;
const persisted2 = writeEvidenceAtomic(EVIDENCE_PATH, evidence);

console.log(`lsv-01-lot-a: aggregate_exit=${aggregate}`);
console.log(`lsv-01-lot-a: exits=${JSON.stringify(results)}`);
console.log(`lsv-01-lot-a: evidence_persisted=${persisted2.ok}`);

if (!persisted2.ok) {
  console.log(`lsv-01-lot-a: FATAL — evidence persistence failed (${persisted2.error ?? "unknown"}).`);
  process.exit(aggregate || 1);
}

process.exit(aggregate);

function writeEvidenceAtomic(path: string, obj: unknown): { ok: boolean; error?: string } {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    const payload = JSON.stringify(obj, null, 2) + "\n";
    writeFileSync(tmp, payload, "utf8");
    const fd = openSync(tmp, "r+");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, path);
    const readback = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    if (readback.aggregate_exit !== (obj as Record<string, unknown>).aggregate_exit) {
      return { ok: false, error: "readback_mismatch" };
    }
    return { ok: true };
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* best-effort */
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
