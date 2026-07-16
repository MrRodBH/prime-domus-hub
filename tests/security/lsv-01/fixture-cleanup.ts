// LSV-01 · Lote A — Fixture cleanup.
//
// The concrete cleanup runs after every live harness invocation in a
// `finally` block. It tears down fixtures in an order compatible with
// the production FK/RESTRICT contract (audit → leads → properties →
// memberships → user_roles → tenants → auth users) and never relaxes
// the production `ON DELETE RESTRICT` on `lead_audit_events`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LsvCleanupOutcome, LsvFixtureContext, LsvIdentity } from "./fixture-types";
import { IDENTITIES } from "./fixture-factory";

export interface LsvCleanupRunner {
  cleanup(
    admin: SupabaseClient,
    ctx: LsvFixtureContext,
  ): Promise<LsvCleanupOutcome>;
}

export function createRefusingCleanup(): LsvCleanupRunner {
  return {
    async cleanup() {
      throw new Error(
        "LSV_CLEANUP_RUNNER_NOT_BOUND: bind a concrete cleanup runner only after the environment guard authorizes the target.",
      );
    },
  };
}

/**
 * Concrete cleanup — only bind after the environment guard authorizes
 * a non-production target. All DELETEs use the service-role client
 * passed in by the runner and are scoped by the fixture context IDs.
 */
export function createConcreteCleanup(): LsvCleanupRunner {
  return {
    async cleanup(admin: SupabaseClient, ctx: LsvFixtureContext): Promise<LsvCleanupOutcome> {
      const created = countFixtures(ctx);
      let cleaned = 0;

      const leadIds = [
        ctx.resources.leadAAssigned,
        ctx.resources.leadAUnassigned,
        ctx.resources.leadB,
      ];
      const propertyIds = [ctx.resources.propertyA, ctx.resources.propertyB];
      const tenantIds = [ctx.tenants.tenantA, ctx.tenants.tenantB];
      const userIds = collectUserIdsFromCtx(ctx);

      // Audit events first (ON DELETE RESTRICT on leads).
      cleaned += await safeDelete(admin, "lead_audit_events", "lead_id", leadIds);

      // Stage history references leads too.
      cleaned += await safeDelete(admin, "lead_stage_history", "lead_id", leadIds);

      // Leads.
      cleaned += await safeDelete(admin, "leads", "id", leadIds);

      // Properties.
      cleaned += await safeDelete(admin, "imoveis", "id", propertyIds);

      // Memberships + roles by user_id.
      cleaned += await safeDelete(admin, "tenant_members", "user_id", userIds);
      cleaned += await safeDelete(admin, "user_roles", "user_id", userIds);

      // Tenants.
      cleaned += await safeDelete(admin, "tenants", "id", tenantIds);

      // Auth users last.
      for (const uid of userIds) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin as any).auth.admin.deleteUser(uid);
          cleaned += 1;
        } catch {
          // Counted as orphan below.
        }
      }

      const orphaned = await countOrphans(admin, ctx);

      return {
        fixturesCreated: created,
        fixturesCleaned: cleaned,
        orphanedFixtures: orphaned,
      };
    },
  };
}

async function safeDelete(
  admin: SupabaseClient,
  table: string,
  column: string,
  ids: ReadonlyArray<string>,
): Promise<number> {
  if (ids.length === 0) return 0;
  const { error, count } = await admin
    .from(table)
    .delete({ count: "exact" })
    .in(column, ids as string[]);
  if (error) return 0;
  return count ?? 0;
}

function countFixtures(ctx: LsvFixtureContext): number {
  let n = 0;
  n += 2; // tenants
  for (const id of IDENTITIES) if (ctx.users[id as LsvIdentity]) n += 1;
  n += 2; // properties
  n += 3; // leads
  return n;
}

function collectUserIdsFromCtx(ctx: LsvFixtureContext): string[] {
  const ids: string[] = [];
  for (const id of IDENTITIES) {
    const rec = ctx.users[id as LsvIdentity];
    if (rec) ids.push(rec.userId);
  }
  return ids;
}

async function countOrphans(admin: SupabaseClient, ctx: LsvFixtureContext): Promise<number> {
  const tenantIds = [ctx.tenants.tenantA, ctx.tenants.tenantB];
  let orphans = 0;
  const checks: Array<[string, string, ReadonlyArray<string>]> = [
    ["leads", "tenant_id", tenantIds],
    ["imoveis", "tenant_id", tenantIds],
    ["tenant_members", "tenant_id", tenantIds],
    ["tenants", "id", tenantIds],
  ];
  for (const [table, col, ids] of checks) {
    const { count } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(col, ids as string[]);
    orphans += count ?? 0;
  }
  return orphans;
}
