// PR-M1 — Typed Transition Boundary (server-only)
//
// Single server-side authority for lead status transitions. Wraps the
// SECURITY DEFINER RPC `transition_lead_status`, validates the JSON
// response, and maps known Postgres errors into a stable, typed contract
// so callers (Kanban / advance / lose / discard / reopen) can render
// deterministic UI, rollback optimistic updates, and refetch.

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// --- Canonical domain ----------------------------------------------------

export const LEAD_STATUSES = [
  "novo",
  "conversando",
  "visita",
  "proposta",
  "ganho",
  "perdido",
  "descartado",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_REASON_TYPES = [
  "advance",
  "discard",
  "lost",
  "reopen",
] as const;

export type LeadReasonType = (typeof LEAD_REASON_TYPES)[number];

// --- Typed error codes ---------------------------------------------------

export const LEAD_TRANSITION_ERROR_CODES = [
  "unauthenticated",
  "tenant_unresolved",
  "tenant_boundary_violation",
  "no_active_membership",
  "forbidden",
  "lead_not_found",
  "invalid_to_status",
  "invalid_transition",
  "noop_transition",
  "version_conflict",
  "discard_reason_required",
  "invalid_discard_reason",
  "lost_reason_required",
  "invalid_lost_reason",
  "reason_id_not_allowed_for_transition",
  "rpc_contract_violation",
  "unknown_error",
] as const;

export type LeadTransitionErrorCode =
  (typeof LEAD_TRANSITION_ERROR_CODES)[number];

export class LeadTransitionError extends Error {
  readonly code: LeadTransitionErrorCode;
  readonly detail?: string;
  readonly pgCode?: string;

  constructor(
    code: LeadTransitionErrorCode,
    message: string,
    opts: { detail?: string; pgCode?: string } = {},
  ) {
    super(message);
    this.name = "LeadTransitionError";
    this.code = code;
    this.detail = opts.detail;
    this.pgCode = opts.pgCode;
  }
}

// --- Input / output contracts -------------------------------------------

const uuid = z.string().uuid();
const leadStatus = z.enum(LEAD_STATUSES);
const reasonType = z.enum(LEAD_REASON_TYPES);

const metadataSchema = z
  .object({
    note: z.string().max(2000).nullish(),
    source: z.string().max(200).nullish(),
  })
  .strict()
  .partial()
  .optional();

export const LeadTransitionInputSchema = z.object({
  leadId: uuid,
  toStatus: leadStatus,
  expectedVersion: z.number().int().nonnegative(),
  reasonId: uuid.nullish(),
  metadata: metadataSchema,
});

export type LeadTransitionInput = z.infer<typeof LeadTransitionInputSchema>;

const RpcResponseSchema = z.object({
  lead_id: uuid,
  from_status: leadStatus,
  to_status: leadStatus,
  reason_type: reasonType,
  version: z.number().int().positive(),
});

export const LeadTransitionResultSchema = z.object({
  leadId: uuid,
  fromStatus: leadStatus,
  toStatus: leadStatus,
  reasonType: reasonType,
  version: z.number().int().positive(),
});

export type LeadTransitionResult = z.infer<typeof LeadTransitionResultSchema>;

// --- Error mapping -------------------------------------------------------

const KNOWN_MESSAGES: ReadonlySet<string> = new Set(
  LEAD_TRANSITION_ERROR_CODES.filter(
    (c) => c !== "rpc_contract_violation" && c !== "unknown_error",
  ),
);

export interface PostgrestLikeError {
  message?: string | null;
  details?: string | null;
  code?: string | null;
  hint?: string | null;
}

/**
 * Maps a Postgres/PostgREST-like error into a typed LeadTransitionError.
 *
 * Recognizes canonical identifiers either as an exact message or as the
 * head of a `code: extra detail` shape (RAISE EXCEPTION USING DETAIL...).
 * Never converts arbitrary Postgres text into an internal code.
 */
export function mapRpcError(err: PostgrestLikeError): LeadTransitionError {
  const raw = (err.message ?? "").trim();
  const detail = err.details ?? undefined;
  const pgCode = err.code ?? undefined;

  // Exact match.
  if (KNOWN_MESSAGES.has(raw)) {
    return new LeadTransitionError(raw as LeadTransitionErrorCode, raw, {
      detail,
      pgCode,
    });
  }

  // `code: rest` prefix — canonical identifier must be an isolated head
  // token, delimited by `:`, before any free-text detail. Anything else
  // falls into `unknown_error` deliberately.
  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0) {
    const head = raw.slice(0, colonIdx).trim();
    if (KNOWN_MESSAGES.has(head)) {
      return new LeadTransitionError(head as LeadTransitionErrorCode, raw, {
        detail,
        pgCode,
      });
    }
  }

  return new LeadTransitionError("unknown_error", raw || "unknown_error", {
    detail,
    pgCode,
  });
}

// --- Boundary ------------------------------------------------------------

/**
 * Minimal structurally-typed RPC client for the transition boundary. The
 * real Supabase client satisfies this interface without any cast; test
 * doubles can implement it directly.
 */
export interface LeadTransitionRpcClient {
  rpc(
    fn: "transition_lead_status",
    args: Database["public"]["Functions"]["transition_lead_status"]["Args"],
  ): PromiseLike<{
    data: unknown;
    error: PostgrestLikeError | null;
  }>;
}

/**
 * Transitions a lead through the canonical RPC. `client` MUST be an
 * authenticated client (RLS as the caller). Never pass supabaseAdmin here.
 */
export async function transitionLead(
  client: LeadTransitionRpcClient,
  rawInput: LeadTransitionInput,
): Promise<LeadTransitionResult> {
  const input = LeadTransitionInputSchema.parse(rawInput);

  const metadataJson: Record<string, string> = {};
  if (input.metadata?.note != null) metadataJson.note = input.metadata.note;
  if (input.metadata?.source != null)
    metadataJson.source = input.metadata.source;

  const { data, error } = await client.rpc("transition_lead_status", {
    _lead_id: input.leadId,
    _to_status: input.toStatus,
    _expected_version: input.expectedVersion,
    _reason_id: input.reasonId ?? undefined,
    _metadata: metadataJson,
  });

  if (error) throw mapRpcError(error);

  const parsed = RpcResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new LeadTransitionError(
      "rpc_contract_violation",
      "transition_lead_status returned an unexpected payload",
      { detail: parsed.error.message },
    );
  }

  return {
    leadId: parsed.data.lead_id,
    fromStatus: parsed.data.from_status,
    toStatus: parsed.data.to_status,
    reasonType: parsed.data.reason_type,
    version: parsed.data.version,
  };
}
