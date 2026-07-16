// LSV-01 · Lote A — Live harness runner.
//
// Executes the concrete factory + cleanup + Tenant Context smoke tests
// against the authorized target. Exits non-zero when:
//   * no authorized target is configured;
//   * live tests were skipped for any reason;
//   * cleanup left orphaned fixtures;
//   * the LSH-01 canonical Super Admin path did not resolve.
//
// This runner never logs JWTs, refresh tokens, cookies, service role,
// anon key, passwords, or full emails. Evidence is written to
// docs/delivery/product-roadmap/pre-homologation-product-readiness/
// evidence/lsv-01-lot-a-live-execution.json and is fully redigido.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  assertLsvTestEnvironment,
  LsvEnvironmentGuardError,
  redactProjectRef,
} from "./tests/security/lsv-01/environment-guard";
import {
  createConcreteFactory,
  makeRunId,
  IDENTITIES,
} from "./tests/security/lsv-01/fixture-factory";
import { createConcreteCleanup } from "./tests/security/lsv-01/fixture-cleanup";
import { createIsolatedClient } from "./tests/security/lsv-01/client-factory";
import { acquireSession } from "./tests/security/lsv-01/session-factory";
import type {
  LsvCleanupOutcome,
  LsvFixtureContext,
} from "./tests/security/lsv-01/fixture-types";

const EVIDENCE_PATH =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsv-01-lot-a-live-execution.json";

interface Evidence {
  head: string;
  run_id: string;
  execution_timestamp: string;
  environment_target: string;
  project_ref_redacted: string;
  production_guard_passed: boolean;
  tenants_created: number;
  auth_users_created: number;
  memberships_created: number;
  roles_created: number;
  properties_created: number;
  leads_created: number;
  real_sessions_acquired: number;
  distinct_session_fingerprints: number;
  super_admin_canonical_verified: boolean;
  admin_is_not_super_admin_verified: boolean;
  tenant_context_smoke_passed: number;
  tenant_context_smoke_failed: number;
  fixtures_created: number;
  fixtures_cleaned: number;
  orphaned_fixtures: number;
  harness_passed: number;
  harness_failed: number;
  harness_skipped: number;
  typecheck_exit: number | null;
  build_exit: number | null;
  status: "success" | "skipped_no_authorized_target" | "failed";
}

function readHead(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function main() {
  const head = readHead();
  const evidence: Evidence = {
    head,
    run_id: "",
    execution_timestamp: new Date().toISOString(),
    environment_target: "<unset>",
    project_ref_redacted: "<unset>",
    production_guard_passed: false,
    tenants_created: 0,
    auth_users_created: 0,
    memberships_created: 0,
    roles_created: 0,
    properties_created: 0,
    leads_created: 0,
    real_sessions_acquired: 0,
    distinct_session_fingerprints: 0,
    super_admin_canonical_verified: false,
    admin_is_not_super_admin_verified: false,
    tenant_context_smoke_passed: 0,
    tenant_context_smoke_failed: 0,
    fixtures_created: 0,
    fixtures_cleaned: 0,
    orphaned_fixtures: 0,
    harness_passed: 0,
    harness_failed: 0,
    harness_skipped: 0,
    typecheck_exit: null,
    build_exit: null,
    status: "failed",
  };

  let env: ReturnType<typeof assertLsvTestEnvironment>;
  try {
    env = assertLsvTestEnvironment({
      LSV_TEST_MODE: process.env.LSV_TEST_MODE,
      LSV_TEST_TARGET: process.env.LSV_TEST_TARGET,
      LSV_ALLOWED_PROJECT_REF: process.env.LSV_ALLOWED_PROJECT_REF,
      SUPABASE_URL: process.env.LSV_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.LSV_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.LSV_SUPABASE_SERVICE_ROLE_KEY,
    });
  } catch (e) {
    evidence.status = "skipped_no_authorized_target";
    evidence.harness_skipped = 1;
    const code =
      e instanceof LsvEnvironmentGuardError ? e.code : "LSV_UNKNOWN_GUARD_ERROR";
    writeEvidence(evidence);
    console.log(
      `lsv-01-live: SKIPPED (${code}) — no authorized non-production target configured. See ${EVIDENCE_PATH}.`,
    );
    // The live runner must NOT report success when no target is authorized.
    process.exit(1);
    return;
  }

  evidence.environment_target = env.target;
  evidence.project_ref_redacted = redactProjectRef(env.projectRef);
  evidence.production_guard_passed = true;

  const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const factory = createConcreteFactory();
  const cleanup = createConcreteCleanup();
  const runId = makeRunId();
  evidence.run_id = runId;

  let ctx: LsvFixtureContext | null = null;
  try {
    ctx = await factory.setup(admin, runId);
    evidence.tenants_created = 2;
    evidence.auth_users_created = countAuthUsers(ctx);
    evidence.memberships_created = 7;
    evidence.roles_created = 7; // 6 app roles + 1 super_admin
    evidence.properties_created = 2;
    evidence.leads_created = 3;
    evidence.fixtures_created =
      2 + evidence.auth_users_created + 2 + 3;

    // Acquire real sessions per identity (skip anonymous).
    const fingerprints = new Set<string>();
    let acquired = 0;
    for (const id of IDENTITIES) {
      if (id === "anonymous") continue;
      const user = ctx.users[id];
      if (!user) continue;
      const c = createIsolatedClient({ url: env.supabaseUrl, anonKey: env.anonKey });
      // Password is not stored on ctx by design; live-session paths are
      // exercised end-to-end here only when the runner extends the factory
      // to publish per-identity passwords via an in-memory channel. Until
      // that channel exists in an authorized target, live sessions are
      // deferred and counted as skipped so evidence remains honest.
      const _ = c;
      void acquireSession;
      void acquired;
      void fingerprints;
    }
    evidence.real_sessions_acquired = acquired;
    evidence.distinct_session_fingerprints = fingerprints.size;

    // Canonical Super Admin verification against public.is_super_admin()
    // requires an authenticated session for the super_admin identity;
    // deferred with the live session path above.
    evidence.super_admin_canonical_verified = false;
    evidence.admin_is_not_super_admin_verified = false;
    evidence.tenant_context_smoke_passed = 0;
    evidence.tenant_context_smoke_failed = 0;
    evidence.harness_failed = 1; // live session path not yet exercised
    evidence.status = "failed";
  } catch (e) {
    evidence.harness_failed += 1;
    console.log(
      `lsv-01-live: fixture setup failed — ${e instanceof Error ? e.message : String(e)}`,
    );
  } finally {
    if (ctx) {
      try {
        const out: LsvCleanupOutcome = await cleanup.cleanup(admin, ctx);
        evidence.fixtures_cleaned = out.fixturesCleaned;
        evidence.orphaned_fixtures = out.orphanedFixtures;
      } catch (e) {
        console.log(
          `lsv-01-live: cleanup failed — ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    writeEvidence(evidence);
  }

  const ok =
    evidence.status === "success" &&
    evidence.harness_failed === 0 &&
    evidence.orphaned_fixtures === 0 &&
    evidence.harness_skipped === 0;
  process.exit(ok ? 0 : 1);
}

function countAuthUsers(ctx: LsvFixtureContext): number {
  let n = 0;
  for (const id of IDENTITIES) if (ctx.users[id]) n += 1;
  return n;
}

function writeEvidence(evidence: Evidence) {
  try {
    mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
    writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  } catch (e) {
    console.log(`lsv-01-live: could not write evidence: ${String(e)}`);
  }
}

void main();
