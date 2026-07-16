// LSV-01 · Lote A — Fixture cleanup (skeleton).
// Cleanup must run in a `finally` block after every harness run. It
// enforces the ON DELETE RESTRICT contract of `lead_audit_events` by
// tearing down audit rows only through the isolated test project's
// administrative teardown (never by relaxing the production contract).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LsvCleanupOutcome, LsvFixtureContext } from "./fixture-types";

export interface LsvCleanupRunner {
  cleanup(
    admin: SupabaseClient,
    ctx: LsvFixtureContext,
  ): Promise<LsvCleanupOutcome>;
}

/**
 * Fails closed when called without a concrete cleanup binding. The
 * concrete implementation is only wired against an authorized target;
 * production must never reach this module.
 */
export function createRefusingCleanup(): LsvCleanupRunner {
  return {
    async cleanup() {
      throw new Error(
        "LSV_CLEANUP_RUNNER_NOT_BOUND: bind a concrete cleanup runner only after the environment guard authorizes the target.",
      );
    },
  };
}
