// LSV-01 · Lote A — Live harness runner (Canonical Tenant Context Alignment).
//
// Full success path. Executes ONLY against an authorized non-production
// target approved by the environment guard. On success:
//   * fixtures created via the concrete factory (bundle w/ credentials);
//   * 9 real Supabase sessions acquired via signInWithPassword;
//   * anonymous session confirmed absent on an independent client;
//   * canonical Super Admin verified via public.is_super_admin();
//   * common admins verified NOT to be Super Admin;
//   * Tenant Context smoke via public.get_current_tenant_id();
//   * forged-header probe aligned to CANONICAL SQL CONTRACT (see below);
//   * cleanup consumes the manifest; zero orphans required for success.
//
// The runner never logs JWTs, refresh tokens, cookies, service role,
// anon key, passwords, or full emails. Evidence is redigido.
//
// Evidence persistence is FAIL-CLOSED: writeEvidence performs a
// temp-file + fsync + atomic rename + JSON re-read validation; on any
// failure of the final write the runner exits non-zero and success is
// gated on `evidence.evidence_persisted === true` (never on an earlier
// write that later diverged from disk).
//
// ─────────────────────────────────────────────────────────────────────
// CANONICAL SQL CONTRACT — public.get_current_tenant_id()
// Source of truth:
//   supabase/migrations/20260707143029_83dd8dc5-0313-45cd-a332-cc188a6f64c2.sql
// (M2b.1 — strict cardinality; header IGNORED for regular users)
//
//   anonymous (auth.uid() IS NULL)
//     → returns x-tenant-id header (public form endpoints) or NULL.
//   Super Admin:
//     → x-tenant-id header respected (impersonation) or NULL.
//   Regular authenticated user (NON super admin):
//     → x-tenant-id header is IGNORED. Server-side COUNT(*) over
//       public.tenant_members for auth.uid():
//         0 memberships  → NULL
//         1 membership   → that tenant's id
//         N memberships  → NULL
//
// Forged-header probe scenario in this runner:
//   actor  = tenant_a_admin (regular user, 1 active membership on tenantA)
//   header = x-tenant-id: <tenantB uuid>
//   canonical expected result = tenantA
//     * tenantB result → cross-tenant leak → FAIL
//     * NULL result    → cardinality/contract drift → FAIL
//     * any other      → FAIL
// ─────────────────────────────────────────────────────────────────────

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

/**
 * Canonical migration path for public.get_current_tenant_id().
 * The structural test in harness-smoke inspects THIS specific file, not
 * any historical occurrence, to prove the runner is aligned to the
 * currently binding SQL contract.
 */
export const CANONICAL_GET_CURRENT_TENANT_ID_MIGRATION =
  "supabase/migrations/20260707143029_83dd8dc5-0313-45cd-a332-cc188a6f64c2.sql";

interface Evidence {
  head: string;
  run_id: string;
  execution_timestamp: string;
  environment_target: string;
  project_ref_redacted: string;
  production_guard_passed: boolean;
  canonical_migration_path: string;
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
  forged_header_user_verified: boolean;
  forged_header_jwt_verified: boolean;
  forged_header_requested_tenant: "tenantB" | "<unset>";
  forged_header_effective_tenant: "tenantA" | "tenantB" | "null" | "other" | "<unset>";
  forged_header_cross_tenant_gain: boolean;
  forged_header_canonical_contract_verified: boolean;
  forged_header_denial_verified: boolean;
  forged_header_result: string;
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
    canonical_migration_path: CANONICAL_GET_CURRENT_TENANT_ID_MIGRATION,
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
    forged_header_user_verified: false,
    forged_header_jwt_verified: false,
    forged_header_requested_tenant: "<unset>",
    forged_header_effective_tenant: "<unset>",
    forged_header_cross_tenant_gain: false,
    forged_header_canonical_contract_verified: false,
    forged_header_denial_verified: false,
    forged_header_result: "<unset>",
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
    if (parsed.evidence_persisted !== evidence.evidence_persisted) {
      return { persisted: false, error: "evidence_persisted_flag_mismatch" };
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

/**
 * Persist an evidence object with a self-consistent evidence_persisted
 * flag. Success requires that the FINAL on-disk snapshot has
 * evidence_persisted === true. Any intermediate write failure results
 * in an evidence object whose evidence_persisted stays false.
 */
function finalizeEvidence(evidence: Evidence): { ok: boolean; error?: string } {
  // First pass: write with the flag set to true and verify readback.
  // If the readback succeeds, the on-disk snapshot IS the truthful one;
  // there is no second-write divergence.
  evidence.evidence_persisted = true;
  const w = writeEvidence(evidence);
  if (w.persisted) return { ok: true };
  // Persistence failed — record the truthful flag on the in-memory
  // object; do not lie about disk state. Attempt a best-effort second
  // write with evidence_persisted=false so operators see the failure
  // on disk if that write happens to succeed.
  evidence.evidence_persisted = false;
  writeEvidence(evidence);
  return { ok: false, error: w.error };
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
    const w = finalizeEvidence(ev);
    console.log(
      `lsv-01-live: evidence generation failed (git HEAD unresolved)${w.ok ? "" : ` — persistence failed (${w.error ?? "unknown"})`}.`,
    );
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
    const w = finalizeEvidence(evidence);
    if (!w.ok) {
      console.log(
        `lsv-01-live: FATAL — evidence write failed (${w.error ?? "unknown"}).`,
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
    // Canonical get_current_tenant_id() contract (see file header).
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

    // Regular users, no header → cardinality=1 → their own tenant.
    await smoke("tenant_a_admin→A", clients.get("tenant_a_admin")!, tenantA);
    await smoke("tenant_b_admin→B", clients.get("tenant_b_admin")!, tenantB);
    // Super admin with no header → NULL.
    await smoke("super_admin_no_header→null", superClient, null);
    // Anonymous with no header → NULL.
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

    // ── Forged-header cross-tenant probe (canonical contract) ─
    // Scenario: tenant_a_admin (single active membership on tenantA)
    // forges x-tenant-id: tenantB. Canonical contract IGNORES the header
    // for regular users; the effective tenant MUST equal tenantA. Any
    // other outcome (null, tenantB, other tenant, non-string) is a
    // contract drift and fails closed.
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
    evidence.forged_header_auth_verified = true;
    if (forgedAuth.session.user.id !== adminACred.expectedUserId) {
      throw new Error("forged_header_session_user_mismatch");
    }
    evidence.forged_header_user_verified = true;
    const forgedParts = forgedAuth.session.access_token.split(".");
    if (forgedParts.length !== 3) {
      throw new Error("forged_header_session_not_jwt");
    }
    evidence.forged_header_jwt_verified = true;

    evidence.forged_header_requested_tenant = "tenantB";

    const { data: forged, error: forgedErr } = await adminAForged.rpc(
      "get_current_tenant_id",
    );
    if (forgedErr) throw new Error(`forged_header_error:${forgedErr.code ?? "?"}`);
    const forgedValue = (forged as string | null) ?? null;

    // Redacted label + effective_tenant + cross_tenant_gain.
    if (forgedValue === null) {
      evidence.forged_header_result = "null_UNEXPECTED";
      evidence.forged_header_effective_tenant = "null";
    } else if (typeof forgedValue !== "string") {
      evidence.forged_header_result = "TYPE_MISMATCH";
      evidence.forged_header_effective_tenant = "other";
    } else if (forgedValue === tenantB) {
      evidence.forged_header_result = "tenantB_LEAK";
      evidence.forged_header_effective_tenant = "tenantB";
    } else if (forgedValue === tenantA) {
      evidence.forged_header_result = "tenantA";
      evidence.forged_header_effective_tenant = "tenantA";
    } else {
      evidence.forged_header_result = "OTHER_UNEXPECTED";
      evidence.forged_header_effective_tenant = "other";
    }
    evidence.forged_header_cross_tenant_gain = forgedValue === tenantB;

    // Canonical contract: effective tenant MUST equal tenantA (strict).
    // NULL, tenantB, any other tenant, or a non-string value fails closed.
    if (typeof forgedValue !== "string" || forgedValue !== tenantA) {
      evidence.tenant_context_smoke_failed += 1;
      throw new Error(
        `forged_header_unexpected_result:${evidence.forged_header_result}`,
      );
    }
    evidence.tenant_context_smoke_passed += 1;
    evidence.forged_header_canonical_contract_verified = true;
    // Denial verified ⇔ auth verified + requested=tenantB +
    // effective=tenantA + no cross-tenant gain.
    evidence.forged_header_denial_verified =
      evidence.forged_header_auth_verified &&
      evidence.forged_header_user_verified &&
      evidence.forged_header_jwt_verified &&
      evidence.forged_header_requested_tenant === "tenantB" &&
      evidence.forged_header_effective_tenant === "tenantA" &&
      !evidence.forged_header_cross_tenant_gain;

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

    const proofsOk =
      allProofsPassed &&
      evidence.harness_failed === 0 &&
      evidence.orphaned_fixtures === 0 &&
      evidence.fixtures_cleaned === evidence.fixtures_created &&
      evidence.real_sessions_acquired === AUTH_IDENTITIES.length &&
      evidence.distinct_session_fingerprints === AUTH_IDENTITIES.length &&
      evidence.super_admin_canonical_verified &&
      evidence.admin_is_not_super_admin_verified &&
      evidence.forged_header_auth_verified &&
      evidence.forged_header_user_verified &&
      evidence.forged_header_jwt_verified &&
      evidence.forged_header_canonical_contract_verified &&
      evidence.forged_header_denial_verified &&
      !evidence.forged_header_cross_tenant_gain &&
      evidence.forged_header_effective_tenant === "tenantA" &&
      evidence.tenant_context_smoke_failed === 0;

    if (proofsOk) {
      evidence.status = "success";
      evidence.harness_passed = 1;
    } else {
      evidence.status = "failed";
    }
    const fin = finalizeEvidence(evidence);
    if (!fin.ok) {
      console.log(
        `lsv-01-live: FATAL — evidence persistence failed (${fin.error ?? "unknown"}).`,
      );
      process.exit(1);
      return;
    }
    // Success gate: all proofs AND evidence_persisted true on disk.
    const finalOk = proofsOk && evidence.evidence_persisted === true;
    process.exit(finalOk ? 0 : 1);
  }
}

void main();
