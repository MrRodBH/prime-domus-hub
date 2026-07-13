// SCP-012.0.2.2 §12 — Unit specs for the extracted selection helper.
// The observable tie-breaker case exercises: two subscriptions with the
// same status priority and same started_at, IDs A < B, provided to the
// selector in reverse order — helper must return the row with id A.

import {
  selectCommercialSubscription,
  selectPrimaryProviderMapping,
} from "@/lib/api/commercial/commercial-context-selection";
import type {
  ProviderMappingRow,
  SubscriptionRow,
} from "@/lib/api/commercial/read-models";

type SpecResult = { passed: number; failed: number };

function makeSub(partial: Partial<SubscriptionRow> & Pick<SubscriptionRow, "id">): SubscriptionRow {
  return {
    id: partial.id,
    tenant_id: partial.tenant_id ?? "00000000-0000-0000-0000-000000000000",
    plan_id: partial.plan_id ?? null,
    status: partial.status ?? "active",
    status_reason: partial.status_reason ?? null,
    // Preserve explicit null for started_at so NULLS LAST tests can pass null.
    started_at: "started_at" in partial ? partial.started_at ?? null : "2026-01-01T00:00:00Z",
    trial_ends_at: partial.trial_ends_at ?? null,
    current_period_start: partial.current_period_start ?? null,
    current_period_end: partial.current_period_end ?? null,
    canceled_at: partial.canceled_at ?? null,
    suspended_at: partial.suspended_at ?? null,
  } as SubscriptionRow;
}





export async function runCommercialContextSelectionSpecs(): Promise<SpecResult> {
  let passed = 0;
  let failed = 0;
  const check = (name: string, cond: boolean) => {
    if (cond) { passed++; } else { failed++; console.log(`  ✗ ${name}`); }
  };

  // empty input
  check(
    "empty subscription array returns null",
    selectCommercialSubscription([]) === null,
  );
  check(
    "empty provider mapping array returns null",
    selectPrimaryProviderMapping([]) === null,
  );

  // status priority
  const canceled = makeSub({ id: "aaaaaaaa-0000-0000-0000-000000000001", status: "canceled" });
  const active = makeSub({ id: "aaaaaaaa-0000-0000-0000-000000000002", status: "active" });
  check(
    "active beats canceled regardless of order",
    selectCommercialSubscription([canceled, active])?.id === active.id,
  );

  // started_at DESC NULLS LAST
  const older = makeSub({ id: "bbbbbbbb-0000-0000-0000-000000000001", status: "active", started_at: "2025-01-01T00:00:00Z" });
  const newer = makeSub({ id: "bbbbbbbb-0000-0000-0000-000000000002", status: "active", started_at: "2026-01-01T00:00:00Z" });
  check(
    "same status: newer started_at wins",
    selectCommercialSubscription([older, newer])?.id === newer.id,
  );
  const nullStart = makeSub({ id: "bbbbbbbb-0000-0000-0000-000000000003", status: "active", started_at: null });
  check(
    "same status: non-null started_at beats null (NULLS LAST)",
    selectCommercialSubscription([nullStart, older])?.id === older.id,
  );

  // final tie-breaker: id ASC
  // SCP-012.0.2.2 §12 — observable tie-breaker: same status, same
  // started_at, IDs A < B, reversed input order → A must win.
  const idA = "cccccccc-0000-0000-0000-000000000001";
  const idB = "cccccccc-0000-0000-0000-000000000002";
  const tieA = makeSub({ id: idA, status: "active", started_at: "2026-06-01T00:00:00Z" });
  const tieB = makeSub({ id: idB, status: "active", started_at: "2026-06-01T00:00:00Z" });
  check(
    "tie-breaker: same priority + same started_at, reversed input → id ASC picks A",
    selectCommercialSubscription([tieB, tieA])?.id === idA,
  );

  // provider mapping
  const inactiveMap: ProviderMappingRow = {
    tenant_id: "t1",
    provider_code: "stripe",
    subscription_id: null,
    status: "inactive",
  };
  const activeMap: ProviderMappingRow = {
    tenant_id: "t1",
    provider_code: "stripe",
    subscription_id: null,
    status: "active",
  };
  check(
    "provider: active wins over inactive",
    selectPrimaryProviderMapping([inactiveMap, activeMap])?.status === "active",
  );
  check(
    "provider: no active → returns first row",
    selectPrimaryProviderMapping([inactiveMap])?.status === "inactive",
  );

  return { passed, failed };
}

