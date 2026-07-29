import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import {
  TRACKING_AVAILABILITY_STATES,
  TRACKING_EVENT_KEYS,
  TRACKING_EVENT_REGISTRY,
  TRACKING_PROVIDER_REGISTRY,
  TrackingConnectorDraftSchema,
  TrackingConsentConfigurationSchema,
  TrackingEventBindingsSchema,
  assertNoArbitraryTrackingCode,
  assertTrackingProviderPublishable,
  getTrackingProviderDefinition,
  validateTrackingIdentifier,
  type TrackingEventKey,
  type TrackingProviderKey,
} from "@/lib/tracking/tracking-registry";
import type {
  PublicTrackingConnectorDto,
  PublicTrackingSnapshotDto,
} from "@/lib/tracking/tracking-contracts";
import {
  authorizeTenantTrackingOperation,
  executeTenantTrackingRpc,
  listTenantTrackingBindings,
  listTenantTrackingConnectorRows,
  loadTenantTrackingConnector,
  loadTenantTrackingConsentConfiguration,
  safeTenantTrackingError,
} from "@/lib/api/tenant-tracking-authority.server";

const uuid = z.string().uuid();
const positiveVersion = z.number().int().min(1);
const trusted = (context: any) => ({ userId: context.userId as string, tenant: context.tenant });

function serializableProviderRegistry() {
  return TRACKING_PROVIDER_REGISTRY.map((definition) => ({
    ...definition,
    scriptOrigins: [...definition.scriptOrigins],
    connectOrigins: [...definition.connectOrigins],
    imageOrigins: [...definition.imageOrigins],
    supportedEventKeys: [...definition.supportedEventKeys],
  }));
}

function serializableEventRegistry() {
  return TRACKING_EVENT_REGISTRY.map((definition) => ({
    ...definition,
    allowedSurfaces: [...definition.allowedSurfaces],
    allowedPayloadFields: [...definition.allowedPayloadFields],
    requiredPayloadFields: [...definition.requiredPayloadFields],
    providerMappings: { ...definition.providerMappings },
  }));
}

export const listTenantTrackingProviders = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorizeTenantTrackingOperation(trusted(context), "view");
    return {
      providers: serializableProviderRegistry(),
      availabilityStates: [...TRACKING_AVAILABILITY_STATES],
      arbitraryTenantJavaScript: false as const,
      fakeProviderDelivery: false as const,
    };
  });

export const listTenantTrackingConnectors = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "view");
    return listTenantTrackingConnectorRows(auth.tenantId);
  });

export const getTenantTrackingConnector = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "view");
    return loadTenantTrackingConnector(auth.tenantId, data.connectorId);
  });

const connectorInput = z.object({
  connectorId: uuid,
  expectedRowVersion: positiveVersion,
  config: TrackingConnectorDraftSchema,
}).strict();

export const saveTenantTrackingConnectorDraft = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(connectorInput)
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "configure");
    assertNoArbitraryTrackingCode(data.config);
    const connector = await loadTenantTrackingConnector(auth.tenantId, data.connectorId);
    if (connector.providerKey !== data.config.providerKey) throw new Error("tracking_connector_provider_mismatch");
    const identifier = data.config.providerIdentifier
      ? validateTrackingIdentifier(data.config.providerKey, data.config.providerIdentifier)
      : null;
    return executeTenantTrackingRpc<{
      id: string; providerKey: TrackingProviderKey; enabled: boolean;
      configurationVersion: number; availabilityState: string; rowVersion: number;
    }>("save_tenant_tracking_connector", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _connector_id: data.connectorId,
      _expected_row_version: data.expectedRowVersion,
      _provider_identifier: identifier,
      _enabled: false,
    });
  });

export const publishTenantTrackingConnector = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(connectorInput)
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "publish");
    assertNoArbitraryTrackingCode(data.config);
    assertTrackingProviderPublishable(data.config.providerKey);
    const connector = await loadTenantTrackingConnector(auth.tenantId, data.connectorId);
    if (connector.providerKey !== data.config.providerKey) throw new Error("tracking_connector_provider_mismatch");
    if (!data.config.providerIdentifier) throw new Error("tracking_provider_identifier_required");
    const identifier = validateTrackingIdentifier(data.config.providerKey, data.config.providerIdentifier);
    return executeTenantTrackingRpc<{
      id: string; providerKey: TrackingProviderKey; enabled: boolean;
      configurationVersion: number; availabilityState: string; rowVersion: number;
    }>("save_tenant_tracking_connector", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _connector_id: data.connectorId,
      _expected_row_version: data.expectedRowVersion,
      _provider_identifier: identifier,
      _enabled: true,
    });
  });

export const disableTenantTrackingConnector = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid, expectedRowVersion: positiveVersion }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "publish");
    const connector = await loadTenantTrackingConnector(auth.tenantId, data.connectorId);
    return executeTenantTrackingRpc<{
      id: string; providerKey: TrackingProviderKey; enabled: false;
      configurationVersion: number; availabilityState: string; rowVersion: number;
    }>("save_tenant_tracking_connector", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _connector_id: connector.id,
      _expected_row_version: data.expectedRowVersion,
      _provider_identifier: connector.providerIdentifier,
      _enabled: false,
    });
  });

export const listTenantTrackingEventDefinitions = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await authorizeTenantTrackingOperation(trusted(context), "view");
    return serializableEventRegistry();
  });

export const listTenantTrackingEventBindings = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "view");
    return listTenantTrackingBindings(auth.tenantId, data.connectorId);
  });

export const saveTenantTrackingEventBindings = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    connectorId: uuid,
    expectedBindingVersion: positiveVersion,
    bindings: TrackingEventBindingsSchema,
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "configure");
    await loadTenantTrackingConnector(auth.tenantId, data.connectorId);
    const supplied = new Set(data.bindings.map((binding) => binding.eventKey));
    if (TRACKING_EVENT_KEYS.some((eventKey) => !supplied.has(eventKey))) {
      throw new Error("tracking_event_bindings_complete_set_required");
    }
    return executeTenantTrackingRpc<{
      connectorId: string; eventBindingVersion: number; rowVersion: number;
    }>("save_tenant_tracking_event_bindings", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _connector_id: data.connectorId,
      _expected_binding_version: data.expectedBindingVersion,
      _bindings: data.bindings,
    });
  });

export const validateTenantTrackingConfiguration = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ config: TrackingConnectorDraftSchema }).strict())
  .handler(async ({ context, data }) => {
    await authorizeTenantTrackingOperation(trusted(context), "configure");
    assertNoArbitraryTrackingCode(data.config);
    const definition = getTrackingProviderDefinition(data.config.providerKey);
    const identifier = data.config.providerIdentifier
      ? validateTrackingIdentifier(data.config.providerKey, data.config.providerIdentifier)
      : null;
    return {
      valid: definition.availabilityState !== "csp_blocked",
      state: definition.availabilityState,
      providerKey: definition.providerKey,
      identifierConfigured: Boolean(identifier),
      consentCategory: definition.consentCategory,
      csp: {
        strategy: definition.cspContract,
        nonceContract: definition.nonceContract,
        scriptOrigins: [...definition.scriptOrigins],
        connectOrigins: [...definition.connectOrigins],
        imageOrigins: [...definition.imageOrigins],
        wildcardOrigins: false as const,
      },
      arbitraryTenantJavaScript: false as const,
      externalProviderCalled: false as const,
    };
  });

export const previewTenantTrackingRuntime = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ connectorId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "view");
    const connector = await loadTenantTrackingConnector(auth.tenantId, data.connectorId);
    const bindings = await listTenantTrackingBindings(auth.tenantId, connector.id);
    const definition = getTrackingProviderDefinition(connector.providerKey);
    return {
      state: definition.availabilityState === "csp_blocked"
        ? "csp_blocked" as const
        : connector.providerIdentifier
          ? "preview_ready" as const
          : "unconfigured" as const,
      providerKey: connector.providerKey,
      identifierConfigured: Boolean(connector.providerIdentifier),
      enabledBindingCount: bindings.filter((binding) => binding.enabled).length,
      consentCategory: connector.consentCategory,
      runtimeMode: definition.runtimeMode,
      scriptOrigins: [...definition.scriptOrigins],
      connectOrigins: [...definition.connectOrigins],
      imageOrigins: [...definition.imageOrigins],
      inlineProviderScript: false as const,
      arbitraryTenantJavaScript: false as const,
      externalProviderCalled: false as const,
      externalDeliveryProved: false as const,
    };
  });

export const getTenantTrackingConsentConfiguration = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "view");
    return loadTenantTrackingConsentConfiguration(auth.tenantId);
  });

export const saveTenantTrackingConsentConfiguration = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    expectedRowVersion: positiveVersion,
    config: TrackingConsentConfigurationSchema,
  }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "configure");
    return executeTenantTrackingRpc<{
      tenantId: string; noticeEnabled: boolean; analyticsMode: "opt_in";
      marketingMode: "opt_in"; policyRevision: number; rowVersion: number;
    }>("save_tenant_tracking_consent_configuration", {
      _actor_user_id: auth.actorUserId,
      _tenant_id: auth.tenantId,
      _tenant_origin: context.tenant.origin,
      _expected_row_version: data.expectedRowVersion,
      _notice_enabled: data.config.noticeEnabled,
      _policy_revision: data.config.policyRevision,
    });
  });

export const listTenantTrackingDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ limit: z.number().int().min(1).max(200).default(100) }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "diagnostics");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("tenant_tracking_diagnostics")
      .select("id, tenant_id, connector_id, provider_key, diagnostic_state, error_code, metadata, created_at")
      .eq("tenant_id", auth.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (result.error) throw safeTenantTrackingError(result.error);
    return (result.data ?? []).map((row: any) => {
      if (row.tenant_id !== auth.tenantId) throw new Error("tenant_tracking_cross_tenant_diagnostic");
      return {
        id: String(row.id),
        connectorId: row.connector_id ? String(row.connector_id) : null,
        providerKey: row.provider_key as TrackingProviderKey | null,
        state: String(row.diagnostic_state),
        errorCode: row.error_code ? String(row.error_code) : null,
        metadata: typeof row.metadata === "object" && row.metadata !== null ? row.metadata : {},
        createdAt: String(row.created_at),
      };
    });
  });

export const getTenantTrackingDiagnostic = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ diagnosticId: uuid }).strict())
  .handler(async ({ context, data }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "diagnostics");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("tenant_tracking_diagnostics")
      .select("id, tenant_id, connector_id, provider_key, diagnostic_state, error_code, metadata, created_at")
      .eq("tenant_id", auth.tenantId)
      .eq("id", data.diagnosticId)
      .maybeSingle();
    if (result.error) throw safeTenantTrackingError(result.error);
    if (!result.data) throw new Error("tenant_tracking_diagnostic_not_found");
    return {
      id: String(result.data.id),
      connectorId: result.data.connector_id ? String(result.data.connector_id) : null,
      providerKey: result.data.provider_key as TrackingProviderKey | null,
      state: String(result.data.diagnostic_state),
      errorCode: result.data.error_code ? String(result.data.error_code) : null,
      metadata: typeof result.data.metadata === "object" && result.data.metadata !== null ? result.data.metadata : {},
      createdAt: String(result.data.created_at),
    };
  });

export const getTenantTrackingHealth = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantTrackingOperation(trusted(context), "diagnostics");
    const [connectors, consent] = await Promise.all([
      listTenantTrackingConnectorRows(auth.tenantId),
      loadTenantTrackingConsentConfiguration(auth.tenantId),
    ]);
    return {
      providerCount: connectors.length,
      configuredProviders: connectors.filter((connector) => Boolean(connector.providerIdentifier)).length,
      activeProviders: connectors.filter((connector) => connector.enabled && connector.availabilityState === "active").length,
      failedProviders: connectors.filter((connector) => connector.availabilityState === "failed" || connector.lastErrorCode).length,
      cspBlockedProviders: connectors.filter((connector) => connector.availabilityState === "csp_blocked").length,
      consentPolicyRevision: consent.policyRevision,
      noticeEnabled: consent.noticeEnabled,
      arbitraryTenantJavaScript: false as const,
      fakeProviderDelivery: false as const,
      serverSideProviderDelivery: false as const,
    };
  });

export const getPublicTrackingSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicTrackingSnapshotDto> => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [connectorResult, consentResult] = await Promise.all([
      (supabaseAdmin as any)
        .from("tenant_tracking_connectors")
        .select("id, tenant_id, provider_key, provider_identifier, schema_version, enabled, consent_category, configuration_version, event_binding_version, availability_state")
        .eq("tenant_id", tenant.id)
        .eq("enabled", true),
      (supabaseAdmin as any)
        .from("tenant_tracking_consent_configuration")
        .select("tenant_id, schema_version, notice_enabled, analytics_mode, marketing_mode, policy_revision")
        .eq("tenant_id", tenant.id)
        .maybeSingle(),
    ]);
    if (connectorResult.error) throw new Error("public_tracking_connector_query_failed");
    if (consentResult.error) throw new Error("public_tracking_consent_query_failed");
    if (!consentResult.data || consentResult.data.tenant_id !== tenant.id) {
      throw new Error("public_tracking_consent_configuration_missing");
    }
    if (consentResult.data.schema_version !== 1 || consentResult.data.analytics_mode !== "opt_in" || consentResult.data.marketing_mode !== "opt_in") {
      throw new Error("public_tracking_consent_configuration_invalid");
    }

    const connectorRows = connectorResult.data ?? [];
    const seen = new Set<TrackingProviderKey>();
    const connectorIds: string[] = [];
    for (const row of connectorRows) {
      if (row.tenant_id !== tenant.id) throw new Error("public_tracking_cross_tenant_connector");
      const providerKey = row.provider_key as TrackingProviderKey;
      if (seen.has(providerKey)) throw new Error("public_tracking_provider_configuration_ambiguous");
      seen.add(providerKey);
      connectorIds.push(String(row.id));
    }

    let bindingRows: any[] = [];
    if (connectorIds.length > 0) {
      const bindingResult = await (supabaseAdmin as any)
        .from("tenant_tracking_event_bindings")
        .select("tenant_id, connector_id, event_key, enabled")
        .eq("tenant_id", tenant.id)
        .in("connector_id", connectorIds);
      if (bindingResult.error) throw new Error("public_tracking_binding_query_failed");
      bindingRows = bindingResult.data ?? [];
    }

    const connectors: PublicTrackingConnectorDto[] = connectorRows.map((row: any) => {
      const providerKey = row.provider_key as TrackingProviderKey;
      const definition = getTrackingProviderDefinition(providerKey);
      const providerIdentifier = validateTrackingIdentifier(providerKey, String(row.provider_identifier ?? ""));
      if (row.consent_category !== definition.consentCategory) throw new Error("public_tracking_consent_category_mismatch");
      const rows = bindingRows.filter((binding) => binding.connector_id === row.id);
      if (rows.length !== TRACKING_EVENT_KEYS.length) throw new Error("public_tracking_event_bindings_incomplete");
      const bindingSeen = new Set<string>();
      const bindings = rows.map((binding) => {
        if (binding.tenant_id !== tenant.id) throw new Error("public_tracking_cross_tenant_binding");
        const eventKey = binding.event_key as TrackingEventKey;
        if (!TRACKING_EVENT_KEYS.includes(eventKey) || bindingSeen.has(eventKey)) {
          throw new Error("public_tracking_event_binding_invalid");
        }
        bindingSeen.add(eventKey);
        return { eventKey, enabled: binding.enabled === true };
      });
      return {
        providerKey,
        providerIdentifier,
        schemaVersion: 1,
        consentCategory: definition.consentCategory,
        availabilityState: definition.availabilityState === "csp_blocked"
          ? "csp_blocked"
          : row.availability_state === "active"
            ? "active"
            : "preview_ready",
        configurationVersion: Number(row.configuration_version),
        eventBindingVersion: Number(row.event_binding_version),
        bindings,
      };
    });

    const definitions = connectors.map((connector) => getTrackingProviderDefinition(connector.providerKey));
    return {
      schemaVersion: 1,
      tenantResolution: "host_derived_server_authority",
      generatedAt: new Date().toISOString(),
      configurationRevision: Math.max(
        Number(consentResult.data.policy_revision),
        ...connectors.map((connector) => connector.configurationVersion),
      ),
      connectors,
      consent: {
        schemaVersion: 1,
        noticeEnabled: consentResult.data.notice_enabled === true,
        analyticsMode: "opt_in",
        marketingMode: "opt_in",
        policyRevision: Number(consentResult.data.policy_revision),
      },
      csp: {
        strategy: "external_loader_module_no_inline_provider_script",
        nonceRequiredForProviderRuntime: false,
        wildcardOrigins: false,
        scriptOrigins: [...new Set(definitions.flatMap((definition) => [...definition.scriptOrigins]))],
        connectOrigins: [...new Set(definitions.flatMap((definition) => [...definition.connectOrigins]))],
        imageOrigins: [...new Set(definitions.flatMap((definition) => [...definition.imageOrigins]))],
      },
      arbitraryTenantJavaScript: false,
      fakeProviderDelivery: false,
    };
  },
);
