import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { authorizeTenantMarketingOperation } from "@/lib/api/tenant-marketing-authority.server";

const targetSchema = z.object({
  imovel_id: z.string().uuid().optional(),
  launch_project_id: z.string().uuid().optional(),
}).refine((value) => Boolean(value.imovel_id) !== Boolean(value.launch_project_id), {
  message: "Informe imovel_id OU launch_project_id.",
});

async function authorize(context: Parameters<typeof authorizeTenantMarketingOperation>[0], operation: "view" | "configure") {
  return authorizeTenantMarketingOperation(context, operation);
}

async function requireTarget(context: any, tenantId: string, input: z.infer<typeof targetSchema>) {
  const table = input.imovel_id ? "imoveis" : "launch_projects";
  const id = input.imovel_id ?? input.launch_project_id!;
  const { data, error } = await context.supabase
    .from(table)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .limit(2);
  if (error) throw new Error(error.message);
  if ((data ?? []).length !== 1) throw new Error("instagram_target_cross_tenant_or_missing");
  return id;
}

const generateInput = targetSchema.and(z.object({
  tom: z.enum(["sofisticado", "objetivo", "acolhedor"]).default("sofisticado"),
  formato: z.enum(["feed", "story", "reels"]).default("feed"),
}).strict());

/** External social-copy generation has no factual provider adapter in PR-M2. */
export const igGerarPost = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => generateInput.parse(input))
  .handler(async ({ data, context }) => {
    const decision = await authorize(context, "configure");
    await requireTarget(context, decision.tenantId, data);
    throw new Error("instagram_copy_ai_adapter_not_implemented");
  });

const saveInput = targetSchema.and(z.object({
  id: z.string().uuid().optional(),
  legenda: z.string().max(10000),
  hashtags: z.string().max(3000),
  imagem_ids: z.array(z.string().uuid()).max(20).default([]),
  status: z.enum(["rascunho", "aprovado", "publicado"]).default("rascunho"),
  modelo_ia: z.string().max(200).optional().nullable(),
}).strict()).refine((value) => Boolean(value.id) || Boolean(value.imovel_id) !== Boolean(value.launch_project_id), {
  message: "Informe imovel_id OU launch_project_id para novo post.",
});

export const igSalvarPost = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => saveInput.parse(input))
  .handler(async ({ data, context }) => {
    const decision = await authorize(context, "configure");
    if (!data.id) await requireTarget(context, decision.tenantId, data);
    const payload = {
      legenda: data.legenda,
      hashtags: data.hashtags,
      imagem_ids: data.imagem_ids,
      status: data.status,
      modelo_ia: data.modelo_ia ?? null,
      publicado_em: data.status === "publicado" ? new Date().toISOString() : null,
    };
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("instagram_posts")
        .update(payload as never)
        .eq("tenant_id", decision.tenantId)
        .eq("id", data.id)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!updated) throw new Error("instagram_post_cross_tenant_or_missing");
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("instagram_posts")
      .insert({
        ...payload,
        tenant_id: decision.tenantId,
        imovel_id: data.imovel_id ?? null,
        launch_project_id: data.launch_project_id ?? null,
        created_by: decision.actorUserId,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const igListarPosts = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => targetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const decision = await authorize(context, "view");
    await requireTarget(context, decision.tenantId, data);
    let query = context.supabase
      .from("instagram_posts")
      .select("id, imovel_id, launch_project_id, legenda, hashtags, imagem_ids, status, modelo_ia, publicado_em, created_at, updated_at")
      .eq("tenant_id", decision.tenantId)
      .order("created_at", { ascending: false });
    query = data.imovel_id
      ? query.eq("imovel_id", data.imovel_id)
      : query.eq("launch_project_id", data.launch_project_id!);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const igExcluirPost = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const decision = await authorize(context, "configure");
    const { data: deleted, error } = await context.supabase
      .from("instagram_posts")
      .delete()
      .eq("tenant_id", decision.tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deleted) throw new Error("instagram_post_cross_tenant_or_missing");
    return { ok: true };
  });
