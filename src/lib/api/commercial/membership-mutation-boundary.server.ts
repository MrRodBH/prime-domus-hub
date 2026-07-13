// SCP-012.0.3 — Membership Mutation Boundary (server-only)
//
// Única escrita autorizada: chama exclusivamente a RPC canônica
// public.mutate_tenant_membership via supabaseAdmin. NUNCA escreve
// diretamente em tenant_members. NUNCA implementa fallback TypeScript.
//
// Este módulo é *.server.ts — bloqueado do bundle do cliente.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  parseMembershipMutationInput,
  validateMembershipMutationResult,
  type MembershipMutationInput,
  type MembershipMutationResult,
} from "@/lib/api/commercial/membership-mutation-types";
import {
  classifyMembershipSeatDelta,
  type MembershipSeatDelta,
} from "@/lib/api/commercial/membership-seat-delta";

export type TrustedActorContext = {
  actorUserId: string;
  tenantId: string;
  tenantOrigin: "impersonation" | "selection" | "single-membership";
};

export type MembershipMutationOutcome = {
  result: MembershipMutationResult;
  /** classificação interna — NÃO exposta ao cliente nesta etapa. */
  seatDelta: MembershipSeatDelta;
};

/**
 * Executa uma mutation canônica de membership.
 * O `context` deve ter sido produzido pelos middlewares (requireSupabaseAuth
 * + requireTenant). Nenhum campo do context vem do payload público.
 */
export async function executeMembershipMutation(
  context: TrustedActorContext,
  rawInput: unknown,
): Promise<MembershipMutationOutcome> {
  const input: MembershipMutationInput = parseMembershipMutationInput(rawInput);

  const rpcArgs: Record<string, unknown> = {
    _actor_user_id: context.actorUserId,
    _tenant_id: context.tenantId,
    _tenant_origin: context.tenantOrigin,
    _operation: input.operation,
    _target_user_id: input.targetUserId,
    _target_role:
      input.operation === "create_membership" || input.operation === "change_role"
        ? input.targetRole
        : null,
  };

  const { data, error } = await supabaseAdmin.rpc(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "mutate_tenant_membership" as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpcArgs as any,
  );

  if (error) {
    // fail-closed determinístico
    throw new Error(`membership_mutation_rpc_failed: ${error.message}`);
  }
  if (data === null || data === undefined) {
    throw new Error("membership_mutation_rpc_failed: empty response");
  }

  const result = validateMembershipMutationResult(data, {
    tenantId: context.tenantId,
    targetUserId: input.targetUserId,
    operation: input.operation,
    targetRole:
      input.operation === "create_membership" || input.operation === "change_role"
        ? input.targetRole
        : undefined,
  });
  const seatDelta = classifyMembershipSeatDelta({
    operation: result.operation,
    previousStatus: result.previousStatus,
    nextStatus: result.status,
    changed: result.changed,
  });

  return { result, seatDelta };
}
