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

// Track all auth users we create so cleanup is fail-closed.
const createdAuthUsers: string[] = [];
let tempSuperRoleUserId: string | null = null;
let tenantId = "";

function makeAnonClient() {
  if (!PUBLISHABLE_KEY) throw new Error("SUPABASE_PUBLISHABLE_KEY missing");
  return createClient(SUPABASE_URL!, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (
          PUBLISHABLE_KEY.startsWith("sb_") &&
          h.get("Authorization") === `Bearer ${PUBLISHABLE_KEY}`
        ) {
          h.delete("Authorization");
        }
        h.set("apikey", PUBLISHABLE_KEY);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function createAuthUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  createdAuthUsers.push(data.user.id);
  return data.user.id;
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
  let ownerId = "";
  let regularId = "";
  let superId = "";
  let targetId = "";
  let otherTargetId = "";
  let authProbeUserId = "";
  const authProbePassword = `Px!${Math.random().toString(36).slice(2)}A9`;

  let cleanupError: string | null = null;

  try {
    // ---- FIXTURES ----
    tenantId = crypto.randomUUID();
    const { error: tErr } = await admin
      .from("tenants" as Any)
      .insert({ id: tenantId, nome: `T-${uniq}`, slug: `t-${uniq}`, status: "ativo" } as Any);
    if (tErr) throw new Error(`tenant insert: ${tErr.message}`);

    ownerId = await createAuthUser(`owner-${uniq}@test.local`, `Px!${Math.random().toString(36).slice(2)}A9`);
    regularId = await createAuthUser(`user-${uniq}@test.local`, `Px!${Math.random().toString(36).slice(2)}A9`);
    superId = await createAuthUser(`super-${uniq}@test.local`, `Px!${Math.random().toString(36).slice(2)}A9`);
    targetId = await createAuthUser(`target-${uniq}@test.local`, `Px!${Math.random().toString(36).slice(2)}A9`);
    otherTargetId = await createAuthUser(`t2-${uniq}@test.local`, `Px!${Math.random().toString(36).slice(2)}A9`);
    authProbeUserId = await createAuthUser(`probe-${uniq}@test.local`, authProbePassword);

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

    // super admin role
    const { error: srErr } = await admin
      .from("user_roles" as Any)
      .insert({ user_id: superId, role: "super_admin" } as Any);
    if (srErr) throw new Error(`super_admin insert: ${srErr.message}`);
    tempSuperRoleUserId = superId;

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

    // 1) owner create
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
      expect(data.previousStatus === null, "prev null");
    });

    await run("2. owner change_role manager→viewer + idempotent", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "change_role", _target_user_id: targetId, _target_role: "viewer",
      });
      expect(!error, error?.message);
      expect(data.changed === true && data.role === "viewer", "state");
      const { data: d2 } = await callRpc({
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "change_role", _target_user_id: targetId, _target_role: "viewer",
      });
      expect(d2.changed === false, "idempotent");
    });

    await run("3. owner suspend active", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "suspend", _target_user_id: targetId,
      });
      expect(!error, error?.message);
      expect(data.status === "suspended" && data.changed === true, "state");
    });

    await run("4. owner reactivate suspended", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "reactivate", _target_user_id: targetId,
      });
      expect(!error, error?.message);
      expect(data.status === "active" && data.changed === true, "state");
    });

    await run("5. owner revoke active → revoked", async () => {
      const { error: cErr } = await callRpc({
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "create_membership", _target_user_id: otherTargetId, _target_role: "viewer",
      });
      expect(!cErr, cErr?.message);
      const { data, error } = await callRpc({
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "revoke", _target_user_id: otherTargetId,
      });
      expect(!error, error?.message);
      expect(data.status === "revoked", "status");
      const st = await currentStatus(otherTargetId);
      expect(st === "revoked", `db shows ${st}`);
    });

    await run("6. non-owner regular user rejected", async () => {
      const { error } = await callRpc({
        _actor_user_id: regularId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "suspend", _target_user_id: targetId,
      });
      expect(!!error, "should reject");
      expect(/not authorized/i.test(error!.message), `msg: ${error!.message}`);
    });

    await run("7. super_admin impersonation accepted", async () => {
      const { data, error } = await callRpc({
        _actor_user_id: superId, _tenant_id: tenantId, _tenant_origin: "impersonation",
        _operation: "suspend", _target_user_id: targetId,
      });
      expect(!error, error?.message);
      expect(data.status === "suspended", "state");
    });

    await run("8. super_admin without impersonation rejected", async () => {
      const { error } = await callRpc({
        _actor_user_id: superId, _tenant_id: tenantId, _tenant_origin: "selection",
        _operation: "suspend", _target_user_id: targetId,
      });
      expect(!!error, "should reject");
      expect(/impersonation/i.test(error!.message), `msg: ${error!.message}`);
    });

    await run("9. target owner rejected", async () => {
      const { error } = await callRpc({
        _actor_user_id: superId, _tenant_id: tenantId, _tenant_origin: "impersonation",
        _operation: "suspend", _target_user_id: ownerId,
      });
      expect(!!error, "should reject");
      expect(/owner/i.test(error!.message), `msg: ${error!.message}`);
    });

    // ---- Privilege boundary probes (anon vs authenticated vs service_role) ----

    await run("10a. anon client: RPC rejected", async () => {
      const anonClient = makeAnonClient();
      const { error } = await anonClient.rpc("mutate_tenant_membership" as Any, {
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "suspend", _target_user_id: targetId,
      } as Any);
      expect(!!error, "anon RPC should be rejected");
      const msg = error!.message.toLowerCase();
      expect(
        /permission|not exist|not found|schema cache/i.test(msg),
        `expected permission/not-exposed error, got: ${error!.message}`,
      );
    });

    await run("10b. anon client: direct INSERT into tenant_members rejected", async () => {
      const anonClient = makeAnonClient();
      const { error } = await anonClient.from("tenant_members" as Any).insert({
        tenant_id: tenantId,
        user_id: targetId,
        tenant_role: "viewer",
        membership_status: "active",
      } as Any);
      expect(!!error, "anon INSERT should be rejected");
    });

    await run("10c. authenticated client: RPC rejected", async () => {
      const authedClient = makeAnonClient();
      const { data: signIn, error: signInErr } = await authedClient.auth.signInWithPassword({
        email: `probe-${uniq}@test.local`,
        password: authProbePassword,
      });
      expect(!signInErr, `signIn error: ${signInErr?.message}`);
      expect(!!signIn.session?.access_token, "no access_token from signIn");
      // Confirm this is authenticated (not anon)
      const { data: userData, error: userErr } = await authedClient.auth.getUser();
      expect(!userErr && userData.user?.id === authProbeUserId, "getUser should return probe user");

      const { error } = await authedClient.rpc("mutate_tenant_membership" as Any, {
        _actor_user_id: authProbeUserId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "suspend", _target_user_id: targetId,
      } as Any);
      expect(!!error, "authenticated RPC should be rejected");
      const msg = error!.message.toLowerCase();
      expect(
        /permission|not exist|not found|schema cache/i.test(msg),
        `expected permission/not-exposed error, got: ${error!.message}`,
      );
      await authedClient.auth.signOut();
    });

    await run("10d. authenticated client: direct INSERT into tenant_members rejected", async () => {
      const authedClient = makeAnonClient();
      const { error: signInErr } = await authedClient.auth.signInWithPassword({
        email: `probe-${uniq}@test.local`,
        password: authProbePassword,
      });
      expect(!signInErr, `signIn error: ${signInErr?.message}`);
      const { error } = await authedClient.from("tenant_members" as Any).insert({
        tenant_id: tenantId,
        user_id: authProbeUserId,
        tenant_role: "viewer",
        membership_status: "active",
      } as Any);
      expect(!!error, "authenticated INSERT should be rejected (no INSERT priv + RLS)");
      await authedClient.auth.signOut();
    });

    await run("10e. service_role probe: authorized mutation still works", async () => {
      // Re-verify by creating and revoking a scratch membership under service_role
      const scratchId = await createAuthUser(
        `scratch-${uniq}@test.local`,
        `Px!${Math.random().toString(36).slice(2)}A9`,
      );
      const { error: cErr } = await callRpc({
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "create_membership", _target_user_id: scratchId, _target_role: "viewer",
      });
      expect(!cErr, cErr?.message);
      const { data, error } = await callRpc({
        _actor_user_id: ownerId, _tenant_id: tenantId, _tenant_origin: "single-membership",
        _operation: "revoke", _target_user_id: scratchId,
      });
      expect(!error, error?.message);
      expect(data.status === "revoked", "revoked");
    });
  } finally {
    // ---- FAIL-CLOSED CLEANUP ----
    const cleanupErrors: string[] = [];

    // memberships
    if (tenantId) {
      const { error } = await admin.from("tenant_members" as Any).delete().eq("tenant_id", tenantId);
      if (error) cleanupErrors.push(`memberships delete: ${error.message}`);
    }

    // user_roles temp
    if (tempSuperRoleUserId) {
      const { error } = await admin.from("user_roles" as Any).delete().eq("user_id", tempSuperRoleUserId);
      if (error) cleanupErrors.push(`user_roles delete: ${error.message}`);
    }

    // tenant
    if (tenantId) {
      const { error } = await admin.from("tenants" as Any).delete().eq("id", tenantId);
      if (error) cleanupErrors.push(`tenant delete: ${error.message}`);
    }

    // auth users — fail closed
    for (const uid of createdAuthUsers) {
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) cleanupErrors.push(`deleteUser(${uid}): ${error.message}`);
    }

    // residual verifications
    if (tenantId) {
      const { data: memRes } = await admin
        .from("tenant_members" as Any)
        .select("user_id")
        .eq("tenant_id", tenantId);
      if ((memRes as Any)?.length) cleanupErrors.push(`residual memberships: ${JSON.stringify(memRes)}`);

      const { data: tenRes } = await admin
        .from("tenants" as Any)
        .select("id")
        .eq("id", tenantId);
      if ((tenRes as Any)?.length) cleanupErrors.push(`residual tenant: ${JSON.stringify(tenRes)}`);
    }
    if (tempSuperRoleUserId) {
      const { data: urRes } = await admin
        .from("user_roles" as Any)
        .select("user_id")
        .eq("user_id", tempSuperRoleUserId);
      if ((urRes as Any)?.length) cleanupErrors.push(`residual user_role: ${JSON.stringify(urRes)}`);
    }
    for (const uid of createdAuthUsers) {
      const { data, error } = await admin.auth.admin.getUserById(uid);
      // getUserById returns error when user is gone
      if (!error && data.user) cleanupErrors.push(`residual auth user ${uid}`);
    }

    if (cleanupErrors.length) {
      cleanupError = cleanupErrors.join(" | ");
    }
  }

  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.err ? `\n  ${r.err}` : ""}`);
    if (!r.ok) failed++;
  }
  console.log(`\nTOTAL: ${results.length - failed} passed, ${failed} failed`);
  if (cleanupError) {
    console.error(`CLEANUP FAILED: ${cleanupError}`);
    process.exit(1);
  }
  if (failed > 0) process.exit(1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(2);
});
