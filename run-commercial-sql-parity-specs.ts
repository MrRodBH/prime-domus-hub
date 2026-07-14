// SCP-012.0.2.1 §13 — Runner for executable SQL/TypeScript parity harness.
//
// STATUS (F4-CF-01 — SQL Parity Runner Classification): HISTORICAL / SUPERSEDED.
//
// This harness was authored for a PostgreSQL connection with either
// superuser or `service_role` authority — i.e. a role able to seed
// `public.tenant_members` directly and bypass RLS. The current SCP-012
// ACL contract does NOT grant that authority to any exec-accessible
// application role (anon/authenticated/sandbox_exec are policy-scoped
// or lack a matching policy on tenant_members). As a consequence, when
// invoked from the exec sandbox connection the harness aborts during
// fixture seeding with `permission denied for table tenant_members`
// (RLS, not GRANT) BEFORE the parity matrix runs. A seeding abort is
// NOT evidence of the RPC ACL, is NOT evidence of SQL/TypeScript
// parity, and is NOT a passed gate.
//
// The runner is retained for historical reference and continues to
// compile. It is NOT the current parity gate. Its semantic contracts
// are covered by the substitute runners referenced in the F4-CF-01
// impact analysis (§8 supersession matrix):
//
//   • run-commercial-seat-atomic-enforcement-specs.ts — real RPC
//     invocation (mutate_tenant_membership → resolve_commercial_seat_decision)
//     via supabaseAdmin, real limit_reached denial, DTO contract,
//     rollback and cross-tenant scenarios.
//   • run-membership-mutation-parity-specs.ts — parity + ACL boundary.
//   • commercial-seat-rpc-contract.spec.ts — RPC DTO shape.
//   • commercial-seat-limit.spec.ts / commercial-feature-gate.spec.ts /
//     commercial-feature-catalog.spec.ts — TypeScript oracle.
//
// Do NOT run this file as part of the current gate. Executing it in
// the exec sandbox will exit non-zero by design and is expected — that
// exit code documents the ACL/RLS boundary, but MUST NOT be recorded
// as passing evidence for parity or ACL. Modernizing the harness to a
// controlled service_role fixture path is a Class C future item.
//
// Usage (historical, requires a PostgreSQL connection with authority
// to seed tenant_members — e.g. superuser or service_role):
//   bunx tsx --tsconfig tsconfig.json ./run-commercial-sql-parity-specs.ts

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
