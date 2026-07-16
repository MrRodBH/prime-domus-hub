// LSV-01 · Lote A — Fixture cleanup.
//
// Runs after every live harness invocation from a `finally` block. Uses
// the manifest returned by the concrete factory as the single source of
// truth for what to delete AND for how to count fixtures. Never silences
// errors: every failed DELETE or count query raises a structured
// LsvCleanupError.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LsvCleanupOutcome,
  LsvFixtureManifest,
} from "./fixture-types";
import { countManifestFixtures } from "./fixture-factory";

export class LsvCleanupError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "LsvCleanupError";
  }
}

export interface LsvCleanupRunner {
  cleanup(
    admin: SupabaseClient,
    manifest: LsvFixtureManifest,
  ): Promise<LsvCleanupOutcome>;
}

export function createRefusingCleanup(): LsvCleanupRunner {
  return {
    async cleanup() {
      throw new LsvCleanupError(
        "LSV_CLEANUP_RUNNER_NOT_BOUND",
        "Bind a concrete cleanup runner only after the environment guard authorizes the target.",
      );
    },
  };
}

export function createConcreteCleanup(): LsvCleanupRunner {
  return {
    async cleanup(
      admin: SupabaseClient,
      manifest: LsvFixtureManifest,
    ): Promise<LsvCleanupOutcome> {
      const created = countManifestFixtures(manifest);
      let cleaned = 0;

      const leadIds = [...manifest.leadIds];
      const propertyIds = [...manifest.propertyIds];
      const tenantIds = [...manifest.tenantIds];
      const membershipUserIds = manifest.membershipKeys.map((m) => m.userId);
      const roleUserIds = [...manifest.roleIds];
      const authUserIds = [...manifest.authUserIds];

      cleaned += await strictDelete(admin, "lead_audit_events", "lead_id", leadIds);
      cleaned += await strictDelete(admin, "lead_stage_history", "lead_id", leadIds);
      cleaned += await strictDelete(admin, "leads", "id", leadIds);
      cleaned += await strictDelete(admin, "imoveis", "id", propertyIds);
      cleaned += await strictDelete(admin, "tenant_members", "user_id", membershipUserIds);
      cleaned += await strictDelete(admin, "user_roles", "user_id", roleUserIds);
      cleaned += await strictDelete(admin, "tenants", "id", tenantIds);

      for (const uid of authUserIds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (admin as any).auth.admin.deleteUser(uid);
        if (error) {
          throw new LsvCleanupError(
            "LSV_CLEANUP_AUTH_DELETE_FAILED",
            `auth.admin.deleteUser failed: ${error.status ?? "?"}`,
          );
        }
        cleaned += 1;
      }

      const orphaned = await countOrphans(admin, manifest);

      return { fixturesCreated: created, fixturesCleaned: cleaned, orphanedFixtures: orphaned };
    },
  };
}

async function strictDelete(
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
  if (error) {
    throw new LsvCleanupError(
      "LSV_CLEANUP_DELETE_FAILED",
      `${table}.${column}: ${error.code ?? "unknown"}`,
    );
  }
  return count ?? 0;
}

async function countOrphans(
  admin: SupabaseClient,
  manifest: LsvFixtureManifest,
): Promise<number> {
  let orphans = 0;
  const tenantIds = [...manifest.tenantIds];
  const authUserIds = [...manifest.authUserIds];
  const membershipUserIds = manifest.membershipKeys.map((m) => m.userId);
  const roleUserIds = [...manifest.roleIds];
  const leadIds = [...manifest.leadIds];

  const strictCount = async (
    table: string,
    column: string,
    ids: ReadonlyArray<string>,
  ): Promise<number> => {
    if (ids.length === 0) return 0;
    const { error, count } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(column, ids as string[]);
    if (error) {
      throw new LsvCleanupError(
        "LSV_CLEANUP_ORPHAN_COUNT_FAILED",
        `${table}.${column}: ${error.code ?? "unknown"}`,
      );
    }
    return count ?? 0;
  };

  orphans += await strictCount("lead_audit_events", "lead_id", leadIds);
  orphans += await strictCount("lead_stage_history", "lead_id", leadIds);
  orphans += await strictCount("leads", "tenant_id", tenantIds);
  orphans += await strictCount("imoveis", "tenant_id", tenantIds);
  orphans += await strictCount("tenant_members", "tenant_id", tenantIds);
  orphans += await strictCount("tenant_members", "user_id", membershipUserIds);
  orphans += await strictCount("user_roles", "user_id", roleUserIds);
  orphans += await strictCount("tenants", "id", tenantIds);

  // Auth-user orphan check via admin.getUserById — errors propagate.
  for (const uid of authUserIds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any).auth.admin.getUserById(uid);
    if (error) {
      const status = (error as { status?: number }).status;
      if (status === 404) continue; // gone → not orphan
      throw new LsvCleanupError(
        "LSV_CLEANUP_AUTH_ORPHAN_CHECK_FAILED",
        `auth.getUserById: ${status ?? "unknown"}`,
      );
    }
    if (data?.user) orphans += 1;
  }

  return orphans;
}
