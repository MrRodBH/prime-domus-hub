import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCrmOperation,
  safeTenantCrmError,
  trustedTenantCrmContext,
} from "@/lib/api/tenant-crm-authority.server";

async function authorizeOriginRead(context: Parameters<typeof trustedTenantCrmContext>[0]) {
  return authorizeTenantCrmOperation(trustedTenantCrmContext(context), "lead.read");
}

async function authorizeOriginMutation(context: Parameters<typeof trustedTenantCrmContext>[0]) {
  const decision = await authorizeTenantCrmOperation(
    trustedTenantCrmContext(context),
    "pipeline.manage",
  );
  if (decision.scope !== "global") throw new Error("crm_scope_denied");
  return decision;
}

export const listarOrigens = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const decision = await authorizeOriginRead(context);
    const { data, error } = await context.supabase
      .from("lead_origens")
      .select("id, nome, descricao, cor, ativo, ordem")
      .eq("tenant_id", decision.tenantId)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (error) throw safeTenantCrmError(error);
    return data ?? [];
  });

const origemSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2, "Nome muito curto").max(60),
  descricao: z.string().max(300).optional().nullable(),
  cor: z.string().max(20).optional().nullable(),
  ativo: z.boolean().default(true),
  ordem: z.number().int().default(0),
}).strict();

export const salvarOrigem = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => origemSchema.parse(input))
  .handler(async ({ data, context }) => {
    const decision = await authorizeOriginMutation(context);
    const { id, ...fields } = data;
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("lead_origens")
        .update(fields as never)
        .eq("tenant_id", decision.tenantId)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw safeTenantCrmError(error);
      if (!updated) throw new Error("crm_cross_tenant_reference");
      return { ok: true, id };
    }
    const { data: row, error } = await context.supabase
      .from("lead_origens")
      .insert({ ...fields, tenant_id: decision.tenantId } as never)
      .select("id")
      .single();
    if (error) throw safeTenantCrmError(error);
    return { ok: true, id: (row as { id: string }).id };
  });

export const excluirOrigem = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const decision = await authorizeOriginMutation(context);
    const { data: deleted, error } = await context.supabase
      .from("lead_origens")
      .delete()
      .eq("tenant_id", decision.tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw safeTenantCrmError(error);
    if (!deleted) throw new Error("crm_cross_tenant_reference");
    return { ok: true };
  });
