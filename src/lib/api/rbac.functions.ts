// PR-M2 — canonical tenant-scoped access-control barrel.
//
// The previous implementation used requireSupabaseAuth + has_role("admin"),
// global profile assignments and direct table mutations. All public exports now
// resolve tenant authority through requireTenant and service-role-only SQL
// primitives. Historical import names remain source-compatible.

export * from "./tenant-access-control.functions";
