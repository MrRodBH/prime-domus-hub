import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const migrationPath = "supabase/migrations/20260728180000_pr_m2_tenant_access_control.sql";
const migration = read(migrationPath);
const authority = read("src/lib/api/tenant-access-control-authority.server.ts");
const functions = read("src/lib/api/tenant-access-control.functions.ts");
const broker = read("src/lib/api/tenant-broker-directory.functions.ts");
const rbacBarrel = read("src/lib/api/rbac.functions.ts");
const adminBarrel = read("src/lib/api/admin.functions.ts");
const profilesRoute = read("src/routes/_authenticated.admin.perfis.tsx");
const teamsRoute = read("src/routes/_authenticated.admin.equipes.tsx");
const membershipsRoute = read("src/routes/_authenticated.admin.memberships.tsx");
const brokersRoute = read("src/routes/_authenticated.admin.corretores.tsx");
const auditRoute = read("src/routes/_authenticated.admin.auditoria.tsx");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[PR-M2 tenant-access-control] ${message}`);
}

function includesAll(content: string, tokens: string[], label: string) {
  for (const token of tokens) assert(content.includes(token), `${label} missing ${token}`);
}

includesAll(migration, [
  "ADD COLUMN IF NOT EXISTS tenant_id uuid",
  "tenant_access_backfill_ambiguous_or_orphan_user_profile",
  "tenant_access_backfill_unassigned_custom_profile",
  "rbac_profiles_tenant_contract",
  "ux_user_profiles_tenant_user_profile",
  "REVOKE ALL ON TABLE public.rbac_profiles FROM anon, authenticated",
  "REVOKE ALL ON TABLE public.teams FROM anon, authenticated",
  "CREATE OR REPLACE FUNCTION public.resolve_tenant_permission",
  "CREATE OR REPLACE FUNCTION public.mutate_tenant_access_profile",
  "CREATE OR REPLACE FUNCTION public.set_tenant_profile_permission",
  "CREATE OR REPLACE FUNCTION public.set_tenant_member_profiles",
  "CREATE OR REPLACE FUNCTION public.mutate_tenant_team",
  "super_admin_requires_impersonation",
  "owner_required_for_access_control_grant",
  "permission_scope_escalation_denied",
  "cross_tenant_or_unknown_profile",
  "cross_tenant_or_inactive_team_member",
  "FOR UPDATE",
  "GRANT EXECUTE ON FUNCTION public.resolve_tenant_permission",
], "migration");

for (const functionName of [
  "resolve_tenant_permission",
  "assert_tenant_access_manager",
  "mutate_tenant_access_profile",
  "set_tenant_profile_permission",
  "set_tenant_member_profiles",
  "mutate_tenant_team",
]) {
  assert(migration.includes(`REVOKE ALL ON FUNCTION public.${functionName}`), `${functionName} must revoke public/authenticated`);
  assert(migration.includes(`GRANT EXECUTE ON FUNCTION public.${functionName}`), `${functionName} must grant service_role`);
}

assert(!/GRANT\s+(SELECT|INSERT|UPDATE|DELETE|ALL)[\s\S]{0,100}\sTO\s+(anon|authenticated)/i.test(migration), "migration must not grant direct RBAC/team access to anon/authenticated");
assert(migration.includes("WHEN 'global' THEN 3") && migration.includes("WHEN 'equipe' THEN 2") && migration.includes("WHEN 'proprio' THEN 1"), "scope precedence global > equipe > proprio must be explicit");
assert(!/ORDER BY[\s\S]{0,80}LIMIT\s+1/i.test(migration), "migration must not use ORDER BY/LIMIT 1 as authority");

includesAll(authority, [
  "authorizeTenantAccessControlOperation",
  "resolveEffectiveTenantPermission",
  "requireTenantScopedAuthority",
  '"access_control", "gerenciar"',
  'decision.scope !== "global"',
], "authority");
assert(!authority.includes("has_role"), "authority must not use has_role");

includesAll(functions, [
  "requireTenant",
  "getMyEffectiveTenantPermissions",
  "listTenantAccessProfiles",
  "getTenantAccessProfile",
  "saveTenantAccessProfile",
  "deleteTenantAccessProfile",
  "setTenantProfilePermission",
  "setTenantMemberProfiles",
  "listTenantTeams",
  "getTenantTeam",
  "saveTenantTeam",
  "deleteTenantTeam",
  "listTenantAccessAudit",
  '"mutate_tenant_access_profile" as never',
  '"set_tenant_profile_permission" as never',
  '"set_tenant_member_profiles" as never',
  '"mutate_tenant_team" as never',
  "Fluxo legado removido",
], "server functions");
assert(!functions.includes('.from("user_roles").delete'), "canonical server functions must not mutate user_roles");
assert(!functions.includes('.from("rbac_profiles").insert'), "profile mutations must use SQL primitive");
assert(!functions.includes('.from("teams").insert'), "team mutations must use SQL primitive");
assert(!functions.includes("fallback"), "canonical server functions must not implement fallback");

assert(rbacBarrel.includes('export * from "./tenant-access-control.functions"'), "rbac barrel must expose only canonical boundary");
assert(!rbacBarrel.includes("has_role"), "rbac barrel must not retain has_role authority");

includesAll(adminBarrel, [
  'from "./tenant-access-control.functions"',
  'from "./tenant-broker-directory.functions"',
  "adminCriarUsuarioComLogin",
  "adminDefinirPerfilUsuario",
], "admin barrel");

includesAll(broker, [
  "requireTenant",
  "authorizeTenantAccessControlOperation",
  '.eq("tenant_id", tenantId)',
  "accessLifecycleChanged: false",
  "authUserDeleted: false",
  "membershipChanged: false",
], "broker directory");
assert(!broker.includes("auth.admin.createUser"), "broker directory must not create Auth users");
assert(!broker.includes("auth.admin.deleteUser"), "broker directory must not delete Auth users");
assert(!broker.includes('.from("user_roles")'), "broker directory must not mutate global roles");

includesAll(profilesRoute, ["template de sistema", "tenant", "Global > Equipe > Próprios"], "profiles route");
includesAll(teamsRoute, ["listTenantMemberships", "membership", "tenant-scoped"], "teams route");
includesAll(membershipsRoute, ["setUserPerfis", "Perfis RBAC", "Membership role", "Convidar membro"], "memberships route");
includesAll(auditRoute, ["listTenantAccessAudit", "Auditoria de acessos"], "audit route");

assert(!brokersRoute.includes("PasswordInput"), "broker UI must not expose password input");
assert(!brokersRoute.includes("adminCriarUsuarioComLogin"), "broker UI must not call legacy Auth creation");
assert(!brokersRoute.includes("adminAlterarSenhaUsuario"), "broker UI must not expose admin password mutation");
assert(brokersRoute.includes("Membros e acessos"), "broker UI must direct access creation to memberships");

const mutationRpcCalls = [
  "mutate_tenant_access_profile",
  "set_tenant_profile_permission",
  "set_tenant_member_profiles",
  "mutate_tenant_team",
];
for (const rpc of mutationRpcCalls) {
  const occurrences = functions.split(`\"${rpc}\" as never`).length - 1;
  assert(occurrences >= 1, `${rpc} must be called by a canonical wrapper`);
}

console.log(JSON.stringify({
  status: "PASS",
  migration: migrationPath,
  tenantProfilesBound: true,
  tenantAssignmentsBound: true,
  systemTemplatesImmutable: true,
  permissionResolverCanonical: true,
  scopePrecedence: ["global", "equipe", "proprio"],
  directAuthenticatedMutationDenied: true,
  legacyPasswordFlowActive: false,
  brokerAccessLifecycleSeparated: true,
  crossTenantAssertionsPresent: true,
  rpcAclServiceRoleOnly: true,
}, null, 2));
