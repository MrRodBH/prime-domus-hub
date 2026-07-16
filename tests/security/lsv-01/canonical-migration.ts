// LSV-01 · Canonical SQL migration reference.
//
// Points structural tests, the live runner, and the aggregator at the
// SINGLE currently-binding migration that defines
// public.get_current_tenant_id(). Splitting this out of the live runner
// avoids importing the runner's top-level main() from structural tests.

export const CANONICAL_GET_CURRENT_TENANT_ID_MIGRATION =
  "supabase/migrations/20260707143029_83dd8dc5-0313-45cd-a332-cc188a6f64c2.sql";
