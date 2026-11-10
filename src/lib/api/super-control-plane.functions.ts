import { operationalTenantIds } from "./operational-tenants.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  PLATFORM_OPERATION_KEYS,
  PLATFORM_OPERATIONS_REGISTRY,
  SUPER_CONTROL_PLANE_CONTRACT,
} from "@/lib/super-admin/platform-operations-registry";

const uuid = z.string().uuid();

type CountMap = Record<string, number>;
type ControlPlaneRecord = Record<string, Json | undefined>;

export type SuperControlPlaneSnapshot = {
  contract: typeof SUPER_CONTROL_PLANE_CONTRACT;
  generatedAt: string;
  globalExecutiveDashboard: {
    tenantCount: number;
    activeTenantCount: number;
    trialTenantCount: number;
    distinctMembershipUsers: number;
    membershipCount: number;
    globalRoleAssignments: number;
    auditEvents24h: number;
    openIncidentCount: number;
    openSupportCount: number;
  };
  tenants: Array<{
    id: string;
    slug: string;
    nome: string;
    status: string;
    dominio_principal: string | null;
    plano_codigo: string | null;
    owner_user_id: string | null;
    created_at: string;
    membershipSummary: { memberships: number; owners: number };
    domainActivationState: string;
    billingActivationState: "pending_BCA01";
  }>;
  usersAndMemberships: {
    distinctUsers: number;
    membershipStatusCounts: CountMap;
    tenantRoleCounts: CountMap;
    globalRoleCounts: CountMap;
  };
  commercialVisibility: {
    sourceContract: "accepted_phase_4_commercial_models_read_only";
    plans: Json[];
    entitlementDefinitions: Json[];
    planEntitlementRelationships: number;
    billingProviderMappings: number;
    billingEvents7d: number;
    providerMutationAvailable: false;
    activationState: "pending_BCA01";
    realizedMrrProved: false;
  };
  domainVisibility: {
    configuredTenantDomains: number;
    activationAvailable: false;
    activationState: "pending_DCA01";
  };
  integrations: {
    portalConnectorCount: number;
    portalJobStates: CountMap;
    marketingConnectorStates: CountMap;
    marketingVerificationStates: CountMap;
    marketingIngestionStates7d: CountMap;
    trackingProviderStates: CountMap;
    trackingDiagnosticStates7d: CountMap;
  };
  operations: {
    registry: Array<{
      key: string;
      category: string;
      executionState: string;
      authority: string;
    }>;
    queues: { portalJobs: number; marketingEvents7d: number; cmsSchedules: number };
    webhooks: {
      marketingAdaptersImplemented: true;
      billingWebhooks: "pending_BCA01";
      externalDeliveryProved: false;
    };
    cronInventory: Array<{ key: string; state: string }>;
    health: {
      openCrmAlerts: number;
      activeCmsSchedules: number;
      dataCompleteness: "complete";
    };
  };
  incidents: ControlPlaneRecord[];
  support: ControlPlaneRecord[];
  audit: ControlPlaneRecord[];
  reports: Record<string, string>;
  mutationBoundaries: Record<string, string>;
};

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

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function toJsonArray(value: unknown): Json[] {
  const parsed = toJson(value ?? []);
  return Array.isArray(parsed) ? parsed : [];
}

function stripSensitiveKeys(value: unknown): Json {
  if (Array.isArray(value)) return value.map(stripSensitiveKeys);
  if (!value || typeof value !== "object") return value as Json;
  const output: Record<string, Json | undefined> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/(secret|token|password|private_key|api_key|credential)/i.test(key)) continue;
    output[key] = stripSensitiveKeys(child);
  }
  return output;
}

export const getSuperControlPlaneSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperControlPlaneSnapshot> => {
    await assertGlobalSuperAdmin(context);
    const admin = await adminClient();
    const operationalIds = await operationalTenantIds(admin);
    const operationalMembers = await admin.from("tenant_members").select("user_id").in("tenant_id", operationalIds);
    assertQuery(operationalMembers, "operational_members");
    const operationalUserIds = operationalMembers.data?.length ? operationalMembers.data.map((r: {user_id:string}) => r.user_id) : ["00000000-0000-0000-0000-000000000000"];
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
      admin.from("tenants").select("id, slug, nome, status, dominio_principal, plano_codigo, owner_user_id, created_at").in("id", operationalIds).order("created_at", { ascending: true }).limit(1000),
      admin.from("tenant_members").select("tenant_id, user_id, membership_status, tenant_role, is_owner").in("tenant_id", operationalIds),
      admin.from("user_roles").select("user_id, role").in("user_id", operationalUserIds),
      admin.from("commercial_plans").select("*").limit(200),
      admin.from("commercial_entitlement_definitions").select("*").limit(500),
      admin.from("commercial_plan_entitlements").select("id", { count: "exact", head: true }),
      admin.from("tenant_billing_provider_mappings").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds),
      admin.from("billing_events").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds).gte("created_at", since7d),
      admin.from("portal_connectors").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds),
      admin.from("tenant_portal_jobs").select("id, current_state", { count: "exact", head: false }).in("tenant_id", operationalIds).limit(5000),
      admin.from("tenant_marketing_connectors").select("id, channel_key, availability_state, verification_state, active").in("tenant_id", operationalIds).limit(5000),
      admin.from("tenant_marketing_ingestion_events").select("id, ingestion_state", { count: "exact", head: false }).in("tenant_id", operationalIds).gte("received_at", since7d).limit(5000),
      admin.from("tenant_tracking_connectors").select("id, provider_key, availability_state, enabled").in("tenant_id", operationalIds).limit(5000),
      admin.from("tenant_tracking_diagnostics").select("id, diagnostic_state", { count: "exact", head: false }).in("tenant_id", operationalIds).gte("created_at", since7d).limit(5000),
      admin.from("audit_log").select("id", { count: "exact", head: true }).in("tenant_id", operationalIds).gte("created_at", since24h),
      admin.from("audit_log").select("id, tenant_id, user_id, action, entity, entity_id, created_at").in("tenant_id", operationalIds).order("created_at", { ascending: false }).limit(100),
      admin.from("platform_incidents").select("id, incident_key, scope, tenant_id, severity, status, title, summary, source, started_at, resolved_at, updated_at").or(`tenant_id.is.null,tenant_id.in.(${operationalIds.join(",")})`).order("started_at", { ascending: false }).limit(200),
      admin.from("platform_support_cases").select("id, case_key, tenant_id, category, priority, status, subject, summary, requester_reference, assigned_user_id, created_at, resolved_at, updated_at").or(`tenant_id.is.null,tenant_id.in.(${operationalIds.join(",")})`).order("created_at", { ascending: false }).limit(200),
      admin.from("crm_alerts").select("id, alert_key, severity, state", { count: "exact", head: false }).in("tenant_id", operationalIds).eq("state", "open").limit(5000),
      admin.from("cms_publication_schedules").select("id, state", { count: "exact", head: false }).in("tenant_id", operationalIds).limit(5000),
    ]);

    for (const [source, result] of Object.entries({
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
    })) {
      assertQuery(result as any, source);
    }

    const tenantRows = (tenants.data ?? []) as Array<{
      id: string;
      slug: string;
      nome: string;
      status: string;
      dominio_principal: string | null;
      plano_codigo: string | null;
      owner_user_id: string | null;
      created_at: string;
    }>;
    const memberRows = (memberships.data ?? []) as Array<{
      tenant_id: string;
      user_id: string;
      membership_status: string;
      tenant_role: string;
      is_owner: boolean;
    }>;
    const distinctUsers = new Set<string>(memberRows.map((row) => row.user_id));
    const countsByTenant: Record<string, { memberships: number; owners: number }> = {};
    for (const row of memberRows) {
      countsByTenant[row.tenant_id] ??= { memberships: 0, owners: 0 };
      countsByTenant[row.tenant_id].memberships += 1;
      if (row.is_owner) countsByTenant[row.tenant_id].owners += 1;
    }

    const groupCount = (rows: Array<Record<string, unknown>>, key: string): CountMap => {
      const result: CountMap = {};
      for (const row of rows) {
        const value = String(row[key] ?? "unknown");
        result[value] = (result[value] ?? 0) + 1;
      }
      return result;
    };

    const operationRegistry = PLATFORM_OPERATION_KEYS.map((key) => {
      const definition = PLATFORM_OPERATIONS_REGISTRY[key] as {
        key: string;
        category: string;
        executionState: string;
        authority: string;
      };
      return {
        key: definition.key,
        category: definition.category,
        executionState: definition.executionState,
        authority: definition.authority,
      };
    });

    return {
      contract: SUPER_CONTROL_PLANE_CONTRACT,
      generatedAt: new Date().toISOString(),
      globalExecutiveDashboard: {
        tenantCount: tenantRows.length,
        activeTenantCount: tenantRows.filter((row) => row.status === "ativo").length,
        trialTenantCount: tenantRows.filter((row) => row.status === "trial").length,
        distinctMembershipUsers: distinctUsers.size,
        membershipCount: memberRows.length,
        globalRoleAssignments: (globalRoles.data ?? []).length,
        auditEvents24h: audit24h.count ?? 0,
        openIncidentCount: (incidents.data ?? []).filter((row: { status: string }) => !["resolved", "closed"].includes(row.status)).length,
        openSupportCount: (supportCases.data ?? []).filter((row: { status: string }) => !["resolved", "closed"].includes(row.status)).length,
      },
      tenants: tenantRows.map((tenant) => ({
        ...tenant,
        membershipSummary: countsByTenant[tenant.id] ?? { memberships: 0, owners: 0 },
        domainActivationState: tenant.dominio_principal
          ? "configured_pending_DCA01_validation"
          : "pending_DCA01",
        billingActivationState: "pending_BCA01" as const,
      })),
      usersAndMemberships: {
        distinctUsers: distinctUsers.size,
        membershipStatusCounts: groupCount(memberRows, "membership_status"),
        tenantRoleCounts: groupCount(memberRows, "tenant_role"),
        globalRoleCounts: groupCount((globalRoles.data ?? []) as Array<Record<string, unknown>>, "role"),
      },
      commercialVisibility: {
        sourceContract: "accepted_phase_4_commercial_models_read_only",
        plans: toJsonArray(stripSensitiveKeys(plans.data ?? [])),
        entitlementDefinitions: toJsonArray(stripSensitiveKeys(entitlementDefinitions.data ?? [])),
        planEntitlementRelationships: planEntitlements.count ?? 0,
        billingProviderMappings: billingMappings.count ?? 0,
        billingEvents7d: billingEvents.count ?? 0,
        providerMutationAvailable: false,
        activationState: "pending_BCA01",
        realizedMrrProved: false,
      },
      domainVisibility: {
        configuredTenantDomains: tenantRows.filter((row) => Boolean(row.dominio_principal)).length,
        activationAvailable: false,
        activationState: "pending_DCA01",
      },
      integrations: {
        portalConnectorCount: portalConnectors.count ?? 0,
        portalJobStates: groupCount((portalJobs.data ?? []) as Array<Record<string, unknown>>, "current_state"),
        marketingConnectorStates: groupCount((marketingConnectors.data ?? []) as Array<Record<string, unknown>>, "availability_state"),
        marketingVerificationStates: groupCount((marketingConnectors.data ?? []) as Array<Record<string, unknown>>, "verification_state"),
        marketingIngestionStates7d: groupCount((marketingEvents.data ?? []) as Array<Record<string, unknown>>, "ingestion_state"),
        trackingProviderStates: groupCount((trackingConnectors.data ?? []) as Array<Record<string, unknown>>, "availability_state"),
        trackingDiagnosticStates7d: groupCount((trackingDiagnostics.data ?? []) as Array<Record<string, unknown>>, "diagnostic_state"),
      },
      operations: {
        registry: operationRegistry,
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
      incidents: toJsonArray(incidents.data ?? []) as ControlPlaneRecord[],
      support: toJsonArray(supportCases.data ?? []) as ControlPlaneRecord[],
      audit: toJsonArray(recentAudit.data ?? []) as ControlPlaneRecord[],
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
    const tenantId = requireTenantScopedAuthority(
      context.tenant,
      "Super Admin Tenant Operational View",
    );
    if (
      !context.tenant.isSuperAdmin ||
      !context.tenant.impersonation ||
      context.tenant.origin !== "impersonation"
    ) {
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
    for (const [source, result] of Object.entries({
      leads,
      properties,
      members,
      portalJobs,
      marketingEvents,
      crmAlerts,
    })) {
      assertQuery(result as any, source);
    }
    return {
      tenantId,
      authority: "explicit_super_admin_impersonation" as const,
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
  .handler(async ({ data, context }): Promise<Json> => {
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
    return toJson(result);
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

export type PlatformSupportInput = z.infer<typeof supportInput>;

export const mutatePlatformSupportCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => supportInput.parse(input))
  .handler(async ({ data, context }): Promise<Json> => {
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
    return toJson(result);
  });

export type SuperFinanceUsageTenant = {
  id: string; nome: string; slug: string; status: string; createdAt: string;
  planCode: string | null; planName: string | null; subscriptionStatus: string | null; monthlyAmountMinor: number | null;
  imoveisAtivos: number; imoveisTotal: number; leads30d: number; corretoresAtivos: number; fotos: number; membros: number;
  limits: Record<string, number>;
};
export type SuperFinanceUsage = { generatedAt: string; tenants: SuperFinanceUsageTenant[]; plans: Array<{ code: string; name: string; status: string }> };

export const getSuperFinanceUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperFinanceUsage> => {
    await assertGlobalSuperAdmin(context);
    const admin = await adminClient();
    const ids = await operationalTenantIds(admin);
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [tenants, plans, prices, subs, ents, imoveis, leads, corretores, fotos, membros] = await Promise.all([
      admin.from("tenants").select("id, nome, slug, status, created_at, plano_codigo").in("id", ids),
      admin.from("commercial_plans").select("id, code, name, status"),
      admin.from("commercial_plan_prices").select("plan_id, unit_amount_minor, billing_interval, interval_count, status").eq("status", "active"),
      admin.from("tenant_subscriptions").select("tenant_id, plan_id, status, created_at").in("tenant_id", ids).order("created_at", { ascending: false }),
      admin.from("tenant_entitlements").select("tenant_id, entitlement_key, value_int").in("tenant_id", ids).not("value_int", "is", null),
      admin.from("imoveis").select("tenant_id, status").in("tenant_id", ids).limit(20000),
      admin.from("leads").select("tenant_id").in("tenant_id", ids).gte("created_at", since30).limit(20000),
      admin.from("corretores").select("tenant_id, ativo").in("tenant_id", ids).limit(5000),
      admin.from("imovel_imagens").select("tenant_id").in("tenant_id", ids).limit(50000),
      admin.from("tenant_members").select("tenant_id, membership_status").in("tenant_id", ids).limit(5000),
    ]);
    for (const r of [tenants, plans, prices, subs, ents, imoveis, leads, corretores, fotos, membros]) if (r.error) throw new Error("Não foi possível carregar financeiro e consumo.");
    const planById = new Map((plans.data ?? []).map((p: any) => [p.id, p]));
    const planByCode = new Map((plans.data ?? []).map((p: any) => [p.code, p]));
    const monthly = new Map<string, number>();
    for (const p of prices.data ?? []) {
      const months = p.billing_interval === "year" ? 12 * (p.interval_count || 1) : p.billing_interval === "month" ? (p.interval_count || 1) : 0;
      if (months && !monthly.has(p.plan_id)) monthly.set(p.plan_id, Math.round(p.unit_amount_minor / months));
    }
    const count = (rows: any[] | null, id: string, pred: (r: any) => boolean = () => true) => (rows ?? []).filter((r) => r.tenant_id === id && pred(r)).length;
    const result = (tenants.data ?? []).map((t: any): SuperFinanceUsageTenant => {
      const sub = (subs.data ?? []).find((s: any) => s.tenant_id === t.id);
      const plan: any = sub ? planById.get(sub.plan_id) : planByCode.get(t.plano_codigo);
      const limits: Record<string, number> = {};
      for (const e of ents.data ?? []) if (e.tenant_id === t.id && e.value_int != null) limits[e.entitlement_key] = e.value_int;
      return {
        id: t.id, nome: t.nome, slug: t.slug, status: t.status, createdAt: t.created_at,
        planCode: plan?.code ?? t.plano_codigo ?? null, planName: plan?.name ?? null, subscriptionStatus: sub?.status ?? null,
        monthlyAmountMinor: plan ? monthly.get(plan.id) ?? null : null,
        imoveisAtivos: count(imoveis.data, t.id, (r) => r.status === "ativo"), imoveisTotal: count(imoveis.data, t.id),
        leads30d: count(leads.data, t.id), corretoresAtivos: count(corretores.data, t.id, (r) => r.ativo),
        fotos: count(fotos.data, t.id), membros: count(membros.data, t.id, (r) => r.membership_status === "active"), limits,
      };
    });
    return { generatedAt: new Date().toISOString(), tenants: result, plans: (plans.data ?? []).map((p: any) => ({ code: p.code, name: p.name, status: p.status })) };
  });

export const getSuperLeadTrend = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertGlobalSuperAdmin(context);
    const admin = await adminClient();
    const ids = await operationalTenantIds(admin);
    const since = new Date(Date.now() - 29 * 86400_000); since.setHours(0, 0, 0, 0);
    const { data, error } = await admin.from("leads").select("created_at").in("tenant_id", ids).gte("created_at", since.toISOString()).limit(50000);
    if (error) throw new Error("Não foi possível carregar a evolução de leads.");
    const days: { dia: string; leads: number }[] = [];
    for (let i = 0; i < 30; i++) { const d = new Date(since.getTime() + i * 86400_000); days.push({ dia: d.toISOString().slice(0, 10), leads: 0 }); }
    for (const r of data ?? []) { const k = String(r.created_at).slice(0, 10); const d = days.find((x) => x.dia === k); if (d) d.leads++; }
    return days;
  });

export const generateSuperAiInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertGlobalSuperAdmin(context);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("A análise por IA precisa de ajuste de configuração.");
    const admin = await adminClient();
    const ids = await operationalTenantIds(admin);
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [tenants, imoveis, leads, corretores, support] = await Promise.all([
      admin.from("tenants").select("id, nome, status, dominio_principal, plano_codigo").in("id", ids),
      admin.from("imoveis").select("tenant_id, status").in("tenant_id", ids).limit(20000),
      admin.from("leads").select("tenant_id, created_at, corretor_id").in("tenant_id", ids).gte("created_at", since30).limit(20000),
      admin.from("corretores").select("tenant_id, ativo").in("tenant_id", ids).limit(5000),
      admin.from("platform_support_cases").select("status, priority").limit(500),
    ]);
    const summary = (tenants.data ?? []).map((t: any) => ({
      empresa: t.nome, status: t.status, dominio: t.dominio_principal ?? null, plano: t.plano_codigo ?? null,
      imoveisAtivos: (imoveis.data ?? []).filter((r: any) => r.tenant_id === t.id && r.status === "ativo").length,
      leads30d: (leads.data ?? []).filter((r: any) => r.tenant_id === t.id).length,
      leadsSemCorretor: (leads.data ?? []).filter((r: any) => r.tenant_id === t.id && !r.corretor_id).length,
      corretoresAtivos: (corretores.data ?? []).filter((r: any) => r.tenant_id === t.id && r.ativo).length,
    }));
    const suporteAberto = (support.data ?? []).filter((s: any) => !["resolved", "closed"].includes(s.status)).length;
    const { z } = await import("zod");
    const { campaignText } = await import("@/lib/rm-marketing/ai/campaign-text.server");
    const schema = z.object({
      resumo: z.string(),
      insights: z.array(z.object({ tipo: z.enum(["oportunidade", "risco", "acao"]), titulo: z.string(), detalhe: z.string() })),
    });
    const out = await campaignText(key, schema,
      "Você é analista de negócios de uma plataforma SaaS para imobiliárias. Responda em português do Brasil, objetivo e prático. Use apenas os dados fornecidos; nunca invente números. Gere de 3 a 6 insights.",
      `Dados reais da plataforma (últimos 30 dias):\n${JSON.stringify({ empresas: summary, suporteAberto })}`);
    return { ...out, geradoEm: new Date().toISOString() };
  });
