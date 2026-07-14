// F4-CF-01 — Canonical RLS-safe SQL/TypeScript parity harness.
//
// Executes against real PostgreSQL (Supabase managed) exclusively via
// the service-role admin client — no `psql`, no `PGHOST`, no
// sandbox_exec role.
//
// Groups (reported separately):
//   • decision parity scenarios — real RPC invocation vs TS oracle vs
//     canonical expected DTO, deep-equal across the full field set;
//   • rejection contract scenarios — real RPC invocation with inputs
//     that MUST raise, asserting exact contract code + message prefix;
//   • structural ordering assertion — reads the latest CREATE FUNCTION
//     of `resolve_commercial_seat_decision` from versioned migrations
//     and verifies the canonical status priority + started_at DESC
//     NULLS LAST + id ASC ordering is present.
//
// Boundaries:
//   • the harness does NOT mutate global catalog rows. The
//     `commercial_entitlement_definitions.users.seats` row is verified
//     read-only in preflight; a missing / disabled / mistyped row
//     fails the runner fail-closed — the harness does not repair
//     production catalog state.
//   • every fixture uses freshly generated UUIDs and synthetic auth
//     users; nothing is fixed across runs.
//   • all setup runs inside a top-level try/finally; cleanup is always
//     executed and its errors are surfaced.
//   • `COMMERCIAL_PARITY_INJECT_FAILURE_AFTER_SETUP=1` injects a
//     synthetic error after the first setupFixture returns, to
//     demonstrate that cleanup runs and residues stay zero. This flag
//     is test-only; production code never reads it.
//   • harness fixtures use service_role because the SCP-012 ACL
//     forbids client roles from seeding these tables. This is test
//     infrastructure and does not create a production runtime path.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
// Catalog snapshot (read-only)
// ============================================================

export interface CatalogSnapshot {
  key: string | null;
  value_type: string | null;
  is_active: boolean | null;
  name: string | null;
  unit: string | null;
  description: string | null;
}

async function readCatalogSnapshot(): Promise<CatalogSnapshot> {
  const { data, error } = await admin
    .from("commercial_entitlement_definitions" as Any)
    .select("key, value_type, is_active, name, unit, description")
    .eq("key", SEAT_FEATURE_KEY)
    .maybeSingle();
  if (error) throw new Error(`catalog snapshot read failed: ${error.message}`);
  if (!data) return { key: null, value_type: null, is_active: null, name: null, unit: null, description: null };
  const d = data as Record<string, unknown>;
  return {
    key: (d.key as string | null) ?? null,
    value_type: (d.value_type as string | null) ?? null,
    is_active: (d.is_active as boolean | null) ?? null,
    name: (d.name as string | null) ?? null,
    unit: (d.unit as string | null) ?? null,
    description: (d.description as string | null) ?? null,
  };
}

/**
 * Read-only preflight for the `users.seats` catalog row.
 * Fail-closed: any drift is a precondition failure, not a repair opportunity.
 */
async function validateCatalogPreconditions(): Promise<CatalogSnapshot> {
  const snap = await readCatalogSnapshot();
  const fail = (msg: string) => {
    throw new Error(
      `catalog precondition failed: ${msg}. ` +
      `the integration harness does not repair production catalog state.`,
    );
  };
  if (snap.key !== SEAT_FEATURE_KEY) fail(`missing ${SEAT_FEATURE_KEY} definition`);
  if (snap.value_type !== "integer") fail(`value_type=${String(snap.value_type)} (expected integer)`);
  if (snap.is_active !== true) fail(`is_active=${String(snap.is_active)} (expected true)`);
  return snap;
}

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

interface RpcErrorShape {
  message: string;
  code?: string;
}

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

async function sqlOracleExpectError(
  actorUserId: string,
  tenantId: string,
  tenantOrigin: string,
  increment: number,
): Promise<{ data: unknown; error: RpcErrorShape | null }> {
  const { data, error } = await admin.rpc(
    "resolve_commercial_seat_decision" as Any,
    {
      _actor_user_id: actorUserId,
      _tenant_id: tenantId,
      _tenant_origin: tenantOrigin,
      _requested_increment: increment,
    } as Any,
  );
  return { data, error: error as RpcErrorShape | null };
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
// Decision parity scenarios
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
      // Column `value_decimal` is numeric(14,2); the RPC's logical
      // MAX_SAFE_INTEGER ceiling is NOT reachable at storage. We
      // exercise the largest integer that fits the schema (10^12-1)
      // — this is well beyond int4 (2^31-1) and thus exercises the
      // bigint arithmetic path end-to-end. This is NOT equivalent to
      // executing MAX_SAFE_INTEGER against the database; that upper
      // bound is only exercised by the unit-level RPC contract test.
      name: "16. limit beyond int4 (numeric(14,2) upper bound) → entitled bigint arithmetic",
      build: () => ({
        tenantId: uuid(),
        subscriptions: [{ id: uuid(), status: "active", started_at: PAST }],
        tenantEntitlement: { value_decimal: 999999999999 },
      }),
      expected: (f) => baseDto(f.tenantId, { allowed: true, reason: "entitled", source: "tenant", limit: 999999999999, used: 0, remaining: 999999999999 }),
    },
    {
      // Historically named "id ASC winner". That framing was a false
      // positive: with two `canceled` subscriptions and identical
      // started_at, the RPC DTO cannot expose which subscription won
      // (no subscription id in the output). Renamed to reflect what
      // this scenario ACTUALLY proves: the decision is stable and
      // canonical under duplicate rows, and SQL / TS / expected agree.
      // The true id-ASC tie-break rule is proven separately by the
      // structural ordering assertion below (not counted as a
      // decision scenario).
      name: "17. duplicate canceled subscriptions with equal started_at → canonical billing_blocked decision",
      build: () => {
        const [idA, idB] = [uuid(), uuid()].sort();
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
// Rejection contract scenarios
// ============================================================

interface RejectionCase {
  name: string;
  /** Called with the shared super admin actor id, may create fixtures. */
  run: (superActorId: string) => Promise<{ data: unknown; error: RpcErrorShape | null }>;
  /** substring or prefix that must appear in error.message */
  expectMessageIncludes: string;
  /** optional SQLSTATE code */
  expectCode?: string;
}

function buildRejectionCases(): RejectionCase[] {
  return [
    {
      name: "R1. requestedIncrement = 0 → Invalid requestedIncrement (22023)",
      run: (uid) => sqlOracleExpectError(uid, uuid(), "impersonation", 0),
      expectMessageIncludes: "Invalid requestedIncrement",
      expectCode: "22023",
    },
    {
      name: "R2. requestedIncrement = 2 → Invalid requestedIncrement (22023)",
      run: (uid) => sqlOracleExpectError(uid, uuid(), "impersonation", 2),
      expectMessageIncludes: "Invalid requestedIncrement",
      expectCode: "22023",
    },
    {
      name: "R3. tenant_origin = 'bogus' → Invalid tenant origin (22023)",
      run: (uid) => sqlOracleExpectError(uid, uuid(), "bogus", 1),
      expectMessageIncludes: "Invalid tenant origin",
      expectCode: "22023",
    },
    {
      name: "R4. actor uuid not in auth.users → Actor not found (22023)",
      run: () => sqlOracleExpectError(uuid(), uuid(), "impersonation", 1),
      expectMessageIncludes: "Actor not found",
      expectCode: "22023",
    },
    {
      name: "R5. super admin actor with origin=selection → Super admin requires impersonation origin (22023)",
      run: (uid) => sqlOracleExpectError(uid, uuid(), "selection", 1),
      expectMessageIncludes: "Super admin requires impersonation origin",
      expectCode: "22023",
    },
    {
      name: "R6. super admin with impersonation but tenant not found → Tenant not found (22023)",
      // super admin passes actor validation; tenant existence is checked next.
      run: (uid) => sqlOracleExpectError(uid, uuid(), "impersonation", 1),
      expectMessageIncludes: "Tenant not found",
      expectCode: "22023",
    },
  ];
}

// ============================================================
// Structural ordering assertion — reads canonical CREATE FUNCTION
// from versioned migrations. NOT counted as a decision scenario.
// ============================================================

interface StructuralResult {
  name: string;
  ok: boolean;
  reason?: string;
}

function readCanonicalResolveFunctionBody(): { body: string; migration: string } {
  const dir = "supabase/migrations";
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let picked: { body: string; migration: string } | null = null;
  // Match any dollar-quoted tag: `$fn$`, `$function$`, `$$`, `$body$`, etc.
  const rx = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.resolve_commercial_seat_decision\b[\s\S]*?AS\s+(\$[A-Za-z_]*\$)([\s\S]*?)\1/gi;
  for (const f of files) {
    const src = readFileSync(join(dir, f), "utf8");
    let m: RegExpExecArray | null;
    rx.lastIndex = 0;
    while ((m = rx.exec(src)) !== null) {
      picked = { body: m[1], migration: f };
    }
  }
  if (!picked) throw new Error("canonical CREATE FUNCTION resolve_commercial_seat_decision not found in migrations");
  return picked;
}

function structuralOrderingAssertion(): StructuralResult {
  const name = "S1. resolve_commercial_seat_decision subscription ordering (status priority, started_at DESC NULLS LAST, id ASC)";
  try {
    const { body, migration } = readCanonicalResolveFunctionBody();
    const norm = body.replace(/\s+/g, " ").toLowerCase();
    // Locate the ORDER BY that governs subscription pick. We look for
    // the sequence: CASE status ... 'active' ... ORDER BY appears
    // implicitly via the ORDER BY … CASE status WHEN 'active' THEN 0
    // pattern, followed by started_at desc nulls last, then id asc,
    // then limit 1.
    const orderRx = /order by\s+case status[\s\S]*?when 'active'\s*then 0[\s\S]*?started_at desc nulls last[\s\S]*?,\s*id asc\s+limit 1/;
    if (!orderRx.test(norm)) {
      return { name, ok: false, reason: `canonical ordering not matched in ${migration}` };
    }
    return { name, ok: true };
  } catch (e) {
    return { name, ok: false, reason: (e as Error).message };
  }
}

// ============================================================
// Cleanup (fail-closed)
// ============================================================

function isCanonicalAuthUserNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; status?: unknown; code?: unknown };
  return e.name === "AuthApiError" && e.status === 404 && e.code === "user_not_found";
}

async function runCleanupFailClosed(): Promise<string[]> {
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

  for (const pid of createdPlans) {
    const { error: peErr } = await admin.from("commercial_plan_entitlements" as Any).delete().eq("plan_id", pid);
    if (peErr) errors.push(`delete commercial_plan_entitlements for ${pid}: ${peErr.message}`);
    const { error: pErr } = await admin.from("commercial_plans" as Any).delete().eq("id", pid);
    if (pErr) errors.push(`delete commercial_plans ${pid}: ${pErr.message}`);
  }

  for (const tid of createdTenants) {
    const { error } = await admin.from("tenants" as Any).delete().eq("id", tid);
    if (error) errors.push(`delete tenants ${tid}: ${error.message}`);
  }

  for (const uid of grantedSuperAdmins) {
    const { error } = await admin.from("user_roles" as Any).delete().eq("user_id", uid);
    if (error) errors.push(`delete user_roles ${uid}: ${error.message}`);
  }

  for (const uid of createdAuthUsers) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) errors.push(`deleteUser ${uid}: ${error.message}`);
  }

  // Residual verification.
  async function residual(table: string, column: string, value: string, label: string) {
    const { data, error } = await admin.from(table as Any).select(column).eq(column, value);
    if (error) errors.push(`residual ${label}: ${error.message}`);
    else if (data == null) errors.push(`residual ${label}: unexpected null response`);
    else if ((data ?? []).length > 0) errors.push(`residual rows ${label}: ${JSON.stringify(data)}`);
  }
  for (const tid of createdTenants) {
    await residual("tenant_billing_provider_mappings", "tenant_id", tid, `tenant_billing_provider_mappings(${tid})`);
    await residual("tenant_members", "tenant_id", tid, `tenant_members(${tid})`);
    await residual("tenant_entitlements", "tenant_id", tid, `tenant_entitlements(${tid})`);
    await residual("tenant_subscriptions", "tenant_id", tid, `tenant_subscriptions(${tid})`);
    await residual("tenants", "id", tid, `tenants(${tid})`);
  }
  for (const pid of createdPlans) {
    await residual("commercial_plan_entitlements", "plan_id", pid, `commercial_plan_entitlements(${pid})`);
    await residual("commercial_plans", "id", pid, `commercial_plans(${pid})`);
  }
  for (const uid of grantedSuperAdmins) {
    await residual("user_roles", "user_id", uid, `user_roles(${uid})`);
  }
  for (const uid of createdAuthUsers) {
    const { data, error } = await admin.auth.admin.getUserById(uid);
    if (!error && data?.user) {
      errors.push(`residual auth user ${uid}`);
    } else if (error && isCanonicalAuthUserNotFound(error)) {
      // deletion proven
    } else if (error) {
      errors.push(`auth residual verification ${uid}: ${(error as Error).message}`);
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
  decisionPassed: number;
  decisionFailed: number;
  decisionResults: ScenarioResult[];
  rejectionPassed: number;
  rejectionFailed: number;
  rejectionResults: ScenarioResult[];
  structuralPassed: number;
  structuralFailed: number;
  structuralResults: StructuralResult[];
  cleanupErrors: string[];
  fatalError: string | null;
  catalogBefore: CatalogSnapshot | null;
  catalogAfter: CatalogSnapshot | null;
  catalogUnchanged: boolean;
}

async function executeAllChecks(actorId: string): Promise<{
  decisionResults: ScenarioResult[];
  rejectionResults: ScenarioResult[];
  structuralResults: StructuralResult[];
}> {
  const decisionResults: ScenarioResult[] = [];
  const rejectionResults: ScenarioResult[] = [];
  const structuralResults: StructuralResult[] = [];

  const injectAfterSetup = process.env.COMMERCIAL_PARITY_INJECT_FAILURE_AFTER_SETUP === "1";
  let injected = false;

  // Decision parity.
  const scenarios = buildScenarios();
  for (const sc of scenarios) {
    const f = sc.build();
    await setupFixture(f);

    if (injectAfterSetup && !injected) {
      injected = true;
      throw new Error("INJECTED_FAILURE_AFTER_SETUP: synthetic error to exercise fail-closed teardown");
    }

    let sqlDto: CommercialLimitDecision;
    try {
      sqlDto = await sqlOracle(actorId, f.tenantId, sc.origin ?? "impersonation", sc.increment ?? 1);
    } catch (e) {
      decisionResults.push({ name: sc.name, ok: false, reason: `SQL threw: ${(e as Error).message}` });
      continue;
    }
    let tsDto: CommercialLimitDecision;
    let expected: CommercialLimitDecision;
    try {
      tsDto = tsOracle(f, sc.increment ?? 1);
      expected = sc.expected(f);
    } catch (e) {
      decisionResults.push({ name: sc.name, ok: false, reason: `oracle/expected threw: ${(e as Error).message}` });
      continue;
    }

    const okSql = deepEqual(sqlDto, expected);
    const okTs = deepEqual(tsDto, expected);
    const okParity = deepEqual(sqlDto, tsDto);

    if (okSql && okTs && okParity) {
      decisionResults.push({ name: sc.name, ok: true });
    } else {
      decisionResults.push({
        name: sc.name, ok: false,
        reason: `sql=${okSql} ts=${okTs} parity=${okParity}`,
        expected, ts: tsDto, sql: sqlDto,
      });
    }
  }

  // Rejection contract.
  const rejections = buildRejectionCases();
  for (const rc of rejections) {
    try {
      const { data, error } = await rc.run(actorId);
      if (!error) {
        rejectionResults.push({ name: rc.name, ok: false, reason: `expected error, got data=${JSON.stringify(data)}` });
        continue;
      }
      if (!error.message.includes(rc.expectMessageIncludes)) {
        rejectionResults.push({ name: rc.name, ok: false, reason: `message '${error.message}' does not include '${rc.expectMessageIncludes}'` });
        continue;
      }
      if (rc.expectCode && error.code && error.code !== rc.expectCode) {
        rejectionResults.push({ name: rc.name, ok: false, reason: `code '${error.code}' != expected '${rc.expectCode}'` });
        continue;
      }
      rejectionResults.push({ name: rc.name, ok: true });
    } catch (e) {
      rejectionResults.push({ name: rc.name, ok: false, reason: `runner threw: ${(e as Error).message}` });
    }
  }

  // Structural ordering assertion.
  structuralResults.push(structuralOrderingAssertion());

  return { decisionResults, rejectionResults, structuralResults };
}

function catalogEquals(a: CatalogSnapshot | null, b: CatalogSnapshot | null): boolean {
  if (a == null || b == null) return a === b;
  return a.key === b.key
    && a.value_type === b.value_type
    && a.is_active === b.is_active
    && a.name === b.name
    && a.unit === b.unit
    && a.description === b.description;
}

export async function runCommercialSeatSqlParitySpecs(): Promise<SqlParityResult> {
  let fatalError: string | null = null;
  let cleanupErrors: string[] = [];
  let decisionResults: ScenarioResult[] = [];
  let rejectionResults: ScenarioResult[] = [];
  let structuralResults: StructuralResult[] = [];
  let catalogBefore: CatalogSnapshot | null = null;
  let catalogAfter: CatalogSnapshot | null = null;

  try {
    catalogBefore = await validateCatalogPreconditions();
    const actorId = await createAuthUser("super");
    await grantSuperAdmin(actorId);
    const groups = await executeAllChecks(actorId);
    decisionResults = groups.decisionResults;
    rejectionResults = groups.rejectionResults;
    structuralResults = groups.structuralResults;
  } catch (e) {
    fatalError = (e as Error).message;
  } finally {
    try {
      cleanupErrors = await runCleanupFailClosed();
    } catch (e) {
      cleanupErrors = [`cleanup threw: ${(e as Error).message}`];
    }
    try {
      catalogAfter = await readCatalogSnapshot();
    } catch (e) {
      cleanupErrors.push(`catalog post-snapshot: ${(e as Error).message}`);
    }
  }

  const decisionPassed = decisionResults.filter((r) => r.ok).length;
  const decisionFailed = decisionResults.length - decisionPassed;
  const rejectionPassed = rejectionResults.filter((r) => r.ok).length;
  const rejectionFailed = rejectionResults.length - rejectionPassed;
  const structuralPassed = structuralResults.filter((r) => r.ok).length;
  const structuralFailed = structuralResults.length - structuralPassed;

  return {
    decisionPassed, decisionFailed, decisionResults,
    rejectionPassed, rejectionFailed, rejectionResults,
    structuralPassed, structuralFailed, structuralResults,
    cleanupErrors,
    fatalError,
    catalogBefore,
    catalogAfter,
    catalogUnchanged: catalogEquals(catalogBefore, catalogAfter),
  };
}
