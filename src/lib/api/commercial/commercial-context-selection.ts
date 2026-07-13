// SCP-012.0.2.2 §12 — Deterministic selection helpers extracted to a
// pure module so the same canonical ordering is exercised by the runtime
// (`commercial.functions.ts`) and by unit tests. No I/O, no Supabase
// imports.
//
// Canonical subscription ordering (mirrors SQL resolver):
//   1. status priority (active, trialing, past_due, grace, suspended,
//      canceled, unpaid, then everything else)
//   2. started_at DESC NULLS LAST
//   3. id ASC (final tie-breaker)

import type { ProviderMappingRow, SubscriptionRow } from "./read-models";

export const SUB_STATUS_PRIORITY = [
  "active",
  "trialing",
  "past_due",
  "grace",
  "suspended",
  "canceled",
  "unpaid",
] as const;

export function selectCommercialSubscription(
  rows: SubscriptionRow[],
): SubscriptionRow | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => {
    const ai = SUB_STATUS_PRIORITY.indexOf(a.status as (typeof SUB_STATUS_PRIORITY)[number]);
    const bi = SUB_STATUS_PRIORITY.indexOf(b.status as (typeof SUB_STATUS_PRIORITY)[number]);
    const ax = ai === -1 ? SUB_STATUS_PRIORITY.length : ai;
    const bx = bi === -1 ? SUB_STATUS_PRIORITY.length : bi;
    if (ax !== bx) return ax - bx;
    const at = a.started_at ? new Date(a.started_at).getTime() : Number.NEGATIVE_INFINITY;
    const bt = b.started_at ? new Date(b.started_at).getTime() : Number.NEGATIVE_INFINITY;
    if (bt !== at) return bt - at;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return sorted[0];
}

export function selectPrimaryProviderMapping(
  rows: ProviderMappingRow[],
): ProviderMappingRow | null {
  if (rows.length === 0) return null;
  const active = rows.find((r) => r.status === "active");
  return active ?? rows[0];
}
