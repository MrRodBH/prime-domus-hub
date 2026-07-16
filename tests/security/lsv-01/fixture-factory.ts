// LSV-01 · Lote A — Fixture factory (skeleton).
// Real DB writes only fire when the environment guard authorizes a
// non-production target. This module owns the shape of the fixture
// context and the SQL contract; the actual Supabase mutations are
// executed by the caller under a service-role admin client scoped to
// the authorized project.
//
// The factory intentionally never resolves fixtures via LIMIT 1 or
// implicit "first tenant" selection: every returned UUID comes from
// the row the service-role client just inserted. Cardinality
// deviations raise `LsvFixtureError`.

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
   * Sets up tenants, users, memberships, roles, properties and lead
   * fixtures for `runId` using the provided service-role client.
   * Returns an immutable fixture context. Idempotent per runId: a
   * second call with the same runId must reuse existing fixtures.
   */
  setup(admin: SupabaseClient, runId: string): Promise<LsvFixtureContext>;
}

/**
 * Structural placeholder for the concrete factory. The full setup
 * implementation is materialized by Lote A when running against an
 * authorized target; this default implementation refuses to run so
 * that no accidental production writes occur.
 */
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
