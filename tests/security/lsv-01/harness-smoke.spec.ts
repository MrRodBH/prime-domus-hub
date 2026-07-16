// LSV-01 · Lote A — Harness smoke tests.
//
// This spec covers ONLY the harness itself:
//   * environment guard fail-closed behavior;
//   * structural properties of the identity matrix;
//   * client factory session isolation.
//
// It does NOT execute the Lead authorization matrix, RLS, grants,
// impersonation, atomicity, or rollback. Those belong to Lotes B and C.
//
// Live fixture / real-JWT tests are additionally gated on the
// environment guard authorizing a non-production target. When the
// guard is not authorized, live tests are skipped and reported as
// such; the guard's own negative-path tests still run and prove the
// production-protection contract.

import {
  assertLsvTestEnvironment,
  extractProjectRef,
  LsvEnvironmentGuardError,
  redactProjectRef,
} from "../../../tests/security/lsv-01/environment-guard";
import {
  IDENTITY_MATRIX,
  findSpec,
  type LsvIdentitySpec,
} from "../../../tests/security/lsv-01/identity-matrix";
import {
  clientsShareStorage,
  createIsolatedClient,
} from "../../../tests/security/lsv-01/client-factory";
import { fingerprintToken } from "../../../tests/security/lsv-01/session-factory";
import { IDENTITIES, makeRunId } from "../../../tests/security/lsv-01/fixture-factory";

type Case = { name: string; run: () => Promise<void> };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

async function expectThrows(
  fn: () => unknown | Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    if (
      e instanceof LsvEnvironmentGuardError &&
      e.code === code
    ) {
      return;
    }
    throw new Error(
      `expected LsvEnvironmentGuardError(${code}), got ${String(e)}`,
    );
  }
  throw new Error(`expected LsvEnvironmentGuardError(${code}), got no throw`);
}

const CODE = "LSV_TEST_TARGET_NOT_AUTHORIZED";

const cases: Case[] = [
  // ─── Environment guard ────────────────────────────────────────────
  {
    name: "guard: rejects missing LSV_TEST_MODE",
    run: async () => {
      await expectThrows(
        () =>
          assertLsvTestEnvironment({
            LSV_TEST_TARGET: "local",
            LSV_ALLOWED_PROJECT_REF: "abc123",
            SUPABASE_URL: "https://abc123.supabase.co",
            SUPABASE_ANON_KEY: "anon",
            SUPABASE_SERVICE_ROLE_KEY: "srk",
          }),
        CODE,
      );
    },
  },
  {
    name: "guard: rejects unknown LSV_TEST_TARGET",
    run: async () => {
      await expectThrows(
        () =>
          assertLsvTestEnvironment({
            LSV_TEST_MODE: "1",
            LSV_TEST_TARGET: "customer-prod",
            LSV_ALLOWED_PROJECT_REF: "abc123",
            SUPABASE_URL: "https://abc123.supabase.co",
            SUPABASE_ANON_KEY: "anon",
            SUPABASE_SERVICE_ROLE_KEY: "srk",
          }),
        CODE,
      );
    },
  },
  {
    name: "guard: rejects production-hint target label",
    run: async () => {
      await expectThrows(
        () =>
          assertLsvTestEnvironment({
            LSV_TEST_MODE: "1",
            LSV_TEST_TARGET: "production" as unknown as string,
            LSV_ALLOWED_PROJECT_REF: "abc123",
            SUPABASE_URL: "https://abc123.supabase.co",
            SUPABASE_ANON_KEY: "anon",
            SUPABASE_SERVICE_ROLE_KEY: "srk",
          }),
        CODE,
      );
    },
  },
  {
    name: "guard: rejects project ref divergent from URL",
    run: async () => {
      await expectThrows(
        () =>
          assertLsvTestEnvironment({
            LSV_TEST_MODE: "1",
            LSV_TEST_TARGET: "local",
            LSV_ALLOWED_PROJECT_REF: "zzzzzz",
            SUPABASE_URL: "https://abc123.supabase.co",
            SUPABASE_ANON_KEY: "anon",
            SUPABASE_SERVICE_ROLE_KEY: "srk",
          }),
        CODE,
      );
    },
  },
  {
    name: "guard: rejects empty URL / ref",
    run: async () => {
      await expectThrows(
        () =>
          assertLsvTestEnvironment({
            LSV_TEST_MODE: "1",
            LSV_TEST_TARGET: "local",
            LSV_ALLOWED_PROJECT_REF: "",
            SUPABASE_URL: "",
            SUPABASE_ANON_KEY: "",
            SUPABASE_SERVICE_ROLE_KEY: "",
          }),
        CODE,
      );
    },
  },
  {
    name: "guard: accepts authorized ephemeral target",
    run: async () => {
      const env = assertLsvTestEnvironment({
        LSV_TEST_MODE: "1",
        LSV_TEST_TARGET: "ephemeral",
        LSV_ALLOWED_PROJECT_REF: "testref",
        SUPABASE_URL: "https://testref.supabase.co",
        SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "srk",
      });
      assert(env.target === "ephemeral", "target");
      assert(env.projectRef === "testref", "projectRef");
    },
  },
  {
    name: "guard: extractProjectRef parses supabase host, empty on garbage",
    run: async () => {
      assert(
        extractProjectRef("https://abcdef.supabase.co") === "abcdef",
        "supabase host",
      );
      assert(extractProjectRef("not a url") === "", "garbage");
      assert(extractProjectRef("http://localhost") === "", "no dot");
    },
  },
  {
    name: "guard: redactProjectRef never returns the full ref",
    run: async () => {
      const r = redactProjectRef("abcdef1234");
      assert(!r.includes("cdef12"), "middle redacted");
      assert(r.startsWith("abc") && r.endsWith("34"), "prefix/suffix retained");
    },
  },

  // ─── Identity matrix ──────────────────────────────────────────────
  {
    name: "matrix: exposes all declared identities",
    run: async () => {
      const declared = new Set(IDENTITIES);
      const inMatrix = new Set(IDENTITY_MATRIX.map((s) => s.identity));
      for (const id of declared)
        assert(inMatrix.has(id), `matrix missing ${id}`);
      for (const id of inMatrix)
        assert(declared.has(id), `matrix stranger ${id}`);
    },
  },
  {
    name: "matrix: only super_admin is Super Admin; admin app_role is not",
    run: async () => {
      const superAdmins = IDENTITY_MATRIX.filter((s) => s.isSuperAdmin);
      assert(superAdmins.length === 1, "one super admin");
      assert(superAdmins[0].identity === "super_admin", "canonical name");
      const admins = IDENTITY_MATRIX.filter(
        (s: LsvIdentitySpec) => s.functionalRole === "admin",
      );
      for (const a of admins)
        assert(!a.isSuperAdmin, `${a.identity} must not be Super Admin`);
    },
  },
  {
    name: "matrix: anonymous is not authenticated; suspended and removed differ",
    run: async () => {
      assert(!findSpec("anonymous").authenticated, "anon unauth");
      assert(findSpec("suspended_member").membershipStatus === "suspended", "susp");
      assert(
        findSpec("removed_or_no_membership_user").membershipStatus === "none",
        "removed",
      );
    },
  },

  // ─── Client factory ───────────────────────────────────────────────
  {
    name: "client: isolated clients do not share storage",
    run: async () => {
      const a = createIsolatedClient({
        url: "https://example.supabase.co",
        anonKey: "anon-a",
      });
      const b = createIsolatedClient({
        url: "https://example.supabase.co",
        anonKey: "anon-a",
      });
      assert(!clientsShareStorage(a, b), "storage must differ");
    },
  },
  {
    name: "client: header set is per-client",
    run: async () => {
      const a = createIsolatedClient({
        url: "https://example.supabase.co",
        anonKey: "anon",
        headers: { "x-tenant-id": "AAA" },
      });
      const b = createIsolatedClient({
        url: "https://example.supabase.co",
        anonKey: "anon",
        headers: { "x-tenant-id": "BBB" },
      });
      // Do not read internal Supabase state; treat as opaque. Just
      // assert distinctness at the instance level.
      assert(a !== b, "distinct instances");
    },
  },

  // ─── Fingerprint / run id ─────────────────────────────────────────
  {
    name: "fingerprint: deterministic, short, irreversible-shaped",
    run: async () => {
      const fp1 = fingerprintToken("eyJ.aaa.bbb");
      const fp2 = fingerprintToken("eyJ.aaa.bbb");
      const fp3 = fingerprintToken("eyJ.aaa.ccc");
      assert(fp1 === fp2, "deterministic");
      assert(fp1 !== fp3, "distinct inputs → distinct fps");
      assert(fp1.startsWith("fp_") && fp1.length === 11, "shape");
    },
  },
  {
    name: "runId: opaque and unique across calls",
    run: async () => {
      const a = makeRunId();
      const b = makeRunId();
      assert(a.startsWith("lsv01-"), "prefix");
      assert(a !== b, "distinct");
    },
  },
];

export async function runLsvHarnessSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    try {
      await c.run();
      passed += 1;
    } catch (e) {
      failed += 1;
      // Structured, secret-free failure log.
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ✗ ${c.name} — ${msg}`);
    }
  }
  return { passed, failed };
}
