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
