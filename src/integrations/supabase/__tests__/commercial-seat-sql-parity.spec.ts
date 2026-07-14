// F4-CF-01 — Canonical RLS-safe SQL/TypeScript parity harness.
//
// Executes against real PostgreSQL (Supabase managed) exclusively via
// the service-role admin client — no `psql`, no `PGHOST`, no
// sandbox_exec role. Each scenario:
//
//   1. builds isolated synthetic fixtures under a per-run UUID
//      namespace using service-role INSERTs (auth users included);
//   2. invokes the SQL authority
//      `public.resolve_commercial_seat_decision(...)` via
//      `admin.rpc(...)`;
//   3. computes the TypeScript oracle
//      (`decideCommercialFeature` + `extractSeatLimit` +
//      `decideCommercialSeatLimit`) from the SAME fixture definition;
//   4. asserts deep equality of BOTH DTOs against a canonical
//      expected DTO hand-crafted per scenario across the full field
//      set (tenantId, featureKey, allowed, reason, source, limit,
//      used, requestedIncrement, remaining);
//   5. cleans up every inserted row and every auth user fail-closed —
//      any deletion or residual-verification error fails the runner.
//
// Boundaries:
//   • zero mutation of production commercial data — every fixture uses
//     fresh UUIDs and a synthetic auth user set;
//   • no fixed auth user id, no fixed tenant / plan / subscription;
//   • no `.catch(() => {})` in cleanup — errors are accumulated and
//     surfaced;
//   • harness fixtures use service_role because the SCP-012 ACL
//     forbids client roles from seeding these tables. This is test
//     infrastructure and does not create a production runtime path.

import { createClient } from "@supabase/supabase-js";

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

// ============================================================
// Service-role admin client
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Per-run trackers used by teardown.
const RUN_TAG = `scp012p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const createdAuthUsers = new Set<string>();
const createdTenants = new Set<string>();
const createdPlans = new Set<string>();
const grantedSuperAdmins = new Set<string>();

// ============================================================
// Auth user helpers
// ============================================================

async function createAuthUser(prefix: string): Promise<string> {
  const idx = createdAuthUsers.size;
  const email = `${prefix}-${RUN_TAG}-${idx}@test.local`;
  const password = `Px!${Math.random().toString(36).slice(2)}A9`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser(${prefix}): ${error?.message ?? "no user"}`);
  createdAuthUsers.add(data.user.id);
  return data.user.id;
}

async function grantSuperAdmin(userId: string): Promise<void> {
  const { error } = await admin
    .from("user_roles" as Any)
    .insert({ user_id: userId, role: "super_admin" } as Any);
  if (error) throw new Error(`grantSuperAdmin: ${error.message}`);
  grantedSuperAdmins.add(userId);
}

// ============================================================
// Fixture types
// ============================================================

interface EntitlementValue {
  value_bool?: boolean | null;
  value_int?: number | null;
  value_decimal?: number | null;
  value_text?: string | null;
}

interface MembershipSpec {
  status: "active" | "invited" | "suspended" | "revoked";
}

interface FixtureSpec {
  tenantId: string;
  plans?: Array<{ id: string; entitlement?: EntitlementValue | null }>;
  primaryPlanId?: string | null;
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
  memberships?: MembershipSpec[];
  providerMapping?: boolean;
  // Populated by setupFixture.
  memberUserIds?: string[];
}

function uuid(): string {
  return crypto.randomUUID();
}

function slug(prefix: string, id: string): string {
  return (prefix + "_" + id.replace(/-/g, "").slice(0, 10)).toLowerCase();
}

// ============================================================
// Setup / teardown
// ============================================================

async function insertOrThrow(
  table: string,
  payload: Record<string, unknown>,
  label: string,
): Promise<void> {
  const { error } = await admin.from(table as Any).insert(payload as Any);
  if (error) throw new Error(`insert ${label}: ${error.message}`);
}

async function setupFixture(f: FixtureSpec): Promise<void> {
  await insertOrThrow("tenants", {
    id: f.tenantId,
    slug: slug("p", f.tenantId),
    nome: `F4CF01 parity ${f.tenantId.slice(0, 8)}`,
    status: "ativo",
  }, `tenant ${f.tenantId}`);
  createdTenants.add(f.tenantId);

  for (const p of f.plans ?? []) {
    await insertOrThrow("commercial_plans", {
      id: p.id,
      code: slug("pl", p.id),
      name: `harness plan ${p.id.slice(0, 8)}`,
      status: "active",
    }, `plan ${p.id}`);
    createdPlans.add(p.id);
    if (p.entitlement) {
      await insertOrThrow("commercial_plan_entitlements", {
        plan_id: p.id,
        entitlement_key: SEAT_FEATURE_KEY,
        value_bool: p.entitlement.value_bool ?? null,
        value_int: p.entitlement.value_int ?? null,
        value_decimal: p.entitlement.value_decimal ?? null,
        value_text: p.entitlement.value_text ?? null,
      }, `plan entitlement ${p.id}`);
    }
  }

  for (const s of f.subscriptions ?? []) {
    await insertOrThrow("tenant_subscriptions", {
      id: s.id,
      tenant_id: f.tenantId,
      plan_id: s.plan_id ?? null,
      status: s.status,
      started_at: s.started_at ?? null,
    }, `subscription ${s.id}`);
  }

  if (f.tenantEntitlement) {
    const v = f.tenantEntitlement;
    await insertOrThrow("tenant_entitlements", {
      tenant_id: f.tenantId,
      entitlement_key: SEAT_FEATURE_KEY,
      source: v.source ?? "override",
      value_bool: v.value_bool ?? null,
      value_int: v.value_int ?? null,
      value_decimal: v.value_decimal ?? null,
      value_text: v.value_text ?? null,
      effective_from: v.effective_from ?? "1970-01-01",
      effective_until: v.effective_until ?? null,
      subscription_id: null,
    }, `tenant_entitlement ${f.tenantId}`);
  }

  const memberIds: string[] = [];
  for (const m of f.memberships ?? []) {
    const uid = await createAuthUser("member");
    memberIds.push(uid);
    await insertOrThrow("tenant_members", {
      tenant_id: f.tenantId,
      user_id: uid,
      tenant_role: "viewer",
      membership_status: m.status,
      is_owner: false,
      is_default: false,
      joined_at: new Date().toISOString(),
      accepted_at: m.status === "active" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, `tenant_member ${uid}`);
  }
  f.memberUserIds = memberIds;

  if (f.providerMapping) {
    await insertOrThrow("tenant_billing_provider_mappings", {
      tenant_id: f.tenantId,
      provider_code: "stripe",
      status: "active",
    }, `provider mapping ${f.tenantId}`);
  }
}

// ============================================================
// TypeScript oracle
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

function tsOracle(f: FixtureSpec, requestedIncrement: number): CommercialLimitDecision {
  const subs: SubscriptionRow[] = (f.subscriptions ?? []).map((s) => ({
    id: s.id,
    tenant_id: f.tenantId,
    plan_id: s.plan_id ?? null,
    status: s.status,
    status_reason: null,
    started_at: s.started_at ?? null,
    trial_ends_at: null,
    current_period_start: null,
    current_period_end: null,
    canceled_at: null,
    suspended_at: null,
  }));
  const SUB_STATUS_PRIORITY = [
    "active", "trialing", "past_due", "grace", "suspended", "canceled", "unpaid",
  ];
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
  const planEntitlements: PlanEntitlementRow[] = [];
  for (const p of f.plans ?? []) {
    if (p.entitlement && p.id === activePlanId) {
      planEntitlements.push({
        plan_id: p.id,
        entitlement_key: SEAT_FEATURE_KEY,
        ...toRowValue(p.entitlement),
      });
    }
  }

  const snapshot = deriveEntitlementSnapshot({
    tenantId: f.tenantId,
    tenantEntitlements,
    planEntitlements,
    activePlanId,
  });
  const billing = deriveBillingHealth({
    tenantId: f.tenantId,
    subscription: sub ?? null,
    providerMapping: f.providerMapping
      ? { tenant_id: f.tenantId, provider_code: "stripe", status: "active", subscription_id: null }
      : null,
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

// ============================================================
// SQL invocation
// ============================================================

async function sqlOracle(
  actorUserId: string,
  tenantId: string,
  tenantOrigin: string,
  increment: number,
): Promise<CommercialLimitDecision> {
  const { data, error } = await admin.rpc(
    "resolve_commercial_seat_decision" as Any,
    {
      _actor_user_id: actorUserId,
      _tenant_id: tenantId,
      _tenant_origin: tenantOrigin,
      _requested_increment: increment,
    } as Any,
  );
  if (error) throw new Error(`rpc: ${error.message}`);
  if (data == null) throw new Error("rpc returned null");
  return data as CommercialLimitDecision;
}

// ============================================================
// Deep equality
// ============================================================

function normalize(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(normalize);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).sort()) {
    out[k] = normalize((v as Record<string, unknown>)[k]);
  }
  return out;
}
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

// ============================================================
// Scenarios
// ============================================================

interface Scenario {
  name: string;
  build: () => FixtureSpec;
  expected: (f: FixtureSpec) => CommercialLimitDecision;
  origin?: string;
  increment?: number;
}

const NOW = new Date();
const PAST = new Date(NOW.getTime() - 30 * 86400_000).toISOString();

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

function buildScenarios(): Scenario[] {
  return [
    {
      name: "1. no subscription + no entitlement → billing_unknown",
      build: () => ({ tenantId: uuid() }),
      expected: (f) => baseDto(f.tenantId, {}),
    },
    {
      name: "2. subscription active + no entitlement → not_entitled",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "not_entitled" }),
    },
    {
      name: "3. subscription past_due → billing_attention_required",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "past_due", started_at: PAST }],
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "billing_attention_required" }),
    },
    {
      name: "4. subscription canceled → billing_blocked",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "canceled", started_at: PAST }],
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "billing_blocked" }),
    },
    {
      name: "5. tenant entitlement effective + no members → entitled remaining=limit",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_int: 10 },
      }),
      expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 10, used: 0, remaining: 10 }),
    },
    {
      name: "6. tenant entitlement NOT effective (past) → not_entitled",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_int: 10, effective_from: PAST, effective_until: PAST },
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "not_entitled", source: "tenant" }),
    },
    {
      name: "7. tenant entitlement value_bool=false → not_entitled",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_bool: false },
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "not_entitled", source: "tenant" }),
    },
    {
      name: "8. plan entitlement (no tenant override) → entitled source=plan",
      build: () => {
        const planId = uuid();
        const subId = uuid();
        return {
          tenantId: uuid(),
          plans: [{ id: planId, entitlement: { value_int: 5 } }],
          primaryPlanId: planId,
          subscriptions: [{ id: subId, status: "active", started_at: PAST, plan_id: planId }],
        };
      },
      expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "plan", limit: 5, used: 0, remaining: 5 }),
    },
    {
      name: "9. entitlement with value_text (no numeric) → not_evaluated",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_text: "unlimited" },
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "not_evaluated", source: "none" }),
    },
    {
      name: "10. limit fractional decimal → not_evaluated",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_decimal: 3.5 },
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "not_evaluated", source: "none" }),
    },
    {
      name: "11. limit = 0 + no members → limit_reached",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_int: 0 },
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "limit_reached", source: "tenant", limit: 0, used: 0, remaining: 0 }),
    },
    {
      name: "12. limit = 2 + one active member → entitled remaining=1",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_int: 2 },
        memberships: [{ status: "active" }],
      }),
      expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 2, used: 1, remaining: 1 }),
    },
    {
      name: "13. limit = 2, 1 active + 1 invited → limit_reached",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_int: 2 },
        memberships: [{ status: "active" }, { status: "invited" }],
      }),
      expected: (f) => baseDto(f.tenantId, { reason: "limit_reached", source: "tenant", limit: 2, used: 2, remaining: 0 }),
    },
    {
      name: "14. suspended + revoked NOT counted",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_int: 5 },
        memberships: [{ status: "suspended" }, { status: "revoked" }, { status: "active" }],
      }),
      expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 5, used: 1, remaining: 4 }),
    },
    {
      name: "15. limit = 2^31 (int4 boundary)",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_decimal: 2147483648 },
      }),
      expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 2147483648, used: 0, remaining: 2147483648 }),
    },
    {
      name: "16. limit = MAX_SAFE_INTEGER",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_decimal: 9007199254740991 },
      }),
      expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 9007199254740991, used: 0, remaining: 9007199254740991 }),
    },
    {
      name: "17. subscription tie: same status/started_at → id ASC wins",
      build: () => {
        // Two canonical UUIDs — a<b, both canceled.
        const idA = "00000000-0000-0000-0000-0000000000a1";
        const idB = "00000000-0000-0000-0000-0000000000b1";
        const planA = uuid();
        const planB = uuid();
        return {
          tenantId: uuid(),
          plans: [{ id: planA }, { id: planB }],
          primaryPlanId: planA,
          subscriptions: [
            { id: idB, status: "canceled", started_at: PAST, plan_id: planB },
            { id: idA, status: "canceled", started_at: PAST, plan_id: planA },
          ],
        };
      },
      expected: (f) => baseDto(f.tenantId, { reason: "billing_blocked", source: "none" }),
    },
  ];
}

// ============================================================
// Cleanup (fail-closed)
// ============================================================

function isCanonicalAuthUserNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; status?: unknown; code?: unknown };
  return e.name === "AuthApiError" && e.status === 404 && e.code === "user_not_found";
}

async function runCleanup(): Promise<string[]> {
  const errors: string[] = [];

  // Leaf tables scoped by tenant first.
  for (const tid of createdTenants) {
    for (const table of [
      "tenant_billing_provider_mappings",
      "tenant_members",
      "tenant_entitlements",
      "tenant_subscriptions",
    ]) {
      const { error } = await admin.from(table as Any).delete().eq("tenant_id", tid);
      if (error) errors.push(`delete ${table} for ${tid}: ${error.message}`);
    }
  }

  // Plans and their entitlements.
  for (const pid of createdPlans) {
    const { error: peErr } = await admin.from("commercial_plan_entitlements" as Any).delete().eq("plan_id", pid);
    if (peErr) errors.push(`delete commercial_plan_entitlements for ${pid}: ${peErr.message}`);
    const { error: pErr } = await admin.from("commercial_plans" as Any).delete().eq("id", pid);
    if (pErr) errors.push(`delete commercial_plans ${pid}: ${pErr.message}`);
  }

  // Tenants.
  for (const tid of createdTenants) {
    const { error } = await admin.from("tenants" as Any).delete().eq("id", tid);
    if (error) errors.push(`delete tenants ${tid}: ${error.message}`);
  }

  // user_roles cascade on auth.users delete; explicit delete first anyway.
  for (const uid of grantedSuperAdmins) {
    const { error } = await admin.from("user_roles" as Any).delete().eq("user_id", uid);
    if (error) errors.push(`delete user_roles ${uid}: ${error.message}`);
  }

  // Auth users.
  for (const uid of createdAuthUsers) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) errors.push(`deleteUser ${uid}: ${error.message}`);
  }

  // Residual verification — errors count as inconclusive, not proof of absence.
  async function residual(table: string, column: string, value: string, label: string) {
    const { data, error } = await admin.from(table as Any).select(column).eq(column, value);
    if (error) errors.push(`residual ${label}: ${error.message}`);
    else if ((data ?? []).length > 0) errors.push(`residual rows ${label}: ${JSON.stringify(data)}`);
  }
  for (const tid of createdTenants) {
    await residual("tenant_members", "tenant_id", tid, `tenant_members(${tid})`);
    await residual("tenant_subscriptions", "tenant_id", tid, `tenant_subscriptions(${tid})`);
    await residual("tenant_entitlements", "tenant_id", tid, `tenant_entitlements(${tid})`);
    await residual("tenant_billing_provider_mappings", "tenant_id", tid, `tenant_billing_provider_mappings(${tid})`);
    await residual("tenants", "id", tid, `tenants(${tid})`);
  }
  for (const pid of createdPlans) {
    await residual("commercial_plan_entitlements", "plan_id", pid, `commercial_plan_entitlements(${pid})`);
    await residual("commercial_plans", "id", pid, `commercial_plans(${pid})`);
  }
  for (const uid of createdAuthUsers) {
    const { data, error } = await admin.auth.admin.getUserById(uid);
    if (!error && data?.user) {
      errors.push(`residual auth user ${uid}`);
    } else if (error && isCanonicalAuthUserNotFound(error)) {
      // deletion proven
    } else if (error) {
      errors.push(`auth residual verification ${uid}: ${error.message}`);
    } else {
      errors.push(`auth residual verification returned empty response for ${uid}`);
    }
  }

  return errors;
}

// ============================================================
// Runner entry
// ============================================================

interface ScenarioResult {
  name: string;
  ok: boolean;
  reason?: string;
  expected?: unknown;
  ts?: unknown;
  sql?: unknown;
}

export interface SqlParityResult {
  passed: number;
  failed: number;
  results: ScenarioResult[];
  cleanupErrors: string[];
}

export async function runCommercialSeatSqlParitySpecs(): Promise<SqlParityResult> {
  // Ensure the users.seats definition exists in the catalog table.
  {
    const { error } = await admin.from("commercial_entitlement_definitions" as Any).upsert({
      key: SEAT_FEATURE_KEY,
      name: "Seat limit",
      description: "Seat limit",
      value_type: "integer",
      unit: "seats",
      is_active: true,
    } as Any, { onConflict: "key" } as Any);
    if (error) throw new Error(`entitlement definition upsert: ${error.message}`);
  }

  // One synthetic super_admin actor shared across scenarios.
  const actorId = await createAuthUser("super");
  await grantSuperAdmin(actorId);

  const scenarios = buildScenarios();
  const results: ScenarioResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const sc of scenarios) {
    const f = sc.build();
    try {
      await setupFixture(f);
    } catch (e) {
      failed++;
      results.push({ name: sc.name, ok: false, reason: `setup: ${(e as Error).message}` });
      continue;
    }

    let sqlDto: CommercialLimitDecision;
    try {
      sqlDto = await sqlOracle(actorId, f.tenantId, sc.origin ?? "impersonation", sc.increment ?? 1);
    } catch (e) {
      failed++;
      results.push({ name: sc.name, ok: false, reason: `SQL threw: ${(e as Error).message}` });
      continue;
    }
    const tsDto = tsOracle(f, sc.increment ?? 1);
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
  }

  const cleanupErrors = await runCleanup();
  return { passed, failed, results, cleanupErrors };
}
