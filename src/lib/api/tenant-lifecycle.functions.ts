import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  NON_OWNER_TENANT_ROLES,
  type NonOwnerTenantRole,
} from "@/lib/api/commercial/membership-mutation-types";
import { parseCommercialSeatLimitDeniedError } from "@/lib/api/commercial/membership-mutation-enforcement-error";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`tenant_lifecycle_invalid_response:${key}`);
  }
  return value;
}

function requireUuid(record: Record<string, unknown>, key: string) {
  const value = requireString(record, key);
  if (!UUID_RE.test(value)) throw new Error(`tenant_lifecycle_invalid_response:${key}`);
  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`tenant_lifecycle_invalid_response:${key}`);
  return value;
}

function roleSchema() {
  return z.string().refine(
    (value): value is NonOwnerTenantRole =>
      (NON_OWNER_TENANT_ROLES as readonly string[]).includes(value),
    "Role inválida ou não permitida.",
  );
}

function safeLifecycleError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "tenant_lifecycle_failed";
  const known: Array<[string, string]> = [
    ["tenant_slug_already_exists", "Já existe um tenant com este slug."],
    ["owner_auth_user_not_found", "O proprietário inicial não possui usuário Auth."],
    ["initial_owner_required", "O proprietário inicial é obrigatório."],
    ["membership_invitation_already_exists", "Já existe um convite pendente para este usuário."],
    ["membership_already_exists", "O usuário já possui membership neste tenant."],
    ["revoked_membership_requires_explicit_recovery", "A membership revogada não pode ser reativada por convite."],
    ["invitation_not_found_or_invalid", "O convite não existe, não pertence ao usuário ou não está mais válido."],
    ["owner_cardinality_invalid", "A cardinalidade de owner do tenant está inconsistente."],
    ["tenant_owner_reference_inconsistent", "A referência do owner do tenant está inconsistente."],
    ["target_must_be_active_non_owner_member", "O novo owner deve ser um membro ativo e não proprietário."],
    ["target_already_owner", "O usuário já é o proprietário do tenant."],
    ["membership_manager_required", "Somente o owner ativo pode gerenciar memberships."],
    ["current_owner_required", "Somente o owner atual pode transferir a propriedade."],
    ["super_admin_requires_impersonation", "Super Admin precisa de impersonação explícita para operar memberships."],
  ];
  for (const [token, safe] of known) {
    if (message.includes(token)) return new Error(safe);
  }
  return new Error("Falha segura no lifecycle do tenant.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertSuperAdmin(context: any) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error || !data) throw new Error("Acesso restrito ao Super Admin.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertTenantMembershipManager(context: any) {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Membership");
  if (context.tenant.isSuperAdmin) return tenantId;
  const { data, error } = await context.supabase
    .from("tenant_members")
    .select("tenant_role, membership_status, is_owner")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error || !data) throw new Error("Membership de gestão não encontrada.");
  if (data.membership_status !== "active" || data.tenant_role !== "owner" || data.is_owner !== true) {
    throw new Error("Somente o owner ativo pode gerenciar memberships.");
  }
  return tenantId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findAuthUserByEmail(admin: any, normalizedEmail: string) {
  const matches: Array<{ id: string; email: string; confirmed: boolean }> = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Falha ao consultar usuários Auth.");
    for (const user of data.users ?? []) {
      if (normalizeEmail(user.email ?? "") === normalizedEmail) {
        matches.push({
          id: user.id,
          email: normalizeEmail(user.email ?? normalizedEmail),
          confirmed: Boolean(user.email_confirmed_at),
        });
      }
    }
    const lastPage = typeof data.lastPage === "number" ? data.lastPage : page;
    if (page >= lastPage) break;
  }
  if (matches.length > 1) throw new Error("Usuário Auth ambíguo para o e-mail informado.");
  return matches[0] ?? null;
}

const bootstrapSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().min(2).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ownerEmail: z.string().trim().email().max(320),
  initialStatus: z.enum(["trial", "ativo"]).default("trial"),
}).strict();

export const bootstrapTenantWithOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bootstrapSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normalizeEmail(data.ownerEmail);
    const owner = await findAuthUserByEmail(supabaseAdmin, email);
    if (!owner) throw new Error("O proprietário inicial não possui usuário Auth.");

    const { data: raw, error } = await supabaseAdmin.rpc(
      "bootstrap_tenant_with_owner" as never,
      {
        _actor_user_id: context.userId,
        _slug: data.slug,
        _name: data.name,
        _owner_user_id: owner.id,
        _initial_status: data.initialStatus,
      } as never,
    );
    if (error) throw safeLifecycleError(error);
    if (!isPlainObject(raw)) throw new Error("tenant_lifecycle_invalid_response:bootstrap");
    const tenantId = requireUuid(raw, "tenantId");
    if (requireUuid(raw, "ownerUserId") !== owner.id) {
      throw new Error("tenant_lifecycle_invalid_response:ownerUserId");
    }
    return {
      tenantId,
      slug: requireString(raw, "slug"),
      name: requireString(raw, "name"),
      status: requireString(raw, "status"),
      ownerUserId: owner.id,
      ownerEmail: owner.email,
      onboardingState: requireString(raw, "onboardingState"),
      domainActivation: requireString(raw, "domainActivation"),
    };
  });

export type TenantMembershipView = {
  tenantId: string;
  userId: string;
  email: string | null;
  role: string;
  status: string;
  isOwner: boolean;
  isDefault: boolean;
  invitedAt: string | null;
  acceptedAt: string | null;
  joinedAt: string;
  suspendedAt: string | null;
  revokedAt: string | null;
};

export const listTenantMemberships = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<TenantMembershipView[]> => {
    const tenantId = await assertTenantMembershipManager(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("tenant_members")
      .select("tenant_id, user_id, tenant_role, membership_status, is_owner, is_default, invited_at, accepted_at, joined_at, suspended_at, revoked_at")
      .eq("tenant_id", tenantId)
      .order("is_owner", { ascending: false })
      .order("joined_at", { ascending: true });
    if (error) throw new Error("Falha ao listar memberships.");

    return Promise.all((rows ?? []).map(async (row) => {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
      return {
        tenantId: row.tenant_id,
        userId: row.user_id,
        email: authError ? null : authData.user?.email ?? null,
        role: row.tenant_role,
        status: row.membership_status,
        isOwner: row.is_owner,
        isDefault: row.is_default,
        invitedAt: row.invited_at,
        acceptedAt: row.accepted_at,
        joinedAt: row.joined_at,
        suspendedAt: row.suspended_at,
        revokedAt: row.revoked_at,
      };
    }));
  });

const inviteSchema = z.object({
  email: z.string().trim().email().max(320),
  targetRole: roleSchema(),
  resend: z.boolean().optional().default(false),
  redirectTo: z.string().url().max(1000).optional(),
}).strict();

export const inviteTenantMember = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await assertTenantMembershipManager(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normalizeEmail(data.email);
    let user = await findAuthUserByEmail(supabaseAdmin, email);
    let createdByAutomatedInvite = false;

    if (!user) {
      const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        data.redirectTo ? { redirectTo: data.redirectTo } : undefined,
      );
      if (inviteError || !invited.user) throw new Error("Não foi possível criar o convite Auth.");
      user = { id: invited.user.id, email, confirmed: false };
      createdByAutomatedInvite = true;
    }

    const { data: raw, error } = await supabaseAdmin.rpc(
      "invite_tenant_member" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _target_user_id: user.id,
        _target_role: data.targetRole,
        _resend: data.resend,
      } as never,
    );

    if (error) {
      if (createdByAutomatedInvite) {
        await supabaseAdmin.auth.admin.deleteUser(user.id).catch(() => undefined);
      }
      const denied = parseCommercialSeatLimitDeniedError(error, tenantId);
      if (denied) {
        const { limit, used, remaining } = denied.decision;
        throw new Error(`Limite de usuários atingido. Limite: ${limit ?? "—"}; uso: ${used ?? "—"}; restante: ${remaining ?? "—"}.`);
      }
      throw safeLifecycleError(error);
    }
    if (!isPlainObject(raw)) throw new Error("tenant_lifecycle_invalid_response:invite");

    if (data.resend && !user.confirmed && !createdByAutomatedInvite) {
      await supabaseAdmin.auth.admin
        .inviteUserByEmail(email, data.redirectTo ? { redirectTo: data.redirectTo } : undefined)
        .catch(() => undefined);
    }

    return {
      tenantId: requireUuid(raw, "tenantId"),
      targetUserId: requireUuid(raw, "targetUserId"),
      email,
      operation: requireString(raw, "operation"),
      changed: requireBoolean(raw, "changed"),
      status: requireString(raw, "status"),
      role: requireString(raw, "role"),
      invitedAt: requireString(raw, "invitedAt"),
      deliveryMode: createdByAutomatedInvite ? "automated_email" : "in_app",
    };
  });

export const listMyTenantInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tenant_members")
      .select("tenant_id, tenant_role, invited_at, tenants:tenant_id(id, nome, slug)")
      .eq("user_id", context.userId)
      .eq("membership_status", "invited")
      .order("invited_at", { ascending: true });
    if (error) throw new Error("Falha ao listar convites pendentes.");
    return (data ?? []).map((row) => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] ?? null : row.tenants;
      if (!tenant || tenant.id !== row.tenant_id) {
        throw new Error("Convite com tenant inconsistente.");
      }
      return {
        tenantId: row.tenant_id,
        tenantName: tenant.nome,
        tenantSlug: tenant.slug,
        role: row.tenant_role,
        invitedAt: row.invited_at,
      };
    });
  });

const acceptSchema = z.object({ tenantId: z.string().uuid() }).strict();

export const acceptTenantInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => acceptSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "accept_tenant_invitation" as never,
      { _actor_user_id: context.userId, _tenant_id: data.tenantId } as never,
    );
    if (error) throw safeLifecycleError(error);
    if (!isPlainObject(raw)) throw new Error("tenant_lifecycle_invalid_response:accept");
    if (requireUuid(raw, "userId") !== context.userId) {
      throw new Error("tenant_lifecycle_invalid_response:userId");
    }
    return {
      tenantId: requireUuid(raw, "tenantId"),
      userId: context.userId,
      status: requireString(raw, "status"),
      role: requireString(raw, "role"),
      invitedAt: raw.invitedAt === null ? null : requireString(raw, "invitedAt"),
      acceptedAt: requireString(raw, "acceptedAt"),
      joinedAt: requireString(raw, "joinedAt"),
    };
  });

async function executeCanonicalMembershipMutation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  input: unknown,
) {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Membership");
  try {
    const { executeMembershipMutation } = await import("@/lib/api/commercial/membership-mutation-boundary.server");
    const outcome = await executeMembershipMutation(
      {
        actorUserId: context.userId,
        tenantId,
        tenantOrigin: context.tenant.origin,
      },
      input,
    );
    return outcome.result;
  } catch (error) {
    if (error instanceof Error && error.name === "CommercialSeatLimitDeniedError") {
      throw new Error("Limite comercial de usuários não permite esta operação.");
    }
    throw safeLifecycleError(error);
  }
}

const targetSchema = z.object({ targetUserId: z.string().uuid() }).strict();
const roleChangeSchema = targetSchema.extend({ targetRole: roleSchema() }).strict();

export const changeTenantMemberRole = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => roleChangeSchema.parse(input))
  .handler(async ({ data, context }) => executeCanonicalMembershipMutation(context, {
    operation: "change_role",
    targetUserId: data.targetUserId,
    targetRole: data.targetRole,
  }));

export const suspendTenantMember = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => targetSchema.parse(input))
  .handler(async ({ data, context }) => executeCanonicalMembershipMutation(context, {
    operation: "suspend",
    targetUserId: data.targetUserId,
  }));

export const revokeTenantMember = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => targetSchema.parse(input))
  .handler(async ({ data, context }) => executeCanonicalMembershipMutation(context, {
    operation: "revoke",
    targetUserId: data.targetUserId,
  }));

export const reactivateTenantMember = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => targetSchema.parse(input))
  .handler(async ({ data, context }) => executeCanonicalMembershipMutation(context, {
    operation: "reactivate",
    targetUserId: data.targetUserId,
  }));

export const transferTenantOwnership = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => targetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = requireTenantScopedAuthority(context.tenant, "Tenant Ownership");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "transfer_tenant_ownership" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _target_user_id: data.targetUserId,
      } as never,
    );
    if (error) throw safeLifecycleError(error);
    if (!isPlainObject(raw)) throw new Error("tenant_lifecycle_invalid_response:transfer");
    return {
      tenantId: requireUuid(raw, "tenantId"),
      previousOwnerUserId: requireUuid(raw, "previousOwnerUserId"),
      ownerUserId: requireUuid(raw, "ownerUserId"),
      previousOwnerRole: requireString(raw, "previousOwnerRole"),
      ownerRole: requireString(raw, "ownerRole"),
      changed: requireBoolean(raw, "changed"),
      transferredAt: requireString(raw, "transferredAt"),
    };
  });
