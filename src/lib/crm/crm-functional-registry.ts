import { z } from "zod";

export const CRM_FUNCTIONAL_SCHEMA_VERSION = 1 as const;
export const CRM_FUNCTIONAL_CAPABILITIES = [
  "contacts",
  "calendar",
  "visits",
  "proposals",
  "attachments",
  "automation_rules",
  "manual_import",
  "deterministic_export",
  "communication_jobs",
  "sla_policies",
  "alerts",
  "follow_up_policy",
  "property_relationships",
  "broker_relationships",
  "campaign_relationships",
  "dashboard_kpi_projections",
] as const;
export type CrmFunctionalCapability = (typeof CRM_FUNCTIONAL_CAPABILITIES)[number];

export const CRM_AUTOMATION_RULE_KEYS = [
  "new_lead_first_response_sla",
  "follow_up_overdue_alert",
  "visit_feedback_reminder",
  "proposal_expiry_alert",
  "inactive_lead_alert",
] as const;
export const CRM_COMMUNICATION_CHANNELS = ["email", "whatsapp", "sms"] as const;
export const CRM_COMMUNICATION_ADAPTER_STATE = [
  "adapter_not_implemented",
  "credential_provisioning_required",
  "queued",
  "processing",
  "dispatch_attempted",
  "retry_scheduled",
  "failed_terminal",
  "cancelled",
] as const;
export const CRM_SLA_POLICY_KEYS = ["first_response", "follow_up", "visit_feedback", "proposal_review"] as const;
export const CRM_ALERT_KEYS = [
  "first_response_overdue",
  "follow_up_overdue",
  "visit_feedback_overdue",
  "proposal_review_overdue",
  "proposal_expiring",
  "inactive_lead",
] as const;

const uuid = z.string().uuid();
const boundedText = z.string().trim().max(4000);

export const CRM_FUNCTIONAL_INPUT_SCHEMAS = {
  contact: z.object({
    id: uuid.optional(), leadId: uuid.optional().nullable(), name: z.string().trim().min(1).max(240),
    email: z.string().email().optional().nullable(), phone: z.string().trim().max(80).optional().nullable(),
    expectedVersion: z.number().int().positive().optional(),
  }).strict(),
  calendarEvent: z.object({
    id: uuid.optional(), leadId: uuid.optional().nullable(), contactId: uuid.optional().nullable(),
    eventType: z.enum(["follow_up", "call", "meeting", "visit", "proposal_review", "other"]),
    title: z.string().trim().min(1).max(240), startsAt: z.string().datetime(), endsAt: z.string().datetime().optional().nullable(),
    timezone: z.literal("America/Sao_Paulo").default("America/Sao_Paulo"), notes: boundedText.optional().nullable(),
    assignedUserId: uuid.optional().nullable(), expectedVersion: z.number().int().positive().optional(),
  }).strict(),
  visit: z.object({
    id: uuid.optional(), leadId: uuid, propertyId: uuid, calendarEventId: uuid.optional().nullable(),
    scheduledAt: z.string().datetime(), status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).default("scheduled"),
    feedback: boundedText.optional().nullable(), expectedVersion: z.number().int().positive().optional(),
  }).strict(),
  proposal: z.object({
    id: uuid.optional(), leadId: uuid, propertyId: uuid, amount: z.number().nonnegative(),
    status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "cancelled"]).default("draft"),
    validUntil: z.string().date().optional().nullable(), terms: z.record(z.string(), z.unknown()).default({}),
    expectedVersion: z.number().int().positive().optional(),
  }).strict(),
  automationRule: z.object({
    id: uuid.optional(), ruleKey: z.enum(CRM_AUTOMATION_RULE_KEYS), configuration: z.record(z.string(), z.unknown()).default({}),
    active: z.boolean().default(false), expectedVersion: z.number().int().positive().optional(),
  }).strict(),
  communicationJob: z.object({
    leadId: uuid, channel: z.enum(CRM_COMMUNICATION_CHANNELS), templateKey: z.string().trim().min(1).max(120),
    idempotencyKey: z.string().min(8).max(200), payload: z.record(z.string(), z.unknown()).default({}),
  }).strict(),
  slaPolicy: z.object({
    id: uuid.optional(), policyKey: z.enum(CRM_SLA_POLICY_KEYS), thresholdMinutes: z.number().int().min(1).max(525600),
    active: z.boolean().default(true), expectedVersion: z.number().int().positive().optional(),
  }).strict(),
  importRows: z.object({
    rows: z.array(z.object({
      name: z.string().trim().min(1).max(240), email: z.string().email().optional().nullable(),
      phone: z.string().trim().max(80).optional().nullable(), source: z.string().trim().max(120).optional().nullable(),
      propertyId: uuid.optional().nullable(), campaignId: z.string().trim().max(200).optional().nullable(),
    }).strict()).min(1).max(5000),
    idempotencyKey: z.string().min(8).max(200),
  }).strict(),
} as const;

export const CRM_FUNCTIONAL_CONTRACT = {
  schemaVersion: CRM_FUNCTIONAL_SCHEMA_VERSION,
  tenantAuthority: "server_only",
  authorization: "tenant_access_control_crm_scope",
  optimisticConcurrency: true,
  idempotency: true,
  audit: "required",
  attachmentAuthority: "upload_target_id_only",
  externalCommunication: "adapter_not_implemented_until_factual_adapter",
  automaticMerge: false,
  deterministicExport: true,
  timezone: "America/Sao_Paulo",
  capabilities: CRM_FUNCTIONAL_CAPABILITIES,
} as const;
