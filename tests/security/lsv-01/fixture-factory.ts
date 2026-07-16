// LSV-01 · Lote A — Fixture factory.
//
// Two implementations live here:
//   * createRefusingFactory() — used when the environment guard has not
//     authorized a target. Every call throws.
//   * createConcreteFactory() — used ONLY after the guard authorizes a
//     non-production target. Performs real service-role writes against
//     the isolated project to materialize the LSV-01 identity matrix.
//
// The concrete implementation intentionally never resolves fixtures via
// LIMIT 1 or "first tenant" selection: every returned UUID comes from
// the row the service-role client just inserted. Cardinality deviations
// raise `LsvFixtureError`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LsvFixtureContext,
  LsvIdentity,
  LsvUserRecord,
} from "./fixture-types";

export class LsvFixtureError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "LsvFixtureError";
  }
}

export function makeRunId(): string {
  // Non-sensitive, opaque, sortable by wallclock. Never derived from
  // secrets, never contains PII.
  const rand = Math.random().toString(36).slice(2, 10);
  return `lsv01-${Date.now().toString(36)}-${rand}`;
}

export const IDENTITIES: ReadonlyArray<LsvIdentity> = [
  "tenant_a_admin",
  "tenant_a_corretor_assigned",
  "tenant_a_corretor_unassigned",
  "tenant_a_unauthorized_role",
  "tenant_b_admin",
  "tenant_b_corretor",
  "suspended_member",
  "removed_or_no_membership_user",
  "super_admin",
  "anonymous",
] as const;

export interface LsvFixtureFactory {
  /**
   * Creates the full LSV-01 fixture graph for `runId` using the provided
   * service-role admin client. Returns an immutable fixture context.
   * The factory rejects reuse of the same `runId` within a single
   * process invocation.
   */
  setup(admin: SupabaseClient, runId: string): Promise<LsvFixtureContext>;
}

export function createRefusingFactory(): LsvFixtureFactory {
  return {
    async setup() {
      throw new LsvFixtureError(
        "LSV_FIXTURE_FACTORY_NOT_BOUND",
        "No fixture factory is bound. Bind a concrete factory only after the environment guard authorizes the target.",
      );
    },
  };
}

interface FactoryOptions {
  /** In-process seen runIds to prevent duplicate execution. */
  readonly seen?: Set<string>;
}

/**
 * The concrete factory. Only wire this into the runner AFTER the guard
 * has authorized a non-production target. All mutations use the
 * service-role admin client. Every returned ID is read from the RETURN
 * clause of the INSERT that produced it — never selected via LIMIT 1.
 */
export function createConcreteFactory(opts: FactoryOptions = {}): LsvFixtureFactory {
  const seen = opts.seen ?? new Set<string>();

  return {
    async setup(admin: SupabaseClient, runId: string): Promise<LsvFixtureContext> {
      if (!runId || !runId.startsWith("lsv01-")) {
        throw new LsvFixtureError("LSV_FIXTURE_INVALID_RUN_ID", "Invalid runId.");
      }
      if (seen.has(runId)) {
        throw new LsvFixtureError(
          "LSV_FIXTURE_RUN_ID_REUSED",
          "runId reuse detected within this process invocation.",
        );
      }
      seen.add(runId);

      // Step 1 — tenants.
      const tenantA = await insertTenant(admin, runId, "a");
      const tenantB = await insertTenant(admin, runId, "b");

      // Step 2 — Auth users. Passwords stay only in memory.
      const authIdentities: readonly LsvIdentity[] = [
        "tenant_a_admin",
        "tenant_a_corretor_assigned",
        "tenant_a_corretor_unassigned",
        "tenant_a_unauthorized_role",
        "tenant_b_admin",
        "tenant_b_corretor",
        "suspended_member",
        "removed_or_no_membership_user",
        "super_admin",
      ];

      const users: Record<LsvIdentity, LsvUserRecord | null> = {
        tenant_a_admin: null,
        tenant_a_corretor_assigned: null,
        tenant_a_corretor_unassigned: null,
        tenant_a_unauthorized_role: null,
        tenant_b_admin: null,
        tenant_b_corretor: null,
        suspended_member: null,
        removed_or_no_membership_user: null,
        super_admin: null,
        anonymous: null,
      };

      const passwords = new Map<LsvIdentity, string>();

      for (const alias of authIdentities) {
        const password = generateEphemeralPassword();
        const email = deriveEmail(runId, alias);
        const rec = await createAuthUser(admin, email, password);
        users[alias] = rec;
        passwords.set(alias, password);
      }

      // Step 3 — memberships + roles.
      await createMembership(admin, tenantA, users.tenant_a_admin!.userId, "admin", "active");
      await createMembership(admin, tenantA, users.tenant_a_corretor_assigned!.userId, "corretor", "active");
      await createMembership(admin, tenantA, users.tenant_a_corretor_unassigned!.userId, "corretor", "active");
      await createMembership(admin, tenantA, users.tenant_a_unauthorized_role!.userId, "secretaria", "active");
      await createMembership(admin, tenantB, users.tenant_b_admin!.userId, "admin", "active");
      await createMembership(admin, tenantB, users.tenant_b_corretor!.userId, "corretor", "active");
      await createMembership(admin, tenantA, users.suspended_member!.userId, "corretor", "suspended");

      // Functional roles via public.user_roles.
      await grantAppRole(admin, users.tenant_a_admin!.userId, "admin");
      await grantAppRole(admin, users.tenant_a_corretor_assigned!.userId, "corretor");
      await grantAppRole(admin, users.tenant_a_corretor_unassigned!.userId, "corretor");
      await grantAppRole(admin, users.tenant_b_admin!.userId, "admin");
      await grantAppRole(admin, users.tenant_b_corretor!.userId, "corretor");
      await grantAppRole(admin, users.suspended_member!.userId, "corretor");

      // Super admin — canonical path recognised by public.is_super_admin().
      await grantAppRole(admin, users.super_admin!.userId, "super_admin");

      // Step 4 — properties.
      const propertyA = await insertProperty(admin, tenantA, `lsv01-${runId}-property-a`);
      const propertyB = await insertProperty(admin, tenantB, `lsv01-${runId}-property-b`);

      // Step 5 — leads.
      const leadAAssigned = await insertLead(admin, {
        tenant: tenantA,
        property: propertyA,
        assignedTo: users.tenant_a_corretor_assigned!.userId,
        name: `lsv01-${runId}-lead-a-assigned`,
      });
      const leadAUnassigned = await insertLead(admin, {
        tenant: tenantA,
        property: propertyA,
        assignedTo: null,
        name: `lsv01-${runId}-lead-a-unassigned`,
      });
      const leadB = await insertLead(admin, {
        tenant: tenantB,
        property: propertyB,
        assignedTo: users.tenant_b_corretor!.userId,
        name: `lsv01-${runId}-lead-b`,
      });

      assertDistinct(
        [tenantA, tenantB],
        "tenants",
      );
      assertDistinct(
        collectUserIds(users),
        "auth users",
      );
      assertDistinct(
        [propertyA, propertyB, leadAAssigned, leadAUnassigned, leadB],
        "resources",
      );

      return Object.freeze({
        runId,
        tenants: Object.freeze({ tenantA, tenantB }),
        users: Object.freeze(users),
        resources: Object.freeze({
          propertyA,
          propertyB,
          leadAAssigned,
          leadAUnassigned,
          leadB,
        }),
      });
    },
  };
}

// ────────────────────────────────────────────────────────────────
// Helpers below. All DB writes go through the service-role client
// passed in by the runner — never through a hardcoded connection.
// Every function reads the ID from its own insert; nothing selects
// "first row". Failures raise LsvFixtureError with an explicit code.

async function insertTenant(admin: SupabaseClient, runId: string, slot: "a" | "b"): Promise<string> {
  const name = `lsv01-${runId}-tenant-${slot}`;
  const { data, error } = await admin
    .from("tenants")
    .insert({ nome: name, slug: name })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new LsvFixtureError("LSV_FIXTURE_TENANT_INSERT_FAILED", error?.message ?? "no id");
  }
  return data.id as string;
}

async function createAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<LsvUserRecord> {
  // supabase-js admin client. Never log password.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = await (admin as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (res.error || !res.data?.user?.id) {
    throw new LsvFixtureError(
      "LSV_FIXTURE_AUTH_USER_INSERT_FAILED",
      res.error?.message ?? "no user id",
    );
  }
  return { userId: res.data.user.id as string, email };
}

async function createMembership(
  admin: SupabaseClient,
  tenantId: string,
  userId: string,
  role: string,
  status: "active" | "suspended",
): Promise<void> {
  const { error } = await admin.from("tenant_members").insert({
    tenant_id: tenantId,
    user_id: userId,
    tenant_role: role,
    membership_status: status,
    is_owner: false,
    is_default: false,
    joined_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
  });
  if (error) {
    throw new LsvFixtureError("LSV_FIXTURE_MEMBERSHIP_INSERT_FAILED", error.message);
  }
}

async function grantAppRole(admin: SupabaseClient, userId: string, role: string): Promise<void> {
  const { error } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (error) {
    throw new LsvFixtureError("LSV_FIXTURE_APP_ROLE_INSERT_FAILED", error.message);
  }
}

async function insertProperty(admin: SupabaseClient, tenantId: string, name: string): Promise<string> {
  const { data, error } = await admin
    .from("imoveis")
    .insert({ tenant_id: tenantId, titulo: name, tipo: "apartamento", finalidade: "venda" })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new LsvFixtureError("LSV_FIXTURE_PROPERTY_INSERT_FAILED", error?.message ?? "no id");
  }
  return data.id as string;
}

interface InsertLeadArgs {
  readonly tenant: string;
  readonly property: string;
  readonly assignedTo: string | null;
  readonly name: string;
}

async function insertLead(admin: SupabaseClient, args: InsertLeadArgs): Promise<string> {
  const row: Record<string, unknown> = {
    tenant_id: args.tenant,
    imovel_id: args.property,
    nome: args.name,
    status: "novo",
    version: 1,
  };
  if (args.assignedTo) row.assigned_to = args.assignedTo;
  const { data, error } = await admin
    .from("leads")
    .insert(row)
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new LsvFixtureError("LSV_FIXTURE_LEAD_INSERT_FAILED", error?.message ?? "no id");
  }
  return data.id as string;
}

function deriveEmail(runId: string, alias: LsvIdentity): string {
  // Non-routable @lsv01.invalid namespace. Never uses real user data.
  return `${runId}-${alias}@lsv01.invalid`;
}

function generateEphemeralPassword(): string {
  // 32 bytes of entropy, base36, in-memory only. Never persisted, never logged.
  const bytes = new Uint8Array(32);
  (globalThis.crypto ?? (require("crypto") as { webcrypto: Crypto }).webcrypto).getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += b.toString(36);
  return `Lsv01!${out.slice(0, 40)}`;
}

export function assertDistinct(ids: ReadonlyArray<string>, label: string) {
  const set = new Set(ids);
  if (set.size !== ids.length) {
    throw new LsvFixtureError(
      "LSV_FIXTURE_DUPLICATE_ID",
      `Expected distinct IDs for ${label}, got duplicates.`,
    );
  }
}

export function collectUserIds(
  users: Readonly<Record<LsvIdentity, LsvUserRecord | null>>,
): ReadonlyArray<string> {
  const ids: string[] = [];
  for (const key of IDENTITIES) {
    const rec = users[key];
    if (rec) ids.push(rec.userId);
  }
  return ids;
}
