// SCP-011.1 — Commercial Seat Limit Runtime Orchestration.
//
// Pure, dependency-injected orchestration of the seat limit decision.
// This module is imported by the public server function
// (`getCommercialSeatLimitDecision`) AND by the commercial-seat-limit
// specs, so that the production code path IS the tested code path
// (SCP-011.1 §7). No parallel test-only reader.
//
// It performs no I/O by itself — all side effects (context load,
// tenant_members COUNT) are provided as injectable dependencies. The
// module contains no supabase / server-only imports, and can therefore
// be unit-tested without pulling `client.server` into the client graph.
//
// Canonical runtime order (SCP-011.1 §4):
//   requireTenant                          ← in the server function
//   → strict input validation              ← in the server function
//   → featureKey = SEAT_FEATURE_KEY (server-side, never client-provided)
//   → evaluateFeatureCatalogGate           ← BEFORE any commercial read
//   → only if catalog allows:
//        loadCommercialContext             ← subscriptions/entitlements/billing
//        decideCommercialFeature
//   → only if feature allowed:
//        extractSeatLimit
//        readSeatUsage                     ← authoritative tenant_members COUNT
//   → decideCommercialSeatLimit            ← pure helper (no I/O)

import { evaluateFeatureCatalogGate } from "./feature-catalog";
import {
  decideCommercialFeature,
  type CommercialFeatureDecision,
} from "./feature-gate";
import {
  SEAT_FEATURE_KEY,
  decideCommercialSeatLimit,
  extractSeatLimit,
  isValidCommercialInteger,
  validateSeatUsedCount,
  type CommercialLimitDecision,
} from "./limit-decision";
import type {
  TenantBillingHealth,
  TenantEntitlementSnapshot,
} from "./read-models";

export interface CommercialContext {
  snapshot: TenantEntitlementSnapshot;
  billing: TenantBillingHealth;
}

export interface SeatLimitRuntimeDeps {
  evaluateCatalogGate: (input: {
    tenantId: string;
    featureKey: string;
  }) => CommercialFeatureDecision | null;
  loadCommercialContext: (tenantId: string) => Promise<CommercialContext>;
  readSeatUsage: (tenantId: string) => Promise<number | null>;
}

// Default catalog-gate wiring — the same helper `getCommercialFeatureDecision`
// uses (SCP-006 / SCP-008). Exposed so tests / production share the same
// implementation and no dual catalog can be introduced.
export const defaultEvaluateCatalogGate: SeatLimitRuntimeDeps["evaluateCatalogGate"] =
  evaluateFeatureCatalogGate;

export async function resolveCommercialSeatLimitDecision(input: {
  tenantId: string;
  requestedIncrement: number;
  deps: SeatLimitRuntimeDeps;
}): Promise<CommercialLimitDecision> {
  const { tenantId, requestedIncrement, deps } = input;
  const featureKey = SEAT_FEATURE_KEY;

  // §4/§5 — Catalog gate FIRST. On negative, no commercial context is
  // loaded, no tenant_members read is performed.
  const catalogGate = deps.evaluateCatalogGate({ tenantId, featureKey });
  if (catalogGate) {
    return decideCommercialSeatLimit({
      featureDecision: catalogGate,
      extracted: { limit: null, source: "none" },
      used: null,
      requestedIncrement,
    });
  }

  // §4 — Only after catalog allows do we touch the commercial context.
  const { snapshot, billing } = await deps.loadCommercialContext(tenantId);

  const featureDecision = decideCommercialFeature({
    tenantId,
    featureKey,
    snapshot,
    billing,
  });

  // §8.2 — Negative feature decision: DO NOT call readSeatUsage.
  if (!featureDecision.allowed) {
    return decideCommercialSeatLimit({
      featureDecision,
      extracted: { limit: null, source: "none" },
      used: null,
      requestedIncrement,
    });
  }

  // §8.3 — Feature allowed: extract limit from the SAME snapshot and
  // count tenant_members exactly once via the injected reader.
  const extracted = extractSeatLimit(snapshot);
  const rawUsed = await deps.readSeatUsage(tenantId);
  const used = validateSeatUsedCount(rawUsed);

  return decideCommercialSeatLimit({
    featureDecision,
    extracted,
    used,
    requestedIncrement,
  });
}
