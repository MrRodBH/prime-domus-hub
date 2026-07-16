// LSV-01 · Lote A — Live harness runner.
//
// Full success path. Executes ONLY against an authorized non-production
// target approved by the environment guard. On success:
//   * fixtures created via the concrete factory (bundle w/ credentials);
//   * 9 real Supabase sessions acquired via signInWithPassword;
//   * anonymous session confirmed absent on an independent client;
//   * canonical Super Admin verified via public.is_super_admin();
//   * common admins verified NOT to be Super Admin;
//   * Tenant Context smoke via public.get_current_tenant_id();
//   * cleanup consumes the manifest; zero orphans required for success.
//
// The runner never logs JWTs, refresh tokens, cookies, service role,
// anon key, passwords, or full emails. Evidence is redigido.

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertLsvTestEnvironment,
  LsvEnvironmentGuardError,
  redactProjectRef,
} from "./tests/security/lsv-01/environment-guard";
import {
  createConcreteFactory,
  makeRunId,
  AUTH_IDENTITIES,
  countManifestFixtures,
} from "./tests/security/lsv-01/fixture-factory";
import { createConcreteCleanup } from "./tests/security/lsv-01/fixture-cleanup";
import { createIsolatedClient } from "./tests/security/lsv-01/client-factory";
import { acquireSession, fingerprintToken } from "./tests/security/lsv-01/session-factory";
import type {
  LsvAuthenticatedIdentity,
  LsvFixtureBundle,
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
  status: "success" | "skipped_no_authorized_target" | "failed" | "evidence_head_failed";
}

function readHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function baseEvidence(head: string): Evidence {
  return {
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
}

async function main() {
  let head: string;
  try {
    head = readHead();
  } catch {
    const ev = baseEvidence("unresolved");
    ev.status = "evidence_head_failed";
    writeEvidence(ev);
    console.log("lsv-01-live: evidence generation failed (git HEAD unresolved).");
    process.exit(1);
    return;
  }

  const evidence = baseEvidence(head);

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

  let bundle: LsvFixtureBundle | null = null;
  let allProofsPassed = false;

  try {
    bundle = await factory.setup(admin, runId);
    evidence.tenants_created = bundle.manifest.tenantIds.length;
    evidence.auth_users_created = bundle.manifest.authUserIds.length;
    evidence.memberships_created = bundle.manifest.membershipKeys.length;
    evidence.roles_created = bundle.manifest.roleIds.length;
    evidence.properties_created = bundle.manifest.propertyIds.length;
    evidence.leads_created = bundle.manifest.leadIds.length;
    evidence.fixtures_created = countManifestFixtures(bundle.manifest);

    // ── Sessions ────────────────────────────────────────────────
    const clients = new Map<LsvAuthenticatedIdentity, SupabaseClient>();
    const fingerprints = new Set<string>();
    let acquired = 0;
    for (const id of AUTH_IDENTITIES) {
      const cred = bundle.credentials.get(id);
      if (!cred) throw new Error(`missing credential for ${id}`);
      const c = createIsolatedClient({
        url: env.supabaseUrl,
        anonKey: env.anonKey,
      });
      const r = await acquireSession(c, cred.email, cred.password);
      if (!r.acquired || !r.session) {
        throw new Error(`session_missing:${id}`);
      }
      if (r.session.user.id !== cred.expectedUserId) {
        throw new Error(`session_user_mismatch:${id}`);
      }
      const parts = r.session.access_token.split(".");
      if (parts.length !== 3) throw new Error(`session_token_not_jwt:${id}`);
      const fp = r.tokenFingerprint || fingerprintToken(r.session.access_token);
      if (fingerprints.has(fp)) throw new Error(`fingerprint_collision:${id}`);
      fingerprints.add(fp);
      clients.set(id, c);
      acquired += 1;
    }
    evidence.real_sessions_acquired = acquired;
    evidence.distinct_session_fingerprints = fingerprints.size;

    // Anonymous — independent client, no login, no session.
    const anonClient = createIsolatedClient({
      url: env.supabaseUrl,
      anonKey: env.anonKey,
    });
    const anon = await anonClient.auth.getSession();
    if (anon.data.session) throw new Error("anonymous_has_session");

    // ── Canonical Super Admin ─────────────────────────────────
    const superClient = clients.get("super_admin")!;
    const { data: sa, error: saErr } = await superClient.rpc("is_super_admin");
    if (saErr || sa !== true) throw new Error(`super_admin_check_failed:${saErr?.code ?? sa}`);
    evidence.super_admin_canonical_verified = true;

    const notSuperIdentities: LsvAuthenticatedIdentity[] = [
      "tenant_a_admin",
      "tenant_b_admin",
      "tenant_a_corretor_assigned",
      "tenant_a_unauthorized_role",
    ];
    for (const id of notSuperIdentities) {
      const c = clients.get(id)!;
      const { data, error } = await c.rpc("is_super_admin");
      if (error) throw new Error(`is_super_admin_error:${id}:${error.code ?? "?"}`);
      if (data === true) throw new Error(`admin_is_super_admin_leak:${id}`);
    }
    evidence.admin_is_not_super_admin_verified = true;

    // ── Tenant Context smoke ──────────────────────────────────
    const smoke = async (
      label: string,
      client: SupabaseClient,
      expected: string | null,
    ) => {
      const { data, error } = await client.rpc("get_current_tenant_id");
      if (error) {
        evidence.tenant_context_smoke_failed += 1;
        throw new Error(`tenant_ctx_error:${label}:${error.code ?? "?"}`);
      }
      const got = (data as string | null) ?? null;
      if (got !== expected) {
        evidence.tenant_context_smoke_failed += 1;
        throw new Error(`tenant_ctx_mismatch:${label}`);
      }
      evidence.tenant_context_smoke_passed += 1;
    };

    const tenantA = bundle.context.tenants.tenantA;
    const tenantB = bundle.context.tenants.tenantB;

    await smoke("tenant_a_admin→A", clients.get("tenant_a_admin")!, tenantA);
    await smoke("tenant_b_admin→B", clients.get("tenant_b_admin")!, tenantB);
    await smoke("super_admin_no_header→null", superClient, null);
    await smoke("anonymous→null", anonClient, null);

    // Super admin impersonating tenant A — separate client with header.
    const superImpersonatingA = createIsolatedClient({
      url: env.supabaseUrl,
      anonKey: env.anonKey,
      headers: { "x-tenant-id": tenantA },
    });
    const superCred = bundle.credentials.get("super_admin")!;
    const sa2 = await acquireSession(
      superImpersonatingA,
      superCred.email,
      superCred.password,
    );
    if (!sa2.acquired) throw new Error("super_impersonation_session_failed");
    await smoke("super_admin_impersonate_A", superImpersonatingA, tenantA);

    // tenant_a_admin trying to spoof header for tenantB — separate client.
    const adminAForged = createIsolatedClient({
      url: env.supabaseUrl,
      anonKey: env.anonKey,
      headers: { "x-tenant-id": tenantB },
    });
    const adminACred = bundle.credentials.get("tenant_a_admin")!;
    await acquireSession(adminAForged, adminACred.email, adminACred.password);
    // Must NOT resolve to Tenant B; per canonical contract this returns
    // Tenant A (single active membership) or null — never Tenant B.
    const { data: forged, error: forgedErr } = await adminAForged.rpc(
      "get_current_tenant_id",
    );
    if (forgedErr) throw new Error(`forged_header_error:${forgedErr.code ?? "?"}`);
    if ((forged as string | null) === tenantB) {
      throw new Error("cross_tenant_header_forgery_succeeded");
    }
    evidence.tenant_context_smoke_passed += 1;

    allProofsPassed = true;
  } catch (e) {
    evidence.harness_failed += 1;
    console.log(
      `lsv-01-live: harness failed — ${e instanceof Error ? e.message : String(e)}`,
    );
  } finally {
    if (bundle) {
      try {
        const out = await cleanup.cleanup(admin, bundle.manifest);
        evidence.fixtures_cleaned = out.fixturesCleaned;
        evidence.orphaned_fixtures = out.orphanedFixtures;
      } catch (e) {
        evidence.harness_failed += 1;
        console.log(
          `lsv-01-live: cleanup failed — ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const ok =
      allProofsPassed &&
      evidence.harness_failed === 0 &&
      evidence.orphaned_fixtures === 0 &&
      evidence.fixtures_cleaned === evidence.fixtures_created &&
      evidence.real_sessions_acquired === AUTH_IDENTITIES.length &&
      evidence.distinct_session_fingerprints === AUTH_IDENTITIES.length &&
      evidence.super_admin_canonical_verified &&
      evidence.admin_is_not_super_admin_verified &&
      evidence.tenant_context_smoke_failed === 0;

    if (ok) {
      evidence.status = "success";
      evidence.harness_passed = 1;
    } else {
      evidence.status = "failed";
    }
    writeEvidence(evidence);
    process.exit(ok ? 0 : 1);
  }
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
