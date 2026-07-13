// SCP-012.0.3 — Membership Seat Delta (classificação interna determinística)
//
// Helper puro. NUNCA aceita valor do client, NUNCA autoriza a mutation,
// NUNCA chama o resolver comercial. Existe para consumo pela SCP-012 final.

import type { MembershipStatus } from "@/integrations/supabase/membership-types";
import type { MembershipMutationOperation } from "@/lib/api/commercial/membership-mutation-types";

export type MembershipSeatDelta = -1 | 0 | 1;

export type SeatDeltaContext = {
  operation: MembershipMutationOperation;
  previousStatus: MembershipStatus | null;
  nextStatus: MembershipStatus;
  changed: boolean;
};

/**
 * Classifica o efeito quantitativo de uma mutation aplicada.
 * Contrato: NUNCA lê estado externo; NUNCA aceita valor do client.
 */
export function classifyMembershipSeatDelta(ctx: SeatDeltaContext): MembershipSeatDelta {
  if (!ctx.changed) return 0;

  switch (ctx.operation) {
    case "create_membership":
      // criação ativa direta
      return ctx.nextStatus === "active" ? 1 : 0;
    case "reactivate":
      return ctx.previousStatus === "suspended" && ctx.nextStatus === "active" ? 1 : 0;
    case "suspend":
      return ctx.previousStatus === "active" && ctx.nextStatus === "suspended" ? -1 : 0;
    case "revoke":
      if (ctx.nextStatus !== "revoked") return 0;
      if (ctx.previousStatus === "active" || ctx.previousStatus === "invited") return -1;
      return 0; // suspended → revoked ou já revoked
    case "change_role":
      return 0;
    default:
      return 0;
  }
}
