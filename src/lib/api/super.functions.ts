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
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, nome, status, dominio_principal, plano_codigo, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const criarSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "slug: apenas a-z 0-9 e -"),
  nome: z.string().min(2),
  dominio_principal: z.string().min(3).optional().nullable(),
});

export const criarTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => criarSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("tenants")
      .insert({
        slug: data.slug,
        nome: data.nome,
        status: "trial",
        dominio_principal: data.dominio_principal ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
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
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("tenants").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const estatisticasTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [members, imoveis, leads] = await Promise.all([
      supabaseAdmin.from("tenant_members").select("tenant_id", { count: "exact", head: false }),
      supabaseAdmin.from("imoveis").select("tenant_id", { count: "exact", head: false }),
      supabaseAdmin.from("leads").select("tenant_id", { count: "exact", head: false }),
    ]);
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
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      tenants, tenantsAtivos, users, imoveis, leads,
      leads24h, portalErr7d, portalOk7d, auditoria24h,
    ] = await Promise.all([
      supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      supabaseAdmin.from("tenant_members").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("imoveis").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      supabaseAdmin.from("portal_sync_logs").select("id", { count: "exact", head: true }).eq("status", "erro").gte("created_at", since7d),
      supabaseAdmin.from("portal_sync_logs").select("id", { count: "exact", head: true }).eq("status", "ok").gte("created_at", since7d),
      supabaseAdmin.from("audit_log").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    ]);

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
      mrrPending: true, // ⚠️ requer schema de billing (Fase futura)
    };
  });
