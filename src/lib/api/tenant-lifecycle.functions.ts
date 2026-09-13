import { operationalRows, requireOperationalIdentity } from './tenant-operational-directory.server';
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
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "tenant_lifecycle_failed";
  const known: Array<[string, string]> = [
    ["registration_retry_later", "Aguarde um minuto antes de reenviar a ativação."],
    ["cross_tenant_or_unknown_profile", "Selecione um perfil válido desta empresa."],
    ["platform_identity_not_operational", "Esta identidade não está disponível para a equipe da empresa."],
    ["registration_expired", "A ativação expirou. Solicite o reenvio ao Admin."],
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
    ["membership_manager_required", "Somente o owner ou administrador ativo do tenant pode gerenciar membros."],
    ["current_owner_required", "Somente o owner atual pode transferir a propriedade."],
    ["super_admin_requires_impersonation", "O Super Admin não pode operar membros de tenants."],
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
  const { data, error } = await context.supabase
    .from("tenant_members")
    .select("tenant_role, membership_status, is_owner")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error || !data) throw new Error("Membership de gestão não encontrada.");
  if (data.membership_status !== "active" || !((data.tenant_role === "owner" && data.is_owner === true) || (data.tenant_role === "admin" && data.is_owner === false))) {
    throw new Error("Somente o owner ou administrador ativo do tenant pode gerenciar membros.");
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
  canTransferOwnership: boolean;
  name: string | null;
  activationDeliveryStatus: string | null;
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
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("tenant_members")
      .select("tenant_id, user_id, tenant_role, membership_status, is_owner, is_default, invited_at, accepted_at, joined_at, suspended_at, revoked_at, display_name, activation_delivery_status")
      .eq("tenant_id", tenantId)
      .order("is_owner", { ascending: false })
      .order("joined_at", { ascending: true });
    if (error) throw new Error("Falha ao listar memberships.");

    const visible = await operationalRows(supabaseAdmin, rows ?? []);
    return Promise.all(visible.map(async (row: any) => {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
      return {
        tenantId: row.tenant_id,
        userId: row.user_id,
        email: authError ? null : authData.user?.email ?? null,
        name: row.display_name ?? null,
        activationDeliveryStatus: row.activation_delivery_status ?? null,
        role: row.tenant_role,
        status: row.membership_status,
        isOwner: row.is_owner,
        canTransferOwnership: visible.some((member: any) => member.user_id === context.userId && member.tenant_role === "owner" && member.is_owner && member.membership_status === "active"),
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
  name: z.string().trim().min(2).max(160).optional(),
  profileIds: z.array(z.string().uuid()).min(1).max(20).optional(),
  targetRole: roleSchema(),
  resend: z.boolean().optional().default(false),
}).strict().refine(v => v.resend || (!!v.name && !!v.profileIds?.length), 'Informe o nome e pelo menos um perfil de acesso.');

export const inviteTenantMember = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await assertTenantMembershipManager(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const email = normalizeEmail(data.email);
    // Revalidate authority, seats and profiles before any external Auth operation.
    const preflight = await admin.rpc('preflight_tenant_member_registration', {
      _actor: context.userId, _tenant: tenantId, _origin: context.tenant.origin,
      _profiles: data.profileIds ?? [], _resend: data.resend,
    });
    if (preflight.error) throw safeLifecycleError(preflight.error);
    let user = await findAuthUserByEmail(admin, email);
    if (user) await requireOperationalIdentity(admin, user.id);
    if (!user) {
      if (data.resend) throw Error('Cadastro pendente não encontrado.');
      // createUser sends NO email. No password is chosen by the operator.
      const created = await admin.auth.admin.createUser({email, email_confirm:false});
      if (created.error || !created.data?.user) throw Error('Não foi possível preparar a conta. Nenhum e-mail foi enviado.');
      user = {id:created.data.user.id,email,confirmed:false};
    }
    const prepared = await admin.rpc('configure_tenant_member_registration', {
      _actor:context.userId, _tenant:tenantId, _origin:context.tenant.origin,
      _target:user.id, _role:data.targetRole, _name:data.name ?? null,
      _profiles:data.profileIds ?? [], _resend:data.resend,
    });
    if (prepared.error) {
      const denied = parseCommercialSeatLimitDeniedError(prepared.error, tenantId);
      if (denied) throw Error('O plano não possui vagas disponíveis para novos usuários.');
      throw safeLifecycleError(prepared.error);
    }
    const raw = prepared.data;
    if (!isPlainObject(raw)) throw Error('tenant_lifecycle_invalid_response:registration');
    const invitedAt = requireString(raw,'invitedAt');
    let delivery: 'sent' | 'failed' = 'sent';
    try {
      // Existing identities keep their password; new identities define their own.
      const sent = user.confirmed
        ? await admin.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:'https://realone.com.br/auth'}})
        : await admin.auth.admin.inviteUserByEmail(email,{redirectTo:'https://realone.com.br/reset-password'});
      if (sent.error) delivery = 'failed';
    } catch { delivery = 'failed'; }
    const saved = await admin.from('tenant_members').update({activation_delivery_status:delivery})
      .eq('tenant_id',tenantId).eq('user_id',user.id).eq('invited_at',invitedAt).select('user_id');
    if (saved.error || saved.data?.length !== 1) throw Error('Cadastro salvo, mas não foi possível confirmar o envio. Recarregue antes de reenviar.');
    return {tenantId:requireUuid(raw,'tenantId'),targetUserId:requireUuid(raw,'targetUserId'),email,
      operation:requireString(raw,'operation'),changed:requireBoolean(raw,'changed'),status:requireString(raw,'status'),
      role:requireString(raw,'role'),invitedAt,deliveryMode:delivery === 'sent' ? 'automated_email' : 'failed'};
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
    const response: unknown = raw;
    if (!isPlainObject(response)) throw new Error("tenant_lifecycle_invalid_response:accept");
    if (requireUuid(response, "userId") !== context.userId) {
      throw new Error("tenant_lifecycle_invalid_response:userId");
    }
    return {
      tenantId: requireUuid(response, "tenantId"),
      userId: context.userId,
      status: requireString(response, "status"),
      role: requireString(response, "role"),
      invitedAt: response.invitedAt === null ? null : requireString(response, "invitedAt"),
      acceptedAt: requireString(response, "acceptedAt"),
      joinedAt: requireString(response, "joinedAt"),
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
