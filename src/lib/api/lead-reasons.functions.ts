import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado: requer administrador.");
}

const Kind = z.enum(["discard", "lost"]);
type Reason = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  padrao: boolean;
};

function tableFor(kind: "discard" | "lost") {
  return kind === "discard" ? "lead_discard_reasons" : "deal_lost_reasons";
}

export const listarMotivos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ kind: Kind, apenasAtivos: z.boolean().optional() }).parse(i))
  .handler(async ({ data, context }): Promise<Reason[]> => {
    let q = context.supabase
      .from(tableFor(data.kind))
      .select("id, nome, descricao, ativo, ordem, padrao")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (data.apenasAtivos) q = q.eq("ativo", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Reason[];
  });

export const criarMotivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      kind: Kind,
      nome: z.string().min(2).max(80),
      descricao: z.string().max(400).optional().nullable(),
      ordem: z.number().int().optional(),
      ativo: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from(tableFor(data.kind)).insert({
      nome: data.nome.trim(),
      descricao: data.descricao ?? null,
      ordem: data.ordem ?? 100,
      ativo: data.ativo ?? true,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarMotivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      kind: Kind,
      id: z.string().uuid(),
      nome: z.string().min(2).max(80).optional(),
      descricao: z.string().max(400).nullable().optional(),
      ativo: z.boolean().optional(),
      ordem: z.number().int().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, kind, ...rest } = data;
    const { error } = await context.supabase.from(tableFor(kind)).update(rest as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirMotivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ kind: Kind, id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from(tableFor(data.kind)).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
