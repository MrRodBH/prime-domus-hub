// SCP-012.0.3 — Integration harness for public.mutate_tenant_membership.
// Executed with service_role against real PostgreSQL. Creates isolated fixtures
// (auth users, tenant, memberships) and tears them down deterministically.
//
// Usage:
//   bunx tsx --tsconfig tsconfig.json ./run-membership-mutation-parity-specs.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(2);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const uniq = `scp01203-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function createAuthUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Px!${Math.random().toString(36).slice(2)}A9`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return data.user.id;
}
async function deleteAuthUser(id: string) {
  try {
    await admin.auth.admin.deleteUser(id);
  } catch {
    /* ignore */
  }
}

async function callRpc(args: Record<string, unknown>): Promise<{ data: Any; error: Any }> {
  return (await admin.rpc("mutate_tenant_membership" as Any, args as Any)) as {
    data: Any;
    error: Any;
  };
}

type SpecResult = { name: string; ok: boolean; err?: string };

async function main() {
  const results: SpecResult[] = [];
  const cleanup: Array<() => Promise<void>> = [];
  let tenantId = "";
  let ownerId = "";
  let regularId = "";
  let superId = "";
  let targetId = "";
  let otherTargetId = "";

  try {
    // ---- FIXTURES ----
    tenantId = crypto.randomUUID();
    const { error: tErr } = await admin
      .from("tenants" as Any)
      .insert({ id: tenantId, nome: `T-${uniq}`, slug: `t-${uniq}`, status: "ativo" } as Any);
    if (tErr) throw new Error(`tenant insert: ${tErr.message}`);
    cleanup.push(async () => {
      await admin.from("tenants" as Any).delete().eq("id", tenantId);
    });

    ownerId = await createAuthUser(`owner-${uniq}@test.local`);
    cleanup.push(() => deleteAuthUser(ownerId));
    regularId = await createAuthUser(`user-${uniq}@test.local`);
    cleanup.push(() => deleteAuthUser(regularId));
    superId = await createAuthUser(`super-${uniq}@test.local`);
    cleanup.push(() => deleteAuthUser(superId));
    targetId = await createAuthUser(`target-${uniq}@test.local`);
    cleanup.push(() => deleteAuthUser(targetId));
    otherTargetId = await createAuthUser(`t2-${uniq}@test.local`);
    cleanup.push(() => deleteAuthUser(otherTargetId));

    // owner membership
    const { error: omErr } = await admin.from("tenant_members" as Any).insert({
      tenant_id: tenantId,
      user_id: ownerId,
      tenant_role: "owner",
      membership_status: "active",
      is_owner: true,
      is_default: true,
      joined_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    } as Any);
    if (omErr) throw new Error(`owner membership insert: ${omErr.message}`);

    // regular user is not a member of this tenant → non-owner
    // super admin role
    const { error: srErr } = await admin
      .from("user_roles" as Any)
      .insert({ user_id: superId, role: "super_admin" } as Any);
    if (srErr) throw new Error(`super_admin insert: ${srErr.message}`);
    cleanup.push(async () => {
      await admin.from("user_roles" as Any).delete().eq("user_id", superId);
    });

    async function currentStatus(uid: string): Promise<string | null> {
      const { data } = await admin
        .from("tenant_members" as Any)
        .select("membership_status")
        .eq("tenant_id", tenantId)
        .eq("user_id", uid)
        .maybeSingle();
      return (data as Any)?.membership_status ?? null;
    }

    async function run(name: string, fn: () => Promise<void>) {
      try {
        await fn();
        results.push({ name, ok: true });
      } catch (e) {
        results.push({ name, ok: false, err: e instanceof Error ? e.message : String(e) });
      }
    }

    function expect(cond: unknown, msg: string): asserts cond {
      if (!cond) throw new Error(msg);
    }

    // 1) owner creates active membership for existing auth user
    await run("1. owner create_membership → active +1", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: ownerId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "create_membership",
        _target_user_id: targetId,
        _target_role: "manager",
      });
      expect(!error, `unexpected error: ${error?.message}`);
      expect(data.changed === true, "changed");
      expect(data.status === "active" && data.role === "manager", "state");
      expect(data.previousStatus === null, "prev status null");
    });

    // 2) owner change_role
    await run("2. owner change_role manager→viewer", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: ownerId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "change_role",
        _target_user_id: targetId,
        _target_role: "viewer",
      });
      expect(!error, error?.message);
      expect(data.changed === true && data.role === "viewer", "state");
      // idempotent
      const { data: d2 } = await callRpc({
        _actor_user_id: ownerId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "change_role",
        _target_user_id: targetId,
        _target_role: "viewer",
      });
      expect(d2.changed === false, "idempotent");
    });

    // 3) owner suspends active
    await run("3. owner suspend active", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: ownerId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "suspend",
        _target_user_id: targetId,
      });
      expect(!error, error?.message);
      expect(data.status === "suspended" && data.changed === true, "state");
    });

    // 4) owner reactivates suspended
    await run("4. owner reactivate suspended", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: ownerId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "reactivate",
        _target_user_id: targetId,
      });
      expect(!error, error?.message);
      expect(data.status === "active" && data.changed === true, "state");
    });

    // 5) owner revokes non-owner (via other target)
    await run("5. owner revoke active → revoked", async () => {
      // create then revoke
      const { error: cErr } = await callRpc({
        _actor_user_id: ownerId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "create_membership",
        _target_user_id: otherTargetId,
        _target_role: "viewer",
      });
      expect(!cErr, cErr?.message);
      const { data, error } = await callRpc({
        _actor_user_id: ownerId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "revoke",
        _target_user_id: otherTargetId,
      });
      expect(!error, error?.message);
      expect(data.status === "revoked", "status");
      const st = await currentStatus(otherTargetId);
      expect(st === "revoked", `db shows ${st}`);
    });

    // 6) non-owner regular user is rejected
    await run("6. non-owner regular user rejected", async () => {
      const { error } = await callRpc({
        _actor_user_id: regularId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "suspend",
        _target_user_id: targetId,
      });
      expect(!!error, "should reject");
      expect(/not authorized/i.test(error!.message), `msg: ${error!.message}`);
    });

    // 7) super admin with impersonation accepted
    await run("7. super_admin impersonation accepted", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: superId,
        _tenant_id: tenantId,
        _tenant_origin: "impersonation",
        _operation: "suspend",
        _target_user_id: targetId,
      });
      expect(!error, error?.message);
      expect(data.status === "suspended", "state");
    });

    // 8) super_admin without impersonation is rejected
    await run("8. super_admin without impersonation rejected", async () => {
      const { error } = await callRpc({
        _actor_user_id: superId,
        _tenant_id: tenantId,
        _tenant_origin: "selection",
        _operation: "suspend",
        _target_user_id: targetId,
      });
      expect(!!error, "should reject");
      expect(/impersonation/i.test(error!.message), `msg: ${error!.message}`);
    });

    // 9) target owner rejected
    await run("9. target owner rejected", async () => {
      const { error } = await callRpc({
        _actor_user_id: superId,
        _tenant_id: tenantId,
        _tenant_origin: "impersonation",
        _operation: "suspend",
        _target_user_id: ownerId,
      });
      expect(!!error, "should reject");
      expect(/owner/i.test(error!.message), `msg: ${error!.message}`);
    });

    // 10) anon + authenticated do not have EXECUTE on the RPC
    await run("10. anon/authenticated lack EXECUTE on RPC", async () => {
      if (!PUBLISHABLE_KEY) throw new Error("SUPABASE_PUBLISHABLE_KEY missing (needed for anon probe)");
      const anonClient = createClient(SUPABASE_URL!, PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (PUBLISHABLE_KEY.startsWith("sb_") && h.get("Authorization") === `Bearer ${PUBLISHABLE_KEY}`) {
              h.delete("Authorization");
            }
            h.set("apikey", PUBLISHABLE_KEY);
            return fetch(input, { ...init, headers: h });
          },
        },
      });
      const { error } = await anonClient.rpc("mutate_tenant_membership" as Any, {
        _actor_user_id: ownerId,
        _tenant_id: tenantId,
        _tenant_origin: "single-membership",
        _operation: "suspend",
        _target_user_id: targetId,
      } as Any);
      expect(!!error, "anon should be rejected");
      // Postgres returns 42883 (function not found) or 42501 (permission denied) via PostgREST
      const msg = error!.message.toLowerCase();
      expect(
        /permission|not exist|not found|not found in the schema/i.test(msg),
        `expected permission/not-exposed error, got: ${error!.message}`,
      );
    });
  } finally {
    // ---- CLEANUP ----
    // memberships auto-delete via tenant cascade if configured; explicit sweep is safer:
    if (tenantId) {
      await admin.from("tenant_members" as Any).delete().eq("tenant_id", tenantId);
    }
    for (const fn of cleanup.reverse()) {
      try {
        await fn();
      } catch {
        /* ignore */
      }
    }
    // residual check
    if (tenantId) {
      const { data } = await admin
        .from("tenant_members" as Any)
        .select("user_id")
        .eq("tenant_id", tenantId);
      if ((data as Any)?.length) {
        console.warn(`residual memberships: ${JSON.stringify(data)}`);
      }
    }
  }

  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.err ? `\n  ${r.err}` : ""}`);
    if (!r.ok) failed++;
  }
  console.log(`\nTOTAL: ${results.length - failed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(2);
});
