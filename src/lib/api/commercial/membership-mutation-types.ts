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

export function validateMembershipMutationResult(raw: unknown): MembershipMutationResult {
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
