// SCP-004 — specs for commercial read-model pure derivation.
import {
  deriveAdminDiagnostic,
  deriveBillingHealth,
  deriveCommercialSummary,
  deriveEntitlementSnapshot,
  type PlanEntitlementRow,
  type PlanRow,
  type ProviderMappingRow,
  type SubscriptionRow,
  type TenantEntitlementRow,
} from "@/lib/api/commercial/read-models";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "commercial summary: empty tenant returns null plan/subscription/provider",
    run: async () => {
      const dto = deriveCommercialSummary({
        tenantId: TENANT,
        subscription: null,
        plan: null,
        providerMapping: null,
      });
      assert(dto.tenantId === TENANT, "tenantId echoed");
      assert(dto.plan.id === null && dto.plan.code === null, "plan null");
      assert(dto.subscription.status === null, "sub status null");
      assert(dto.billingProvider.configured === false, "provider not configured");
      // Sanitization: no forbidden fields present.
      const keys = Object.keys(dto.billingProvider);
      assert(
        !keys.some((k) => k.toLowerCase().includes("customer") || k.toLowerCase().includes("ref")),
        "no provider refs leaked",
      );
    },
  },
  {
    name: "commercial summary: whitelisted fields only",
    run: async () => {
      const sub: SubscriptionRow = {
        id: "s1",
        tenant_id: TENANT,
        plan_id: "p1",
        status: "active",
        status_reason: null,
        started_at: "2026-01-01T00:00:00Z",
        trial_ends_at: null,
        current_period_start: "2026-07-01T00:00:00Z",
        current_period_end: "2026-08-01T00:00:00Z",
        canceled_at: null,
        suspended_at: null,
      };
      const plan: PlanRow = { id: "p1", code: "pro", name: "Pro", status: "active" };
      const mapping: ProviderMappingRow = {
        tenant_id: TENANT,
        provider_code: "stub",
        status: "active",
        subscription_id: "s1",
      };
      const dto = deriveCommercialSummary({
        tenantId: TENANT,
        subscription: sub,
        plan,
        providerMapping: mapping,
      });
      assert(dto.plan.code === "pro" && dto.plan.name === "Pro", "plan reflected");
      assert(dto.subscription.status === "active", "sub active");
      assert(dto.billingProvider.configured === true, "provider configured");
      const subKeys = Object.keys(dto.subscription);
      assert(
        !subKeys.some(
          (k) =>
            k.includes("provider") ||
            k.includes("payload") ||
            k.includes("idempotency") ||
            k.includes("error"),
        ),
        "sanitized subscription payload",
      );
    },
  },
  {
    name: "entitlement snapshot: tenant overrides plan",
    run: async () => {
      const planEnts: PlanEntitlementRow[] = [
        {
          plan_id: "p1",
          entitlement_key: "seats",
          value_bool: null,
          value_int: 5,
          value_decimal: null,
          value_text: null,
        },
        {
          plan_id: "p1",
          entitlement_key: "reports",
          value_bool: true,
          value_int: null,
          value_decimal: null,
          value_text: null,
        },
      ];
      const tenantEnts: TenantEntitlementRow[] = [
        {
          tenant_id: TENANT,
          entitlement_key: "seats",
          source: "tenant",
          value_bool: null,
          value_int: 10,
          value_decimal: null,
          value_text: null,
          effective_from: null,
          effective_until: null,
        },
      ];
      const dto = deriveEntitlementSnapshot({
        tenantId: TENANT,
        tenantEntitlements: tenantEnts,
        planEntitlements: planEnts,
        activePlanId: "p1",
      });
      const seats = dto.entitlements.find((e) => e.key === "seats");
      const reports = dto.entitlements.find((e) => e.key === "reports");
      assert(seats?.value === 10 && seats?.source === "tenant", "tenant overrides plan");
      assert(reports?.value === true && reports?.source === "plan", "plan value preserved");
      assert(dto.entitlements.every((e) => typeof e.effective === "boolean"), "effective typed");
    },
  },
  {
    name: "entitlement snapshot: effective window respected",
    run: async () => {
      const now = new Date("2026-07-09T00:00:00Z");
      const dto = deriveEntitlementSnapshot({
        tenantId: TENANT,
        now,
        activePlanId: null,
        planEntitlements: [],
        tenantEntitlements: [
          {
            tenant_id: TENANT,
            entitlement_key: "expired",
            source: "tenant",
            value_bool: true,
            value_int: null,
            value_decimal: null,
            value_text: null,
            effective_from: null,
            effective_until: "2026-01-01T00:00:00Z",
          },
        ],
      });
      const e = dto.entitlements.find((x) => x.key === "expired");
      assert(e?.effective === false, "past effective_until = not effective");
    },
  },
  {
    name: "entitlement snapshot: no plan, no tenant entitlements → empty",
    run: async () => {
      const dto = deriveEntitlementSnapshot({
        tenantId: TENANT,
        activePlanId: null,
        planEntitlements: [],
        tenantEntitlements: [],
      });
      assert(dto.entitlements.length === 0, "empty snapshot");
    },
  },
  {
    name: "billing health: no subscription → unknown + reason",
    run: async () => {
      const dto = deriveBillingHealth({
        tenantId: TENANT,
        subscription: null,
        providerMapping: null,
        lastEvent: null,
      });
      assert(dto.status === "unknown", "unknown");
      assert(dto.reasons.includes("no_subscription"), "no_subscription reason");
      assert(dto.hasProviderMapping === false, "no mapping");
      assert(dto.lastBillingEventAt === null, "no event");
    },
  },
  {
    name: "billing health: active subscription → healthy",
    run: async () => {
      const sub: SubscriptionRow = {
        id: "s1",
        tenant_id: TENANT,
        plan_id: "p1",
        status: "active",
        status_reason: null,
        started_at: null,
        trial_ends_at: null,
        current_period_start: null,
        current_period_end: null,
        canceled_at: null,
        suspended_at: null,
      };
      const dto = deriveBillingHealth({
        tenantId: TENANT,
        subscription: sub,
        providerMapping: {
          tenant_id: TENANT,
          provider_code: "stub",
          status: "active",
          subscription_id: "s1",
        },
        lastEvent: { tenant_id: TENANT, received_at: "2026-07-01T00:00:00Z", processing_status: "processed" },
      });
      assert(dto.status === "healthy", "healthy");
      assert(dto.lastBillingEventAt === "2026-07-01T00:00:00Z", "last event exposed only as timestamp");
    },
  },
  {
    name: "billing health: past_due → attention_required; suspended → blocked",
    run: async () => {
      const base: SubscriptionRow = {
        id: "s",
        tenant_id: TENANT,
        plan_id: null,
        status: "past_due",
        status_reason: null,
        started_at: null,
        trial_ends_at: null,
        current_period_start: null,
        current_period_end: null,
        canceled_at: null,
        suspended_at: null,
      };
      const attn = deriveBillingHealth({
        tenantId: TENANT,
        subscription: base,
        providerMapping: null,
        lastEvent: null,
      });
      assert(attn.status === "attention_required", "attention");

      const blocked = deriveBillingHealth({
        tenantId: TENANT,
        subscription: { ...base, status: "suspended" },
        providerMapping: null,
        lastEvent: null,
      });
      assert(blocked.status === "blocked", "blocked");
    },
  },
  {
    name: "admin diagnostic: warnings when empty",
    run: async () => {
      const dto = deriveAdminDiagnostic({
        tenantId: TENANT,
        subscription: null,
        tenantEntitlementsCount: 0,
        providerMapping: null,
        billingEventsCount: 0,
      });
      assert(dto.commercialRecords.hasSubscription === false, "no sub");
      assert(dto.warnings.includes("missing_subscription"), "warn sub");
      assert(dto.warnings.includes("no_tenant_entitlements"), "warn ents");
      assert(dto.warnings.includes("no_provider_mapping"), "warn map");
    },
  },
  {
    name: "admin diagnostic: never exposes provider refs / payloads",
    run: async () => {
      const dto = deriveAdminDiagnostic({
        tenantId: TENANT,
        subscription: null,
        tenantEntitlementsCount: 3,
        providerMapping: {
          tenant_id: TENANT,
          provider_code: "stub",
          status: "active",
          subscription_id: "s1",
        },
        billingEventsCount: 7,
      });
      const json = JSON.stringify(dto);
      assert(!json.includes("provider_customer_ref"), "no customer ref");
      assert(!json.includes("provider_subscription_ref"), "no sub ref");
      assert(!json.includes("payload"), "no payload");
      assert(!json.includes("idempotency"), "no idempotency");
    },
  },
];

export async function runCommercialReadModelsSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const s of specs) {
    try {
      await s.run();
      passed++;
    } catch (e) {
      failed++;
      console.error(`  ✗ ${s.name}: ${(e as Error).message}`);
    }
  }
  return { passed, failed };
}
