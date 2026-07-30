import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCrmOperation,
  safeTenantCrmError,
  trustedTenantCrmContext,
} from "@/lib/api/tenant-crm-authority.server";

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

async function authorizeReasonRead(context: Parameters<typeof trustedTenantCrmContext>[0]) {
  return authorizeTenantCrmOperation(trustedTenantCrmContext(context), "lead.read");
}

async function authorizeReasonMutation(context: Parameters<typeof trustedTenantCrmContext>[0]) {
  const decision = await authorizeTenantCrmOperation(
    trustedTenantCrmContext(context),
    "pipeline.manage",
  );
  if (decision.scope !== "global") throw new Error("crm_scope_denied");
  return decision;
}

export const listarMotivos = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ kind: Kind, apenasAtivos: z.boolean().optional() }).strict().parse(input),
  )
  .handler(async ({ data, context }): Promise<Reason[]> => {
    const decision = await authorizeReasonRead(context);
    let query = context.supabase
      .from(tableFor(data.kind))
      .select("id, nome, descricao, ativo, ordem, padrao")
      .eq("tenant_id", decision.tenantId)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (data.apenasAtivos) query = query.eq("ativo", true);
    const { data: rows, error } = await query;
    if (error) throw safeTenantCrmError(error);
    return (rows ?? []) as Reason[];
  });

export const criarMotivo = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      kind: Kind,
      nome: z.string().trim().min(2).max(80),
      descricao: z.string().max(400).optional().nullable(),
      ordem: z.number().int().optional(),
      ativo: z.boolean().optional(),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const decision = await authorizeReasonMutation(context);
    const { error } = await context.supabase.from(tableFor(data.kind)).insert({
      tenant_id: decision.tenantId,
      nome: data.nome,
      descricao: data.descricao ?? null,
      ordem: data.ordem ?? 100,
      ativo: data.ativo ?? true,
    } as never);
    if (error) throw safeTenantCrmError(error);
    return { ok: true };
  });

export const atualizarMotivo = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      kind: Kind,
      id: z.string().uuid(),
      nome: z.string().trim().min(2).max(80).optional(),
      descricao: z.string().max(400).nullable().optional(),
      ativo: z.boolean().optional(),
      ordem: z.number().int().optional(),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const decision = await authorizeReasonMutation(context);
    const { id, kind, ...rest } = data;
    const { data: updated, error } = await context.supabase
      .from(tableFor(kind))
      .update(rest as never)
      .eq("tenant_id", decision.tenantId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw safeTenantCrmError(error);
    if (!updated) throw new Error("crm_cross_tenant_reference");
    return { ok: true };
  });

export const excluirMotivo = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ kind: Kind, id: z.string().uuid() }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const decision = await authorizeReasonMutation(context);
    const { data: deleted, error } = await context.supabase
      .from(tableFor(data.kind))
      .delete()
      .eq("tenant_id", decision.tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw safeTenantCrmError(error);
    if (!deleted) throw new Error("crm_cross_tenant_reference");
    return { ok: true };
  });
