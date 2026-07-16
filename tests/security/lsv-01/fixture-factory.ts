// LSV-01 · Lote A — Fixture factory.
//
// Materializes the full LSV-01 identity/tenant/lead graph against an
// authorized non-production Supabase project via the service-role
// client. Returns a LsvFixtureBundle whose credentials live ONLY in
// memory. Every ID comes from the INSERT that produced it — never from
// LIMIT 1 or "first row" selection. On partial failure, the factory
// runs an in-memory compensation using the partial manifest and
// re-throws a structured error containing NO secrets.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import type {
  LsvAuthenticatedIdentity,
  LsvFixtureBundle,
  LsvFixtureContext,
  LsvFixtureManifest,
  LsvIdentity,
  LsvRuntimeCredential,
  LsvUserRecord,
} from "./fixture-types";

// Schema-derived canonical role enums. Using generated types here ensures
// typecheck fails if the factory ever attempts a value not present in the
// database enum (e.g. the historical bug that tried tenant_role="corretor").
export type TenantRole = Database["public"]["Enums"]["tenant_role"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type MembershipStatus = Database["public"]["Enums"]["membership_status"];

export class LsvFixtureError extends Error {
  readonly code: string;
  readonly compensationCode?: string;
  constructor(code: string, message: string, compensationCode?: string) {
    super(message);
    this.code = code;
    this.compensationCode = compensationCode;
    this.name = "LsvFixtureError";
  }
}

export function makeRunId(): string {
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

export const AUTH_IDENTITIES: ReadonlyArray<LsvAuthenticatedIdentity> = [
  "tenant_a_admin",
  "tenant_a_corretor_assigned",
  "tenant_a_corretor_unassigned",
  "tenant_a_unauthorized_role",
  "tenant_b_admin",
  "tenant_b_corretor",
  "suspended_member",
  "removed_or_no_membership_user",
  "super_admin",
] as const;

export interface LsvFixtureFactory {
  setup(admin: SupabaseClient, runId: string): Promise<LsvFixtureBundle>;
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
  readonly seen?: Set<string>;
}

interface PartialManifest {
  tenantIds: string[];
  authUserIds: string[];
  membershipKeys: { tenantId: string; userId: string }[];
  roleIds: string[];
  propertyIds: string[];
  leadIds: string[];
}

function emptyPartial(): PartialManifest {
  return {
    tenantIds: [],
    authUserIds: [],
    membershipKeys: [],
    roleIds: [],
    propertyIds: [],
    leadIds: [],
  };
}

export function createConcreteFactory(opts: FactoryOptions = {}): LsvFixtureFactory {
  const seen = opts.seen ?? new Set<string>();

  return {
    async setup(admin: SupabaseClient, runId: string): Promise<LsvFixtureBundle> {
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

      const partial = emptyPartial();
      const credentials = new Map<LsvAuthenticatedIdentity, LsvRuntimeCredential>();
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

      try {
        // 1) Tenants.
        const tenantA = await insertTenant(admin, runId, "a");
        partial.tenantIds.push(tenantA);
        const tenantB = await insertTenant(admin, runId, "b");
        partial.tenantIds.push(tenantB);

        // 2) Auth users + credentials.
        for (const alias of AUTH_IDENTITIES) {
          const password = generateEphemeralPassword();
          const email = deriveEmail(runId, alias);
          const rec = await createAuthUser(admin, email, password);
          users[alias] = rec;
          partial.authUserIds.push(rec.userId);
          credentials.set(alias, {
            identity: alias,
            email,
            password,
            expectedUserId: rec.userId,
          });
        }

        // 3) Memberships (7).
        // 3) Memberships (7). tenant_role uses the SCHEMA enum
        //    (broker for corretor identities); functional/app_role is a
        //    separate concept applied in step (4).
        const memberships: Array<{
          tenantId: string;
          userId: string;
          role: TenantRole;
          status: Extract<MembershipStatus, "active" | "suspended">;
        }> = [
          { tenantId: tenantA, userId: users.tenant_a_admin!.userId, role: "admin", status: "active" },
          { tenantId: tenantA, userId: users.tenant_a_corretor_assigned!.userId, role: "broker", status: "active" },
          { tenantId: tenantA, userId: users.tenant_a_corretor_unassigned!.userId, role: "broker", status: "active" },
          { tenantId: tenantA, userId: users.tenant_a_unauthorized_role!.userId, role: "secretaria", status: "active" },
          { tenantId: tenantB, userId: users.tenant_b_admin!.userId, role: "admin", status: "active" },
          { tenantId: tenantB, userId: users.tenant_b_corretor!.userId, role: "broker", status: "active" },
          { tenantId: tenantA, userId: users.suspended_member!.userId, role: "broker", status: "suspended" },
        ];
        for (const m of memberships) {
          await createMembership(admin, m.tenantId, m.userId, m.role, m.status);
          partial.membershipKeys.push({ tenantId: m.tenantId, userId: m.userId });
        }

        // 4) app_role grants (functional role — distinct from tenant_role).
        const roleGrants: Array<{ userId: string; role: AppRole }> = [
          { userId: users.tenant_a_admin!.userId, role: "admin" },
          { userId: users.tenant_a_corretor_assigned!.userId, role: "corretor" },
          { userId: users.tenant_a_corretor_unassigned!.userId, role: "corretor" },
          { userId: users.tenant_a_unauthorized_role!.userId, role: "secretaria" },
          { userId: users.tenant_b_admin!.userId, role: "admin" },
          { userId: users.tenant_b_corretor!.userId, role: "corretor" },
          { userId: users.suspended_member!.userId, role: "corretor" },
          { userId: users.super_admin!.userId, role: "super_admin" },
        ];
        for (const g of roleGrants) {
          await grantAppRole(admin, g.userId, g.role);
          partial.roleIds.push(g.userId);
        }

        // 5) Properties — slug derived from runId, unique per tenant,
        //    payload typed against TablesInsert<"imoveis"> so any future
        //    required column addition is caught at typecheck time.
        const propertyA = await insertProperty(admin, tenantA, runId, "a");
        partial.propertyIds.push(propertyA);
        const propertyB = await insertProperty(admin, tenantB, runId, "b");
        partial.propertyIds.push(propertyB);

        // 6) Leads.
        const leadAAssigned = await insertLead(admin, {
          tenant: tenantA,
          property: propertyA,
          assignedTo: users.tenant_a_corretor_assigned!.userId,
          name: `lsv01-${runId}-lead-a-assigned`,
        });
        partial.leadIds.push(leadAAssigned);
        const leadAUnassigned = await insertLead(admin, {
          tenant: tenantA,
          property: propertyA,
          assignedTo: null,
          name: `lsv01-${runId}-lead-a-unassigned`,
        });
        partial.leadIds.push(leadAUnassigned);
        const leadB = await insertLead(admin, {
          tenant: tenantB,
          property: propertyB,
          assignedTo: users.tenant_b_corretor!.userId,
          name: `lsv01-${runId}-lead-b`,
        });
        partial.leadIds.push(leadB);

        assertDistinct(partial.tenantIds, "tenants");
        assertDistinct(partial.authUserIds, "auth users");
        assertDistinct(
          [...partial.propertyIds, ...partial.leadIds],
          "resources",
        );

        const context: LsvFixtureContext = Object.freeze({
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

        const manifest: LsvFixtureManifest = Object.freeze({
          tenantIds: Object.freeze([...partial.tenantIds]) as readonly string[],
          authUserIds: Object.freeze([...partial.authUserIds]) as readonly string[],
          membershipKeys: Object.freeze(
            partial.membershipKeys.map((m) => Object.freeze({ ...m })),
          ) as readonly { tenantId: string; userId: string }[],
          roleIds: Object.freeze([...partial.roleIds]) as readonly string[],
          propertyIds: Object.freeze([...partial.propertyIds]) as readonly string[],
          leadIds: Object.freeze([...partial.leadIds]) as readonly string[],
        });

        return { context, credentials, manifest };
      } catch (setupErr) {
        // Compensation: attempt to remove whatever was created.
        const code =
          setupErr instanceof LsvFixtureError
            ? setupErr.code
            : "LSV_FIXTURE_SETUP_FAILED";
        let compensationCode: string | undefined;
        try {
          await compensatePartial(admin, partial);
        } catch (compErr) {
          compensationCode =
            compErr instanceof LsvFixtureError
              ? compErr.code
              : "LSV_FIXTURE_COMPENSATION_FAILED";
        }
        const redacted =
          `setup=${code}` +
          (compensationCode ? ` compensation=${compensationCode}` : "") +
          ` orphaned_counts=` +
          JSON.stringify({
            tenants: partial.tenantIds.length,
            auth_users: partial.authUserIds.length,
            memberships: partial.membershipKeys.length,
            roles: partial.roleIds.length,
            properties: partial.propertyIds.length,
            leads: partial.leadIds.length,
          });
        throw new LsvFixtureError(code, redacted, compensationCode);
      }
    },
  };
}

async function compensatePartial(
  admin: SupabaseClient,
  partial: PartialManifest,
): Promise<void> {
  const errors: string[] = [];
  const del = async (table: string, col: string, ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await admin.from(table).delete().in(col, ids);
    if (error) errors.push(`${table}:${error.code ?? "unknown"}`);
  };
  await del("lead_audit_events", "lead_id", partial.leadIds);
  await del("lead_stage_history", "lead_id", partial.leadIds);
  await del("leads", "id", partial.leadIds);
  await del("imoveis", "id", partial.propertyIds);
  await del(
    "tenant_members",
    "user_id",
    partial.membershipKeys.map((m) => m.userId),
  );
  await del("user_roles", "user_id", partial.roleIds);
  await del("tenants", "id", partial.tenantIds);
  for (const uid of partial.authUserIds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).auth.admin.deleteUser(uid);
    if (error) errors.push(`auth:${error.status ?? "unknown"}`);
  }
  if (errors.length > 0) {
    throw new LsvFixtureError(
      "LSV_FIXTURE_COMPENSATION_FAILED",
      `codes=${errors.slice(0, 8).join(",")}`,
    );
  }
}

// ──────────────────────────────────────────────────────────────

async function insertTenant(
  admin: SupabaseClient,
  runId: string,
  slot: "a" | "b",
): Promise<string> {
  const name = `lsv01-${runId}-tenant-${slot}`;
  const { data, error } = await admin
    .from("tenants")
    .insert({ nome: name, slug: name })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new LsvFixtureError(
      "LSV_FIXTURE_TENANT_INSERT_FAILED",
      error?.message ?? "no id",
    );
  }
  return data.id as string;
}

async function createAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<LsvUserRecord> {
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

async function grantAppRole(
  admin: SupabaseClient,
  userId: string,
  role: string,
): Promise<void> {
  const { error } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (error) {
    throw new LsvFixtureError("LSV_FIXTURE_APP_ROLE_INSERT_FAILED", error.message);
  }
}

async function insertProperty(
  admin: SupabaseClient,
  tenantId: string,
  name: string,
): Promise<string> {
  const { data, error } = await admin
    .from("imoveis")
    .insert({
      tenant_id: tenantId,
      titulo: name,
      tipo: "apartamento",
      finalidade: "venda",
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new LsvFixtureError(
      "LSV_FIXTURE_PROPERTY_INSERT_FAILED",
      error?.message ?? "no id",
    );
  }
  return data.id as string;
}

interface InsertLeadArgs {
  readonly tenant: string;
  readonly property: string;
  readonly assignedTo: string | null;
  readonly name: string;
}

async function insertLead(
  admin: SupabaseClient,
  args: InsertLeadArgs,
): Promise<string> {
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
    throw new LsvFixtureError(
      "LSV_FIXTURE_LEAD_INSERT_FAILED",
      error?.message ?? "no id",
    );
  }
  return data.id as string;
}

function deriveEmail(runId: string, alias: LsvIdentity): string {
  return `${runId}-${alias}@lsv01.invalid`;
}

function generateEphemeralPassword(): string {
  const bytes = new Uint8Array(32);
  const g = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!g?.getRandomValues) {
    throw new LsvFixtureError(
      "LSV_FIXTURE_CRYPTO_UNAVAILABLE",
      "crypto.getRandomValues is unavailable",
    );
  }
  g.getRandomValues(bytes);
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

/** Manifest-derived fixture count (single source of truth). */
export function countManifestFixtures(m: LsvFixtureManifest): number {
  return (
    m.tenantIds.length +
    m.authUserIds.length +
    m.membershipKeys.length +
    m.roleIds.length +
    m.propertyIds.length +
    m.leadIds.length
  );
}
