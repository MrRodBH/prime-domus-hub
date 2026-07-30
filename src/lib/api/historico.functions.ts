import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  getTenantLeadAggregateForContext,
  listTenantLeadsForContext,
} from "@/lib/api/tenant-crm.functions";
import {
  authorizeTenantCrmOperation,
  safeTenantCrmError,
  trustedTenantCrmContext,
} from "@/lib/api/tenant-crm-authority.server";

const TIPOS = [
  "ligacao",
  "whatsapp",
  "email",
  "visita",
  "video_chamada",
  "reuniao_presencial",
  "outros",
] as const;
type TipoAtividade = (typeof TIPOS)[number];

const activityInput = z.object({
  lead_id: z.string().uuid(),
  tipo: z.enum(TIPOS),
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(4000),
}).strict();

function activityTypeFromNote(note: string): { tipo: TipoAtividade; descricao: string } {
  const match = /^\[crm-activity:([a-z_]+)\]\s*([\s\S]*)$/.exec(note);
  if (!match || !TIPOS.includes(match[1] as TipoAtividade)) {
    return { tipo: "outros", descricao: note };
  }
  return { tipo: match[1] as TipoAtividade, descricao: match[2] };
}

function stringField(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof row[key] === "string" && row[key]) return row[key] as string;
  }
  return null;
}

function objectField(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const nested = (value as Record<string, unknown>)[key];
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : {};
}

function mapCanonicalActivity(value: unknown, index: number) {
  const payload = objectField(value, "payload");
  const rawNote =
    stringField(payload, ["note", "description", "descricao", "message"]) ??
    stringField(value, ["note", "description", "descricao"]) ??
    "Evento CRM registrado.";
  const parsed = activityTypeFromNote(rawNote);
  const eventType = stringField(value, ["event_type", "eventType", "type"]);
  const createdAt = stringField(value, ["created_at", "createdAt"]) ?? new Date(0).toISOString();
  const actor = stringField(value, ["actor_user_id", "actorUserId", "user_id"]);
  return {
    id: stringField(value, ["id"]) ?? `crm-event-${index}`,
    lead_id: stringField(value, ["lead_id", "leadId"]) ?? "",
    user_id: actor,
    user_nome: actor ? `Usuário ${actor.slice(0, 8)}` : "Sistema CRM",
    user_perfil: "crm_authorized_actor",
    tipo: eventType === "note_added" ? parsed.tipo : "outros",
    descricao: eventType === "note_added" ? parsed.descricao : rawNote,
    metadata: { eventType: eventType ?? "unknown", canonical: true },
    created_at: createdAt,
    updated_at: createdAt,
  };
}

export const listarHistorico = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ lead_id: z.string().uuid() }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const aggregate = await getTenantLeadAggregateForContext(context, data.lead_id);
    return {
      atividades: aggregate.activities.map(mapCanonicalActivity),
      descarte: aggregate.lead.status === "descartado"
        ? {
            id: `canonical-discard-${aggregate.lead.id}`,
            motivo: "canonical_transition",
            detalhes: "Lead descartado pelo workflow CRM canônico.",
            user_nome: "Sistema CRM",
            created_at: aggregate.lead.updated_at,
          }
        : null,
    };
  });

/** Scoped count derived from the same canonical CRM list authority used by the pipeline. */
export const adminContarDescartes = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const rows = await listTenantLeadsForContext(context, {
      status: "descartado",
      limit: 1000,
      offset: 0,
    });
    return { total: rows.length };
  });

export const criarAtividade = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => activityInput.parse(input))
  .handler(async ({ data, context }) => {
    const decision = await authorizeTenantCrmOperation(
      trustedTenantCrmContext(context),
      "lead.note",
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const note = `[crm-activity:${data.tipo}] ${data.descricao}`;
    const { data: raw, error } = await (supabaseAdmin as any).rpc(
      "add_tenant_crm_note",
      {
        _actor_user_id: decision.actorUserId,
        _tenant_id: decision.tenantId,
        _tenant_origin: context.tenant.origin,
        _lead_id: data.lead_id,
        _note: note,
        _idempotency_key: `crm:activity:${crypto.randomUUID()}`,
      },
    );
    if (error) throw safeTenantCrmError(error);
    const result = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    return {
      ok: true,
      id: typeof result.eventId === "string" ? result.eventId : crypto.randomUUID(),
    };
  });

/**
 * Canonical CRM events are append-only. Historical editing was retired instead
 * of preserving a second mutable timeline.
 */
export const editarAtividade = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), descricao: z.string().trim().min(1).max(4000) }).strict().parse(input),
  )
  .handler(async ({ context }) => {
    await authorizeTenantCrmOperation(trustedTenantCrmContext(context), "lead.note");
    throw new Error("legacy_activity_edit_retired_append_only_timeline");
  });

/** The canonical discard operation is transitionTenantLeadStatus. */
export const descartarLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({ lead_id: z.string().uuid(), motivo: z.string().min(1), detalhes: z.string().min(1).max(2000) }).strict().parse(input),
  )
  .handler(async ({ context }) => {
    await authorizeTenantCrmOperation(trustedTenantCrmContext(context), "lead.transition");
    throw new Error("legacy_discard_retired_use_canonical_transition");
  });

/** External AI analysis is not an active CRM authority in PR-M2. */
export const analisarLeadIA = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ lead_id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ context }) => {
    await authorizeTenantCrmOperation(trustedTenantCrmContext(context), "lead.read");
    throw new Error("crm_ai_adapter_not_implemented");
  });
