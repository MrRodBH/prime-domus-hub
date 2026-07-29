import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  listTenantLeads,
  listTenantLeadAssignees,
  listTenantLeadProperties,
  type ManualLeadResult,
} from "@/lib/api/tenant-crm.functions";
import {
  authorizeTenantCrmOperation,
  safeTenantCrmError,
  trustedTenantCrmContext,
} from "@/lib/api/tenant-crm-authority.server";

export const adminListarLeads = listTenantLeads;
export const adminListarLeadAssignees = listTenantLeadAssignees;
export const adminListarImoveisLite = listTenantLeadProperties;

const manualLeadResultSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  status: z.literal("novo"),
  version: z.number().int().positive(),
  assignedTo: z.string().uuid().nullable(),
  corretorId: z.string().uuid().nullable(),
  imovelId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
}).strict();

const mutationResultSchema = z.object({
  ok: z.literal(true),
  id: z.string().uuid(),
  version: z.number().int().positive(),
  qualificationKey: z.string().optional(),
}).passthrough();

async function crmRpc(
  context: { userId: string; tenant: Parameters<typeof trustedTenantCrmContext>[0]["tenant"] },
  operation: Parameters<typeof authorizeTenantCrmOperation>[1],
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const decision = await authorizeTenantCrmOperation(trustedTenantCrmContext(context), operation);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc(name, {
    _actor_user_id: decision.actorUserId,
    _tenant_id: decision.tenantId,
    _tenant_origin: context.tenant.origin,
    ...args,
  });
  if (error) throw safeTenantCrmError(error);
  return data;
}

/**
 * Compatibility mapper for the existing value editor. The legacy component did
 * not expose a revision field. The mapper first loads the scoped aggregate and
 * forwards its exact rowVersion to the canonical OCC primitive. A concurrent
 * change between the read and write is rejected by the primitive.
 */
export const adminAtualizarLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(),
    observacoes: z.string().max(4_000).optional(),
    valor_estimado: z.number().nonnegative().nullable().optional(),
  }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const aggregate = await crmRpc(context, "lead.read", "get_tenant_crm_lead_aggregate", { _lead_id: data.id });
    const aggregateSchema = z.object({ row_version: z.number().int().positive() }).passthrough();
    const current = aggregateSchema.parse(aggregate);
    const patch: Record<string, unknown> = {};
    if (data.observacoes !== undefined) patch.mensagem = data.observacoes;
    if (data.valor_estimado !== undefined) patch.valor_estimado = data.valor_estimado;
    const raw = await crmRpc(context, "lead.update", "update_tenant_crm_lead", {
      _lead_id: data.id,
      _expected_version: current.row_version,
      _patch: patch,
      _idempotency_key: `crm:compat:update:${data.id}:${current.row_version}`,
    });
    return mutationResultSchema.parse(raw);
  });

/**
 * Compatibility mapper for the existing manual-lead dialog. It delegates to
 * the same canonical primitive and never accepts tenant, actor, role or scope.
 * New CRM consumers must call createTenantLead with an explicit idempotency key.
 */
export const criarLeadManual = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({
    nome: z.string().trim().min(2).max(200),
    email: z.string().email().max(254).nullish(),
    telefone: z.string().max(40).nullish(),
    imovel_id: z.string().uuid().nullish(),
    observacoes: z.string().max(4_000).nullish(),
    assigned_to: z.string().uuid().nullish(),
  }).strict().parse(input))
  .handler(async ({ data, context }): Promise<ManualLeadResult> => {
    const raw = await crmRpc(context, "lead.create", "create_tenant_crm_lead", {
      _nome: data.nome,
      _email: data.email ?? null,
      _telefone: data.telefone ?? null,
      _imovel_id: data.imovel_id ?? null,
      _mensagem: data.observacoes ?? null,
      _assigned_to: data.assigned_to ?? null,
      _idempotency_key: crypto.randomUUID(),
    });
    return manualLeadResultSchema.parse(raw);
  });
