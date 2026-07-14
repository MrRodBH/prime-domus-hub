// F4-CF-01 — CURRENT CANONICAL INTEGRATION GATE for the executable
// SQL / TypeScript parity harness (`commercial-seat-sql-parity.spec.ts`).
//
// Reports three distinct groups:
//   • decision parity scenarios (SQL DTO × TS DTO × expected DTO,
//     full-field deep equal);
//   • rejection contract scenarios (real RPC errors with canonical
//     code + message);
//   • structural ordering assertion (canonical CREATE FUNCTION body
//     read from versioned migrations — proves the id-ASC tie-break
//     rule that the DTO cannot observe).
//
// Setup + scenarios are protected by a top-level try/finally; cleanup
// is always executed and its residual verification is fail-closed
// (any error, unexpected null response, or residual row aborts the
// runner). The `users.seats` catalog row is validated read-only —
// the harness never repairs production catalog state.
//
// Environment:
//   • SUPABASE_URL
//   • SUPABASE_SERVICE_ROLE_KEY
//   • COMMERCIAL_PARITY_INJECT_FAILURE_AFTER_SETUP=1 (test-only)
//     Injects a synthetic error after the first setupFixture returns
//     to demonstrate the fail-closed teardown. In this mode the
//     runner MUST exit non-zero and cleanup MUST leave zero residues.
//
// Usage:
//   bunx tsx --tsconfig tsconfig.json ./run-commercial-sql-parity-specs.ts

import { runCommercialSeatSqlParitySpecs } from "./src/integrations/supabase/__tests__/commercial-seat-sql-parity.spec";

async function main() {
  if (!process.env.SUPABASE_URL) {
    console.error("SUPABASE_URL is required.");
    process.exit(2);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required.");
    process.exit(2);
  }

  const injected = process.env.COMMERCIAL_PARITY_INJECT_FAILURE_AFTER_SETUP === "1";
  console.log(
    injected
      ? "F4-CF-01 harness — INJECTED-FAILURE mode (expects non-zero exit + zero residues)"
      : "F4-CF-01 canonical SQL/TypeScript parity harness — running…",
  );

  const result = await runCommercialSeatSqlParitySpecs();

  console.log("\nDecision parity:");
  for (const r of result.decisionResults) {
    if (r.ok) console.log(`  ✓ ${r.name}`);
    else {
      console.log(`  ✗ ${r.name} — ${r.reason ?? "mismatch"}`);
      if (r.expected !== undefined) {
        console.log(`    expected: ${JSON.stringify(r.expected)}`);
        console.log(`    ts:       ${JSON.stringify(r.ts)}`);
        console.log(`    sql:      ${JSON.stringify(r.sql)}`);
      }
    }
  }

  console.log("\nRejection contract:");
  for (const r of result.rejectionResults) {
    console.log(r.ok ? `  ✓ ${r.name}` : `  ✗ ${r.name} — ${r.reason ?? "mismatch"}`);
  }

  console.log("\nStructural assertions:");
  for (const r of result.structuralResults) {
    console.log(r.ok ? `  ✓ ${r.name}` : `  ✗ ${r.name} — ${r.reason ?? "mismatch"}`);
  }

  console.log(
    `\nSummary — decision: ${result.decisionPassed} passed / ${result.decisionResults.length} total; ` +
    `rejection: ${result.rejectionPassed} passed / ${result.rejectionResults.length} total; ` +
    `structural: ${result.structuralPassed} passed / ${result.structuralResults.length} total; ` +
    `cleanup errors: ${result.cleanupErrors.length}; ` +
    `fatal: ${result.fatalError ? "yes" : "no"}; ` +
    `catalog unchanged: ${result.catalogUnchanged ? "yes" : "no"}`,
  );

  console.log(`Catalog before: ${JSON.stringify(result.catalogBefore)}`);
  console.log(`Catalog after : ${JSON.stringify(result.catalogAfter)}`);

  if (result.fatalError) {
    console.error(`\nFATAL: ${result.fatalError}`);
  }
  if (result.cleanupErrors.length > 0) {
    console.error("\nCLEANUP FAILURES (fail-closed):");
    for (const e of result.cleanupErrors) console.error(`  - ${e}`);
  }

  const anyFail =
    result.decisionFailed > 0 ||
    result.rejectionFailed > 0 ||
    result.structuralFailed > 0 ||
    result.cleanupErrors.length > 0 ||
    result.fatalError !== null ||
    !result.catalogUnchanged;

  if (anyFail) process.exit(1);
}

void main().catch((e) => {
  // Sanitized error output — never echo service-role key or headers.
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`runner threw: ${msg.slice(0, 500)}`);
  process.exit(2);
});
