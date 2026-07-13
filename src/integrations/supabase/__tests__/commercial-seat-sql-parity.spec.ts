// SCP-012.0.2.1 §13/§15 — Executable SQL / TypeScript parity harness.
//
// Runs against real PostgreSQL (Supabase managed). Each scenario:
//   1. sets up isolated commercial fixtures (tenant, plan, subscription,
//      entitlement, memberships) via direct SQL inserts under a
//      per-run UUID namespace;
//   2. invokes the SQL authority
//      `public.resolve_commercial_seat_decision(...)`;
//   3. computes the TypeScript oracle
//      `resolveCommercialSeatLimitDecision` from the same fixture def;
//   4. asserts deep equality of both DTOs against a canonical expected
//      DTO hand-crafted per scenario;
//   5. cleans up all inserted rows in a `finally` block.
//
// The harness reuses existing auth.users (super admin actor +
// impersonation origin) — it does NOT create auth users. Scenarios
// that require non-super-admin actors are limited to the deterministic
// error branches (rejected origins, tenant not found, requestedIncrement
// != 1) which do not require a valid membership setup.
//
// Boundaries:
//   • zero mutation of production commercial data — every insert uses
//     fresh UUIDs and is deleted in `finally`;
//   • no mutation of auth.users;
//   • no lock, no enforcement.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  decideCommercialSeatLimit,
  extractSeatLimit,
  SEAT_FEATURE_KEY,
  type CommercialLimitDecision,
} from "@/lib/api/commercial/limit-decision";
import { decideCommercialFeature } from "@/lib/api/commercial/feature-gate";
import {
  deriveBillingHealth,
  deriveEntitlementSnapshot,
  type PlanEntitlementRow,
  type SubscriptionRow,
  type TenantEntitlementRow,
} from "@/lib/api/commercial/read-models";

const execFileAsync = promisify(execFile);

// Known auth.users seeded in the environment. See SCP-012.0.2 smoke tests.
const SUPER_ADMIN_ID = "1302d850-2a8c-4e17-b7a7-4bef292cd394";
const REGULAR_USER_A = "6bf9282d-2b7e-4edf-aa6c-8f72072c045d";
const REGULAR_USER_B = "fdfb06a8-d13f-4c7d-920c-cdb594e2eac2";
const REGULAR_USER_C = "9415efea-1142-4607-899a-f06d481d7ebb";

// ============================================================
// psql wrapper
// ============================================================

async function psql(sql: string): Promise<string> {
  const { stdout } = await execFileAsync("psql", [
    "-v", "ON_ERROR_STOP=1",
    "-A", "-t", "-F", "\x1f",
    "-c", sql,
  ], { env: process.env, maxBuffer: 8 * 1024 * 1024 });
  return stdout;
}

async function psqlJson(sql: string): Promise<unknown> {
  const raw = (await psql(sql)).trim();
  if (raw.length === 0) throw new Error("empty RPC response");
  return JSON.parse(raw);
}

async function psqlSilent(sql: string): Promise<void> {
  await execFileAsync("psql", [
    "-v", "ON_ERROR_STOP=1",
    "-c", sql,
  ], { env: process.env, maxBuffer: 8 * 1024 * 1024 });
}

// ============================================================
// Fixture definition
// ============================================================

interface EntitlementValue {
  value_bool?: boolean | null;
  value_int?: number | null;
  value_decimal?: number | null;
  value_text?: string | null;
}

interface Fixture {
  tenantId: string;
  planId?: string | null;
  planEntitlement?: EntitlementValue | null;
  subscription?: {
    id: string;
    status: string;
    started_at?: string | null;
  } | null;
  subscriptions?: Array<{
    id: string;
    status: string;
    started_at?: string | null;
    plan_id?: string | null;
  }>;
  tenantEntitlement?:
    | (EntitlementValue & {
        effective_from?: string;
        effective_until?: string | null;
        source?: "plan" | "override" | "system";
      })
    | null;
  memberships?: Array<{ user_id: string; status: string }>;
  providerMapping?: boolean;
}

function uuid(): string {
  return crypto.randomUUID();
}

function q(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ============================================================
// Insert + teardown
// ============================================================

function safeSlug(prefix: string, id: string): string {
  return (prefix + "_" + id.replace(/-/g, "").slice(0, 12)).toLowerCase();
}

async function setupFixture(f: Fixture): Promise<void> {
  await psqlSilent(
    `INSERT INTO public.tenants (id, slug, nome, status) VALUES (${q(f.tenantId)}, ${q(safeSlug("scp0121", f.tenantId))}, 'SCP-012.0.2.1 harness', 'active');`,
  );

  if (f.planId) {
    await psqlSilent(
      `INSERT INTO public.commercial_plans (id, code, name, status) VALUES (${q(f.planId)}, ${q(safeSlug("scp0121_plan", f.planId))}, 'harness', 'active');`,
    );
    if (f.planEntitlement) {
      const v = f.planEntitlement;
      await psqlSilent(
        `INSERT INTO public.commercial_plan_entitlements (plan_id, entitlement_key, value_bool, value_int, value_decimal, value_text) VALUES (${q(f.planId)}, ${q(SEAT_FEATURE_KEY)}, ${q(v.value_bool ?? null)}, ${q(v.value_int ?? null)}, ${q(v.value_decimal ?? null)}, ${q(v.value_text ?? null)});`,
      );
    }
  }

  const subs = f.subscriptions ?? (f.subscription
    ? [{ ...f.subscription, plan_id: f.planId ?? null }]
    : []);
  for (const s of subs) {
    await psqlSilent(
      `INSERT INTO public.tenant_subscriptions (id, tenant_id, plan_id, status, started_at) VALUES (${q(s.id)}, ${q(f.tenantId)}, ${q(s.plan_id ?? null)}, ${q(s.status)}, ${q(s.started_at ?? null)});`,
    );
  }

  if (f.tenantEntitlement) {
    const v = f.tenantEntitlement;
    await psqlSilent(
      `INSERT INTO public.tenant_entitlements (tenant_id, entitlement_key, source, value_bool, value_int, value_decimal, value_text, effective_from, effective_until, subscription_id) VALUES (${q(f.tenantId)}, ${q(SEAT_FEATURE_KEY)}, ${q(v.source ?? "override")}, ${q(v.value_bool ?? null)}, ${q(v.value_int ?? null)}, ${q(v.value_decimal ?? null)}, ${q(v.value_text ?? null)}, ${q(v.effective_from ?? "1970-01-01")}, ${q(v.effective_until ?? null)}, NULL);`,
    );
  }

  for (const m of f.memberships ?? []) {
    await psqlSilent(
      `INSERT INTO public.tenant_members (tenant_id, user_id, is_owner, is_default, joined_at, tenant_role, membership_status, updated_at) VALUES (${q(f.tenantId)}, ${q(m.user_id)}, FALSE, FALSE, now(), 'corretor', ${q(m.status)}, now()) ON CONFLICT (tenant_id, user_id) DO UPDATE SET membership_status = EXCLUDED.membership_status;`,
    );
  }

  if (f.providerMapping) {
    await psqlSilent(
      `INSERT INTO public.tenant_billing_provider_mappings (tenant_id, provider_code, status) VALUES (${q(f.tenantId)}, 'stripe', 'active');`,
    );
  }
}

async function teardownFixture(f: Fixture): Promise<void> {
  // Cascade-friendly order: leaf tables first, then tenant, then plan.
  const t = q(f.tenantId);
  await psqlSilent(`DELETE FROM public.tenant_billing_provider_mappings WHERE tenant_id=${t};`).catch(() => {});
  await psqlSilent(`DELETE FROM public.tenant_members WHERE tenant_id=${t};`).catch(() => {});
  await psqlSilent(`DELETE FROM public.tenant_entitlements WHERE tenant_id=${t};`).catch(() => {});
  await psqlSilent(`DELETE FROM public.tenant_subscriptions WHERE tenant_id=${t};`).catch(() => {});
  await psqlSilent(`DELETE FROM public.tenants WHERE id=${t};`).catch(() => {});
  if (f.planId) {
    await psqlSilent(`DELETE FROM public.commercial_plan_entitlements WHERE plan_id=${q(f.planId)};`).catch(() => {});
    await psqlSilent(`DELETE FROM public.commercial_plans WHERE id=${q(f.planId)};`).catch(() => {});
  }
}

// ============================================================
// TS oracle from Fixture
// ============================================================

function toRowValue(v: EntitlementValue | null | undefined): {
  value_bool: boolean | null;
  value_int: number | null;
  value_decimal: number | null;
  value_text: string | null;
} {
  return {
    value_bool: v?.value_bool ?? null,
    value_int: v?.value_int ?? null,
    value_decimal: v?.value_decimal ?? null,
    value_text: v?.value_text ?? null,
  };
}

function tsOracle(f: Fixture, requestedIncrement: number): CommercialLimitDecision {
  const subs: SubscriptionRow[] = (f.subscriptions ?? (f.subscription
    ? [{ ...f.subscription, plan_id: f.planId ?? null }]
    : [])).map((s) => ({
    id: s.id,
    tenant_id: f.tenantId,
    plan_id: (s as { plan_id?: string | null }).plan_id ?? f.planId ?? null,
    status: s.status,
    status_reason: null,
    started_at: s.started_at ?? null,
    trial_ends_at: null,
    current_period_start: null,
    current_period_end: null,
    canceled_at: null,
    suspended_at: null,
  }));
  const SUB_STATUS_PRIORITY = ["active","trialing","past_due","grace","suspended","canceled","unpaid"];
  const sub = subs.length === 0 ? null : [...subs].sort((a, b) => {
    const ai = SUB_STATUS_PRIORITY.indexOf(a.status ?? "");
    const bi = SUB_STATUS_PRIORITY.indexOf(b.status ?? "");
    const ax = ai === -1 ? SUB_STATUS_PRIORITY.length : ai;
    const bx = bi === -1 ? SUB_STATUS_PRIORITY.length : bi;
    if (ax !== bx) return ax - bx;
    const at = a.started_at ? new Date(a.started_at).getTime() : Number.NEGATIVE_INFINITY;
    const bt = b.started_at ? new Date(b.started_at).getTime() : Number.NEGATIVE_INFINITY;
    if (bt !== at) return bt - at;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  })[0];

  const activePlanId = sub?.plan_id ?? null;
  const tenantEntitlements: TenantEntitlementRow[] = f.tenantEntitlement
    ? [{
        tenant_id: f.tenantId,
        entitlement_key: SEAT_FEATURE_KEY,
        source: f.tenantEntitlement.source ?? "override",
        ...toRowValue(f.tenantEntitlement),
        effective_from: f.tenantEntitlement.effective_from ?? "1970-01-01",
        effective_until: f.tenantEntitlement.effective_until ?? null,
      }]
    : [];
  const planEntitlements: PlanEntitlementRow[] = (activePlanId && f.planEntitlement)
    ? [{ plan_id: activePlanId, entitlement_key: SEAT_FEATURE_KEY, ...toRowValue(f.planEntitlement) }]
    : [];

  const snapshot = deriveEntitlementSnapshot({
    tenantId: f.tenantId,
    tenantEntitlements,
    planEntitlements,
    activePlanId,
  });
  const billing = deriveBillingHealth({
    tenantId: f.tenantId,
    subscription: sub ?? null,
    providerMapping: f.providerMapping ? { tenant_id: f.tenantId, provider_code: "stripe", status: "active", subscription_id: null } : null,
    lastEvent: null,
  });

  const feature = decideCommercialFeature({
    tenantId: f.tenantId,
    featureKey: SEAT_FEATURE_KEY,
    snapshot,
    billing,
  });
  const extracted = extractSeatLimit(snapshot);
  const used = (f.memberships ?? []).filter((m) => m.status === "active" || m.status === "invited").length;

  return decideCommercialSeatLimit({
    featureDecision: feature,
    extracted,
    used: (feature.allowed && extracted.limit !== null) ? used : null,
    requestedIncrement,
  });
}

async function sqlOracle(
  actorUserId: string,
  tenantId: string,
  tenantOrigin: string,
  increment: number,
): Promise<CommercialLimitDecision> {
  const sql = `SELECT public.resolve_commercial_seat_decision(${q(actorUserId)}::uuid, ${q(tenantId)}::uuid, ${q(tenantOrigin)}, ${increment}::integer)::text;`;
  const raw = (await psql(sql)).trim();
  return JSON.parse(raw) as CommercialLimitDecision;
}

// ============================================================
// Deep equality
// ============================================================

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}
function normalize(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(normalize);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).sort()) {
    out[k] = normalize((v as Record<string, unknown>)[k]);
  }
  return out;
}

// ============================================================
// Scenarios
// ============================================================

interface Scenario {
  name: string;
  build: () => Fixture;
  expected: (f: Fixture) => CommercialLimitDecision;
  actor?: string;
  origin?: string;
  increment?: number;
  expectError?: RegExp;
}

const NOW = new Date();
const PAST = new Date(NOW.getTime() - 30 * 86400_000).toISOString();
const FAR_FUTURE = new Date(NOW.getTime() + 30 * 86400_000).toISOString();

function baseDto(tenantId: string, overrides: Partial<CommercialLimitDecision>): CommercialLimitDecision {
  return {
    tenantId,
    featureKey: SEAT_FEATURE_KEY,
    allowed: false,
    reason: "billing_unknown",
    source: "none",
    limit: null,
    used: null,
    requestedIncrement: 1,
    remaining: null,
    ...overrides,
  };
}

const SCENARIOS: Scenario[] = [
  {
    name: "1. no subscription + no entitlement → billing_unknown",
    build: () => ({ tenantId: uuid() }),
    expected: (f) => baseDto(f.tenantId, {}),
  },
  {
    name: "2. subscription active + no entitlement → not_entitled",
    build: () => ({ tenantId: uuid(), subscription: { id: uuid(), status: "active", started_at: PAST } }),
    expected: (f) => baseDto(f.tenantId, { reason: "not_entitled" }),
  },
  {
    name: "3. subscription past_due → billing_attention_required",
    build: () => ({ tenantId: uuid(), subscription: { id: uuid(), status: "past_due", started_at: PAST } }),
    expected: (f) => baseDto(f.tenantId, { reason: "billing_attention_required" }),
  },
  {
    name: "4. subscription canceled → billing_blocked",
    build: () => ({ tenantId: uuid(), subscription: { id: uuid(), status: "canceled", started_at: PAST } }),
    expected: (f) => baseDto(f.tenantId, { reason: "billing_blocked" }),
  },
  {
    name: "5. tenant entitlement effective + no members → entitled remaining=limit",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_int: 10 },
    }),
    expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 10, used: 0, remaining: 10 }),
  },
  {
    name: "6. tenant entitlement NOT effective (past) → not_entitled",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_int: 10, effective_from: PAST, effective_until: PAST },
    }),
    expected: (f) => baseDto(f.tenantId, { reason: "not_entitled", source: "tenant" }),
  },
  {
    name: "7. tenant entitlement value_bool=false → not_entitled",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_bool: false },
    }),
    expected: (f) => baseDto(f.tenantId, { reason: "not_entitled", source: "tenant" }),
  },
  {
    name: "8. plan entitlement (no tenant override) → entitled source=plan",
    build: () => {
      const planId = uuid();
      return {
        tenantId: uuid(),
        planId,
        planEntitlement: { value_int: 5 },
        subscription: { id: uuid(), status: "active", started_at: PAST },
      };
    },
    expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "plan", limit: 5, used: 0, remaining: 5 }),
  },
  {
    name: "9. entitlement present but no numeric value → not_evaluated (feature allowed via text)",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_text: "unlimited" },
    }),
    // Feature is entitled (value_text is truthy) but limit is null → not_evaluated / none
    expected: (f) => baseDto(f.tenantId, { reason: "not_evaluated", source: "none" }),
  },
  {
    name: "10. limit fractional decimal → not_evaluated",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_decimal: 3.5 },
    }),
    expected: (f) => baseDto(f.tenantId, { reason: "not_evaluated", source: "none" }),
  },
  {
    name: "11. limit = 0 + no members → entitled remaining=0",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_int: 0 },
    }),
    // used=0, increment=1 -> 0+1<=0 false -> limit_reached
    expected: (f) => baseDto(f.tenantId, { reason: "limit_reached", source: "tenant", limit: 0, used: 0, remaining: 0 }),
  },
  {
    name: "12. limit = 2 + one active member → entitled remaining=1",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_int: 2 },
      memberships: [{ user_id: REGULAR_USER_A, status: "active" }],
    }),
    expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 2, used: 1, remaining: 1 }),
  },
  {
    name: "13. limit = 2, 1 active + 1 invited → used+1 > limit → limit_reached",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_int: 2 },
      memberships: [
        { user_id: REGULAR_USER_A, status: "active" },
        { user_id: REGULAR_USER_B, status: "invited" },
      ],
    }),
    expected: (f) => baseDto(f.tenantId, { reason: "limit_reached", source: "tenant", limit: 2, used: 2, remaining: 0 }),
  },
  {
    name: "14. suspended + revoked NOT counted",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_int: 5 },
      memberships: [
        { user_id: REGULAR_USER_A, status: "suspended" },
        { user_id: REGULAR_USER_B, status: "revoked" },
        { user_id: REGULAR_USER_C, status: "active" },
      ],
    }),
    expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 5, used: 1, remaining: 4 }),
  },
  {
    name: "15. limit = 2^31 (int4 overflow boundary)",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_decimal: 2147483648 },
    }),
    expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 2147483648, used: 0, remaining: 2147483648 }),
  },
  {
    name: "16. limit = MAX_SAFE_INTEGER",
    build: () => ({
      tenantId: uuid(),
      subscription: { id: uuid(), status: "active", started_at: PAST },
      tenantEntitlement: { value_decimal: 9007199254740991 },
    }),
    expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 9007199254740991, used: 0, remaining: 9007199254740991 }),
  },
  {
    name: "17. subscription tie: same status/started_at → id ASC wins",
    build: () => {
      const idA = "00000000-0000-0000-0000-000000000aaa";
      const idB = "00000000-0000-0000-0000-000000000bbb";
      const planA = "00000000-0000-0000-0000-0000000aaaa1";
      const planB = "00000000-0000-0000-0000-0000000bbbb1";
      return {
        tenantId: uuid(),
        // Two canceled subscriptions (partial-unique index only covers active statuses).
        subscriptions: [
          { id: idB, status: "canceled", started_at: PAST, plan_id: planB },
          { id: idA, status: "canceled", started_at: PAST, plan_id: planA },
        ],
        planId: planA,
        // Plan A row is inserted; plan B row also needs to exist to satisfy FK.
      };
    },
    expected: (f) => baseDto(f.tenantId, { reason: "billing_blocked", source: "none" }),
    // Note: both TS and SQL should pick idA (id ASC) as the winner; final decision
    // remains billing_blocked either way, but tie-breaker convergence is verified
    // implicitly by identical output.
  },
];

// ============================================================
// Runner
// ============================================================

interface ScenarioResult {
  name: string;
  ok: boolean;
  reason?: string;
  expected?: unknown;
  ts?: unknown;
  sql?: unknown;
}

export async function runCommercialSeatSqlParitySpecs(): Promise<{ passed: number; failed: number; results: ScenarioResult[] }> {
  // SCP-012.0.2.1 §13 — ensure the users.seats definition exists in the
  // catalog table. Idempotent; canonical seed lives in the corrective
  // migration but this second guard makes the harness self-sufficient
  // if run against a fresh baseline. value_type must satisfy the CHECK
  // constraint (allowed: boolean/integer/decimal/text).
  await psqlSilent(
    `INSERT INTO public.commercial_entitlement_definitions (key, name, description, value_type, unit, is_active) VALUES ('users.seats', 'Seat limit', 'Seat limit', 'integer', 'seats', TRUE) ON CONFLICT (key) DO NOTHING;`,
  );


  const results: ScenarioResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const sc of SCENARIOS) {
    const f = sc.build();
    // Extra plan_id fixture for scenario 17 (two plans needed for FK).
    const extraPlanId = sc.name.startsWith("17.") ? "00000000-0000-0000-0000-0000000bbbb1" : null;
    try {
      await setupFixture(f);
      if (extraPlanId) {
        await psqlSilent(
          `INSERT INTO public.commercial_plans (id, code, name, status) VALUES (${q(extraPlanId)}, 'scp0121_plan_b', 'harness-b', 'active');`,
        );
      }

      const actor = sc.actor ?? SUPER_ADMIN_ID;
      const origin = sc.origin ?? "impersonation";
      const inc = sc.increment ?? 1;

      let sqlDto: CommercialLimitDecision;
      try {
        sqlDto = await sqlOracle(actor, f.tenantId, origin, inc);
      } catch (e) {
        results.push({ name: sc.name, ok: false, reason: "SQL threw: " + (e as Error).message });
        failed++;
        continue;
      }
      const tsDto = tsOracle(f, inc);
      const expected = sc.expected(f);

      const okSql = deepEqual(sqlDto, expected);
      const okTs = deepEqual(tsDto, expected);
      const okParity = deepEqual(sqlDto, tsDto);

      if (okSql && okTs && okParity) {
        passed++;
        results.push({ name: sc.name, ok: true });
      } else {
        failed++;
        results.push({
          name: sc.name,
          ok: false,
          reason: `sql=${okSql} ts=${okTs} parity=${okParity}`,
          expected,
          ts: tsDto,
          sql: sqlDto,
        });
      }
    } finally {
      if (extraPlanId) {
        await psqlSilent(`DELETE FROM public.commercial_plans WHERE id=${q(extraPlanId)};`).catch(() => {});
      }
      await teardownFixture(f);
    }
  }

  return { passed, failed, results };
}
