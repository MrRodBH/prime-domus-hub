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
//
// Evidence persistence is FAIL-CLOSED: writeEvidence performs a
// temp-file + fsync + atomic rename + JSON re-read validation, and any
// I/O failure results in a non-zero exit. Silent evidence loss is not
// acceptable.

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, renameSync, openSync, fsyncSync, closeSync, unlinkSync } from "node:fs";
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

// Canonical results from public.get_current_tenant_id() as inspected in
// this repo (see supabase migration for get_current_tenant_id in the
// "context" pack, and function-source snapshot embedded in this task).
// A regular user WITH a header referencing a tenant they DO NOT actively
// belong to receives NULL (not the tenant, not an error). This is the
// only accepted forged-header outcome for a non-super-admin caller;
// any other value indicates a cross-tenant leak.

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
  forged_header_auth_verified: boolean;
  forged_header_result: string;
  forged_header_denial_verified: boolean;
  fixtures_created: number;
  fixtures_cleaned: number;
  orphaned_fixtures: number;
  harness_passed: number;
  harness_failed: number;
  harness_skipped: number;
  typecheck_exit: number | null;
  build_exit: number | null;
  structural_harness_exit: number | null;
  live_harness_exit: number | null;
  lsh_regression_exit: number | null;
  aggregate_exit: number | null;
  evidence_persisted: boolean;
  status:
    | "success"
    | "skipped_no_authorized_target"
    | "failed"
    | "evidence_head_failed";
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
    forged_header_auth_verified: false,
    forged_header_result: "<unset>",
    forged_header_denial_verified: false,
    fixtures_created: 0,
    fixtures_cleaned: 0,
    orphaned_fixtures: 0,
    harness_passed: 0,
    harness_failed: 0,
    harness_skipped: 0,
    typecheck_exit: null,
    build_exit: null,
    structural_harness_exit: null,
    live_harness_exit: null,
    lsh_regression_exit: null,
    aggregate_exit: null,
    evidence_persisted: false,
    status: "failed",
  };
}

/**
 * Atomic, fail-closed evidence writer.
 * 1) write to a sibling temp file
 * 2) fsync
 * 3) rename over the target
 * 4) read back and JSON.parse to confirm persistence
 * On any failure the caller MUST propagate a non-zero exit.
 */
function writeEvidence(evidence: Evidence): { persisted: boolean; error?: string } {
  const tmp = `${EVIDENCE_PATH}.tmp-${process.pid}-${Date.now()}`;
  try {
    mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
    const payload = JSON.stringify(evidence, null, 2) + "\n";
    writeFileSync(tmp, payload, "utf8");
    const fd = openSync(tmp, "r+");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, EVIDENCE_PATH);
    const readback = readFileSync(EVIDENCE_PATH, "utf8");
    const parsed = JSON.parse(readback) as Evidence;
    if (parsed.head !== evidence.head || parsed.status !== evidence.status) {
      return { persisted: false, error: "evidence_readback_mismatch" };
    }
    return { persisted: true };
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* best-effort */
    }
    return { persisted: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  let head: string;
  try {
    head = readHead();
    if (!head || head === "unknown" || head === "unresolved") {
      throw new Error("empty head");
    }
  } catch {
    const ev = baseEvidence("unresolved");
    ev.status = "evidence_head_failed";
    const w = writeEvidence(ev);
    ev.evidence_persisted = w.persisted;
    // Best-effort second write to persist evidence_persisted flag.
    if (w.persisted) writeEvidence(ev);
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
    const w = writeEvidence(evidence);
    evidence.evidence_persisted = w.persisted;
    // Re-persist including evidence_persisted for observability.
    const w2 = writeEvidence(evidence);
    if (!w2.persisted) {
      console.log(
        `lsv-01-live: FATAL — evidence write failed (${w2.error ?? "unknown"}).`,
      );
      process.exit(1);
      return;
    }
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
    // Canonical get_current_tenant_id() contract (from migrations):
    //   - anonymous (auth.uid() IS NULL)                           → NULL
    //   - regular user, no header, single active membership        → that tenant
    //   - regular user, header != active membership tenant         → NULL
    //   - super admin, no header                                   → NULL
    //   - super admin, header = existing tenant                    → that tenant
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
    if (!sa2.acquired || !sa2.session) {
      throw new Error("super_impersonation_session_failed");
    }
    if (sa2.session.user.id !== superCred.expectedUserId) {
      throw new Error("super_impersonation_user_mismatch");
    }
    await smoke("super_admin_impersonate_A", superImpersonatingA, tenantA);

    // ── Forged-header cross-tenant probe ──────────────────────
    // tenant_a_admin attempts to spoof x-tenant-id: tenantB. This is
    // ONLY meaningful once we have proven the client actually holds a
    // real session for tenant_a_admin. Skipping the session validation
    // would allow an anonymous client to trivially satisfy the assertion.
    const adminAForged = createIsolatedClient({
      url: env.supabaseUrl,
      anonKey: env.anonKey,
      headers: { "x-tenant-id": tenantB },
    });
    const adminACred = bundle.credentials.get("tenant_a_admin")!;
    const forgedAuth = await acquireSession(
      adminAForged,
      adminACred.email,
      adminACred.password,
    );
    if (!forgedAuth.acquired || !forgedAuth.session) {
      throw new Error("forged_header_session_missing");
    }
    if (forgedAuth.session.user.id !== adminACred.expectedUserId) {
      throw new Error("forged_header_session_user_mismatch");
    }
    const forgedParts = forgedAuth.session.access_token.split(".");
    if (forgedParts.length !== 3) {
      throw new Error("forged_header_session_not_jwt");
    }
    evidence.forged_header_auth_verified = true;

    const { data: forged, error: forgedErr } = await adminAForged.rpc(
      "get_current_tenant_id",
    );
    if (forgedErr) throw new Error(`forged_header_error:${forgedErr.code ?? "?"}`);
    const forgedValue = (forged as string | null) ?? null;
    // Redacted result label: never emit the tenant UUID.
    if (forgedValue === null) {
      evidence.forged_header_result = "null";
    } else if (forgedValue === tenantB) {
      evidence.forged_header_result = "tenantB_LEAK";
    } else if (forgedValue === tenantA) {
      evidence.forged_header_result = "tenantA_UNEXPECTED";
    } else {
      evidence.forged_header_result = "OTHER_UNEXPECTED";
    }
    // Canonical contract: NULL is the only accepted outcome. Any tenant
    // (including tenantA) indicates the SQL contract has drifted and
    // the probe MUST fail closed.
    if (forgedValue !== null) {
      evidence.tenant_context_smoke_failed += 1;
      throw new Error(`forged_header_unexpected_result:${evidence.forged_header_result}`);
    }
    evidence.tenant_context_smoke_passed += 1;
    evidence.forged_header_denial_verified = true;

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
      evidence.forged_header_auth_verified &&
      evidence.forged_header_denial_verified &&
      evidence.tenant_context_smoke_failed === 0;

    if (ok) {
      evidence.status = "success";
      evidence.harness_passed = 1;
    } else {
      evidence.status = "failed";
    }
    const w = writeEvidence(evidence);
    evidence.evidence_persisted = w.persisted;
    const w2 = writeEvidence(evidence);
    if (!w2.persisted) {
      console.log(
        `lsv-01-live: FATAL — evidence persistence failed (${w2.error ?? "unknown"}).`,
      );
      process.exit(1);
      return;
    }
    process.exit(ok ? 0 : 1);
  }
}

void main();
