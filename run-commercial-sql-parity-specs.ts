// F4-CF-01 — CURRENT CANONICAL INTEGRATION GATE for the executable
// SQL / TypeScript parity harness (`commercial-seat-sql-parity.spec.ts`).
//
// The harness runs against real PostgreSQL (Supabase managed) exclusively
// through the service-role admin client. It:
//   • provisions synthetic fixtures (auth users, tenant, plan,
//     subscription, entitlement, memberships, provider mapping) per
//     scenario under an isolated UUID namespace;
//   • invokes `public.resolve_commercial_seat_decision` via
//     `admin.rpc(...)`;
//   • computes the canonical TypeScript oracle
//     (`decideCommercialFeature` + `extractSeatLimit` +
//     `decideCommercialSeatLimit`) from the same fixture;
//   • asserts full-field deep equality between SQL DTO, TS DTO and the
//     expected DTO;
//   • tears down every row and every auth user fail-closed, surfacing
//     any deletion or residual verification error.
//
// This runner does NOT require `psql`, `PGHOST`, or the sandbox_exec
// PostgreSQL role. It requires only:
//   • SUPABASE_URL
//   • SUPABASE_SERVICE_ROLE_KEY
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

  console.log("F4-CF-01 canonical SQL/TypeScript parity harness — running…");
  const { passed, failed, results, cleanupErrors } = await runCommercialSeatSqlParitySpecs();

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

  console.log(`\nSQL/TypeScript parity: ${passed} passed, ${failed} failed (of ${results.length} scenarios)`);

  if (cleanupErrors.length > 0) {
    console.error("CLEANUP FAILED (fail-closed):");
    for (const e of cleanupErrors) console.error(`  - ${e}`);
    process.exit(1);
  }
  if (failed > 0) process.exit(1);
  process.exit(0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(2);
});
