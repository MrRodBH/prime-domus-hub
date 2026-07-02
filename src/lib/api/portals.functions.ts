import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureManager(ctx: any) {
  const [{ data: admin }, { data: gerente }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "gerente" }),
  ]);
  if (!admin && !gerente) throw new Error("Acesso negado.");
}

export const listarPortais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("portal_connectors")
      .select("*")
      .order("portal_nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const salvarSchema = z.object({
  id: z.string().uuid(),
  ativo: z.boolean().optional(),
  feed_url: z.string().url().optional().nullable(),
  webhook_url: z.string().url().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

export const atualizarPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => salvarSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureManager(context);
    const patch: Record<string, unknown> = {};
    if (data.ativo !== undefined) {
      patch.ativo = data.ativo;
      patch.status = data.ativo ? "ativo" : "inativo";
    }
    if (data.feed_url !== undefined) patch.feed_url = data.feed_url;
    if (data.webhook_url !== undefined) patch.webhook_url = data.webhook_url;
    if (data.config !== undefined) patch.config = data.config;
    const { error } = await context.supabase
      .from("portal_connectors")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rotacionarToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureManager(context);
    const novo = crypto.randomUUID().replace(/-/g, "");
    const { error } = await context.supabase
      .from("portal_connectors")
      .update({ feed_token: novo } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, token: novo };
  });

export const dashboardPortais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supa = context.supabase;
    const [publicados, pendentes, erros, ativos, leads, porPortal, logs] = await Promise.all([
      supa.from("imovel_portais").select("id", { count: "exact", head: true }).eq("publicado", true),
      supa.from("imovel_portais").select("id", { count: "exact", head: true }).in("status", ["aguardando", "processando"]),
      supa.from("imovel_portais").select("id", { count: "exact", head: true }).eq("status", "erro"),
      supa.from("portal_connectors").select("id", { count: "exact", head: true }).eq("ativo", true),
      supa.from("leads").select("id, origem, created_at").not("origem", "is", null).order("created_at", { ascending: false }).limit(500),
      supa.from("imovel_portais").select("portal_slug, status"),
      supa.from("portal_sync_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    const leadsPorPortal: Record<string, number> = {};
    (leads.data ?? []).forEach((l) => {
      const key = (l.origem ?? "outros").toString().toLowerCase();
      leadsPorPortal[key] = (leadsPorPortal[key] ?? 0) + 1;
    });

    const imoveisPorPortal: Record<string, { publicado: number; erro: number; total: number }> = {};
    (porPortal.data ?? []).forEach((r) => {
      const k = r.portal_slug;
      if (!imoveisPorPortal[k]) imoveisPorPortal[k] = { publicado: 0, erro: 0, total: 0 };
      imoveisPorPortal[k].total++;
      if (r.status === "publicado") imoveisPorPortal[k].publicado++;
      if (r.status === "erro") imoveisPorPortal[k].erro++;
    });

    return {
      kpis: {
        imoveis_publicados: publicados.count ?? 0,
        imoveis_pendentes: pendentes.count ?? 0,
        imoveis_erro: erros.count ?? 0,
        portais_ativos: ativos.count ?? 0,
        leads_total: leads.data?.length ?? 0,
      },
      leadsPorPortal,
      imoveisPorPortal,
      logs: logs.data ?? [],
    };
  });

export const listarLogsPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ portal_slug: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("portal_sync_logs").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.portal_slug) q = q.eq("portal_slug", data.portal_slug);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
