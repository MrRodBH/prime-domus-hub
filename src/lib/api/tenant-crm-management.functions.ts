import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant, type TenantContext } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCrmOperation,
  safeTenantCrmError,
  trustedTenantCrmContext,
} from "@/lib/api/tenant-crm-authority.server";

export type CrmTagDto = {
  id: string;
  tagKey: string;
  name: string;
  active: boolean;
};

export type CrmPipelineStateResult = {
  ok: true;
  id: string;
  active: boolean;
  version: number;
};

export type CrmTagCreateResult = {
  ok: true;
  id: string;
  tagKey: string;
  name: string;
};

type RuntimeContext = { userId: string; tenant: TenantContext };

function asObject(value: unknown, label: string): Record<string, unknown> {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error(`crm_non_serializable:${label}`);
  const parsed: unknown = JSON.parse(serialized);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`crm_invalid_object:${label}`);
  }
  return parsed as Record<string, unknown>;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`crm_invalid_string:${label}`);
  }
  return value;
}

function numberValue(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`crm_invalid_number:${label}`);
  }
  return value;
}

async function execute(
  context: RuntimeContext,
  operation: "pipeline.manage" | "tag.manage",
  rpcName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const decision = await authorizeTenantCrmOperation(
    trustedTenantCrmContext(context),
    operation,
  );
  if (decision.scope !== "global") throw new Error("crm_scope_denied");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc(rpcName, {
    _actor_user_id: decision.actorUserId,
    _tenant_id: decision.tenantId,
    _tenant_origin: context.tenant.origin,
    ...args,
  });
  if (error) throw safeTenantCrmError(error);
  return asObject(data, rpcName);
}

export const listTenantCrmTags = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<CrmTagDto[]> => {
    const decision = await authorizeTenantCrmOperation(
      trustedTenantCrmContext(context),
      "tag.list",
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("crm_tags")
      .select("id, tag_key, nome, ativo")
      .eq("tenant_id", decision.tenantId)
      .eq("ativo", true)
      .order("nome", { ascending: true });
    if (error) throw safeTenantCrmError(error);
    return (Array.isArray(data) ? data : []).map((row: unknown, index: number) => {
      const value = asObject(row, `tags.${index}`);
      return {
        id: stringValue(value.id, `tags.${index}.id`),
        tagKey: stringValue(value.tag_key, `tags.${index}.tag_key`),
        name: stringValue(value.nome, `tags.${index}.nome`),
        active: value.ativo === true,
      };
    });
  });

export const createTenantCrmTag = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({
    tagKey: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/),
    name: z.string().trim().min(1).max(120),
    idempotencyKey: z.string().min(8).max(200),
  }).strict().parse(input))
  .handler(async ({ data, context }): Promise<CrmTagCreateResult> => {
    const raw = await execute(context, "tag.manage", "create_tenant_crm_tag", {
      _tag_key: data.tagKey,
      _nome: data.name,
      _idempotency_key: data.idempotencyKey,
    });
    if (raw.ok !== true) throw new Error("crm_invalid_mutation_result");
    return {
      ok: true,
      id: stringValue(raw.id, "tag.id"),
      tagKey: stringValue(raw.tagKey, "tag.tagKey"),
      name: stringValue(raw.name, "tag.name"),
    };
  });

export const setTenantCrmPipelineState = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({
    pipelineId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    active: z.boolean(),
    idempotencyKey: z.string().min(8).max(200),
  }).strict().parse(input))
  .handler(async ({ data, context }): Promise<CrmPipelineStateResult> => {
    const raw = await execute(context, "pipeline.manage", "set_tenant_crm_pipeline_state", {
      _pipeline_id: data.pipelineId,
      _expected_version: data.expectedVersion,
      _active: data.active,
      _idempotency_key: data.idempotencyKey,
    });
    if (raw.ok !== true) throw new Error("crm_invalid_mutation_result");
    return {
      ok: true,
      id: stringValue(raw.id, "pipeline.id"),
      active: raw.active === true,
      version: numberValue(raw.version, "pipeline.version"),
    };
  });
