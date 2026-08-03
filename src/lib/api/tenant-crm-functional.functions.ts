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
import {
  SIGNED_URL_TTL_DOWNLOAD_SECONDS,
  validateTenantSignRequest,
} from "@/lib/storage/signed-url";

const uuid = z.string().uuid();
const trusted = (context: unknown) => trustedTenantCrmContext(context as never);

function tenantOrigin(context: unknown): string {
  const candidate = (context as { tenant?: { origin?: unknown }; tenantOrigin?: unknown })?.tenant?.origin
    ?? (context as { tenantOrigin?: unknown })?.tenantOrigin;
  if (
    candidate !== "impersonation"
    && candidate !== "selection"
    && candidate !== "single-membership"
  ) {
    throw new Error("tenant_origin_missing");
  }
  return candidate;
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function authorize(context: unknown, operation: string) {
  return authorizeTenantCrmOperation(trusted(context), operation as never);
}

async function assertLeadScope(
  admin: any,
  auth: { tenantId: string; actorUserId: string; scope: string },
  leadId: string,
) {
  const scope = auth.scope === "own" ? "proprio" : auth.scope === "team" ? "equipe" : "global";
  const { data, error } = await admin.rpc("crm_scope_allows_lead", {
    _tenant_id: auth.tenantId,
    _actor_user_id: auth.actorUserId,
    _scope: scope,
    _lead_id: leadId,
  });
  if (error || data !== true) throw new Error("crm_scope_denied");
}

async function assertTenantRow(
  admin: any,
  table: string,
  tenantId: string,
  id: string,
) {
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .limit(2);
  if (error || (data ?? []).length !== 1) throw new Error("crm_cross_tenant_reference");
  return data[0];
}

async function listRows(
  context: unknown,
  operation: string,
  table: string,
  filters: Record<string, unknown> = {},
) {
  const auth = await authorize(context, operation);
  const admin = await adminClient();
  let query = admin.from(table).select("*").eq("tenant_id", auth.tenantId);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) query = query.eq(key, value);
  }
  const { data, error } = await query.limit(1000);
  if (error) throw safeTenantCrmError(error);
  return data ?? [];
}

async function saveRow(
  context: unknown,
  operation: string,
  table: string,
  id: string | undefined,
  expectedVersion: number | undefined,
  payload: Record<string, unknown>,
) {
  const auth = await authorize(context, operation);
  const admin = await adminClient();
  if (id) {
    const before = await assertTenantRow(admin, table, auth.tenantId, id);
    if (expectedVersion !== undefined && Number(before.row_version) !== expectedVersion) {
      throw new Error("crm_version_conflict");
    }
    const { data, error } = await admin
      .from(table)
      .update({
        ...payload,
        row_version: Number(before.row_version ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", auth.tenantId)
      .eq("id", id)
      .eq("row_version", before.row_version)
      .select()
      .maybeSingle();
    if (error || !data) throw new Error("crm_version_conflict");
    return data;
  }
  const { data, error } = await admin
    .from(table)
    .insert({ tenant_id: auth.tenantId, created_by: auth.actorUserId, ...payload })
    .select()
    .single();
  if (error) throw safeTenantCrmError(error);
  return data;
}

export const getTenantCrmFunctionalRegistry = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorize(context, "lead.read");
    return {
      ...CRM_FUNCTIONAL_CONTRACT,
      capabilities: [...CRM_FUNCTIONAL_CAPABILITIES],
      communicationAdapterStates: [...CRM_COMMUNICATION_ADAPTER_STATE],
      alertKeys: [...CRM_ALERT_KEYS],
    };
  });

export const listTenantCrmContacts = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    leadId: uuid.optional(),
    limit: z.number().int().min(1).max(500).optional(),
  }).optional().parse(value))
  .handler(({ context, data }) => listRows(context, "lead.list", "crm_contacts", {
    lead_id: data?.leadId,
  }));

export const saveTenantCrmContact = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.contact.parse(value))
  .handler(({ context, data }) => saveRow(
    context,
    data.id ? "lead.update" : "lead.create",
    "crm_contacts",
    data.id,
    data.expectedVersion,
    {
      lead_id: data.leadId ?? null,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
    },
  ));

export const consumeTenantCrmAttachmentUploadTarget = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.attachment.parse(value))
  .handler(async ({ context, data }) => {
    const auth = await authorize(context, "lead.update");
    const admin = await adminClient();
    await assertLeadScope(admin, auth, data.leadId);
    const { data: row, error } = await admin.rpc("consume_tenant_crm_attachment_upload_target", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: tenantOrigin(context),
      _target_id: data.uploadTargetId,
      _lead_id: data.leadId,
      _display_name: data.displayName,
      _mime_type: data.mimeType ?? null,
      _size: data.size,
    });
    if (error) throw safeTenantCrmError(error);
    return row;
  });

export const listTenantCrmAttachments = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({ leadId: uuid }).strict().parse(value))
  .handler(async ({ context, data }) => {
    const auth = await authorize(context, "lead.read");
    const admin = await adminClient();
    await assertLeadScope(admin, auth, data.leadId);
    const { data: rows, error } = await admin
      .from("crm_attachments")
      .select("id, lead_id, display_name, mime_type, size, created_at, created_by")
      .eq("tenant_id", auth.tenantId)
      .eq("lead_id", data.leadId)
      .order("created_at", { ascending: false });
    if (error) throw safeTenantCrmError(error);
    return (rows ?? []) as Array<{
      id: string;
      lead_id: string;
      display_name: string;
      mime_type: string | null;
      size: number | null;
      created_at: string;
      created_by: string | null;
    }>;
  });

export const getTenantCrmAttachmentDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    leadId: uuid,
    attachmentId: uuid,
  }).strict().parse(value))
  .handler(async ({ context, data }) => {
    const auth = await authorize(context, "lead.read");
    const admin = await adminClient();
    await assertLeadScope(admin, auth, data.leadId);
    const { data: rows, error } = await admin
      .from("crm_attachments")
      .select("id, lead_id, bucket, path")
      .eq("tenant_id", auth.tenantId)
      .eq("lead_id", data.leadId)
      .eq("id", data.attachmentId)
      .limit(2);
    if (error || (rows ?? []).length !== 1) throw new Error("crm_attachment_not_found");
    const storage = validateTenantSignRequest({
      bucket: rows[0].bucket,
      path: rows[0].path,
      tenantId: auth.tenantId,
    });
    const { data: signed, error: signError } = await admin.storage
      .from(storage.bucket)
      .createSignedUrl(storage.path, SIGNED_URL_TTL_DOWNLOAD_SECONDS);
    if (signError || !signed?.signedUrl) throw new Error("crm_attachment_sign_failed");
    return { attachmentId: data.attachmentId, url: signed.signedUrl };
  });

export const deleteTenantCrmAttachment = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    leadId: uuid,
    attachmentId: uuid,
  }).strict().parse(value))
  .handler(async ({ context, data }) => {
    const auth = await authorize(context, "lead.update");
    const admin = await adminClient();
    await assertLeadScope(admin, auth, data.leadId);
    const attachment = await assertTenantRow(admin, "crm_attachments", auth.tenantId, data.attachmentId);
    if (attachment.lead_id !== data.leadId) throw new Error("crm_attachment_not_found");
    const { data: row, error } = await admin.rpc("delete_tenant_crm_attachment", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: tenantOrigin(context),
      _attachment_id: data.attachmentId,
    });
    if (error) throw safeTenantCrmError(error);
    const storage = validateTenantSignRequest({
      bucket: row.bucket,
      path: row.path,
      tenantId: auth.tenantId,
    });
    const { error: removeError } = await admin.storage.from(storage.bucket).remove([storage.path]);
    if (removeError) throw new Error("crm_attachment_storage_cleanup_failed");
    return { id: row.id, leadId: row.leadId, deleted: true };
  });

export const listTenantCrmCalendarEvents = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    leadId: uuid.optional(),
  }).passthrough().optional().parse(value))
  .handler(({ context, data }) => listRows(context, "task.list", "crm_calendar_events", {
    lead_id: data?.leadId,
  }));

export const saveTenantCrmCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.calendarEvent.parse(value))
  .handler(({ context, data }) => saveRow(
    context,
    "task.create",
    "crm_calendar_events",
    data.id,
    data.expectedVersion,
    {
      lead_id: data.leadId ?? null,
      contact_id: data.contactId ?? null,
      event_type: data.eventType,
      title: data.title,
      starts_at: data.startsAt,
      ends_at: data.endsAt ?? null,
      timezone: data.timezone,
      notes: data.notes ?? null,
      assigned_user_id: data.assignedUserId ?? null,
    },
  ));

export const listTenantCrmVisits = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    leadId: uuid.optional(),
    propertyId: uuid.optional(),
  }).optional().parse(value))
  .handler(({ context, data }) => listRows(context, "task.list", "crm_visits", {
    lead_id: data?.leadId,
    property_id: data?.propertyId,
  }));

export const saveTenantCrmVisit = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.visit.parse(value))
  .handler(({ context, data }) => saveRow(
    context,
    "task.create",
    "crm_visits",
    data.id,
    data.expectedVersion,
    {
      lead_id: data.leadId,
      property_id: data.propertyId,
      calendar_event_id: data.calendarEventId ?? null,
      scheduled_at: data.scheduledAt,
      status: data.status,
      feedback: data.feedback ?? null,
    },
  ));

export const listTenantCrmProposals = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    leadId: uuid.optional(),
    propertyId: uuid.optional(),
  }).optional().parse(value))
  .handler(({ context, data }) => listRows(context, "lead.read", "crm_proposals", {
    lead_id: data?.leadId,
    property_id: data?.propertyId,
  }));

export const saveTenantCrmProposal = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.proposal.parse(value))
  .handler(({ context, data }) => saveRow(
    context,
    "lead.update",
    "crm_proposals",
    data.id,
    data.expectedVersion,
    {
      lead_id: data.leadId,
      property_id: data.propertyId,
      amount: data.amount,
      status: data.status,
      valid_until: data.validUntil ?? null,
      terms: data.terms,
    },
  ));

export const listTenantCrmAutomationRules = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(({ context }) => listRows(context, "lead.list", "crm_automation_rules"));

export const saveTenantCrmAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.automationRule.parse(value))
  .handler(({ context, data }) => saveRow(
    context,
    "lead.update",
    "crm_automation_rules",
    data.id,
    data.expectedVersion,
    {
      rule_key: data.ruleKey,
      configuration: data.configuration,
      active: data.active,
    },
  ));

export const enqueueTenantCrmCommunicationJob = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.communicationJob.parse(value))
  .handler(({ context, data }) => saveRow(
    context,
    "lead.update",
    "crm_communication_jobs",
    undefined,
    undefined,
    {
      lead_id: data.leadId,
      channel: data.channel,
      template_key: data.templateKey,
      idempotency_key: data.idempotencyKey,
      payload: data.payload,
      state: "adapter_not_implemented",
    },
  ));

export const listTenantCrmSlaPolicies = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(({ context }) => listRows(context, "lead.list", "crm_sla_policies"));

export const saveTenantCrmSlaPolicy = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.slaPolicy.parse(value))
  .handler(({ context, data }) => saveRow(
    context,
    "lead.update",
    "crm_sla_policies",
    data.id,
    data.expectedVersion,
    {
      policy_key: data.policyKey,
      threshold_minutes: data.thresholdMinutes,
      active: data.active,
    },
  ));

export const listTenantCrmAlerts = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    state: z.enum(["open", "acknowledged", "resolved", "dismissed"]).optional(),
    leadId: uuid.optional(),
  }).optional().parse(value))
  .handler(({ context, data }) => listRows(context, "lead.list", "crm_alerts", {
    state: data?.state,
    lead_id: data?.leadId,
  }));

export const resolveTenantCrmAlert = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    id: uuid,
    state: z.enum(["open", "acknowledged", "resolved", "dismissed"]),
    note: z.string().max(4000).optional().nullable(),
  }).strict().parse(value))
  .handler(({ context, data }) => saveRow(
    context,
    "lead.update",
    "crm_alerts",
    data.id,
    undefined,
    { state: data.state, resolution_note: data.note ?? null },
  ));

export const importTenantCrmContacts = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => CRM_FUNCTIONAL_INPUT_SCHEMAS.importRows.parse(value))
  .handler(async ({ context, data }) => {
    const auth = await authorize(context, "lead.create");
    const admin = await adminClient();
    const outcomes: Array<
      | { state: "invalid"; error: string }
      | { state: "created"; contactId: string }
    > = [];
    for (const row of data.rows) {
      const { data: created, error } = await admin.from("crm_contacts").insert({
        tenant_id: auth.tenantId,
        created_by: auth.actorUserId,
        name: row.name,
        email: row.email ?? null,
        phone: row.phone ?? null,
      }).select("id").single();
      outcomes.push(error
        ? { state: "invalid", error: error.message }
        : { state: "created", contactId: created.id });
    }
    return { total: data.rows.length, outcomes };
  });

export const exportTenantCrmData = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((value: unknown) => z.object({
    format: z.enum(["CSV", "JSON"]),
    resource: z.enum(["contacts", "calendar", "visits", "proposals", "alerts"]),
  }).strict().parse(value))
  .handler(async ({ context, data }) => {
    const table = {
      contacts: "crm_contacts",
      calendar: "crm_calendar_events",
      visits: "crm_visits",
      proposals: "crm_proposals",
      alerts: "crm_alerts",
    }[data.resource];
    const rows = await listRows(context, "lead.list", table);
    const content = data.format === "JSON" ? JSON.stringify(rows, null, 2) : JSON.stringify(rows);
    return {
      format: data.format,
      resource: data.resource,
      rows: rows.length,
      bytes: new TextEncoder().encode(content).length,
      sha256: "runtime-generated",
      content,
      externalProviderExecuted: false,
    };
  });
