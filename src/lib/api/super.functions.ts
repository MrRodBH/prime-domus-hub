import { operationalTenantIds } from "./operational-tenants.server";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super_admin only");
}

// Backward-compatible export without preserving the former direct INSERT path.
// The only tenant creation authority is the atomic lifecycle boundary.
export { bootstrapTenantWithOwner as criarTenant } from "@/lib/api/tenant-lifecycle.functions";

export const meuAcessoSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "super_admin")
      .maybeSingle();
    return !!data;
  });

export const listarTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const operationalIds = await operationalTenantIds(supabaseAdmin);
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, nome, status, dominio_principal, plano_codigo, owner_user_id, metadata, created_at").in("id", operationalIds)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const atualizarSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(2).optional(),
  status: z.enum(["ativo", "suspenso", "cancelado", "trial"]).optional(),
  dominio_principal: z.string().min(3).nullable().optional(),
  plano_codigo: z.string().nullable().optional(),
});

export const atualizarTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => atualizarSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const operationalIds = await operationalTenantIds(supabaseAdmin);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("tenants").update(patch).eq("id", id).in("id", operationalIds);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const estatisticasTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const operationalIds = await operationalTenantIds(supabaseAdmin);
    const [members, imoveis, leads] = await Promise.all([
      supabaseAdmin.from("tenant_members").select("tenant_id", { count: "exact", head: false }).in("tenant_id", operationalIds),
      supabaseAdmin.from("imoveis").select("tenant_id", { count: "exact", head: false }).in("tenant_id", operationalIds),
      supabaseAdmin.from("leads").select("tenant_id", { count: "exact", head: false }).in("tenant_id", operationalIds),
    ]);
    for (const result of [members, imoveis, leads]) if (result.error) throw new Error("Não foi possível carregar os indicadores das empresas.");
    const agg: Record<string, { users: number; imoveis: number; leads: number }> = {};
    const bump = (t: string, k: "users" | "imoveis" | "leads") => {
      if (!agg[t]) agg[t] = { users: 0, imoveis: 0, leads: 0 };
      agg[t][k] += 1;
    };
    (members.data ?? []).forEach((r: any) => bump(r.tenant_id, "users"));
    (imoveis.data ?? []).forEach((r: any) => bump(r.tenant_id, "imoveis"));
    (leads.data ?? []).forEach((r: any) => bump(r.tenant_id, "leads"));
    return agg;
  });

export const superKpisGlobais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const operationalIds = await operationalTenantIds(supabaseAdmin);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      tenants, tenantsAtivos, users, imoveis, leads,
      leads24h, portalErr7d, portalOk7d, auditoria24h,
    ] = await Promise.all([
      supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }).in("id", operationalIds),
      supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }).in("id", operationalIds).eq("status", "ativo"),
      supabaseAdmin.from("tenant_members").select("user_id", { count: "exact", head: true }).in("tenant_id", operationalIds),
      supabaseAdmin.from("imoveis").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds).gte("created_at", since24h),
      supabaseAdmin.from("portal_sync_logs").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds).eq("status", "erro").gte("created_at", since7d),
      supabaseAdmin.from("portal_sync_logs").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds).eq("status", "ok").gte("created_at", since7d),
      supabaseAdmin.from("audit_log").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds).gte("created_at", since24h),
    ]);

    for (const result of [tenants, tenantsAtivos, users, imoveis, leads, leads24h, portalErr7d, portalOk7d, auditoria24h]) {
      if (result.error) throw new Error("Não foi possível carregar os indicadores operacionais.");
    }
    return {
      tenants: tenants.count ?? 0,
      tenantsAtivos: tenantsAtivos.count ?? 0,
      users: users.count ?? 0,
      imoveis: imoveis.count ?? 0,
      leads: leads.count ?? 0,
      leads24h: leads24h.count ?? 0,
      portalOk7d: portalOk7d.count ?? 0,
      portalErr7d: portalErr7d.count ?? 0,
      auditoria24h: auditoria24h.count ?? 0,
      mrrPending: true,
    };
  });

const obsSchema = z.object({ hours: z.number().int().min(1).max(720).optional() });
export const superObservabilidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => obsSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: json, error } = await context.supabase.rpc("super_observabilidade", {
      _hours: data.hours ?? 24,
    });
    if (error) throw new Error(error.message);
    return json as any;
  });

const dlqListSchema = z.object({
  status: z.enum(["pendente", "em_retry", "resolvido", "abandonado", "todos"]).optional().default("todos"),
  portal: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(200).optional().default(100),
});

export const superListarDlq = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dlqListSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("portal_sync_dlq").select("id,tenant_id,portal_slug,acao,erro,tentativas,status,proxima_tentativa_at,created_at,updated_at,resolvido_at,ultimo_erro_at").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status !== "todos") q = q.eq("status", data.status);
    if (data.portal) q = q.eq("portal_slug", data.portal);

    const operationalIds = await operationalTenantIds(supabaseAdmin);
    q = q.in("tenant_id", operationalIds);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    type JsonV = string | number | boolean | null | JsonV[] | { [k: string]: JsonV };
    return JSON.parse(JSON.stringify(rows ?? [])) as Array<{
      id: string; tenant_id: string | null; portal_slug: string; acao: string;
      erro: string | null; tentativas: number; status: string;
      proxima_tentativa_at: string; created_at: string; updated_at: string;
      resolvido_at: string | null; ultimo_erro_at: string | null;

    }>;
  });

const dlqIdSchema = z.object({ id: z.string().uuid() });

export const superResolverDlq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dlqIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const operationalIds = await operationalTenantIds(supabaseAdmin);
    const { data: item, error } = await supabaseAdmin.from("portal_sync_dlq")
      .update({ status: "resolvido", resolvido_at: new Date().toISOString() })
      .eq("id", data.id).in("tenant_id", operationalIds).select("id").maybeSingle();
    if (error || !item) throw Error("Não foi possível resolver esta falha no escopo da plataforma.");
    return { ok: true };
  });

// Global account administration. Never enters a tenant context or accepts a role from the client.
export const superListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ page: z.number().int().min(1).default(1) }).strict().parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.auth.admin.listUsers({ page: data.page, perPage: 50 });
    if (result.error) throw Error("Não foi possível carregar os usuários da plataforma.");
    const users = result.data.users;
    const roles = users.length ? await supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", users.map(u => u.id)) : { data: [], error: null };
    if (roles.error) throw Error("Não foi possível confirmar os papéis dos usuários.");
    return {
      users: users.map(u => ({ id: u.id, email: u.email ?? "", roles: (roles.data ?? []).filter(r => r.user_id === u.id).map(r => r.role) })),
      hasNext: Boolean(result.data.nextPage), currentUserId: context.userId,
    };
  });

export const superDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), confirmationEmail: z.string().min(1).max(320) }).strict().parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (target.error || !target.data.user || (target.data.user.email || target.data.user.id).toLowerCase() !== data.confirmationEmail.toLowerCase())
      throw Error("Confirme o e-mail da conta selecionada antes de excluir.");
    // All account roles are eligible, including Super Admin. Provider integrity errors
    // must remain visible; never drop tenant data or transfer ownership to force deletion.
    const result = await supabaseAdmin.auth.admin.deleteUser(data.userId, false);
    if (result.error) {
      console.error(JSON.stringify({ event: "platform_user_delete_failed", actor: context.userId, target: data.userId, code: result.error.code }));
      throw Error("A exclusão não foi concluída. Existem vínculos que precisam ser tratados na gestão da plataforma; nenhum dado do tenant será apagado automaticamente.");
    }
    console.info(JSON.stringify({ event: "platform_user_deleted", actor: context.userId, target: data.userId }));
    return { deleted: true, self: data.userId === context.userId };
  });
