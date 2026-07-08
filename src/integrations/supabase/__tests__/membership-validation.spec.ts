// F3.6 — Membership Roles & Status Validation — Unit Specs
// Framework-agnostic (mesmo padrão das demais suítes tenant-related).

import {
  ACTIVE_MEMBERSHIP_STATUS,
  MEMBERSHIP_STATUSES,
  TENANT_ROLES,
} from "@/integrations/supabase/membership-types";
import {
  assertMembershipStatus,
  assertTenantRole,
  isActiveMembershipStatus,
  isMembershipStatus,
  isTenantAdminRole,
  isTenantOwnerRole,
  isTenantRole,
} from "@/integrations/supabase/membership-validation";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}
function expectThrows(fn: () => unknown, matcher: RegExp, label: string) {
  try {
    fn();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    assert(matcher.test(m), `${label}: expected /${matcher.source}/, got "${m}"`);
    return;
  }
  throw new Error(`${label}: expected throw, got success`);
}

const specs: Array<{ name: string; run: () => void }> = [
  // ---- membership_status domain ----
  {
    name: "membership_status domain matches DB enum exactly",
    run: () => {
      const expected = ["active", "invited", "suspended", "revoked"];
      assert(
        JSON.stringify([...MEMBERSHIP_STATUSES]) === JSON.stringify(expected),
        `domain mismatch: ${JSON.stringify(MEMBERSHIP_STATUSES)}`,
      );
    },
  },
  {
    name: "isMembershipStatus accepts all 4 known values",
    run: () => {
      for (const v of MEMBERSHIP_STATUSES) {
        assert(isMembershipStatus(v), `should accept ${v}`);
      }
    },
  },
  {
    name: "isMembershipStatus rejects null/undefined/unknown",
    run: () => {
      assert(!isMembershipStatus(null), "null rejected");
      assert(!isMembershipStatus(undefined), "undefined rejected");
      assert(!isMembershipStatus(""), "empty rejected");
      assert(!isMembershipStatus("ACTIVE"), "case-sensitive");
      assert(!isMembershipStatus("pending"), "unknown rejected");
      assert(!isMembershipStatus(0), "number rejected");
      assert(!isMembershipStatus({}), "object rejected");
    },
  },
  {
    name: "isActiveMembershipStatus: only 'active' returns true",
    run: () => {
      assert(isActiveMembershipStatus("active"), "active");
      assert(!isActiveMembershipStatus("invited"), "invited not operational");
      assert(!isActiveMembershipStatus("suspended"), "suspended not operational");
      assert(!isActiveMembershipStatus("revoked"), "revoked not operational");
      assert(!isActiveMembershipStatus(null), "null");
      assert(!isActiveMembershipStatus(undefined), "undefined");
      assert(!isActiveMembershipStatus("Active"), "case-sensitive");
      assert(ACTIVE_MEMBERSHIP_STATUS === "active", "constant is 'active'");
    },
  },
  {
    name: "assertMembershipStatus throws without fallback",
    run: () => {
      assert(assertMembershipStatus("active") === "active", "passthrough");
      expectThrows(() => assertMembershipStatus(null), /Invalid membership_status/, "null");
      expectThrows(() => assertMembershipStatus(undefined), /Invalid membership_status/, "undefined");
      expectThrows(() => assertMembershipStatus("pending"), /Invalid membership_status/, "unknown");
      expectThrows(() => assertMembershipStatus(""), /Invalid membership_status/, "empty");
    },
  },

  // ---- tenant_role domain ----
  {
    name: "tenant_role domain matches DB enum exactly (project-specific)",
    run: () => {
      const expected = [
        "owner",
        "admin",
        "manager",
        "broker",
        "captador",
        "secretaria",
        "viewer",
      ];
      assert(
        JSON.stringify([...TENANT_ROLES]) === JSON.stringify(expected),
        `domain mismatch: ${JSON.stringify(TENANT_ROLES)}`,
      );
    },
  },
  {
    name: "isTenantRole accepts each known role",
    run: () => {
      for (const r of TENANT_ROLES) {
        assert(isTenantRole(r), `should accept ${r}`);
      }
    },
  },
  {
    name: "isTenantRole rejects null/undefined/unknown",
    run: () => {
      assert(!isTenantRole(null), "null");
      assert(!isTenantRole(undefined), "undefined");
      assert(!isTenantRole(""), "empty");
      assert(!isTenantRole("member"), "not in this project's domain");
      assert(!isTenantRole("ADMIN"), "case-sensitive");
      assert(!isTenantRole(42), "number");
    },
  },
  {
    name: "assertTenantRole throws without fallback (no auto-promotion)",
    run: () => {
      assert(assertTenantRole("viewer") === "viewer", "passthrough");
      expectThrows(() => assertTenantRole(null), /Invalid tenant_role/, "null");
      expectThrows(() => assertTenantRole(undefined), /Invalid tenant_role/, "undefined");
      expectThrows(() => assertTenantRole("unknown"), /Invalid tenant_role/, "unknown");
      expectThrows(() => assertTenantRole("member"), /Invalid tenant_role/, "member not in domain");
    },
  },

  // ---- role helpers are inert (not enforcement) ----
  {
    name: "isTenantAdminRole/isTenantOwnerRole return booleans strictly",
    run: () => {
      assert(isTenantAdminRole("admin"), "admin");
      assert(!isTenantAdminRole("owner"), "owner is not admin");
      assert(!isTenantAdminRole("viewer"), "viewer is not admin");
      assert(!isTenantAdminRole(null), "null");
      assert(isTenantOwnerRole("owner"), "owner");
      assert(!isTenantOwnerRole("admin"), "admin is not owner");
      assert(!isTenantOwnerRole(null), "null");
    },
  },
];

export async function runMembershipValidationSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const s of specs) {
    try {
      s.run();
      passed++;
    } catch (e) {
      failed++;
      // eslint-disable-next-line no-console
      console.error(`✗ ${s.name}\n  ${e instanceof Error ? e.message : e}`);
    }
  }
  return { passed, failed };
}
