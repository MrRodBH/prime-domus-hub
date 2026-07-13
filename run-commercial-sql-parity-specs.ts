// SCP-012.0.2.1 §13 — Runner for executable SQL/TypeScript parity harness.
// Executes against real PostgreSQL. Exits 1 on any failure.
// Usage: bunx tsx --tsconfig tsconfig.json ./run-commercial-sql-parity-specs.ts

import { runCommercialSeatSqlParitySpecs } from "./src/integrations/supabase/__tests__/commercial-seat-sql-parity.spec";

async function main() {
  if (!process.env.PGHOST) {
    console.error("PGHOST not set — parity harness requires direct DB access.");
    process.exit(1);
  }
  console.log("Running SCP-012.0.2.1 SQL/TypeScript parity harness against real PostgreSQL…");
  const { passed, failed, results } = await runCommercialSeatSqlParitySpecs();
  for (const r of results) {
    if (r.ok) {
      console.log(`  ✓ ${r.name}`);
    } else {
      console.log(`  ✗ ${r.name} — ${r.reason ?? "mismatch"}`);
      if (r.expected !== undefined) {
        console.log(`    expected: ${JSON.stringify(r.expected)}`);
        console.log(`    ts:       ${JSON.stringify(r.ts)}`);
        console.log(`    sql:      ${JSON.stringify(r.sql)}`);
      }
    }
  }
  console.log(`\nSCP-012.0.2.1 parity: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
