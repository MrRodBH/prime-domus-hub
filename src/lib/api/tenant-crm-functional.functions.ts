import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCrmOperation,
  trustedTenantCrmContext,
  safeTenantCrmError,
} from "@/lib/api/tenant-crm-authority.server";
import {
  CRM_FUNCTIONAL_CAPABILITIES,
  CRM_FUNCTIONAL_CONTRACT,
  CRM_FUNCTIONAL_INPUT_SCHEMAS,
  CRM_COMMUNICATION_ADAPTER_STATE,
  CRM_ALERT_KEYS,
} from "@/lib/crm/crm-functional-registry";

const uuid = z.string().uuid();
const trusted = (context: any) => trustedTenantCrmContext(context);

function normalizeEmail(value: string | null | undefined) {
  return value ? value.trim().toLowerCase() : null;
}
function normalizePhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}
function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
function assertExpectedVersion(current: unknown, expected: number | undefined) {
  if (expected !== undefined && Number(current) !== expected) throw new Error("crm_version_conflict");
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function audit(input: {
  tenantId: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  const admin = await adminClient();
  const { error } = await admin.from("audit_log").insert({
    tenant_id: input.tenantId,
    user_id: input.actorUserId,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
  });
  if (error) throw new Error("crm_functional_audit_failed");
}

export const getTenantCrmFunctionalRegistry = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorizeTenantCrmOperation(trusted(context), "lead.read");
    return {
      ...CRM_FUNCTIONAL_CONTRACT,
      capabilities: [...CRM_FUNCTIONAL_CAPABILITIES],
      communicationAdapterStates: [...CRM_COMMUNICATION_ADAPTER_STATE],
      alertKeys: [...CRM_ALERT_KEYS],
    };
  });

export const listTenantCrmContacts = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ leadId: uuid.optional(), limit: z.number().int().min(1).max(500).optional() }).optional().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "lead.list");
    const admin = await adminClient();
    let query = admin.from("crm_contacts")
      .select("id, tenant_id, lead_id, name, email, phone, status, row_version, created_at, updated_at")
      .eq("tenant_id", auth.tenantId)
      .order("updated_at", { ascending: false })
      .limit(data?.limit ?? 200);
    if (data?.leadId) query = query.eq("lead_id", data.leadId);
    const { data: rows, error } = await query;
    if (error) throw safeTenantCrmError(error);
    return rows ?? [];
  });

export const saveTenantCrmContact = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.contact.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), data.id ? "lead.update" : "lead.create");
    const admin = await adminClient();
    if (data.leadId) {
      const { data: leads, error } = await admin.from("leads").select("id").eq("tenant_id", auth.tenantId).eq("id", data.leadId).limit(2);
      if (error || (leads ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
    }
    const payload = {
      lead_id: data.leadId ?? null,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      normalized_email: normalizeEmail(data.email),
      normalized_phone: normalizePhone(data.phone),
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: rows, error: readError } = await admin.from("crm_contacts").select("*").eq("tenant_id", auth.tenantId).eq("id", data.id).limit(2);
      if (readError || (rows ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
      const before = rows[0];
      assertExpectedVersion(before.row_version, data.expectedVersion);
      const { data: row, error } = await admin.from("crm_contacts")
        .update({ ...payload, row_version: Number(before.row_version) + 1 })
        .eq("tenant_id", auth.tenantId).eq("id", data.id).eq("row_version", before.row_version)
        .select("id, row_version").maybeSingle();
      if (error || !row) throw new Error("crm_version_conflict");
      await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: "crm.contact.update", entity: "crm_contacts", entityId: data.id, before, after: payload });
      return row;
    }
    const { data: row, error } = await admin.from("crm_contacts")
      .insert({ tenant_id: auth.tenantId, created_by: auth.actorUserId, ...payload })
      .select("id, row_version").single();
    if (error) throw safeTenantCrmError(error);
    await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: "crm.contact.create", entity: "crm_contacts", entityId: row.id, after: payload });
    return row;
  });

export const listTenantCrmCalendarEvents = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ start: z.string().datetime().optional(), end: z.string().datetime().optional(), leadId: uuid.optional() }).optional().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "task.list");
    const admin = await adminClient();
    let query = admin.from("crm_calendar_events").select("*").eq("tenant_id", auth.tenantId).order("starts_at", { ascending: true }).limit(1000);
    if (data?.start) query = query.gte("starts_at", data.start);
    if (data?.end) query = query.lte("starts_at", data.end);
    if (data?.leadId) query = query.eq("lead_id", data.leadId);
    const { data: rows, error } = await query;
    if (error) throw safeTenantCrmError(error);
    return rows ?? [];
  });

export const saveTenantCrmCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.calendarEvent.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "task.create");
    const admin = await adminClient();
    if (data.endsAt && new Date(data.endsAt).getTime() < new Date(data.startsAt).getTime()) throw new Error("crm_calendar_invalid_range");
    for (const [table, id] of [["leads", data.leadId], ["crm_contacts", data.contactId]] as const) {
      if (!id) continue;
      const { data: rows, error } = await admin.from(table).select("id").eq("tenant_id", auth.tenantId).eq("id", id).limit(2);
      if (error || (rows ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
    }
    const payload = {
      lead_id: data.leadId ?? null, contact_id: data.contactId ?? null, event_type: data.eventType,
      title: data.title, starts_at: data.startsAt, ends_at: data.endsAt ?? null, timezone: data.timezone,
      notes: data.notes ?? null, assigned_user_id: data.assignedUserId ?? null, updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: rows, error } = await admin.from("crm_calendar_events").select("*").eq("tenant_id", auth.tenantId).eq("id", data.id).limit(2);
      if (error || (rows ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
      assertExpectedVersion(rows[0].row_version, data.expectedVersion);
      const { data: row, error: updateError } = await admin.from("crm_calendar_events")
        .update({ ...payload, row_version: Number(rows[0].row_version) + 1 })
        .eq("tenant_id", auth.tenantId).eq("id", data.id).eq("row_version", rows[0].row_version)
        .select("id, row_version").maybeSingle();
      if (updateError || !row) throw new Error("crm_version_conflict");
      await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: "crm.calendar.update", entity: "crm_calendar_events", entityId: data.id, before: rows[0], after: payload });
      return row;
    }
    const { data: row, error } = await admin.from("crm_calendar_events").insert({ tenant_id: auth.tenantId, created_by: auth.actorUserId, ...payload }).select("id, row_version").single();
    if (error) throw safeTenantCrmError(error);
    await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: "crm.calendar.create", entity: "crm_calendar_events", entityId: row.id, after: payload });
    return row;
  });

export const listTenantCrmVisits = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ leadId: uuid.optional(), propertyId: uuid.optional() }).optional().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "task.list");
    const admin = await adminClient();
    let query = admin.from("crm_visits").select("*").eq("tenant_id", auth.tenantId).order("scheduled_at", { ascending: false }).limit(500);
    if (data?.leadId) query = query.eq("lead_id", data.leadId);
    if (data?.propertyId) query = query.eq("property_id", data.propertyId);
    const { data: rows, error } = await query;
    if (error) throw safeTenantCrmError(error);
    return rows ?? [];
  });

export const saveTenantCrmVisit = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.visit.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "task.create");
    const admin = await adminClient();
    for (const [table, id] of [["leads", data.leadId], ["imoveis", data.propertyId]] as const) {
      const { data: rows, error } = await admin.from(table).select("id").eq("tenant_id", auth.tenantId).eq("id", id).limit(2);
      if (error || (rows ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
    }
    const payload = { lead_id: data.leadId, property_id: data.propertyId, calendar_event_id: data.calendarEventId ?? null, scheduled_at: data.scheduledAt, status: data.status, feedback: data.feedback ?? null, feedback_recorded_at: data.feedback ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    return upsertFunctionalRow(admin, auth, "crm_visits", "crm.visit", data.id, data.expectedVersion, payload);
  });

export const listTenantCrmProposals = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ leadId: uuid.optional(), propertyId: uuid.optional() }).optional().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "lead.read");
    const admin = await adminClient();
    let query = admin.from("crm_proposals").select("*").eq("tenant_id", auth.tenantId).order("updated_at", { ascending: false }).limit(500);
    if (data?.leadId) query = query.eq("lead_id", data.leadId);
    if (data?.propertyId) query = query.eq("property_id", data.propertyId);
    const { data: rows, error } = await query;
    if (error) throw safeTenantCrmError(error);
    return rows ?? [];
  });

export const saveTenantCrmProposal = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.proposal.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "lead.update");
    const admin = await adminClient();
    for (const [table, id] of [["leads", data.leadId], ["imoveis", data.propertyId]] as const) {
      const { data: rows, error } = await admin.from(table).select("id").eq("tenant_id", auth.tenantId).eq("id", id).limit(2);
      if (error || (rows ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
    }
    const payload = { lead_id: data.leadId, property_id: data.propertyId, amount: data.amount, status: data.status, valid_until: data.validUntil ?? null, terms: data.terms, updated_at: new Date().toISOString() };
    return upsertFunctionalRow(admin, auth, "crm_proposals", "crm.proposal", data.id, data.expectedVersion, payload);
  });

async function upsertFunctionalRow(
  admin: any,
  auth: { tenantId: string; actorUserId: string },
  table: string,
  actionPrefix: string,
  id: string | undefined,
  expectedVersion: number | undefined,
  payload: Record<string, unknown>,
) {
  if (id) {
    const { data: rows, error } = await admin.from(table).select("*").eq("tenant_id", auth.tenantId).eq("id", id).limit(2);
    if (error || (rows ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
    const before = rows[0];
    assertExpectedVersion(before.row_version, expectedVersion);
    const { data: row, error: updateError } = await admin.from(table)
      .update({ ...payload, row_version: Number(before.row_version) + 1 })
      .eq("tenant_id", auth.tenantId).eq("id", id).eq("row_version", before.row_version)
      .select("id, row_version").maybeSingle();
    if (updateError || !row) throw new Error("crm_version_conflict");
    await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: `${actionPrefix}.update`, entity: table, entityId: id, before, after: payload });
    return row;
  }
  const { data: row, error } = await admin.from(table).insert({ tenant_id: auth.tenantId, created_by: auth.actorUserId, ...payload }).select("id, row_version").single();
  if (error) throw safeTenantCrmError(error);
  await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: `${actionPrefix}.create`, entity: table, entityId: row.id, after: payload });
  return row;
}

export const listTenantCrmAutomationRules = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "crm.diagnostics");
    const admin = await adminClient();
    const { data, error } = await admin.from("crm_automation_rules").select("*").eq("tenant_id", auth.tenantId).order("rule_key");
    if (error) throw safeTenantCrmError(error);
    return rowsOrEmpty(data);
  });

export const saveTenantCrmAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.automationRule.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "crm.diagnostics");
    if (auth.scope !== "global") throw new Error("crm_scope_denied");
    const admin = await adminClient();
    return upsertFunctionalRow(admin, auth, "crm_automation_rules", "crm.automation_rule", data.id, data.expectedVersion, { rule_key: data.ruleKey, configuration: data.configuration, active: data.active, updated_at: new Date().toISOString() });
  });

export const enqueueTenantCrmCommunicationJob = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.communicationJob.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "lead.note");
    const admin = await adminClient();
    const { data: leads, error: leadError } = await admin.from("leads").select("id").eq("tenant_id", auth.tenantId).eq("id", data.leadId).limit(2);
    if (leadError || (leads ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
    const { data: existing, error: existingError } = await admin.from("crm_communication_jobs").select("id, payload, adapter_state").eq("tenant_id", auth.tenantId).eq("idempotency_key", data.idempotencyKey).maybeSingle();
    if (existingError) throw safeTenantCrmError(existingError);
    if (existing) {
      if (JSON.stringify(existing.payload) !== JSON.stringify(data.payload)) throw new Error("crm_idempotency_conflict");
      return existing;
    }
    const { data: row, error } = await admin.from("crm_communication_jobs").insert({
      tenant_id: auth.tenantId,
      lead_id: data.leadId,
      channel: data.channel,
      template_key: data.templateKey,
      adapter_state: "adapter_not_implemented",
      idempotency_key: data.idempotencyKey,
      payload: data.payload,
      created_by: auth.actorUserId,
    }).select("id, adapter_state").single();
    if (error) throw safeTenantCrmError(error);
    await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: "crm.communication_job.create", entity: "crm_communication_jobs", entityId: row.id, after: { channel: data.channel, adapterState: "adapter_not_implemented" } });
    return { ...row, externalProviderExecuted: false, deliveryProved: false };
  });

export const listTenantCrmSlaPolicies = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "crm.diagnostics");
    const admin = await adminClient();
    const { data, error } = await admin.from("crm_sla_policies").select("*").eq("tenant_id", auth.tenantId).order("policy_key");
    if (error) throw safeTenantCrmError(error);
    return rowsOrEmpty(data);
  });

export const saveTenantCrmSlaPolicy = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.slaPolicy.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "crm.diagnostics");
    if (auth.scope !== "global") throw new Error("crm_scope_denied");
    const admin = await adminClient();
    return upsertFunctionalRow(admin, auth, "crm_sla_policies", "crm.sla_policy", data.id, data.expectedVersion, { policy_key: data.policyKey, threshold_minutes: data.thresholdMinutes, active: data.active, updated_at: new Date().toISOString() });
  });

export const listTenantCrmAlerts = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ state: z.enum(["open", "acknowledged", "resolved", "dismissed"]).optional(), leadId: uuid.optional() }).optional().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "lead.list");
    const admin = await adminClient();
    let query = admin.from("crm_alerts").select("*").eq("tenant_id", auth.tenantId).order("created_at", { ascending: false }).limit(1000);
    if (data?.state) query = query.eq("state", data.state);
    if (data?.leadId) query = query.eq("lead_id", data.leadId);
    const { data: rows, error } = await query;
    if (error) throw safeTenantCrmError(error);
    return rowsOrEmpty(rows);
  });

export const resolveTenantCrmAlert = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: uuid, state: z.enum(["acknowledged", "resolved", "dismissed"]), note: z.string().trim().max(2000).optional().nullable() }).strict().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "lead.update");
    const admin = await adminClient();
    const { data: row, error } = await admin.from("crm_alerts")
      .update({ state: data.state, resolution_note: data.note ?? null, resolved_at: data.state === "resolved" ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("tenant_id", auth.tenantId).eq("id", data.id).eq("state", "open")
      .select("id, state").maybeSingle();
    if (error || !row) throw new Error("crm_alert_not_found_or_not_open");
    await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: "crm.alert.resolve", entity: "crm_alerts", entityId: data.id, after: { state: data.state } });
    return row;
  });

export const importTenantCrmContacts = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.importRows.parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "lead.create");
    const admin = await adminClient();
    const key = `crm-import:${data.idempotencyKey}`;
    const { data: existing, error: existingError } = await admin.from("audit_log").select("after").eq("tenant_id", auth.tenantId).eq("action", key).limit(2);
    if (existingError) throw safeTenantCrmError(existingError);
    if ((existing ?? []).length > 1) throw new Error("crm_ambiguous_state");
    if ((existing ?? []).length === 1) return existing[0].after;

    const outcomes: Array<{ row: number; state: "created" | "duplicate" | "invalid"; contactId?: string; error?: string }> = [];
    for (const [index, input] of data.rows.entries()) {
      try {
        if (input.propertyId) {
          const { data: properties, error } = await admin.from("imoveis").select("id").eq("tenant_id", auth.tenantId).eq("id", input.propertyId).limit(2);
          if (error || (properties ?? []).length !== 1) throw new Error("property_not_found");
        }
        const normalizedEmail = normalizeEmail(input.email);
        const normalizedPhone = normalizePhone(input.phone);
        let duplicateQuery = admin.from("crm_contacts").select("id").eq("tenant_id", auth.tenantId).eq("status", "active");
        if (normalizedEmail) duplicateQuery = duplicateQuery.eq("normalized_email", normalizedEmail);
        else if (normalizedPhone) duplicateQuery = duplicateQuery.eq("normalized_phone", normalizedPhone);
        else duplicateQuery = duplicateQuery.eq("id", "00000000-0000-0000-0000-000000000000");
        const { data: duplicates, error: duplicateError } = await duplicateQuery.limit(2);
        if (duplicateError) throw duplicateError;
        if ((duplicates ?? []).length > 1) throw new Error("duplicate_ambiguous");
        if ((duplicates ?? []).length === 1) {
          outcomes.push({ row: index + 1, state: "duplicate", contactId: duplicates[0].id });
          continue;
        }
        const { data: row, error } = await admin.from("crm_contacts").insert({
          tenant_id: auth.tenantId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          normalized_email: normalizedEmail,
          normalized_phone: normalizedPhone,
          created_by: auth.actorUserId,
        }).select("id").single();
        if (error) throw error;
        outcomes.push({ row: index + 1, state: "created", contactId: row.id });
      } catch (error) {
        outcomes.push({ row: index + 1, state: "invalid", error: error instanceof Error ? error.message.slice(0, 200) : "invalid" });
      }
    }
    const result = { total: data.rows.length, created: outcomes.filter((item) => item.state === "created").length, duplicates: outcomes.filter((item) => item.state === "duplicate").length, invalid: outcomes.filter((item) => item.state === "invalid").length, outcomes };
    await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: key, entity: "crm_contacts", entityId: data.idempotencyKey, after: result });
    return result;
  });

export const exportTenantCrmData = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ format: z.enum(["CSV", "JSON"]), resource: z.enum(["contacts", "calendar", "visits", "proposals", "alerts"]) }).strict().parse(input))
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantCrmOperation(trusted(context), "lead.list");
    const table = { contacts: "crm_contacts", calendar: "crm_calendar_events", visits: "crm_visits", proposals: "crm_proposals", alerts: "crm_alerts" }[data.resource];
    const admin = await adminClient();
    const { data: rows, error } = await admin.from(table).select("*").eq("tenant_id", auth.tenantId).order("created_at", { ascending: true }).limit(10000);
    if (error) throw safeTenantCrmError(error);
    const accepted = asRows<Record<string, unknown>>(rows).map(({ tenant_id: _tenantId, ...row }) => row);
    const content = data.format === "JSON"
      ? JSON.stringify(accepted, null, 2)
      : toCsv(accepted);
    const bytes = new TextEncoder().encode(content);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
    await audit({ tenantId: auth.tenantId, actorUserId: auth.actorUserId, action: "crm.export.generated", entity: table, entityId: sha256, after: { format: data.format, rows: accepted.length, bytes: bytes.length, sha256 } });
    return { format: data.format, resource: data.resource, rows: accepted.length, bytes: bytes.length, sha256, content, externalProviderExecuted: false };
  });

function rowsOrEmpty(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  const escape = (value: unknown) => {
    const raw = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };
  return [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
}
