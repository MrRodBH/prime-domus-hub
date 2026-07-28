import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  authorizeTenantAccessControlOperation,
  RBAC_ACTIONS,
  RBAC_SCOPES,
  resolveEffectiveTenantPermission,
  safeTenantAccessError,
  type RbacAction,
  type RbacScope,
} from "@/lib/api/tenant-access-control-authority.server";

export type { RbacAction, RbacScope };

const uuid = z.string().uuid();
const actionSchema = z.enum(RBAC_ACTIONS);
const scopeSchema = z.enum(RBAC_SCOPES);

function trusted(context: any) {
  return {
    userId: context.userId as string,
    tenant: context.tenant as {
      tenantId: string;
      origin: "impersonation" | "selection" | "single-membership";
      isSuperAdmin: boolean;
    },
  };
}

function tenantIdFrom(context: any) {
  return requireTenantScopedAuthority(context.tenant, "Tenant Access Control");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("tenant_access_invalid_response");
  }
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`tenant_access_invalid_response:${key}`);
  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`tenant_access_invalid_response:${key}`);
  return value;
}

const rank: Record<RbacScope, number> = { proprio: 1, equipe: 2, global: 3 };

export type TenantAccessModuleView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  order: number;
};

export type TenantAccessProfileView = {
  id: string;
  tenant_id: string | null;
  nome: string;
  descricao: string | null;
  codigo: string | null;
  sistema: boolean;
  total_usuarios: number;
  can_edit: boolean;
  can_delete: boolean;
};

export type TenantPermissionView = {
  profile_id: string;
  module_id: string;
  action: RbacAction;
  scope: RbacScope;
};

export type TenantTeamView = {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  lider_user_id: string | null;
  ativo: boolean;
  total_membros: number;
  team_members?: Array<{ user_id: string }>;
};

export const getMyEffectiveTenantPermissions = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const tenantId = tenantIdFrom(context);
    const authContext = trusted(context);
    const manageDecision = await resolveEffectiveTenantPermission(authContext, "access_control", "gerenciar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: modules, error: modulesError } = await admin
      .from("rbac_modules")
      .select("id, codigo, nome, descricao, ordem")
      .order("ordem", { ascending: true });
    if (modulesError) throw new Error("Falha ao carregar catálogo de módulos.");

    if (manageDecision.source === "tenant_owner" || manageDecision.source === "super_admin_impersonation") {
      return (modules ?? []).flatMap((module: any) =>
        RBAC_ACTIONS.map((action) => ({ modulo: module.codigo as string, action, scope: "global" as const })),
      );
    }

    const { data: assignments, error: assignmentError } = await admin
      .from("user_profiles")
      .select("profile_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", context.userId);
    if (assignmentError) throw new Error("Falha ao carregar associações de acesso.");
    const profileIds = [...new Set((assignments ?? []).map((row: any) => row.profile_id as string))];
    if (profileIds.length === 0) return [] as Array<{ modulo: string; action: RbacAction; scope: RbacScope }>;

    const { data: permissions, error: permissionError } = await admin
      .from("rbac_permissions")
      .select("module_id, action, scope")
      .in("profile_id", profileIds);
    if (permissionError) throw new Error("Falha ao carregar permissões efetivas.");

    const moduleById = new Map((modules ?? []).map((module: any) => [module.id as string, module.codigo as string]));
    const effective = new Map<string, { modulo: string; action: RbacAction; scope: RbacScope }>();
    for (const permission of permissions ?? []) {
      const modulo = moduleById.get(permission.module_id as string);
      if (!modulo) continue;
      const action = permission.action as RbacAction;
      const scope = permission.scope as RbacScope;
      const key = `${modulo}:${action}`;
      const current = effective.get(key);
      if (!current || rank[scope] > rank[current.scope]) effective.set(key, { modulo, action, scope });
    }
    return [...effective.values()];
  });

export const listTenantAccessModules = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<TenantAccessModuleView[]> => {
    await authorizeTenantAccessControlOperation(trusted(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("rbac_modules")
      .select("id, codigo, nome, descricao, ordem")
      .order("ordem", { ascending: true });
    if (error) throw new Error("Falha ao listar módulos de acesso.");
    return (data ?? []).map((row: any) => ({
      id: row.id,
      code: row.codigo,
      name: row.nome,
      description: row.descricao ?? null,
      order: row.ordem,
    }));
  });

export const listTenantAccessProfiles = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<TenantAccessProfileView[]> => {
    const { tenantId, actorKind } = await authorizeTenantAccessControlOperation(trusted(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const [{ data: system, error: systemError }, { data: custom, error: customError }, { data: assignments, error: assignmentError }] = await Promise.all([
      admin.from("rbac_profiles").select("id, tenant_id, nome, descricao, codigo, sistema").eq("sistema", true).order("nome"),
      admin.from("rbac_profiles").select("id, tenant_id, nome, descricao, codigo, sistema").eq("sistema", false).eq("tenant_id", tenantId).order("nome"),
      admin.from("user_profiles").select("profile_id").eq("tenant_id", tenantId),
    ]);
    if (systemError || customError || assignmentError) throw new Error("Falha ao listar perfis de acesso.");
    const counts = new Map<string, number>();
    for (const row of assignments ?? []) counts.set(row.profile_id, (counts.get(row.profile_id) ?? 0) + 1);
    return [...(system ?? []), ...(custom ?? [])].map((row: any) => ({
      ...row,
      total_usuarios: counts.get(row.id) ?? 0,
      can_edit: row.sistema === false,
      can_delete: row.sistema === false && (counts.get(row.id) ?? 0) === 0 && actorKind !== "delegated" ? true : row.sistema === false && (counts.get(row.id) ?? 0) === 0,
    }));
  });

export const getTenantAccessProfile = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: uuid }).strict())
  .handler(async ({ context, data }) => {
    const { tenantId } = await authorizeTenantAccessControlOperation(trusted(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: profile, error: profileError } = await admin
      .from("rbac_profiles")
      .select("id, tenant_id, nome, descricao, codigo, sistema")
      .eq("id", data.id)
      .maybeSingle();
    if (profileError || !profile || (!profile.sistema && profile.tenant_id !== tenantId)) {
      throw new Error("Perfil não encontrado neste tenant.");
    }
    const { data: permissions, error: permissionsError } = await admin
      .from("rbac_permissions")
      .select("profile_id, module_id, action, scope")
      .eq("profile_id", data.id);
    if (permissionsError) throw new Error("Falha ao carregar permissões do perfil.");
    return { perfil: profile as TenantAccessProfileView, permissoes: (permissions ?? []) as TenantPermissionView[] };
  });

const profileMutationSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(500).optional().nullable(),
}).strict();

export const saveTenantAccessProfile = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(profileMutationSchema)
  .handler(async ({ context, data }) => {
    const tenantId = tenantIdFrom(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "mutate_tenant_access_profile" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _operation: data.id ? "update" : "create",
        _profile_id: data.id ?? null,
        _name: data.nome,
        _description: data.descricao ?? null,
      } as never,
    );
    if (error) throw safeTenantAccessError(error);
    const row = asRecord(raw);
    return { id: requireString(row, "profileId"), tenant_id: requireString(row, "tenantId"), changed: requireBoolean(row, "changed") };
  });

export const deleteTenantAccessProfile = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: uuid }).strict())
  .handler(async ({ context, data }) => {
    const tenantId = tenantIdFrom(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "mutate_tenant_access_profile" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _operation: "delete",
        _profile_id: data.id,
        _name: null,
        _description: null,
      } as never,
    );
    if (error) throw safeTenantAccessError(error);
    return { ok: requireBoolean(asRecord(raw), "changed") };
  });

const permissionMutationSchema = z.object({
  profile_id: uuid,
  module_id: uuid,
  action: actionSchema,
  scope: scopeSchema,
  enabled: z.boolean(),
}).strict();

export const setTenantProfilePermission = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(permissionMutationSchema)
  .handler(async ({ context, data }) => {
    const tenantId = tenantIdFrom(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "set_tenant_profile_permission" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _profile_id: data.profile_id,
        _module_id: data.module_id,
        _action: data.action,
        _scope: data.scope,
        _enabled: data.enabled,
      } as never,
    );
    if (error) throw safeTenantAccessError(error);
    return { ok: requireBoolean(asRecord(raw), "changed") };
  });

export const setTenantMemberProfiles = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ user_id: uuid, profile_ids: z.array(uuid).max(50) }).strict())
  .handler(async ({ context, data }) => {
    const tenantId = tenantIdFrom(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "set_tenant_member_profiles" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _target_user_id: data.user_id,
        _profile_ids: [...new Set(data.profile_ids)],
      } as never,
    );
    if (error) throw safeTenantAccessError(error);
    return { ok: requireBoolean(asRecord(raw), "changed") };
  });

export const listTenantMemberProfiles = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const { tenantId } = await authorizeTenantAccessControlOperation(trusted(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: assignments, error } = await admin
      .from("user_profiles")
      .select("tenant_id, user_id, profile_id")
      .eq("tenant_id", tenantId);
    if (error) throw new Error("Falha ao listar associações de perfis.");
    const profileIds = [...new Set((assignments ?? []).map((row: any) => row.profile_id as string))];
    const { data: profiles, error: profileError } = profileIds.length
      ? await admin.from("rbac_profiles").select("id, tenant_id, nome, sistema, codigo").in("id", profileIds)
      : { data: [], error: null };
    if (profileError) throw new Error("Falha ao carregar perfis associados.");
    const byId = new Map((profiles ?? []).map((profile: any) => [profile.id as string, profile]));
    return (assignments ?? []).map((row: any) => ({
      tenant_id: row.tenant_id,
      user_id: row.user_id,
      profile_id: row.profile_id,
      rbac_profiles: byId.get(row.profile_id) ?? null,
    }));
  });

export const listTenantTeams = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<TenantTeamView[]> => {
    const { tenantId } = await authorizeTenantAccessControlOperation(trusted(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const [{ data: teams, error: teamError }, { data: members, error: memberError }] = await Promise.all([
      admin.from("teams").select("id, tenant_id, nome, descricao, lider_user_id, ativo").eq("tenant_id", tenantId).order("nome"),
      admin.from("team_members").select("team_id, user_id").eq("tenant_id", tenantId),
    ]);
    if (teamError || memberError) throw new Error("Falha ao listar equipes.");
    const byTeam = new Map<string, Array<{ user_id: string }>>();
    for (const member of members ?? []) {
      const list = byTeam.get(member.team_id) ?? [];
      list.push({ user_id: member.user_id });
      byTeam.set(member.team_id, list);
    }
    return (teams ?? []).map((team: any) => ({
      ...team,
      total_membros: byTeam.get(team.id)?.length ?? 0,
      team_members: byTeam.get(team.id) ?? [],
    }));
  });

export const getTenantTeam = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: uuid }).strict())
  .handler(async ({ context, data }) => {
    const { tenantId } = await authorizeTenantAccessControlOperation(trusted(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: team, error } = await admin
      .from("teams")
      .select("id, tenant_id, nome, descricao, lider_user_id, ativo")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !team) throw new Error("Equipe não encontrada neste tenant.");
    const { data: members, error: memberError } = await admin
      .from("team_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("team_id", data.id);
    if (memberError) throw new Error("Falha ao carregar membros da equipe.");
    return { ...team, team_members: members ?? [] } as TenantTeamView;
  });

const teamMutationSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(500).optional().nullable(),
  lider_user_id: uuid.optional().nullable(),
  ativo: z.boolean().optional().default(true),
  member_ids: z.array(uuid).max(500).optional().default([]),
}).strict();

export const saveTenantTeam = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(teamMutationSchema)
  .handler(async ({ context, data }) => {
    const tenantId = tenantIdFrom(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "mutate_tenant_team" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _operation: data.id ? "update" : "create",
        _team_id: data.id ?? null,
        _name: data.nome,
        _description: data.descricao ?? null,
        _leader_user_id: data.lider_user_id ?? null,
        _active: data.ativo,
        _member_ids: [...new Set(data.member_ids)],
      } as never,
    );
    if (error) throw safeTenantAccessError(error);
    const row = asRecord(raw);
    return { id: requireString(row, "teamId"), changed: requireBoolean(row, "changed") };
  });

export const deleteTenantTeam = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: uuid }).strict())
  .handler(async ({ context, data }) => {
    const tenantId = tenantIdFrom(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "mutate_tenant_team" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _operation: "delete",
        _team_id: data.id,
        _name: null,
        _description: null,
        _leader_user_id: null,
        _active: false,
        _member_ids: [],
      } as never,
    );
    if (error) throw safeTenantAccessError(error);
    return { ok: requireBoolean(asRecord(raw), "changed") };
  });

export const listTenantAccessAudit = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ limit: z.number().int().positive().max(500).optional() }).optional())
  .handler(async ({ context, data }) => {
    const { tenantId } = await authorizeTenantAccessControlOperation(trusted(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("audit_log")
      .select("id, tenant_id, user_id, user_email, action, entity, entity_id, before, after, created_at")
      .eq("tenant_id", tenantId)
      .like("action", "tenant_access.%")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 200);
    if (error) throw new Error("Falha ao listar auditoria de acesso.");
    return rows ?? [];
  });

// Compatibility exports. All active consumers keep their historical import
// names while executing the canonical tenant-scoped boundaries above.
export const meusModulos = getMyEffectiveTenantPermissions;
export const listarModulos = listTenantAccessModules;
export const listarPerfis = listTenantAccessProfiles;
export const obterPerfilComPermissoes = getTenantAccessProfile;
export const salvarPerfil = saveTenantAccessProfile;
export const excluirPerfil = deleteTenantAccessProfile;
export const togglePermissao = setTenantProfilePermission;
export const atualizarEscopo = setTenantProfilePermission;
export const setUserPerfis = setTenantMemberProfiles;
export const setUserPerfisCustom = setTenantMemberProfiles;
export const listarPerfisPorUsuario = listTenantMemberProfiles;
export const listarEquipes = listTenantTeams;
export const obterEquipe = getTenantTeam;
export const salvarEquipe = saveTenantTeam;
export const excluirEquipe = deleteTenantTeam;
export const listarAuditoria = listTenantAccessAudit;

export const meuAcessoAdmin = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const tenantId = tenantIdFrom(context);
    if (context.tenant.isSuperAdmin) return true;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("tenant_members")
      .select("membership_status")
      .eq("tenant_id", tenantId)
      .eq("user_id", context.userId)
      .maybeSingle();
    return !error && data?.membership_status === "active";
  });

export const adminListarPapeisPorUsuario = listTenantMemberProfiles;

export const adminDefinirPerfilUsuario = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ user_id: uuid, profile_id: uuid }).strict())
  .handler(async ({ context, data }) => {
    const tenantId = tenantIdFrom(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "set_tenant_member_profiles" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _target_user_id: data.user_id,
        _profile_ids: [data.profile_id],
      } as never,
    );
    if (error) throw safeTenantAccessError(error);
    return { ok: requireBoolean(asRecord(raw), "changed") };
  });

const retiredPasswordFlowMessage =
  "Fluxo legado removido. Convide o membro em Membros do tenant e associe perfis pelo Controle de Acesso.";

export const adminCriarUsuarioComLogin = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.unknown())
  .handler(async () => {
    throw new Error(retiredPasswordFlowMessage);
  });

export const adminAtualizarPapeis = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.unknown())
  .handler(async () => {
    throw new Error(retiredPasswordFlowMessage);
  });

export const adminAlterarSenhaUsuario = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.unknown())
  .handler(async () => {
    throw new Error("Alteração administrativa de senha foi removida da superfície tenant-scoped.");
  });
