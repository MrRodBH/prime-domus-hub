import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  PLATFORM_OPERATION_KEYS,
  PLATFORM_OPERATIONS_REGISTRY,
  SUPER_CONTROL_PLANE_CONTRACT,
} from "@/lib/super-admin/platform-operations-registry";

const uuid = z.string().uuid();

async function assertGlobalSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "super_admin")
    .limit(2);
  if (error) throw new Error("Falha ao validar autoridade global.");
  if ((data ?? []).length !== 1) throw new Error("global_super_admin_required");
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function assertQuery(result: { error?: { message?: string } | null }, source: string) {
  if (result.error) throw new Error(`super_control_plane_partial_data:${source}`);
}

function stripSensitiveKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitiveKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/(secret|token|password|private_key|api_key|credential)/i.test(key))
      .map(([key, child]) => [key, stripSensitiveKeys(child)]),
  );
}

export const getSuperControlPlaneSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertGlobalSuperAdmin(context);
    const admin = await adminClient();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      tenants,
      memberships,
      globalRoles,
      plans,
      entitlementDefinitions,
      planEntitlements,
      billingMappings,
      billingEvents,
      portalConnectors,
      portalJobs,
      marketingConnectors,
      marketingEvents,
      trackingConnectors,
      trackingDiagnostics,
      audit24h,
      recentAudit,
      incidents,
      supportCases,
      crmAlerts,
      cmsSchedules,
    ] = await Promise.all([
      admin.from("tenants").select("id, slug, nome, status, dominio_principal, plano_codigo, owner_user_id, created_at").order("created_at", { ascending: true }).limit(1000),
      admin.from("tenant_members").select("tenant_id, user_id, membership_status, tenant_role, is_owner"),
      admin.from("user_roles").select("user_id, role"),
      admin.from("commercial_plans").select("*").limit(200),
      admin.from("commercial_entitlement_definitions").select("*").limit(500),
      admin.from("commercial_plan_entitlements").select("id", { count: "exact", head: true }),
      admin.from("tenant_billing_provider_mappings").select("id", { count: "exact", head: true }),
      admin.from("billing_events").select("id", { count: "exact", head: true }).gte("created_at", since7d),
      admin.from("portal_connectors").select("id", { count: "exact", head: true }),
      admin.from("tenant_portal_jobs").select("id, current_state", { count: "exact", head: false }).limit(5000),
      admin.from("tenant_marketing_connectors").select("id, channel_key, availability_state, verification_state, active").limit(5000),
      admin.from("tenant_marketing_ingestion_events").select("id, ingestion_state", { count: "exact", head: false }).gte("received_at", since7d).limit(5000),
      admin.from("tenant_tracking_connectors").select("id, provider_key, availability_state, active").limit(5000),
      admin.from("tenant_tracking_diagnostics").select("id, state", { count: "exact", head: false }).gte("created_at", since7d).limit(5000),
      admin.from("audit_log").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      admin.from("audit_log").select("id, tenant_id, user_id, action, entity, entity_id, created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("platform_incidents").select("id, incident_key, scope, tenant_id, severity, status, title, summary, source, started_at, resolved_at, updated_at").order("started_at", { ascending: false }).limit(200),
      admin.from("platform_support_cases").select("id, case_key, tenant_id, category, priority, status, subject, summary, assigned_user_id, created_at, resolved_at, updated_at").order("created_at", { ascending: false }).limit(200),
      admin.from("crm_alerts").select("id, alert_key, severity, state", { count: "exact", head: false }).eq("state", "open").limit(5000),
      admin.from("cms_publication_schedules").select("id, state", { count: "exact", head: false }).limit(5000),
    ]);

    for (const [source, result] of Object.entries({
      tenants, memberships, globalRoles, plans, entitlementDefinitions, planEntitlements,
      billingMappings, billingEvents, portalConnectors, portalJobs, marketingConnectors,
      marketingEvents, trackingConnectors, trackingDiagnostics, audit24h, recentAudit,
      incidents, supportCases, crmAlerts, cmsSchedules,
    })) assertQuery(result as any, source);

    const tenantRows = tenants.data ?? [];
    const memberRows = memberships.data ?? [];
    const distinctUsers = new Set(memberRows.map((row: { user_id: string }) => row.user_id));
    const countsByTenant: Record<string, { memberships: number; owners: number }> = {};
    for (const row of memberRows as Array<{ tenant_id: string; is_owner: boolean }>) {
      countsByTenant[row.tenant_id] ??= { memberships: 0, owners: 0 };
      countsByTenant[row.tenant_id].memberships += 1;
      if (row.is_owner) countsByTenant[row.tenant_id].owners += 1;
    }

    const groupCount = (rows: unknown[], key: string) => {
      const result: Record<string, number> = {};
      for (const row of rows as Record<string, unknown>[]) {
        const value = String(row[key] ?? "unknown");
        result[value] = (result[value] ?? 0) + 1;
      }
      return result;
    };

    return {
      contract: SUPER_CONTROL_PLANE_CONTRACT,
      generatedAt: new Date().toISOString(),
      globalExecutiveDashboard: {
        tenantCount: tenantRows.length,
        activeTenantCount: tenantRows.filter((row: { status: string }) => row.status === "ativo").length,
        trialTenantCount: tenantRows.filter((row: { status: string }) => row.status === "trial").length,
        distinctMembershipUsers: distinctUsers.size,
        membershipCount: memberRows.length,
        globalRoleAssignments: (globalRoles.data ?? []).length,
        auditEvents24h: audit24h.count ?? 0,
        openIncidentCount: (incidents.data ?? []).filter((row: { status: string }) => !["resolved", "closed"].includes(row.status)).length,
        openSupportCount: (supportCases.data ?? []).filter((row: { status: string }) => !["resolved", "closed"].includes(row.status)).length,
      },
      tenants: tenantRows.map((tenant: Record<string, unknown>) => ({
        ...tenant,
        membershipSummary: countsByTenant[String(tenant.id)] ?? { memberships: 0, owners: 0 },
        domainActivationState: tenant.dominio_principal ? "configured_pending_DCA01_validation" : "pending_DCA01",
        billingActivationState: "pending_BCA01",
      })),
      usersAndMemberships: {
        distinctUsers: distinctUsers.size,
        membershipStatusCounts: groupCount(memberRows, "membership_status"),
        tenantRoleCounts: groupCount(memberRows, "tenant_role"),
        globalRoleCounts: groupCount(globalRoles.data ?? [], "role"),
      },
      commercialVisibility: {
        sourceContract: "accepted_phase_4_commercial_models_read_only",
        plans: stripSensitiveKeys(plans.data ?? []),
        entitlementDefinitions: stripSensitiveKeys(entitlementDefinitions.data ?? []),
        planEntitlementRelationships: planEntitlements.count ?? 0,
        billingProviderMappings: billingMappings.count ?? 0,
        billingEvents7d: billingEvents.count ?? 0,
        providerMutationAvailable: false,
        activationState: "pending_BCA01",
        realizedMrrProved: false,
      },
      domainVisibility: {
        configuredTenantDomains: tenantRows.filter((row: { dominio_principal: string | null }) => Boolean(row.dominio_principal)).length,
        activationAvailable: false,
        activationState: "pending_DCA01",
      },
      integrations: {
        portalConnectorCount: portalConnectors.count ?? 0,
        portalJobStates: groupCount(portalJobs.data ?? [], "current_state"),
        marketingConnectorStates: groupCount(marketingConnectors.data ?? [], "availability_state"),
        marketingVerificationStates: groupCount(marketingConnectors.data ?? [], "verification_state"),
        marketingIngestionStates7d: groupCount(marketingEvents.data ?? [], "ingestion_state"),
        trackingProviderStates: groupCount(trackingConnectors.data ?? [], "availability_state"),
        trackingDiagnosticStates7d: groupCount(trackingDiagnostics.data ?? [], "state"),
      },
      operations: {
        registry: PLATFORM_OPERATION_KEYS.map((key) => PLATFORM_OPERATIONS_REGISTRY[key]),
        queues: {
          portalJobs: portalJobs.count ?? (portalJobs.data ?? []).length,
          marketingEvents7d: marketingEvents.count ?? (marketingEvents.data ?? []).length,
          cmsSchedules: cmsSchedules.count ?? (cmsSchedules.data ?? []).length,
        },
        webhooks: {
          marketingAdaptersImplemented: true,
          billingWebhooks: "pending_BCA01",
          externalDeliveryProved: false,
        },
        cronInventory: [
          { key: "crm_sla_evaluator", state: "registry_ready_not_live_proved" },
          { key: "cms_publication_scheduler", state: "registry_ready_not_live_proved" },
          { key: "portal_publication_worker", state: "registry_ready_not_live_proved" },
        ],
        health: {
          openCrmAlerts: crmAlerts.count ?? (crmAlerts.data ?? []).length,
          activeCmsSchedules: (cmsSchedules.data ?? []).filter((row: { state: string }) => ["scheduled", "claimed"].includes(row.state)).length,
          dataCompleteness: "complete",
        },
      },
      incidents: incidents.data ?? [],
      support: supportCases.data ?? [],
      audit: recentAudit.data ?? [],
      reports: {
        globalTenantLifecycle: "available",
        commercialVisibility: "available_read_only",
        integrationsHealth: "available",
        incidentsAndSupport: "available",
        tenantScopedResourceDetail: "explicit_impersonation_required",
      },
      mutationBoundaries: {
        billingProviderMutation: "deferred_to_BCA01",
        domainActivation: "deferred_to_DCA01",
        tenantScopedMutation: "explicit_impersonation_required",
      },
    };
  });

export const getSuperTenantScopedOperationalView = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const tenantId = requireTenantScopedAuthority(context.tenant, "Super Admin Tenant Operational View");
    if (!context.tenant.isSuperAdmin || !context.tenant.impersonation || context.tenant.origin !== "impersonation") {
      throw new Error("super_admin_explicit_impersonation_required");
    }
    const admin = await adminClient();
    const [leads, properties, members, portalJobs, marketingEvents, crmAlerts] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      admin.from("imoveis").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      admin.from("tenant_members").select("user_id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      admin.from("tenant_portal_jobs").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      admin.from("tenant_marketing_ingestion_events").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      admin.from("crm_alerts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("state", "open"),
    ]);
    for (const [source, result] of Object.entries({ leads, properties, members, portalJobs, marketingEvents, crmAlerts })) {
      assertQuery(result as any, source);
    }
    return {
      tenantId,
      authority: "explicit_super_admin_impersonation",
      counts: {
        leads: leads.count ?? 0,
        properties: properties.count ?? 0,
        memberships: members.count ?? 0,
        portalJobs: portalJobs.count ?? 0,
        marketingEvents: marketingEvents.count ?? 0,
        openCrmAlerts: crmAlerts.count ?? 0,
      },
    };
  });

const incidentInput = z.object({
  operation: z.enum(["create", "update"]),
  id: uuid.optional().nullable(),
  incidentKey: z.string().regex(/^INC-[0-9]{4}-[0-9]{4,}$/),
  scope: z.enum(["global", "tenant"]),
  tenantId: uuid.optional().nullable(),
  severity: z.enum(["info", "warning", "major", "critical"]),
  status: z.enum(["open", "investigating", "monitoring", "resolved", "closed"]),
  title: z.string().trim().min(3).max(240),
  summary: z.string().trim().min(3).max(4000),
  source: z.enum(["manual", "release_gate", "runtime_diagnostic", "queue", "webhook", "provider", "security_validation"]),
}).strict();

export const mutatePlatformIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => incidentInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalSuperAdmin(context);
    const admin = await adminClient();
    const { data: result, error } = await admin.rpc("mutate_platform_incident", {
      _actor_user_id: context.userId,
      _operation: data.operation,
      _incident_id: data.id ?? null,
      _incident_key: data.incidentKey,
      _scope: data.scope,
      _tenant_id: data.tenantId ?? null,
      _severity: data.severity,
      _status: data.status,
      _title: data.title,
      _summary: data.summary,
      _source: data.source,
    });
    if (error) throw new Error("platform_incident_mutation_failed");
    return result;
  });

const supportInput = z.object({
  operation: z.enum(["create", "update"]),
  id: uuid.optional().nullable(),
  caseKey: z.string().regex(/^SUP-[0-9]{4}-[0-9]{4,}$/),
  tenantId: uuid.optional().nullable(),
  requesterReference: z.string().trim().max(240).optional().nullable(),
  category: z.enum(["access", "configuration", "crm", "cms", "portal", "marketing", "billing_visibility", "domain_visibility", "incident", "other"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  status: z.enum(["open", "triage", "in_progress", "waiting_customer", "resolved", "closed"]),
  subject: z.string().trim().min(3).max(240),
  summary: z.string().trim().min(3).max(4000),
  assignedUserId: uuid.optional().nullable(),
}).strict();

export const mutatePlatformSupportCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => supportInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalSuperAdmin(context);
    const admin = await adminClient();
    const { data: result, error } = await admin.rpc("mutate_platform_support_case", {
      _actor_user_id: context.userId,
      _operation: data.operation,
      _case_id: data.id ?? null,
      _case_key: data.caseKey,
      _tenant_id: data.tenantId ?? null,
      _requester_reference: data.requesterReference ?? null,
      _category: data.category,
      _priority: data.priority,
      _status: data.status,
      _subject: data.subject,
      _summary: data.summary,
      _assigned_user_id: data.assignedUserId ?? null,
    });
    if (error) throw new Error("platform_support_mutation_failed");
    return result;
  });
