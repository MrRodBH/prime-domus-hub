import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RbacAction =
  | "visualizar" | "criar" | "editar" | "excluir"
  | "exportar" | "importar" | "aprovar" | "gerenciar";
export type RbacScope = "proprio" | "equipe" | "global";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado: requer permissão de administrador.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(ctx: any, action: string, entity?: string, entity_id?: string, before?: unknown, after?: unknown) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(ctx.userId);
    await supabaseAdmin.from("audit_log").insert({
      user_id: ctx.userId,
      user_email: u?.user?.email ?? null,
      action, entity: entity ?? null, entity_id: entity_id ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      before: (before ?? null) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      after: (after ?? null) as any,
    });
  } catch (e) { console.error("audit fail", e); }
}

// ===== Listar minhas permissões e módulos acessíveis =====
export const meusModulos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rbac_permissions")
      .select("scope, action, rbac_modules(codigo), rbac_profiles!inner(id), user_profiles:user_profiles!inner(user_id)" as string)
      .eq("rbac_profiles.user_profiles.user_id", context.userId);
    if (error) {
      // fallback: query manual via RPC-like
      const { data: ups } = await context.supabase.from("user_profiles").select("profile_id").eq("user_id", context.userId);
      const ids = (ups ?? []).map((r: { profile_id: string }) => r.profile_id);
      if (!ids.length) return [] as Array<{ modulo: string; action: RbacAction; scope: RbacScope }>;
      const { data: perms } = await context.supabase
        .from("rbac_permissions")
        .select("action, scope, rbac_modules(codigo)")
        .in("profile_id", ids);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (perms ?? []).map((p: any) => ({ modulo: p.rbac_modules?.codigo, action: p.action, scope: p.scope }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((p: any) => ({ modulo: p.rbac_modules?.codigo, action: p.action, scope: p.scope }));
  });

// ===== MÓDULOS =====
export const listarModulos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("rbac_modules").select("*").order("ordem");
    if (error) throw new Error(error.message);
    return data;
  });

// ===== PERFIS =====
export const listarPerfis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rbac_profiles")
      .select("*, user_profiles(user_id)")
      .order("sistema", { ascending: false })
      .order("nome");
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((p: any) => ({ ...p, total_usuarios: p.user_profiles?.length ?? 0 }));
  });

export const obterPerfilComPermissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { data: perfil, error: e1 } = await context.supabase.from("rbac_profiles").select("*").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const { data: perms, error: e2 } = await context.supabase
      .from("rbac_permissions").select("*").eq("profile_id", data.id);
    if (e2) throw new Error(e2.message);
    return { perfil, permissoes: perms ?? [] };
  });

export const salvarPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid().optional(),
    nome: z.string().min(2),
    descricao: z.string().optional().nullable(),
  }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    if (data.id) {
      const { data: before } = await context.supabase.from("rbac_profiles").select("*").eq("id", data.id).single();
      const { data: row, error } = await context.supabase.from("rbac_profiles")
        .update({ nome: data.nome, descricao: data.descricao }).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      await logAudit(context, "perfil.editar", "rbac_profiles", data.id, before, row);
      return row;
    }
    const { data: row, error } = await context.supabase.from("rbac_profiles")
      .insert({ nome: data.nome, descricao: data.descricao, sistema: false }).select().single();
    if (error) throw new Error(error.message);
    await logAudit(context, "perfil.criar", "rbac_profiles", row.id, null, row);
    return row;
  });

export const excluirPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { data: p } = await context.supabase.from("rbac_profiles").select("*").eq("id", data.id).single();
    if (p?.sistema) throw new Error("Perfil de sistema não pode ser excluído.");
    const { error } = await context.supabase.from("rbac_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, "perfil.excluir", "rbac_profiles", data.id, p, null);
    return { ok: true };
  });

const permissaoSchema = z.object({
  profile_id: z.string().uuid(),
  module_id: z.string().uuid(),
  action: z.enum(["visualizar","criar","editar","excluir","exportar","importar","aprovar","gerenciar","publicar"]),
  scope: z.enum(["proprio","equipe","global"]),
  enabled: z.boolean(),
});
export const togglePermissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(permissaoSchema)
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    if (data.enabled) {
      const { error } = await context.supabase.from("rbac_permissions").upsert({
        profile_id: data.profile_id, module_id: data.module_id, action: data.action, scope: data.scope,
      }, { onConflict: "profile_id,module_id,action" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("rbac_permissions").delete()
        .eq("profile_id", data.profile_id).eq("module_id", data.module_id).eq("action", data.action);
      if (error) throw new Error(error.message);
    }
    await logAudit(context, "permissao.toggle", "rbac_permissions", `${data.profile_id}:${data.module_id}:${data.action}`, null, data);
    return { ok: true };
  });

export const atualizarEscopo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    profile_id: z.string().uuid(), module_id: z.string().uuid(),
    action: z.enum(["visualizar","criar","editar","excluir","exportar","importar","aprovar","gerenciar","publicar"]),
    scope: z.enum(["proprio","equipe","global"]),
  }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("rbac_permissions")
      .update({ scope: data.scope })
      .eq("profile_id", data.profile_id).eq("module_id", data.module_id).eq("action", data.action);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== USUÁRIOS x PERFIS =====
export const setUserPerfis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), profile_ids: z.array(z.string().uuid()) }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    await context.supabase.from("user_profiles").delete().eq("user_id", data.user_id);
    if (data.profile_ids.length) {
      const rows = data.profile_ids.map((pid) => ({ user_id: data.user_id, profile_id: pid }));
      const { error } = await context.supabase.from("user_profiles").insert(rows);
      if (error) throw new Error(error.message);
    }
    await logAudit(context, "usuario.perfis", "user_profiles", data.user_id, null, data.profile_ids);
    return { ok: true };
  });

// Define apenas os perfis CUSTOM (não-sistema) de um usuário, preservando os perfis
// de sistema (admin/corretor/secretaria/gerente/captador), que são sincronizados
// via trigger a partir da tabela user_roles.
export const setUserPerfisCustom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), profile_ids: z.array(z.string().uuid()) }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    // Apenas perfis não-sistema podem ser gerenciados aqui
    const { data: customProfiles } = await context.supabase
      .from("rbac_profiles").select("id").eq("sistema", false);
    const customIds = new Set((customProfiles ?? []).map((p: { id: string }) => p.id));
    const desired = data.profile_ids.filter((id) => customIds.has(id));

    // Remove os custom atuais do usuário
    if (customIds.size) {
      await context.supabase.from("user_profiles")
        .delete().eq("user_id", data.user_id).in("profile_id", Array.from(customIds));
    }
    if (desired.length) {
      const rows = desired.map((pid) => ({ user_id: data.user_id, profile_id: pid }));
      const { error } = await context.supabase.from("user_profiles").insert(rows);
      if (error) throw new Error(error.message);
    }
    await logAudit(context, "usuario.perfis_custom", "user_profiles", data.user_id, null, desired);
    return { ok: true };
  });

// Lista perfis (id, nome, sistema) por usuário — para exibir badges/seletor.
export const listarPerfisPorUsuario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_profiles")
      .select("user_id, rbac_profiles(id, nome, sistema)");
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []) as any[];
  });


// ===== EQUIPES =====
export const listarEquipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("teams")
      .select("*, team_members(user_id)")
      .order("nome");
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((t: any) => ({ ...t, total_membros: t.team_members?.length ?? 0 }));
  });

export const obterEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { data: t, error } = await context.supabase
      .from("teams").select("*, team_members(user_id)").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return t;
  });

export const salvarEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid().optional(),
    nome: z.string().min(2),
    descricao: z.string().optional().nullable(),
    lider_user_id: z.string().uuid().optional().nullable(),
    ativo: z.boolean().optional(),
    member_ids: z.array(z.string().uuid()).optional(),
  }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    let teamId = data.id;
    if (teamId) {
      const { error } = await context.supabase.from("teams")
        .update({ nome: data.nome, descricao: data.descricao, lider_user_id: data.lider_user_id ?? null, ativo: data.ativo ?? true })
        .eq("id", teamId);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await context.supabase.from("teams")
        .insert({ nome: data.nome, descricao: data.descricao, lider_user_id: data.lider_user_id ?? null })
        .select().single();
      if (error) throw new Error(error.message);
      teamId = row.id;
    }
    if (data.member_ids) {
      await context.supabase.from("team_members").delete().eq("team_id", teamId!);
      if (data.member_ids.length) {
        const rows = data.member_ids.map((uid) => ({ team_id: teamId!, user_id: uid }));
        await context.supabase.from("team_members").insert(rows);
      }
    }
    await logAudit(context, data.id ? "equipe.editar" : "equipe.criar", "teams", teamId!, null, data);
    return { id: teamId };
  });

export const excluirEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, "equipe.excluir", "teams", data.id);
    return { ok: true };
  });

// ===== AUDITORIA =====
export const listarAuditoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ limit: z.number().int().positive().max(500).optional() }).optional())
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("audit_log").select("*").order("created_at", { ascending: false }).limit(data?.limit ?? 200);
    if (error) throw new Error(error.message);
    return rows;
  });
