// SCP-011.2 — Production Seat Usage Reader.
//
// The single, authoritative reader for the users.seats used count. Both
// the public server function (`getCommercialSeatLimitDecision`) and the
// commercial-seat-limit specs import this exact function — no parallel
// reader exists anywhere in the codebase (SCP-011.2 §5/§7).
//
// Contract:
//   • Reads ONLY from public.tenant_members.
//   • Filters by tenant_id (server-resolved) AND
//     membership_status IN ('active','invited').
//   • Uses count=exact + head=true — no rows are returned.
//   • Read-only: no insert / update / upsert / delete / rpc / mutation.
//   • On DB error / null count / invalid count → returns `null`
//     (the caller emits `not_evaluated`, never `limit_reached`).

import { validateSeatUsedCount } from "./limit-decision";

// Structural, minimal supabase-js-compatible surface — kept intentionally
// narrow so no client capability other than the exact query below can be
// used through this handle.
export interface CommercialSeatUsageQueryResult {
  count: number | null;
  error: unknown;
}

export interface CommercialSeatUsageQueryBuilder
  extends PromiseLike<CommercialSeatUsageQueryResult> {
  eq(column: string, value: string): CommercialSeatUsageQueryBuilder;
  in(
    column: string,
    values: readonly string[],
  ): CommercialSeatUsageQueryBuilder;
}

export interface CommercialSeatUsageSelectBuilder {
  select(
    columns: string,
    opts: { count: "exact"; head: true },
  ): CommercialSeatUsageQueryBuilder;
}

export interface CommercialSeatUsageClient {
  from(table: "tenant_members"): CommercialSeatUsageSelectBuilder;
}

export async function readCommercialSeatUsage(
  client: CommercialSeatUsageClient,
  tenantId: string,
): Promise<number | null> {
  if (typeof tenantId !== "string" || tenantId.length === 0) return null;
  try {
    const res = await client
      .from("tenant_members")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("membership_status", ["active", "invited"]);
    if (res.error) return null;
    return validateSeatUsedCount(res.count);
  } catch {
    return null;
  }
}
