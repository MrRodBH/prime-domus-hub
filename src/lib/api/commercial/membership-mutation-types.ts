// SCP-012.0.3 — Membership Mutation Boundary
//
// Contrato público estrito para mutações canônicas de tenant_members.
// - actor/tenant NUNCA vêm do payload
// - campos comerciais NUNCA são aceitos
// - propriedades adicionais SÃO REJEITADAS
// - roles owner NÃO são aceitas como target
// - seatDelta é derivado internamente (helper), nunca aceito do client

import {
  MEMBERSHIP_STATUSES,
  TENANT_ROLES,
  type MembershipStatus,
  type TenantRole,
} from "@/integrations/supabase/membership-types";

// Derivado do domínio canônico — exclui apenas 'owner'.
export const NON_OWNER_TENANT_ROLES = TENANT_ROLES.filter(
  (r): r is Exclude<TenantRole, "owner"> => r !== "owner",
) as ReadonlyArray<Exclude<TenantRole, "owner">>;

export type NonOwnerTenantRole = (typeof NON_OWNER_TENANT_ROLES)[number];

export const MEMBERSHIP_MUTATION_OPERATIONS = [
  "create_membership",
  "change_role",
  "suspend",
  "reactivate",
  "revoke",
] as const;
export type MembershipMutationOperation =
  (typeof MEMBERSHIP_MUTATION_OPERATIONS)[number];

export type MembershipMutationInput =
  | { operation: "create_membership"; targetUserId: string; targetRole: NonOwnerTenantRole }
  | { operation: "change_role"; targetUserId: string; targetRole: NonOwnerTenantRole }
  | { operation: "suspend"; targetUserId: string }
  | { operation: "reactivate"; targetUserId: string }
  | { operation: "revoke"; targetUserId: string };

// Campos proibidos no payload público (Trusted Actor Context não vem do client)
export const FORBIDDEN_INPUT_FIELDS: ReadonlySet<string> = new Set([
  "tenantId",
  "actorUserId",
  "tenantOrigin",
  "isSuperAdmin",
  "isOwner",
  "targetStatus",
  "membershipStatus",
  "seatDelta",
  "featureKey",
  "allowed",
  "reason",
  "source",
  "limit",
  "used",
  "remaining",
  "billingStatus",
  "CommercialLimitDecision",
  "CommercialFeatureDecision",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isNonOwnerTenantRole(v: unknown): v is NonOwnerTenantRole {
  return (
    typeof v === "string" &&
    (NON_OWNER_TENANT_ROLES as readonly string[]).includes(v)
  );
}

export function parseMembershipMutationInput(raw: unknown): MembershipMutationInput {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid membership mutation input: expected object");
  }

  // Reject forbidden fields
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_INPUT_FIELDS.has(key)) {
      throw new Error(`Forbidden input field: ${key}`);
    }
  }

  const op = raw.operation;
  if (
    typeof op !== "string" ||
    !(MEMBERSHIP_MUTATION_OPERATIONS as readonly string[]).includes(op)
  ) {
    throw new Error("Invalid operation");
  }
  const targetUserId = raw.targetUserId;
  if (typeof targetUserId !== "string" || !UUID_RE.test(targetUserId)) {
    throw new Error("Invalid targetUserId");
  }

  const requiresRole = op === "create_membership" || op === "change_role";
  const allowedKeys = new Set<string>(
    requiresRole
      ? ["operation", "targetUserId", "targetRole"]
      : ["operation", "targetUserId"],
  );
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unexpected input field: ${key}`);
    }
  }

  if (requiresRole) {
    const targetRole = raw.targetRole;
    if (targetRole === "owner") {
      throw new Error("targetRole owner not permitted");
    }
    if (!isNonOwnerTenantRole(targetRole)) {
      throw new Error("Invalid targetRole");
    }
    return {
      operation: op as "create_membership" | "change_role",
      targetUserId,
      targetRole,
    };
  }
  return {
    operation: op as "suspend" | "reactivate" | "revoke",
    targetUserId,
  };
}

// ---------- DTO de retorno ----------

export type MembershipMutationResult = {
  tenantId: string;
  targetUserId: string;
  operation: MembershipMutationOperation;
  changed: boolean;
  previousStatus: MembershipStatus | null;
  status: MembershipStatus;
  previousRole: TenantRole | null;
  role: TenantRole;
};

function isMembershipStatus(v: unknown): v is MembershipStatus {
  return typeof v === "string" && (MEMBERSHIP_STATUSES as readonly string[]).includes(v);
}
function isTenantRole(v: unknown): v is TenantRole {
  return typeof v === "string" && (TENANT_ROLES as readonly string[]).includes(v);
}

const ALLOWED_RESULT_KEYS: ReadonlySet<string> = new Set([
  "tenantId",
  "targetUserId",
  "operation",
  "changed",
  "previousStatus",
  "status",
  "previousRole",
  "role",
]);

export type ExpectedMembershipMutationResult = {
  tenantId: string;
  targetUserId: string;
  operation: MembershipMutationOperation;
};

/**
 * Semantic validator for `mutate_tenant_membership` RPC results.
 *
 * Beyond shape/enum checks, it enforces:
 *   • correspondência com o contexto esperado (tenantId, targetUserId, operation);
 *   • proteção absoluta de owner (nem `role` nem `previousRole` podem ser 'owner');
 *   • semântica determinística por operação (transições permitidas + role stability).
 *
 * Qualquer desvio => throw (fail-closed).
 */
export function validateMembershipMutationResult(
  raw: unknown,
  expected: ExpectedMembershipMutationResult,
): MembershipMutationResult {
  if (!isPlainObject(raw)) throw new Error("Invalid RPC result: not an object");
  for (const k of Object.keys(raw)) {
    if (!ALLOWED_RESULT_KEYS.has(k)) {
      throw new Error(`Unexpected RPC result field: ${k}`);
    }
  }
  const {
    tenantId,
    targetUserId,
    operation,
    changed,
    previousStatus,
    status,
    previousRole,
    role,
  } = raw;

  if (typeof tenantId !== "string" || !UUID_RE.test(tenantId)) {
    throw new Error("Invalid RPC result: tenantId");
  }
  if (typeof targetUserId !== "string" || !UUID_RE.test(targetUserId)) {
    throw new Error("Invalid RPC result: targetUserId");
  }
  if (
    typeof operation !== "string" ||
    !(MEMBERSHIP_MUTATION_OPERATIONS as readonly string[]).includes(operation)
  ) {
    throw new Error("Invalid RPC result: operation");
  }
  if (typeof changed !== "boolean") throw new Error("Invalid RPC result: changed");
  if (previousStatus !== null && !isMembershipStatus(previousStatus)) {
    throw new Error("Invalid RPC result: previousStatus");
  }
  if (!isMembershipStatus(status)) throw new Error("Invalid RPC result: status");
  if (previousRole !== null && !isTenantRole(previousRole)) {
    throw new Error("Invalid RPC result: previousRole");
  }
  if (!isTenantRole(role)) throw new Error("Invalid RPC result: role");

  // --- Context correspondence ---
  if (tenantId !== expected.tenantId) {
    throw new Error("RPC result tenantId mismatch");
  }
  if (targetUserId !== expected.targetUserId) {
    throw new Error("RPC result targetUserId mismatch");
  }
  if (operation !== expected.operation) {
    throw new Error("RPC result operation mismatch");
  }

  // --- Owner protection (this primitive NEVER returns an owner row) ---
  if (role === "owner") {
    throw new Error("RPC result role must not be owner");
  }
  if (previousRole === "owner") {
    throw new Error("RPC result previousRole must not be owner");
  }

  // --- Operation semantics ---
  switch (operation) {
    case "create_membership": {
      if (changed !== true) throw new Error("create_membership must set changed=true");
      if (previousStatus !== null) {
        throw new Error("create_membership must have previousStatus=null");
      }
      if (previousRole !== null) {
        throw new Error("create_membership must have previousRole=null");
      }
      if (status !== "active") {
        throw new Error("create_membership must produce status=active");
      }
      break;
    }
    case "change_role": {
      if (previousStatus === null) {
        throw new Error("change_role requires non-null previousStatus");
      }
      if (previousStatus === "revoked") {
        throw new Error("change_role not permitted on revoked");
      }
      if (status !== previousStatus) {
        throw new Error("change_role must preserve status");
      }
      if (previousRole === null) {
        throw new Error("change_role requires non-null previousRole");
      }
      if (changed === false && role !== previousRole) {
        throw new Error("change_role noop must preserve role");
      }
      if (changed === true && role === previousRole) {
        throw new Error("change_role changed=true must alter role");
      }
      break;
    }
    case "suspend": {
      if (previousStatus === null) throw new Error("suspend requires existing membership");
      if (role !== previousRole) throw new Error("suspend must preserve role");
      if (previousStatus === "active" && status === "suspended" && changed === true) break;
      if (previousStatus === "suspended" && status === "suspended" && changed === false) break;
      throw new Error(
        `suspend invalid transition: prev=${previousStatus} next=${status} changed=${changed}`,
      );
    }
    case "reactivate": {
      if (previousStatus === null) throw new Error("reactivate requires existing membership");
      if (role !== previousRole) throw new Error("reactivate must preserve role");
      if (previousStatus === "suspended" && status === "active" && changed === true) break;
      if (previousStatus === "active" && status === "active" && changed === false) break;
      throw new Error(
        `reactivate invalid transition: prev=${previousStatus} next=${status} changed=${changed}`,
      );
    }
    case "revoke": {
      if (previousStatus === null) throw new Error("revoke requires existing membership");
      if (role !== previousRole) throw new Error("revoke must preserve role");
      if (
        (previousStatus === "active" || previousStatus === "invited" || previousStatus === "suspended") &&
        status === "revoked" &&
        changed === true
      ) {
        break;
      }
      if (previousStatus === "revoked" && status === "revoked" && changed === false) break;
      throw new Error(
        `revoke invalid transition: prev=${previousStatus} next=${status} changed=${changed}`,
      );
    }
  }

  return {
    tenantId,
    targetUserId,
    operation: operation as MembershipMutationOperation,
    changed,
    previousStatus: (previousStatus ?? null) as MembershipStatus | null,
    status,
    previousRole: (previousRole ?? null) as TenantRole | null,
    role,
  };
}
