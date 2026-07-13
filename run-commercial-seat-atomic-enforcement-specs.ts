// SCP-012 — Commercial Seat Limit Atomic Enforcement — concurrency runner.
//
// Executed against real PostgreSQL using service_role clients. Verifies:
//   • lock canônico por tenant serializa mutations concorrentes;
//   • nenhuma over-allocation acontece sob concorrência;
//   • rollback integral quando decisão comercial nega;
//   • redução (delta -1) permanece possível durante bloqueio comercial;
//   • mutation neutra (delta 0) não é bloqueada;
//   • tenants distintos não compartilham lock.
//
// Uso:
//   bunx tsx --tsconfig tsconfig.json ./run-commercial-seat-atomic-enforcement-specs.ts

import { createClient } from "@supabase/supabase-js";
import {
  CommercialSeatLimitDeniedError,
  parseCommercialSeatLimitDeniedError,
  COMMERCIAL_SEAT_LIMIT_DENIED_MESSAGE,
} from "@/lib/api/commercial/membership-mutation-enforcement-error";
import type { CommercialLimitDecision } from "@/lib/api/commercial/limit-decision";
import { executeMembershipMutation } from "@/lib/api/commercial/membership-mutation-boundary.server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(2);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function makeAdmin() {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const admin = makeAdmin();
const uniq = `scp012atom-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const createdAuthUsers: string[] = [];
const createdTenants: string[] = [];
const createdPlans: string[] = [];

async function createAuthUser(prefix: string): Promise<string> {
  const email = `${prefix}-${uniq}-${createdAuthUsers.length}@test.local`;
  const password = `Px!${Math.random().toString(36).slice(2)}A9`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  createdAuthUsers.push(data.user.id);
  return data.user.id;
}

type TenantCtx = {
  tenantId: string;
  ownerId: string;
  planId: string;
  subscriptionId: string;
};

async function provisionTenant(seatsLimit: number, prefilled: number): Promise<TenantCtx> {
  const tenantId = crypto.randomUUID();
  {
    const { error } = await admin.from("tenants" as Any).insert({
      id: tenantId, nome: `T-${uniq}-${createdTenants.length}`,
      slug: `t-${uniq}-${createdTenants.length}`, status: "ativo",
    } as Any);
    if (error) throw new Error(`tenant insert: ${error.message}`);
  }
  createdTenants.push(tenantId);

  const ownerId = await createAuthUser("owner");
  {
    const { error } = await admin.from("tenant_members" as Any).insert({
      tenant_id: tenantId, user_id: ownerId, tenant_role: "owner",
      membership_status: "active", is_owner: true, is_default: true,
      joined_at: new Date().toISOString(), accepted_at: new Date().toISOString(),
    } as Any);
    if (error) throw new Error(`owner insert: ${error.message}`);
  }

  const planId = crypto.randomUUID();
  const planCode = `scp012a_${Date.now().toString(36)}_${createdPlans.length}${Math.floor(Math.random()*1e6).toString(36)}`;
  {
    const { error } = await admin.from("commercial_plans" as Any).insert({
      id: planId, code: planCode, name: `Plan ${uniq}`, status: "active",
    } as Any);
    if (error) throw new Error(`plan insert: ${error.message}`);
  }
  createdPlans.push(planId);
  {
    const { error } = await admin.from("commercial_plan_entitlements" as Any).insert({
      plan_id: planId, entitlement_key: "users.seats", value_int: seatsLimit,
    } as Any);
    if (error) throw new Error(`plan entitlement: ${error.message}`);
  }

  const subscriptionId = crypto.randomUUID();
  {
    const { error } = await admin.from("tenant_subscriptions" as Any).insert({
      id: subscriptionId, tenant_id: tenantId, plan_id: planId,
      status: "active", started_at: new Date().toISOString(),
    } as Any);
    if (error) throw new Error(`subscription insert: ${error.message}`);
  }

  // Pre-fill with `prefilled` additional active memberships (not counting owner).
  for (let i = 0; i < prefilled; i++) {
    const uid = await createAuthUser("prefill");
    const { error } = await admin.from("tenant_members" as Any).insert({
      tenant_id: tenantId, user_id: uid, tenant_role: "viewer",
      membership_status: "active", is_owner: false, is_default: false,
      joined_at: new Date().toISOString(), accepted_at: new Date().toISOString(),
    } as Any);
    if (error) throw new Error(`prefill: ${error.message}`);
  }

  return { tenantId, ownerId, planId, subscriptionId };
}

async function setSubscriptionStatus(subId: string, status: string) {
  const { error } = await admin.from("tenant_subscriptions" as Any)
    .update({ status } as Any).eq("id", subId);
  if (error) throw new Error(`update subscription: ${error.message}`);
}

async function countActiveInvited(tenantId: string): Promise<number> {
  const { data, error } = await admin.from("tenant_members" as Any)
    .select("user_id", { count: "exact", head: false } as Any)
    .eq("tenant_id", tenantId)
    .in("membership_status", ["active", "invited"] as Any);
  if (error) throw new Error(`count: ${error.message}`);
  return (data as Any[])?.length ?? 0;
}

async function callRpc(client: ReturnType<typeof makeAdmin>, args: Record<string, unknown>) {
  return await client.rpc("mutate_tenant_membership" as Any, args as Any);
}

type SpecResult = { name: string; ok: boolean; err?: string };
const results: SpecResult[] = [];
async function run(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: e instanceof Error ? e.message : String(e) }); }
}
function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/**
 * Canonical shape of `admin.auth.admin.getUserById(uid)` when the user does
 * not exist, as returned by @supabase/supabase-js against real GoTrue:
 *   { name: "AuthApiError", status: 404, code: "user_not_found", ... }.
 * Any other error (network, auth, server, unexpected shape) must fail the
 * cleanup — not silently be interpreted as proof of deletion.
 */
function isCanonicalAuthUserNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; status?: unknown; code?: unknown };
  return e.name === "AuthApiError" && e.status === 404 && e.code === "user_not_found";
}

/**
 * Validates that a raw Supabase error object corresponds to a real
 * commercial_seat_limit_denied denial with the canonical error contract
 * (message, ERRCODE=P0001, DETAIL carrying a valid CommercialLimitDecision).
 * Returns the parsed, semantically-validated decision.
 */
function validateRealCommercialDenial(
  error: unknown,
  expectedTenantId: string,
  expectedReason?: CommercialLimitDecision["reason"],
): CommercialLimitDecision {
  expect(!!error && typeof error === "object", `no error object: ${JSON.stringify(error)}`);
  const e = error as { message?: unknown; code?: unknown; details?: unknown };
  expect(
    e.message === COMMERCIAL_SEAT_LIMIT_DENIED_MESSAGE,
    `expected message === commercial_seat_limit_denied, got: ${JSON.stringify(e.message)}`,
  );
  expect(e.code === "P0001", `expected code=P0001, got: ${JSON.stringify(e.code)}`);
  expect(
    typeof e.details === "string" && (e.details as string).length > 0,
    `expected non-empty string details, got: ${JSON.stringify(e.details)}`,
  );
  const parsed = parseCommercialSeatLimitDeniedError(error, expectedTenantId);
  expect(parsed instanceof CommercialSeatLimitDeniedError, "parser did not return CommercialSeatLimitDeniedError");
  const dec = parsed!.decision;
  expect(dec.tenantId === expectedTenantId, `tenantId mismatch: ${dec.tenantId} != ${expectedTenantId}`);
  expect(dec.featureKey === "users.seats", `featureKey ${dec.featureKey}`);
  expect(dec.allowed === false, "allowed must be false");
  expect(dec.requestedIncrement === 1, `requestedIncrement ${dec.requestedIncrement}`);
  if (expectedReason) {
    expect(dec.reason === expectedReason, `expected reason=${expectedReason}, got ${dec.reason}`);
  }
  return dec;
}

async function main() {
  let cleanupError: string | null = null;
  try {
    // -------------------- Scenario A: zero capacity --------------------
    await run("A. limit=used → two concurrent create_membership both denied, no membership created", async () => {
      const ctx = await provisionTenant(2, 1); // owner + 1 prefill = 2 active; limit 2
      const t1 = await createAuthUser("A-t1");
      const t2 = await createAuthUser("A-t2");
      const c1 = makeAdmin(); const c2 = makeAdmin();
      const [r1, r2] = await Promise.all([
        callRpc(c1, {
          _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
          _tenant_origin: "single-membership", _operation: "create_membership",
          _target_user_id: t1, _target_role: "viewer",
        }),
        callRpc(c2, {
          _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
          _tenant_origin: "single-membership", _operation: "create_membership",
          _target_user_id: t2, _target_role: "viewer",
        }),
      ]);
      const errs = [r1, r2].map((r: Any) => r.error);
      expect(errs.every((e) => !!e), `both should error, got ${JSON.stringify(errs.map((e) => e?.message))}`);
      for (const e of errs) {
        validateRealCommercialDenial(e, ctx.tenantId, "limit_reached");
        expect((e as Any).details && JSON.parse((e as Any).details).limit === 2, "limit=2");
        expect(JSON.parse((e as Any).details).used === 2, "used=2");
        expect(JSON.parse((e as Any).details).remaining === 0, "remaining=0");
      }
      const cnt = await countActiveInvited(ctx.tenantId);
      expect(cnt === 2, `count should stay 2, got ${cnt}`);
    });

    // -------------------- Scenario B: exactly 1 free --------------------
    await run("B. limit-used=1 → 2 concurrent creates: exactly 1 applied, 1 denied", async () => {
      const ctx = await provisionTenant(3, 1); // used=2 (owner+1) → 1 free
      const t1 = await createAuthUser("B-t1");
      const t2 = await createAuthUser("B-t2");
      const c1 = makeAdmin(); const c2 = makeAdmin();
      const [r1, r2] = await Promise.all([
        callRpc(c1, { _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
          _tenant_origin: "single-membership", _operation: "create_membership",
          _target_user_id: t1, _target_role: "viewer" }),
        callRpc(c2, { _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
          _tenant_origin: "single-membership", _operation: "create_membership",
          _target_user_id: t2, _target_role: "viewer" }),
      ]);
      const applied = [r1, r2].filter((r: Any) => !r.error).length;
      const deniedErrs = [r1, r2].map((r: Any) => r.error).filter(Boolean);
      expect(applied === 1 && deniedErrs.length === 1,
        `expected 1 applied + 1 denied, got applied=${applied} denied=${deniedErrs.length}`);
      const dec = validateRealCommercialDenial(deniedErrs[0], ctx.tenantId, "limit_reached");
      expect(dec.limit === 3 && dec.used === 3 && dec.remaining === 0, `dec ${JSON.stringify(dec)}`);
      const cnt = await countActiveInvited(ctx.tenantId);
      expect(cnt === 3, `count should be 3 (== limit), got ${cnt}`);
    });

    // -------------------- Scenario C: capacity 2, 4 concurrent --------------------
    await run("C. capacity=2, 4 concurrent creates → 2 applied, 2 denied, used=limit", async () => {
      const ctx = await provisionTenant(4, 1); // used=2 → 2 free
      const targets: string[] = [];
      for (let i = 0; i < 4; i++) targets.push(await createAuthUser("C-t"));
      const clients = targets.map(() => makeAdmin());
      const rs = await Promise.all(targets.map((tid, i) =>
        callRpc(clients[i], { _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
          _tenant_origin: "single-membership", _operation: "create_membership",
          _target_user_id: tid, _target_role: "viewer" }),
      ));
      const applied = rs.filter((r: Any) => !r.error).length;
      const deniedErrs = rs.map((r: Any) => r.error).filter(Boolean);
      expect(applied === 2 && deniedErrs.length === 2,
        `expected 2/2, got applied=${applied} denied=${deniedErrs.length}`);
      for (const e of deniedErrs) {
        const dec = validateRealCommercialDenial(e, ctx.tenantId, "limit_reached");
        expect(dec.limit === 4 && dec.used === 4 && dec.remaining === 0, `dec ${JSON.stringify(dec)}`);
      }
      const cnt = await countActiveInvited(ctx.tenantId);
      expect(cnt === 4, `count should be 4, got ${cnt}`);
    });

    // -------------------- Scenario D: cross-tenant isolation --------------------
    await run("D. cross-tenant isolation: independent locks, both apply", async () => {
      const ctxA = await provisionTenant(2, 0); // owner=1, 1 free
      const ctxB = await provisionTenant(2, 0);
      const tA = await createAuthUser("D-A");
      const tB = await createAuthUser("D-B");
      const c1 = makeAdmin(); const c2 = makeAdmin();
      const [r1, r2] = await Promise.all([
        callRpc(c1, { _actor_user_id: ctxA.ownerId, _tenant_id: ctxA.tenantId,
          _tenant_origin: "single-membership", _operation: "create_membership",
          _target_user_id: tA, _target_role: "viewer" }),
        callRpc(c2, { _actor_user_id: ctxB.ownerId, _tenant_id: ctxB.tenantId,
          _tenant_origin: "single-membership", _operation: "create_membership",
          _target_user_id: tB, _target_role: "viewer" }),
      ]);
      expect(!(r1 as Any).error && !(r2 as Any).error,
        `both should apply, got ${JSON.stringify([(r1 as Any).error?.message, (r2 as Any).error?.message])}`);
      const cA = await countActiveInvited(ctxA.tenantId);
      const cB = await countActiveInvited(ctxB.tenantId);
      expect(cA === 2 && cB === 2, `A=${cA} B=${cB}`);
    });

    // -------------------- Scenario E: rollback of denied create --------------------
    await run("E. denied create leaves target with no membership row", async () => {
      const ctx = await provisionTenant(1, 0); // owner=1, limit=1 → 0 free
      const t = await createAuthUser("E");
      const { error } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "create_membership",
        _target_user_id: t, _target_role: "viewer",
      });
      validateRealCommercialDenial(error, ctx.tenantId, "limit_reached");
      const { data, error: verificationError } = await admin.from("tenant_members" as Any)
        .select("membership_status").eq("tenant_id", ctx.tenantId).eq("user_id", t);
      expect(!verificationError,
        `scenario E rollback verification query failed: ${verificationError?.message}`);
      expect(((data as Any[]) ?? []).length === 0, `residual row ${JSON.stringify(data)}`);
    });

    // -------------------- Scenario F: rollback of reactivate denied --------------------
    await run("F. denied reactivate leaves membership suspended", async () => {
      const ctx = await provisionTenant(2, 0); // owner=1, limit=2
      const t = await createAuthUser("F");
      // create then suspend to reach suspended state
      const { error: cErr } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "create_membership",
        _target_user_id: t, _target_role: "viewer",
      });
      expect(!cErr, cErr?.message);
      const { error: sErr } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "suspend",
        _target_user_id: t,
      });
      expect(!sErr, sErr?.message);
      // Tighten limit to owner-only. Add tenant override entitlement=1.
      const { error: eErr } = await admin.from("tenant_entitlements" as Any).insert({
        tenant_id: ctx.tenantId, entitlement_key: "users.seats",
        value_int: 1, source: "override",
      } as Any);
      expect(!eErr, eErr?.message);

      const { error: rErr } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "reactivate",
        _target_user_id: t,
      });
      validateRealCommercialDenial(rErr, ctx.tenantId, "limit_reached");
      const { data, error: verificationError } = await admin.from("tenant_members" as Any)
        .select("membership_status, suspended_at").eq("tenant_id", ctx.tenantId).eq("user_id", t).single();
      expect(!verificationError,
        `scenario F rollback verification query failed: ${verificationError?.message}`);
      expect((data as Any)?.membership_status === "suspended", `still suspended? ${JSON.stringify(data)}`);
      expect((data as Any)?.suspended_at !== null, `suspended_at nulled`);
    });

    // -------------------- Scenario G: reduction under commercial block --------------------
    await run("G. billing_blocked → suspend active still applies (delta -1)", async () => {
      const ctx = await provisionTenant(5, 0);
      const t = await createAuthUser("G");
      const { error: cErr } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "create_membership",
        _target_user_id: t, _target_role: "viewer",
      });
      expect(!cErr, cErr?.message);
      await setSubscriptionStatus(ctx.subscriptionId, "suspended"); // → billing_blocked

      const { data, error } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "suspend",
        _target_user_id: t,
      });
      expect(!error, `suspend under block should apply, got ${(error as Any)?.message}`);
      expect((data as Any).status === "suspended", `status`);
    });

    // -------------------- Scenario H: neutral op under commercial block --------------------
    await run("H. billing_blocked → change_role still applies (delta 0)", async () => {
      const ctx = await provisionTenant(5, 0);
      const t = await createAuthUser("H");
      const { error: cErr } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "create_membership",
        _target_user_id: t, _target_role: "viewer",
      });
      expect(!cErr, cErr?.message);
      await setSubscriptionStatus(ctx.subscriptionId, "canceled"); // billing_blocked

      const { data, error } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "change_role",
        _target_user_id: t, _target_role: "manager",
      });
      expect(!error, `change_role under block should apply, got ${(error as Any)?.message}`);
      expect((data as Any).role === "manager", `role`);
    });

    // -------------------- Scenario I: no-op reactivate --------------------
    await run("I. reactivate on already-active membership is idempotent no-op, no commercial call needed", async () => {
      const ctx = await provisionTenant(1, 0); // limit=1, only owner (already at limit)
      // We can't add a new member (limit=1 with owner). Use owner? no. Instead:
      // Provision fresh with room, add member, tighten, verify reactivate on active is no-op.
      const t = await createAuthUser("I");
      // First loosen: add entitlement override to allow 2.
      const { error: eErr } = await admin.from("tenant_entitlements" as Any).insert({
        tenant_id: ctx.tenantId, entitlement_key: "users.seats",
        value_int: 2, source: "override",
      } as Any);
      expect(!eErr, eErr?.message);
      const { error: cErr } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "create_membership",
        _target_user_id: t, _target_role: "viewer",
      });
      expect(!cErr, cErr?.message);
      // Tighten to 1 to force limit_reached if it were re-evaluated. Now reactivate on active.
      const { error: uErr } = await admin.from("tenant_entitlements" as Any)
        .update({ value_int: 1 } as Any)
        .eq("tenant_id", ctx.tenantId).eq("entitlement_key", "users.seats");
      expect(!uErr, uErr?.message);

      const { data, error } = await callRpc(admin, {
        _actor_user_id: ctx.ownerId, _tenant_id: ctx.tenantId,
        _tenant_origin: "single-membership", _operation: "reactivate",
        _target_user_id: t,
      });
      expect(!error, `no-op reactivate should not be denied, got ${(error as Any)?.message}`);
      expect((data as Any).changed === false, `changed=false`);
    });

    // -------------------- Scenario J: real boundary conversion --------------------
    await run("J. server boundary converts real RPC denial into CommercialSeatLimitDeniedError", async () => {
      const ctx = await provisionTenant(1, 0); // owner=1, limit=1 → 0 free
      const t = await createAuthUser("J");
      let thrown: unknown = null;
      try {
        await executeMembershipMutation(
          {
            actorUserId: ctx.ownerId,
            tenantId: ctx.tenantId,
            tenantOrigin: "single-membership",
          },
          {
            operation: "create_membership",
            targetUserId: t,
            targetRole: "viewer",
          },
        );
      } catch (e) {
        thrown = e;
      }
      expect(thrown instanceof CommercialSeatLimitDeniedError,
        `expected CommercialSeatLimitDeniedError, got ${thrown instanceof Error ? thrown.name + ": " + thrown.message : JSON.stringify(thrown)}`);
      const err = thrown as CommercialSeatLimitDeniedError;
      expect(err.code === "commercial_seat_limit_denied", `code ${err.code}`);
      expect(err.message === "commercial_seat_limit_denied", `message ${err.message}`);
      expect(err.decision.allowed === false, "allowed");
      expect(err.decision.reason === "limit_reached", `reason ${err.decision.reason}`);
      expect(err.decision.tenantId === ctx.tenantId, "tenantId");
      expect(err.decision.requestedIncrement === 1, "requestedIncrement");
      const { data, error: verificationError } = await admin.from("tenant_members" as Any)
        .select("membership_status").eq("tenant_id", ctx.tenantId).eq("user_id", t);
      expect(!verificationError,
        `scenario J rollback verification query failed: ${verificationError?.message}`);
      expect(((data as Any[]) ?? []).length === 0, `residual row after boundary denial ${JSON.stringify(data)}`);
    });
  } finally {
    const cleanupErrors: string[] = [];
    // memberships + subscriptions + entitlements + tenants
    for (const tid of createdTenants) {
      for (const table of ["tenant_members", "tenant_subscriptions", "tenant_entitlements"]) {
        const { error } = await admin.from(table as Any).delete().eq("tenant_id", tid);
        if (error) cleanupErrors.push(`${table} delete ${tid}: ${error.message}`);
      }
    }
    for (const pid of createdPlans) {
      const { error: peErr } = await admin.from("commercial_plan_entitlements" as Any).delete().eq("plan_id", pid);
      if (peErr) cleanupErrors.push(`plan entitlements: ${peErr.message}`);
      const { error: pErr } = await admin.from("commercial_plans" as Any).delete().eq("id", pid);
      if (pErr) cleanupErrors.push(`plan delete: ${pErr.message}`);
    }
    for (const tid of createdTenants) {
      const { error } = await admin.from("tenants" as Any).delete().eq("id", tid);
      if (error) cleanupErrors.push(`tenant delete ${tid}: ${error.message}`);
    }
    for (const uid of createdAuthUsers) {
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) cleanupErrors.push(`deleteUser(${uid}): ${error.message}`);
    }
    // residual checks — fail-closed: query error counts as inconclusive, not proof of absence.
    async function residual(table: string, column: string, value: string, label: string) {
      const { data, error } = await admin.from(table as Any).select(column).eq(column, value);
      if (error) {
        cleanupErrors.push(`residual verification failed for ${label}: ${error.message}`);
      } else if ((data ?? []).length > 0) {
        cleanupErrors.push(`residual rows in ${label}: ${JSON.stringify(data)}`);
      }
    }
    for (const tid of createdTenants) {
      await residual("tenant_members", "tenant_id", tid, `tenant_members(${tid})`);
      await residual("tenant_subscriptions", "tenant_id", tid, `tenant_subscriptions(${tid})`);
      await residual("tenant_entitlements", "tenant_id", tid, `tenant_entitlements(${tid})`);
      await residual("tenants", "id", tid, `tenants(${tid})`);
    }
    for (const pid of createdPlans) {
      await residual("commercial_plan_entitlements", "plan_id", pid, `commercial_plan_entitlements(${pid})`);
      await residual("commercial_plans", "id", pid, `commercial_plans(${pid})`);
    }
    for (const uid of createdAuthUsers) {
      const { data, error } = await admin.auth.admin.getUserById(uid);
      if (!error && data?.user) {
        cleanupErrors.push(`residual auth user ${uid}`);
      } else if (error && isCanonicalAuthUserNotFoundError(error)) {
        // deletion proved: canonical AuthApiError { status:404, code:'user_not_found' }
      } else if (error) {
        cleanupErrors.push(`auth residual verification failed for ${uid}: ${error.message}`);
      } else {
        cleanupErrors.push(`auth residual verification returned an invalid empty response for ${uid}`);
      }
    }
    if (cleanupErrors.length) cleanupError = cleanupErrors.join(" | ");
  }

  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.err ? `\n  ${r.err}` : ""}`);
    if (!r.ok) failed++;
  }
  console.log(`\nTOTAL: ${results.length - failed} passed, ${failed} failed`);
  if (cleanupError) { console.error(`CLEANUP FAILED: ${cleanupError}`); process.exit(1); }
  if (failed > 0) process.exit(1);
}

void main().catch((e) => { console.error(e); process.exit(2); });
