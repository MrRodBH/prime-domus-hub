import { z } from "zod";

export const TRACKING_PROVIDER_KEYS = [
  "META_PIXEL",
  "GOOGLE_ANALYTICS",
  "GOOGLE_TAG_MANAGER",
] as const;
export type TrackingProviderKey = (typeof TRACKING_PROVIDER_KEYS)[number];

export const TRACKING_CONSENT_CATEGORIES = ["ANALYTICS", "MARKETING"] as const;
export type TrackingConsentCategory = (typeof TRACKING_CONSENT_CATEGORIES)[number];

export const TRACKING_AVAILABILITY_STATES = [
  "unconfigured",
  "configured",
  "consent_required",
  "inactive",
  "preview_ready",
  "active",
  "adapter_not_implemented",
  "csp_blocked",
  "temporarily_unavailable",
  "failed",
] as const;
export type TrackingAvailabilityState = (typeof TRACKING_AVAILABILITY_STATES)[number];

export const TRACKING_EVENT_KEYS = [
  "page_view",
  "view_property",
  "search_properties",
  "filter_properties",
  "submit_public_form",
  "lead_created",
  "contact_click",
  "phone_click",
  "whatsapp_click",
  "email_click",
  "campaign_view",
  "conversion_confirmed",
] as const;
export type TrackingEventKey = (typeof TRACKING_EVENT_KEYS)[number];

export type TrackingPayloadValue = string | number | boolean | null | string[];
export type TrackingPayload = Record<string, TrackingPayloadValue>;

export interface TrackingProviderDefinition {
  providerKey: TrackingProviderKey;
  displayName: string;
  capabilityClass: "required" | "extensible";
  schemaVersion: 1;
  identifierType: "meta_pixel_id" | "ga4_measurement_id" | "gtm_container_id";
  identifierPattern: string;
  runtimeMode: "browser_external_script";
  scriptOrigins: readonly string[];
  connectOrigins: readonly string[];
  imageOrigins: readonly string[];
  consentCategory: TrackingConsentCategory;
  supportedEventKeys: readonly TrackingEventKey[];
  payloadSchemaContract: "closed_event_registry_v1";
  piiContract: "no_direct_pii_no_tenant_or_actor_identifiers";
  ssrSupport: "server_snapshot_only";
  spaNavigationSupport: true;
  cspContract: "external_origin_allowlist_no_inline_provider_script";
  nonceContract: "not_required_for_external_loader_module";
  diagnosticsContract: "sanitized_local_state_only";
  availabilityState: "preview_ready" | "csp_blocked";
  rollbackContract: "disable_connector_remove_runtime_and_stop_future_dispatch";
}

const ALL_EVENTS = [...TRACKING_EVENT_KEYS] as const;

export const TRACKING_PROVIDER_REGISTRY = [
  {
    providerKey: "META_PIXEL",
    displayName: "Meta Pixel",
    capabilityClass: "required",
    schemaVersion: 1,
    identifierType: "meta_pixel_id",
    identifierPattern: "^[0-9]{5,30}$",
    runtimeMode: "browser_external_script",
    scriptOrigins: ["https://connect.facebook.net"],
    connectOrigins: ["https://www.facebook.com", "https://connect.facebook.net"],
    imageOrigins: ["https://www.facebook.com"],
    consentCategory: "MARKETING",
    supportedEventKeys: ALL_EVENTS,
    payloadSchemaContract: "closed_event_registry_v1",
    piiContract: "no_direct_pii_no_tenant_or_actor_identifiers",
    ssrSupport: "server_snapshot_only",
    spaNavigationSupport: true,
    cspContract: "external_origin_allowlist_no_inline_provider_script",
    nonceContract: "not_required_for_external_loader_module",
    diagnosticsContract: "sanitized_local_state_only",
    availabilityState: "preview_ready",
    rollbackContract: "disable_connector_remove_runtime_and_stop_future_dispatch",
  },
  {
    providerKey: "GOOGLE_ANALYTICS",
    displayName: "Google Analytics 4",
    capabilityClass: "extensible",
    schemaVersion: 1,
    identifierType: "ga4_measurement_id",
    identifierPattern: "^G-[A-Z0-9]{4,20}$",
    runtimeMode: "browser_external_script",
    scriptOrigins: ["https://www.googletagmanager.com"],
    connectOrigins: ["https://www.google-analytics.com", "https://region1.google-analytics.com"],
    imageOrigins: ["https://www.google-analytics.com"],
    consentCategory: "ANALYTICS",
    supportedEventKeys: ALL_EVENTS,
    payloadSchemaContract: "closed_event_registry_v1",
    piiContract: "no_direct_pii_no_tenant_or_actor_identifiers",
    ssrSupport: "server_snapshot_only",
    spaNavigationSupport: true,
    cspContract: "external_origin_allowlist_no_inline_provider_script",
    nonceContract: "not_required_for_external_loader_module",
    diagnosticsContract: "sanitized_local_state_only",
    availabilityState: "preview_ready",
    rollbackContract: "disable_connector_remove_runtime_and_stop_future_dispatch",
  },
  {
    providerKey: "GOOGLE_TAG_MANAGER",
    displayName: "Google Tag Manager",
    capabilityClass: "extensible",
    schemaVersion: 1,
    identifierType: "gtm_container_id",
    identifierPattern: "^GTM-[A-Z0-9]{4,20}$",
    runtimeMode: "browser_external_script",
    scriptOrigins: ["https://www.googletagmanager.com"],
    connectOrigins: ["https://www.googletagmanager.com"],
    imageOrigins: ["https://www.googletagmanager.com"],
    consentCategory: "ANALYTICS",
    supportedEventKeys: ALL_EVENTS,
    payloadSchemaContract: "closed_event_registry_v1",
    piiContract: "no_direct_pii_no_tenant_or_actor_identifiers",
    ssrSupport: "server_snapshot_only",
    spaNavigationSupport: true,
    cspContract: "external_origin_allowlist_no_inline_provider_script",
    nonceContract: "not_required_for_external_loader_module",
    diagnosticsContract: "sanitized_local_state_only",
    availabilityState: "csp_blocked",
    rollbackContract: "disable_connector_remove_runtime_and_stop_future_dispatch",
  },
] as const satisfies readonly TrackingProviderDefinition[];

export interface TrackingEventDefinition {
  eventKey: TrackingEventKey;
  schemaVersion: 1;
  businessMeaning: string;
  allowedSurfaces: readonly ("public" | "authenticated" | "server")[];
  allowedPayloadFields: readonly string[];
  requiredPayloadFields: readonly string[];
  piiAllowed: false;
  tenantSource: "server_snapshot_only";
  actorSource: "not_exported";
  resourceValidation: string;
  deduplicationContract: "caller_event_reference_or_navigation_identity";
  providerMappings: Readonly<Record<TrackingProviderKey, string>>;
  consentCategory: TrackingConsentCategory;
  diagnosticsContract: "sanitized_state_without_payload_pii";
}

const event = (
  eventKey: TrackingEventKey,
  businessMeaning: string,
  allowedPayloadFields: readonly string[],
  requiredPayloadFields: readonly string[],
  providerMappings: Readonly<Record<TrackingProviderKey, string>>,
  consentCategory: TrackingConsentCategory = "ANALYTICS",
  allowedSurfaces: readonly ("public" | "authenticated" | "server")[] = ["public"],
): TrackingEventDefinition => ({
  eventKey,
  schemaVersion: 1,
  businessMeaning,
  allowedSurfaces,
  allowedPayloadFields,
  requiredPayloadFields,
  piiAllowed: false,
  tenantSource: "server_snapshot_only",
  actorSource: "not_exported",
  resourceValidation: "closed_schema_and_server_owned_resource_projection",
  deduplicationContract: "caller_event_reference_or_navigation_identity",
  providerMappings,
  consentCategory,
  diagnosticsContract: "sanitized_state_without_payload_pii",
});

export const TRACKING_EVENT_REGISTRY = [
  event("page_view", "Navegação pública resolvida", ["path", "title", "referrerHost"], ["path"], {
    META_PIXEL: "PageView", GOOGLE_ANALYTICS: "page_view", GOOGLE_TAG_MANAGER: "page_view",
  }),
  event("view_property", "Visualização de imóvel publicado", ["propertyReference", "propertyType", "city", "priceBand"], ["propertyReference"], {
    META_PIXEL: "ViewContent", GOOGLE_ANALYTICS: "view_item", GOOGLE_TAG_MANAGER: "view_property",
  }, "MARKETING"),
  event("search_properties", "Busca pública de imóveis", ["queryCategory", "resultCount"], [], {
    META_PIXEL: "Search", GOOGLE_ANALYTICS: "search", GOOGLE_TAG_MANAGER: "search_properties",
  }),
  event("filter_properties", "Aplicação de filtros no catálogo", ["filterKeys", "resultCount"], ["filterKeys"], {
    META_PIXEL: "CustomizeProduct", GOOGLE_ANALYTICS: "view_search_results", GOOGLE_TAG_MANAGER: "filter_properties",
  }),
  event("submit_public_form", "Submissão de formulário público aceita", ["formKey", "formType", "eventReference"], ["formKey"], {
    META_PIXEL: "Lead", GOOGLE_ANALYTICS: "generate_lead", GOOGLE_TAG_MANAGER: "submit_public_form",
  }, "MARKETING", ["public", "server"]),
  event("lead_created", "Lead criado pelo writer canônico", ["source", "eventReference"], ["eventReference"], {
    META_PIXEL: "Lead", GOOGLE_ANALYTICS: "generate_lead", GOOGLE_TAG_MANAGER: "lead_created",
  }, "MARKETING", ["server"]),
  event("contact_click", "Clique genérico em contato", ["channel", "placement"], ["channel"], {
    META_PIXEL: "Contact", GOOGLE_ANALYTICS: "contact", GOOGLE_TAG_MANAGER: "contact_click",
  }, "MARKETING"),
  event("phone_click", "Clique em telefone", ["placement"], [], {
    META_PIXEL: "Contact", GOOGLE_ANALYTICS: "phone_click", GOOGLE_TAG_MANAGER: "phone_click",
  }, "MARKETING"),
  event("whatsapp_click", "Clique em WhatsApp", ["placement"], [], {
    META_PIXEL: "Contact", GOOGLE_ANALYTICS: "whatsapp_click", GOOGLE_TAG_MANAGER: "whatsapp_click",
  }, "MARKETING"),
  event("email_click", "Clique em e-mail", ["placement"], [], {
    META_PIXEL: "Contact", GOOGLE_ANALYTICS: "email_click", GOOGLE_TAG_MANAGER: "email_click",
  }, "MARKETING"),
  event("campaign_view", "Exposição de campanha CMS", ["campaignReference", "placement"], ["campaignReference"], {
    META_PIXEL: "ViewContent", GOOGLE_ANALYTICS: "view_promotion", GOOGLE_TAG_MANAGER: "campaign_view",
  }, "MARKETING"),
  event("conversion_confirmed", "Conversão interna confirmada sem prova de entrega externa", ["conversionType", "value", "currency", "eventReference"], ["conversionType", "eventReference"], {
    META_PIXEL: "Purchase", GOOGLE_ANALYTICS: "conversion", GOOGLE_TAG_MANAGER: "conversion_confirmed",
  }, "MARKETING", ["server"]),
] as const satisfies readonly TrackingEventDefinition[];

const PROVIDER_BY_KEY = new Map<TrackingProviderKey, TrackingProviderDefinition>(
  TRACKING_PROVIDER_REGISTRY.map((definition) => [definition.providerKey, definition]),
);
const EVENT_BY_KEY = new Map<TrackingEventKey, TrackingEventDefinition>(
  TRACKING_EVENT_REGISTRY.map((definition) => [definition.eventKey, definition]),
);

export function getTrackingProviderDefinition(key: string): TrackingProviderDefinition {
  const definition = PROVIDER_BY_KEY.get(key as TrackingProviderKey);
  if (!definition) throw new Error("tracking_provider_not_cataloged");
  return definition;
}

export function getTrackingEventDefinition(key: string): TrackingEventDefinition {
  const definition = EVENT_BY_KEY.get(key as TrackingEventKey);
  if (!definition) throw new Error("tracking_event_not_cataloged");
  return definition;
}

export function assertTrackingProviderPublishable(providerKey: TrackingProviderKey): void {
  if (getTrackingProviderDefinition(providerKey).availabilityState === "csp_blocked") {
    throw new Error("tracking_csp_blocked");
  }
}

export function validateTrackingIdentifier(providerKey: TrackingProviderKey, value: string): string {
  const normalized = value.trim().toUpperCase();
  const definition = getTrackingProviderDefinition(providerKey);
  if (!new RegExp(definition.identifierPattern).test(normalized)) {
    throw new Error("tracking_provider_identifier_invalid");
  }
  return normalized;
}

const FORBIDDEN_PAYLOAD_KEY = /(^|_)(email|phone|message|tenant|tenant_id|tenantid|actor|actor_id|actorid|user|user_id|userid|lead|lead_id|leadid|name|address|document|cpf|cnpj)($|_)/i;
const FORBIDDEN_CONTENT = /<script|javascript:|data:text\/html|document\.write|new\s+function|\beval\s*\(/i;

function assertSafeTrackingValue(key: string, value: unknown): TrackingPayloadValue {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.abs(value) > 1_000_000_000) throw new Error(`tracking_payload_value_invalid:${key}`);
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length > 500 || FORBIDDEN_CONTENT.test(normalized)) throw new Error(`tracking_payload_value_invalid:${key}`);
    if (key === "path" && (!normalized.startsWith("/") || normalized.includes("?") || normalized.includes("#"))) {
      throw new Error("tracking_page_path_must_exclude_query_and_fragment");
    }
    if (key === "referrerHost" && normalized && !/^[a-z0-9.-]{1,253}$/i.test(normalized)) {
      throw new Error("tracking_referrer_host_invalid");
    }
    if (key === "currency" && !/^[A-Z]{3}$/.test(normalized)) throw new Error("tracking_currency_invalid");
    if (key === "eventReference" && !/^evt_[A-Za-z0-9_-]{8,100}$/.test(normalized)) {
      throw new Error("tracking_event_reference_invalid");
    }
    return normalized;
  }
  if (Array.isArray(value)) {
    if (value.length > 30 || value.some((item) => typeof item !== "string" || item.length > 100 || FORBIDDEN_CONTENT.test(item))) {
      throw new Error(`tracking_payload_value_invalid:${key}`);
    }
    return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  }
  throw new Error(`tracking_payload_value_invalid:${key}`);
}

export function parseTrackingEventPayload(eventKey: TrackingEventKey, input: unknown): TrackingPayload {
  const definition = getTrackingEventDefinition(eventKey);
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new Error("tracking_payload_object_required");
  const record = input as Record<string, unknown>;
  const allowed = new Set(definition.allowedPayloadFields);
  const output: TrackingPayload = {};
  for (const [key, value] of Object.entries(record)) {
    if (!allowed.has(key)) throw new Error(`tracking_payload_unknown_field:${key}`);
    if (FORBIDDEN_PAYLOAD_KEY.test(key)) throw new Error(`tracking_payload_pii_field_prohibited:${key}`);
    output[key] = assertSafeTrackingValue(key, value);
  }
  for (const key of definition.requiredPayloadFields) {
    if (!(key in output) || output[key] === "" || output[key] === null) throw new Error(`tracking_payload_required_field:${key}`);
  }
  if (JSON.stringify(output).length > 4_096) throw new Error("tracking_payload_too_large");
  return output;
}

export function assertNoArbitraryTrackingCode(input: unknown): void {
  const serialized = JSON.stringify(input ?? null);
  if (serialized.length > 20_000) throw new Error("tracking_configuration_too_large");
  if (FORBIDDEN_CONTENT.test(serialized) || /"(script|html|javascript|modulePath|component|endpoint|url|src)"\s*:/i.test(serialized)) {
    throw new Error("tracking_arbitrary_code_prohibited");
  }
}

export const TrackingConnectorDraftSchema = z.object({
  providerKey: z.enum(TRACKING_PROVIDER_KEYS),
  providerIdentifier: z.string().trim().max(64).nullable(),
  schemaVersion: z.literal(1),
  enabled: z.boolean(),
  consentCategory: z.enum(TRACKING_CONSENT_CATEGORIES),
}).strict().superRefine((value, context) => {
  const definition = getTrackingProviderDefinition(value.providerKey);
  if (value.consentCategory !== definition.consentCategory) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "tracking_consent_category_mismatch" });
  }
  if (value.providerIdentifier) {
    try { validateTrackingIdentifier(value.providerKey, value.providerIdentifier); }
    catch { context.addIssue({ code: z.ZodIssueCode.custom, message: "tracking_provider_identifier_invalid" }); }
  }
  if (value.enabled && !value.providerIdentifier) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "tracking_provider_identifier_required" });
  }
  if (value.enabled && definition.availabilityState === "csp_blocked") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "tracking_csp_blocked" });
  }
});

export const TrackingEventBindingsSchema = z.array(z.object({
  eventKey: z.enum(TRACKING_EVENT_KEYS),
  enabled: z.boolean(),
}).strict()).min(1).max(TRACKING_EVENT_KEYS.length).superRefine((items, context) => {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.eventKey)) context.addIssue({ code: z.ZodIssueCode.custom, message: "tracking_event_binding_duplicate", path: [index, "eventKey"] });
    seen.add(item.eventKey);
  });
});

export const TrackingConsentConfigurationSchema = z.object({
  schemaVersion: z.literal(1),
  noticeEnabled: z.boolean(),
  analyticsMode: z.literal("opt_in"),
  marketingMode: z.literal("opt_in"),
  policyRevision: z.number().int().min(1).max(1_000_000),
}).strict();
