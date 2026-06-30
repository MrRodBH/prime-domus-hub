import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function canManage(context: any): Promise<boolean> {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (isAdmin) return true;
  const { data: scope } = await context.supabase.rpc("has_permission", {
    _user_id: context.userId,
    _module_codigo: "lead_origens",
    _action: "gerenciar",
  });
  return !!scope;
}

export const listarOrigens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lead_origens")
      .select("*")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const origemSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2, "Nome muito curto").max(60),
  descricao: z.string().max(300).optional().nullable(),
  cor: z.string().max(20).optional().nullable(),
  ativo: z.boolean().default(true),
  ordem: z.number().int().default(0),
});

export const salvarOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(origemSchema)
  .handler(async ({ data, context }) => {
    if (!(await canManage(context))) throw new Error("Acesso negado.");
    if (data.id) {
      const { error } = await context.supabase
        .from("lead_origens")
        .update(data as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("lead_origens")
      .insert(data as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as { id: string }).id };
  });

export const excluirOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    if (!(await canManage(context))) throw new Error("Acesso negado.");
    const { error } = await context.supabase
      .from("lead_origens")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
