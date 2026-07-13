// SCP-012 — Commercial Seat Limit Enforcement Error (server-only-adjacent).
//
// Contrato puro sem I/O. Reconhece EXCLUSIVAMENTE o erro estruturado
// `commercial_seat_limit_denied` produzido pela RPC canônica
// public.mutate_tenant_membership e o converte em CommercialSeatLimitDeniedError
// carregando a decisão CommercialLimitDecision validada.
//
// Nunca recomputa a decisão. Nunca consulta o banco. Nunca aceita valores
// inseguros do client. Todo desvio semântico do DETAIL falha determinístico.

import type { CommercialLimitDecision } from "@/lib/api/commercial/limit-decision";
import { validateSeatDecisionResponse } from "@/lib/api/commercial/seat-limit-rpc-contract";

export const COMMERCIAL_SEAT_LIMIT_DENIED_MESSAGE = "commercial_seat_limit_denied";

export class CommercialSeatLimitDeniedError extends Error {
  readonly code = "commercial_seat_limit_denied" as const;
  readonly decision: CommercialLimitDecision;
  constructor(decision: CommercialLimitDecision) {
    super(COMMERCIAL_SEAT_LIMIT_DENIED_MESSAGE);
    this.name = "CommercialSeatLimitDeniedError";
    this.decision = decision;
  }
}

/**
 * PostgREST/Supabase surface do erro RPC. Não depende de imports do supabase-js
 * para permanecer puramente testável.
 */
export type SupabaseRpcErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Se o erro corresponder à negação comercial canônica, retorna a instância
 * tipada. Caso contrário retorna `null` (erro NÃO é comercial e deve ser
 * tratado como falha determinística do boundary pelo caller).
 *
 * Erros semanticamente inválidos que se apresentam como negação comercial
 * (DETAIL ausente/malformado, tenant divergente, allowed=true, etc.) NÃO são
 * silenciosamente engolidos — lançam Error, forçando fail-closed.
 */
export function parseCommercialSeatLimitDeniedError(
  err: unknown,
  expectedTenantId: string,
): CommercialSeatLimitDeniedError | null {
  if (!isPlainObject(err)) return null;
  const message = typeof err.message === "string" ? err.message : "";
  // Exact-match only. Substrings, prefixes, suffixes, and wrapped messages MUST NOT be classified.
  if (message !== COMMERCIAL_SEAT_LIMIT_DENIED_MESSAGE) return null;

  const detail = err.details;
  if (typeof detail !== "string" || detail.length === 0) {
    throw new Error("commercial_seat_limit_denied: missing DETAIL");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(detail);
  } catch {
    throw new Error("commercial_seat_limit_denied: DETAIL is not valid JSON");
  }

  // Validate via canonical seat-decision validator. Passes iff shape+semantics ok.
  const decision = validateSeatDecisionResponse(parsed, expectedTenantId, 1);

  if (decision.allowed !== false) {
    throw new Error("commercial_seat_limit_denied: decision.allowed must be false");
  }

  return new CommercialSeatLimitDeniedError(decision);
}
