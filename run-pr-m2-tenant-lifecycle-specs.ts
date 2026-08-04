import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;

function source(path: string) {
  return readFileSync(path, "utf8");
}

function check(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`✓ ${name}`);
}

function block(content: string, start: string, end?: string) {
  const startIndex = content.indexOf(start);
  assert.ok(startIndex >= 0, `missing marker: ${start}`);
  const endIndex = end ? content.indexOf(end, startIndex + start.length) : content.length;
  assert.ok(endIndex > startIndex, `missing end marker: ${end ?? "EOF"}`);
  return content.slice(startIndex, endIndex);
}

const lifecycleMigration = source("supabase/migrations/20260728165000_pr_m2_tenant_lifecycle.sql");
const canonicalMutationMigration = source("supabase/migrations/20260713221723_857275c9-958d-46fc-b826-e0c7ae030a3d.sql");
const lifecycleFunctions = source("src/lib/api/tenant-lifecycle.functions.ts");
const canonicalBoundary = source("src/lib/api/commercial/membership-mutation-boundary.server.ts");
const superFunctions = source("src/lib/api/super.functions.ts");
const superRoute = source("src/routes/_authenticated.super.index.tsx");
const membershipsRoute = source("src/routes/_authenticated.admin.memberships.tsx");
const invitationsRoute = source("src/routes/_authenticated.invitations.tsx");
const workspace = source("src/components/workspace/WorkspaceShell.tsx");
const header = source("src/components/workspace/AppHeader.tsx");
const selectionGate = source("src/components/workspace/tenant/TenantSelectionRequired.tsx");

check("canonical membership primitive remains locked and commercially enforced", () => {
  assert.ok(canonicalMutationMigration.includes("FOR UPDATE"));
  assert.ok(canonicalMutationMigration.includes("public.resolve_commercial_seat_decision"));
  assert.ok(canonicalMutationMigration.includes("commercial_seat_limit_denied"));
  assert.ok(canonicalMutationMigration.includes("_operation NOT IN ('create_membership','change_role','suspend','reactivate','revoke')"));
});

check("specialized lifecycle migration defines exactly the missing authorities", () => {
  for (const name of [
    "bootstrap_tenant_with_owner",
    "invite_tenant_member",
    "accept_tenant_invitation",
    "transfer_tenant_ownership",
  ]) {
    assert.ok(lifecycleMigration.includes(`FUNCTION public.${name}`), name);
  }
  assert.equal((lifecycleMigration.match(/CREATE OR REPLACE FUNCTION public\./g) ?? []).length, 4);
  assert.equal(lifecycleMigration.includes("CREATE OR REPLACE FUNCTION public.mutate_tenant_membership"), false);
});

check("all lifecycle primitives are SECURITY DEFINER and service-role only", () => {
  assert.equal((lifecycleMigration.match(/SECURITY DEFINER/g) ?? []).length, 4);
  assert.equal((lifecycleMigration.match(/SET search_path = public, pg_temp/g) ?? []).length, 4);
  for (const signature of [
    "bootstrap_tenant_with_owner(uuid,text,text,uuid,text)",
    "invite_tenant_member(uuid,uuid,text,uuid,text,boolean)",
    "accept_tenant_invitation(uuid,uuid)",
    "transfer_tenant_ownership(uuid,uuid,text,uuid)",
  ]) {
    assert.ok(lifecycleMigration.includes(`REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC, anon, authenticated`), signature);
    assert.ok(lifecycleMigration.includes(`GRANT EXECUTE ON FUNCTION public.${signature} TO service_role`), signature);
  }
  assert.ok(lifecycleMigration.includes("tenant lifecycle ACL breach"));
});

check("bootstrap creates tenant and initial owner in one PostgreSQL function", () => {
  const sql = block(lifecycleMigration, "FUNCTION public.bootstrap_tenant_with_owner", "FUNCTION public.invite_tenant_member");
  const tenantInsert = sql.indexOf("INSERT INTO public.tenants");
  const membershipInsert = sql.indexOf("INSERT INTO public.tenant_members", tenantInsert);
  const ownerCheck = sql.indexOf("v_owner_count <> 1", membershipInsert);
  assert.ok(tenantInsert >= 0 && membershipInsert > tenantInsert && ownerCheck > membershipInsert);
  assert.ok(sql.includes("owner_user_id"));
  assert.ok(sql.includes("'owner'"));
  assert.ok(sql.includes("'active'"));
  assert.ok(sql.includes("owner_initialized"));
  assert.ok(sql.includes("pending_dca_01"));
  assert.equal(sql.includes("dominio_principal,\n    _owner_user_id"), false);
});

check("invitation locks tenant, validates actor and enforces seat before insert", () => {
  const sql = block(lifecycleMigration, "FUNCTION public.invite_tenant_member", "FUNCTION public.accept_tenant_invitation");
  const lock = sql.indexOf("FOR UPDATE");
  const actor = sql.indexOf("membership_manager_required", lock);
  const decision = sql.indexOf("public.resolve_commercial_seat_decision", actor);
  const insert = sql.indexOf("INSERT INTO public.tenant_members", decision);
  assert.ok(lock >= 0 && actor > lock && decision > actor && insert > decision);
  assert.ok(sql.includes("'invited'"));
  assert.ok(sql.includes("membership_invitation_already_exists"));
  assert.ok(sql.includes("revoked_membership_requires_explicit_recovery"));
  assert.ok(sql.includes("resend_invitation"));
});

check("acceptance is authenticated-user-bound and only invited becomes active", () => {
  const sql = block(lifecycleMigration, "FUNCTION public.accept_tenant_invitation", "FUNCTION public.transfer_tenant_ownership");
  assert.ok(sql.includes("user_id = _actor_user_id"));
  assert.ok(sql.includes("v_status <> 'invited'"));
  assert.ok(sql.includes("membership_status = 'active'"));
  assert.ok(sql.includes("accepted_at = v_now"));
  assert.ok(sql.includes("joined_at = v_now"));
  assert.ok(sql.includes("invitation_not_found_or_invalid"));
});

check("ownership transfer preserves exactly one active owner and tenant reference", () => {
  const sql = block(lifecycleMigration, "FUNCTION public.transfer_tenant_ownership", "-- Application trust boundary");
  assert.ok(sql.includes("v_owner_count <> 1"));
  assert.ok(sql.includes("tenant_owner_reference_inconsistent"));
  assert.ok(sql.includes("target_must_be_active_non_owner_member"));
  const demote = sql.indexOf("SET tenant_role = 'admin'");
  const promote = sql.indexOf("SET tenant_role = 'owner'", demote);
  const tenantUpdate = sql.indexOf("SET owner_user_id = _target_user_id", promote);
  const finalCheck = sql.indexOf("owner_transfer_invariant_failed", tenantUpdate);
  assert.ok(demote >= 0 && promote > demote && tenantUpdate > promote && finalCheck > tenantUpdate);
});

check("server functions expose every required lifecycle operation", () => {
  for (const name of [
    "bootstrapTenantWithOwner",
    "listTenantMemberships",
    "inviteTenantMember",
    "listMyTenantInvitations",
    "acceptTenantInvitation",
    "changeTenantMemberRole",
    "suspendTenantMember",
    "revokeTenantMember",
    "reactivateTenantMember",
    "transferTenantOwnership",
  ]) {
    assert.ok(lifecycleFunctions.includes(`export const ${name}`), name);
  }
});

check("TypeScript never mutates tenant_members directly and follows canonical boundary", () => {
  assert.equal(/\.from\(["']tenant_members["']\)[\s\S]{0,250}\.(?:insert|update|upsert|delete)\(/.test(lifecycleFunctions), false);
  assert.equal(/\.from\(["']tenant_members["']\)[\s\S]{0,250}\.(?:insert|update|upsert|delete)\(/.test(canonicalBoundary), false);
  assert.ok(lifecycleFunctions.includes("membership-mutation-boundary.server"));
  assert.ok(lifecycleFunctions.includes("executeMembershipMutation"));
  assert.ok(canonicalBoundary.includes('"mutate_tenant_membership"'));
  assert.ok(lifecycleFunctions.includes('"bootstrap_tenant_with_owner"'));
  assert.ok(lifecycleFunctions.includes('"invite_tenant_member"'));
  assert.ok(lifecycleFunctions.includes('"accept_tenant_invitation"'));
  assert.ok(lifecycleFunctions.includes('"transfer_tenant_ownership"'));
});

check("public payloads do not accept trusted actor or tenant authority fields", () => {
  for (const forbidden of ["actorUserId", "tenantOrigin", "isSuperAdmin", "seatDelta", "limit", "used", "remaining"]) {
    const schemaRegion = lifecycleFunctions.slice(0, lifecycleFunctions.indexOf("export const bootstrapTenantWithOwner"));
    assert.equal(schemaRegion.includes(`${forbidden}:`), false, forbidden);
  }
  assert.ok(lifecycleFunctions.includes("_actor_user_id: context.userId"));
  assert.ok(lifecycleFunctions.includes("_tenant_id: tenantId"));
  assert.ok(lifecycleFunctions.includes("_tenant_origin: context.tenant.origin"));
});

check("non-atomic Super tenant insert path is removed", () => {
  assert.ok(superFunctions.includes('export { bootstrapTenantWithOwner as criarTenant }'));
  assert.equal(/export const criarTenant[\s\S]{0,700}\.from\(["']tenants["']\)[\s\S]{0,200}\.insert\(/.test(superFunctions), false);
});

check("Super Control Plane exposes owner, onboarding and DCA/BCA states", () => {
  for (const marker of [
    "bootstrapTenantWithOwner",
    "E-mail do owner inicial",
    "Status inicial",
    "Criar tenant e owner",
    "pending DCA-01",
    "pending BCA-01",
    '"/admin/memberships"',
  ]) {
    assert.ok(superRoute.includes(marker), marker);
  }
  assert.equal(superRoute.includes("dominio_principal: dominio"), false);
});

check("membership interface exposes every supported state and action", () => {
  for (const marker of [
    "Convidar membro",
    "Reenviar",
    "Suspender",
    "Reativar",
    "Revogar",
    "Tornar owner",
    "changeTenantMemberRole",
    "transferTenantOwnership",
    "invitedAt",
    "acceptedAt",
    "suspendedAt",
    "revokedAt",
  ]) {
    assert.ok(membershipsRoute.includes(marker), marker);
  }
});

check("invitation acceptance surface is outside tenant selection authority", () => {
  assert.ok(invitationsRoute.includes("listMyTenantInvitations"));
  assert.ok(invitationsRoute.includes("acceptTenantInvitation"));
  assert.ok(invitationsRoute.includes("setSelectedTenantId(result.tenantId)"));
  assert.ok(workspace.includes('path === "/invitations"'));
  assert.ok(workspace.includes("isInvitationRoute ?"));
  assert.ok(header.includes('to="/invitations"'));
  assert.ok(selectionGate.includes("Ver convites pendentes"));
});

check("client surfaces do not import the service-role client", () => {
  for (const clientSource of [superRoute, membershipsRoute, invitationsRoute, workspace, header, selectionGate]) {
    assert.equal(clientSource.includes("client.server"), false);
    assert.equal(clientSource.includes("supabaseAdmin"), false);
  }
});

console.log(`PR-M2 tenant lifecycle specs: ${passed} passed`);
