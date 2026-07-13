// SCP-012.0.3 — Unit specs for MembershipMutationInput validator + DTO validator + seat delta.
import {
  FORBIDDEN_INPUT_FIELDS,
  NON_OWNER_TENANT_ROLES,
  parseMembershipMutationInput,
  validateMembershipMutationResult,
} from "@/lib/api/commercial/membership-mutation-types";
import { classifyMembershipSeatDelta } from "@/lib/api/commercial/membership-seat-delta";
import { TENANT_ROLES } from "@/integrations/supabase/membership-types";

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
  throw new Error(`${label}: expected throw`);
}

const T = "11111111-1111-1111-1111-111111111111";

const specs: Array<{ name: string; run: () => void }> = [
  {
    name: "NON_OWNER_TENANT_ROLES derives from TENANT_ROLES minus 'owner'",
    run: () => {
      const expected = TENANT_ROLES.filter((r) => r !== "owner");
      assert(
        JSON.stringify([...NON_OWNER_TENANT_ROLES]) === JSON.stringify(expected),
        `mismatch: ${JSON.stringify(NON_OWNER_TENANT_ROLES)}`,
      );
      assert(!(NON_OWNER_TENANT_ROLES as readonly string[]).includes("owner"), "no owner");
    },
  },
  {
    name: "create_membership: accepts valid payload",
    run: () => {
      const r = parseMembershipMutationInput({
        operation: "create_membership",
        targetUserId: T,
        targetRole: "manager",
      });
      assert(r.operation === "create_membership", "op");
      assert("targetRole" in r && r.targetRole === "manager", "role");
    },
  },
  {
    name: "change_role: accepts valid payload",
    run: () => {
      const r = parseMembershipMutationInput({
        operation: "change_role",
        targetUserId: T,
        targetRole: "viewer",
      });
      assert(r.operation === "change_role", "op");
    },
  },
  {
    name: "suspend/reactivate/revoke: accept payload without targetRole",
    run: () => {
      for (const op of ["suspend", "reactivate", "revoke"] as const) {
        const r = parseMembershipMutationInput({ operation: op, targetUserId: T });
        assert(r.operation === op, op);
      }
    },
  },
  {
    name: "rejects targetRole=owner",
    run: () => {
      expectThrows(
        () =>
          parseMembershipMutationInput({
            operation: "create_membership",
            targetUserId: T,
            targetRole: "owner",
          }),
        /owner not permitted/i,
        "create",
      );
      expectThrows(
        () =>
          parseMembershipMutationInput({
            operation: "change_role",
            targetUserId: T,
            targetRole: "owner",
          }),
        /owner not permitted/i,
        "change_role",
      );
    },
  },
  {
    name: "rejects invalid role",
    run: () => {
      expectThrows(
        () =>
          parseMembershipMutationInput({
            operation: "create_membership",
            targetUserId: T,
            targetRole: "member",
          }),
        /Invalid targetRole/i,
        "member",
      );
    },
  },
  {
    name: "rejects invalid operation",
    run: () => {
      expectThrows(
        () => parseMembershipMutationInput({ operation: "delete", targetUserId: T }),
        /Invalid operation/i,
        "delete",
      );
    },
  },
  {
    name: "rejects invalid targetUserId",
    run: () => {
      expectThrows(
        () => parseMembershipMutationInput({ operation: "suspend", targetUserId: "not-uuid" }),
        /targetUserId/i,
        "bad uuid",
      );
    },
  },
  {
    name: "rejects each forbidden field individually",
    run: () => {
      for (const f of FORBIDDEN_INPUT_FIELDS) {
        expectThrows(
          () =>
            parseMembershipMutationInput({
              operation: "suspend",
              targetUserId: T,
              [f]: "x",
            }),
          /Forbidden input field/i,
          `field:${f}`,
        );
      }
    },
  },
  {
    name: "rejects unknown extra field (no silent passthrough)",
    run: () => {
      expectThrows(
        () =>
          parseMembershipMutationInput({
            operation: "suspend",
            targetUserId: T,
            extra: 1,
          }),
        /Unexpected input field/i,
        "extra",
      );
    },
  },
  {
    name: "rejects targetRole on suspend/reactivate/revoke",
    run: () => {
      expectThrows(
        () =>
          parseMembershipMutationInput({
            operation: "suspend",
            targetUserId: T,
            targetRole: "viewer",
          }),
        /Unexpected input field/i,
        "extra role",
      );
    },
  },
  {
    name: "rejects non-object input",
    run: () => {
      expectThrows(() => parseMembershipMutationInput(null), /expected object/i, "null");
      expectThrows(() => parseMembershipMutationInput([] as unknown), /expected object/i, "array");
    },
  },

  // ---- DTO validator (semantic) ----
  {
    name: "validateMembershipMutationResult accepts a valid response",
    run: () => {
      const r = validateMembershipMutationResult(
        {
          tenantId: T,
          targetUserId: T,
          operation: "suspend",
          changed: true,
          previousStatus: "active",
          status: "suspended",
          previousRole: "viewer",
          role: "viewer",
        },
        { tenantId: T, targetUserId: T, operation: "suspend" },
      );
      assert(r.status === "suspended" && r.previousStatus === "active", "roundtrip");
    },
  },
  {
    name: "validateMembershipMutationResult rejects unknown fields",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T,
              targetUserId: T,
              operation: "suspend",
              changed: true,
              previousStatus: "active",
              status: "suspended",
              previousRole: "viewer",
              role: "viewer",
              email: "leak@x.com",
            },
            { tenantId: T, targetUserId: T, operation: "suspend" },
          ),
        /Unexpected RPC result field/i,
        "leak",
      );
    },
  },
  {
    name: "validateMembershipMutationResult rejects invalid enums",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T,
              targetUserId: T,
              operation: "suspend",
              changed: true,
              previousStatus: "active",
              status: "wat",
              previousRole: "viewer",
              role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "suspend" },
          ),
        /status/i,
        "bad status",
      );
    },
  },

  // ---- semantic guards (SCP-012.0.3 correction) ----
  {
    name: "semantic: rejects tenantId mismatch",
    run: () => {
      const OTHER = "22222222-2222-2222-2222-222222222222";
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: OTHER, targetUserId: T, operation: "suspend",
              changed: true, previousStatus: "active", status: "suspended",
              previousRole: "viewer", role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "suspend" },
          ),
        /tenantId mismatch/i,
        "tenant",
      );
    },
  },
  {
    name: "semantic: rejects targetUserId mismatch",
    run: () => {
      const OTHER = "22222222-2222-2222-2222-222222222222";
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: OTHER, operation: "suspend",
              changed: true, previousStatus: "active", status: "suspended",
              previousRole: "viewer", role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "suspend" },
          ),
        /targetUserId mismatch/i,
        "target",
      );
    },
  },
  {
    name: "semantic: rejects operation mismatch",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "revoke",
              changed: true, previousStatus: "active", status: "revoked",
              previousRole: "viewer", role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "suspend" },
          ),
        /operation mismatch/i,
        "op",
      );
    },
  },
  {
    name: "semantic: rejects role=owner in result",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "change_role",
              changed: true, previousStatus: "active", status: "active",
              previousRole: "viewer", role: "owner",
            },
            { tenantId: T, targetUserId: T, operation: "change_role" },
          ),
        /role must not be owner/i,
        "role owner",
      );
    },
  },
  {
    name: "semantic: rejects previousRole=owner",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "change_role",
              changed: true, previousStatus: "active", status: "active",
              previousRole: "owner", role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "change_role" },
          ),
        /previousRole must not be owner/i,
        "prev owner",
      );
    },
  },
  {
    name: "semantic: create_membership requires null previousStatus",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "create_membership",
              changed: true, previousStatus: "active", status: "active",
              previousRole: null, role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "create_membership" },
          ),
        /previousStatus=null/i,
        "prev",
      );
    },
  },
  {
    name: "semantic: create_membership must produce status=active",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "create_membership",
              changed: true, previousStatus: null, status: "suspended",
              previousRole: null, role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "create_membership" },
          ),
        /status=active/i,
        "status",
      );
    },
  },
  {
    name: "semantic: change_role must not alter status",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "change_role",
              changed: true, previousStatus: "active", status: "suspended",
              previousRole: "viewer", role: "manager",
            },
            { tenantId: T, targetUserId: T, operation: "change_role" },
          ),
        /preserve status/i,
        "status",
      );
    },
  },
  {
    name: "semantic: change_role changed=false must preserve role",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "change_role",
              changed: false, previousStatus: "active", status: "active",
              previousRole: "viewer", role: "manager",
            },
            { tenantId: T, targetUserId: T, operation: "change_role" },
          ),
        /noop must preserve role/i,
        "noop",
      );
    },
  },
  {
    name: "semantic: change_role changed=true must alter role",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "change_role",
              changed: true, previousStatus: "active", status: "active",
              previousRole: "viewer", role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "change_role" },
          ),
        /must alter role/i,
        "changed",
      );
    },
  },
  {
    name: "semantic: suspend invalid transition (revoked→suspended) rejected",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "suspend",
              changed: true, previousStatus: "revoked", status: "suspended",
              previousRole: "viewer", role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "suspend" },
          ),
        /suspend invalid transition/i,
        "suspend",
      );
    },
  },
  {
    name: "semantic: reactivate invalid transition (revoked→active) rejected",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "reactivate",
              changed: true, previousStatus: "revoked", status: "active",
              previousRole: "viewer", role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "reactivate" },
          ),
        /reactivate invalid transition/i,
        "reactivate",
      );
    },
  },
  {
    name: "semantic: revoke changed=false must not alter status",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "revoke",
              changed: false, previousStatus: "active", status: "revoked",
              previousRole: "viewer", role: "viewer",
            },
            { tenantId: T, targetUserId: T, operation: "revoke" },
          ),
        /revoke invalid transition/i,
        "revoke",
      );
    },
  },
  {
    name: "semantic: suspend must preserve role",
    run: () => {
      expectThrows(
        () =>
          validateMembershipMutationResult(
            {
              tenantId: T, targetUserId: T, operation: "suspend",
              changed: true, previousStatus: "active", status: "suspended",
              previousRole: "viewer", role: "manager",
            },
            { tenantId: T, targetUserId: T, operation: "suspend" },
          ),
        /preserve role/i,
        "role",
      );
    },
  },

  // ---- seat delta ----
  {
    name: "seatDelta: create_membership active → +1",
    run: () => {
      assert(
        classifyMembershipSeatDelta({
          operation: "create_membership",
          previousStatus: null,
          nextStatus: "active",
          changed: true,
        }) === 1,
        "+1",
      );
    },
  },
  {
    name: "seatDelta: reactivate suspended→active → +1",
    run: () => {
      assert(
        classifyMembershipSeatDelta({
          operation: "reactivate",
          previousStatus: "suspended",
          nextStatus: "active",
          changed: true,
        }) === 1,
        "+1",
      );
    },
  },
  {
    name: "seatDelta: suspend active→suspended → -1",
    run: () => {
      assert(
        classifyMembershipSeatDelta({
          operation: "suspend",
          previousStatus: "active",
          nextStatus: "suspended",
          changed: true,
        }) === -1,
        "-1",
      );
    },
  },
  {
    name: "seatDelta: revoke from active → -1; from invited → -1; from suspended → 0",
    run: () => {
      assert(
        classifyMembershipSeatDelta({
          operation: "revoke",
          previousStatus: "active",
          nextStatus: "revoked",
          changed: true,
        }) === -1,
        "active→revoked",
      );
      assert(
        classifyMembershipSeatDelta({
          operation: "revoke",
          previousStatus: "invited",
          nextStatus: "revoked",
          changed: true,
        }) === -1,
        "invited→revoked",
      );
      assert(
        classifyMembershipSeatDelta({
          operation: "revoke",
          previousStatus: "suspended",
          nextStatus: "revoked",
          changed: true,
        }) === 0,
        "suspended→revoked",
      );
    },
  },
  {
    name: "seatDelta: change_role → 0",
    run: () => {
      assert(
        classifyMembershipSeatDelta({
          operation: "change_role",
          previousStatus: "active",
          nextStatus: "active",
          changed: true,
        }) === 0,
        "0",
      );
    },
  },
  {
    name: "seatDelta: not changed → 0 for any operation",
    run: () => {
      for (const op of ["create_membership", "change_role", "suspend", "reactivate", "revoke"] as const) {
        assert(
          classifyMembershipSeatDelta({
            operation: op,
            previousStatus: "active",
            nextStatus: "active",
            changed: false,
          }) === 0,
          `noop ${op}`,
        );
      }
    },
  },
];

export async function runMembershipMutationInputSpecs(): Promise<{ passed: number; failed: number }> {
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
