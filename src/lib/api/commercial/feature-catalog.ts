// SCP-008 — Commercial Feature Key Catalog Materialization & Server Validation
//
// Server-authoritative, dependency-free static catalog of commercial
// feature keys and pure helpers to query it. This module does NOT:
//   • touch supabase, network, or filesystem;
//   • create, mutate, or read any commercial/billing row;
//   • implement provider integration, checkout, webhook, or customer
//     portal;
//   • introduce billing_admin / commercial_admin / canManageTenantBilling;
//   • alter membership authorization or tenant_members.
//
// It only provides deterministic catalog metadata for keys already
// accepted by normalizeFeatureKey (SCP-006). getCommercialFeatureDecision
// (SCP-006 runtime) uses this catalog as a gate BEFORE consulting
// entitlement snapshots — non-cataloged keys short-circuit with a
// `not_evaluated` decision and `source: "none"`, never leaking to a
// provider or triggering a mutation.

import type { CommercialFeatureDecision } from "./feature-gate";

// ============================================================
// Closed enums
// ============================================================

export type CommercialFeatureDomain =
  | "crm"
  | "cms"
  | "site"
  | "ai"
  | "users"
  | "storage"
  | "integrations";

export type CommercialFeatureValueType = "boolean" | "number" | "text";

export type CommercialFeatureStatus = "active" | "reserved" | "deprecated";

export interface CommercialFeatureCatalogItem {
  readonly key: string;
  readonly domain: CommercialFeatureDomain;
  readonly valueType: CommercialFeatureValueType;
  readonly description: string;
  readonly status: CommercialFeatureStatus;
}

// ============================================================
// Static catalog
//
// Guidelines (enforced by assertCommercialFeatureCatalogIntegrity):
//   • lowercase, no spaces, no accents;
//   • compatible with normalizeFeatureKey (SCP-006 regex);
//   • no provider namespaces (stripe/hotmart/kiwify);
//   • no billing runtime terms (webhook/checkout/customer portal);
//   • no tenant-specific or plan-specific keys.
// ============================================================

export const COMMERCIAL_FEATURE_CATALOG: ReadonlyArray<CommercialFeatureCatalogItem> = [
  { key: "crm.pipeline", domain: "crm", valueType: "boolean", description: "Basic CRM pipeline access.", status: "active" },
  { key: "crm.pipeline.advanced", domain: "crm", valueType: "boolean", description: "Advanced pipeline capabilities.", status: "active" },
  { key: "crm.leads.import", domain: "crm", valueType: "boolean", description: "Lead import capability.", status: "active" },
  { key: "crm.automation", domain: "crm", valueType: "boolean", description: "CRM automation capability.", status: "reserved" },
  { key: "cms.blog", domain: "cms", valueType: "boolean", description: "Blog content management.", status: "active" },
  { key: "cms.pages", domain: "cms", valueType: "boolean", description: "Page content management.", status: "active" },
  { key: "site.custom_domain", domain: "site", valueType: "boolean", description: "Custom domain capability.", status: "active" },
  { key: "site.white_label", domain: "site", valueType: "boolean", description: "White-label site capability.", status: "active" },
  { key: "ai.lead_scoring", domain: "ai", valueType: "boolean", description: "AI lead scoring capability.", status: "reserved" },
  { key: "ai.content_generation", domain: "ai", valueType: "boolean", description: "AI content generation capability.", status: "reserved" },
  { key: "ai.chat_assistant", domain: "ai", valueType: "boolean", description: "AI chat assistant capability.", status: "reserved" },
  { key: "users.seats", domain: "users", valueType: "number", description: "Seat limit.", status: "active" },
  { key: "storage.media_limit", domain: "storage", valueType: "number", description: "Media storage limit.", status: "active" },
  { key: "integrations.whatsapp", domain: "integrations", valueType: "boolean", description: "WhatsApp integration capability.", status: "reserved" },
  { key: "integrations.analytics", domain: "integrations", valueType: "boolean", description: "Analytics integration capability.", status: "active" },
] as const;

// Indexed lookup — built once at module load.
const CATALOG_INDEX: ReadonlyMap<string, CommercialFeatureCatalogItem> = (() => {
  const m = new Map<string, CommercialFeatureCatalogItem>();
  for (const item of COMMERCIAL_FEATURE_CATALOG) m.set(item.key, item);
  return m;
})();

// ============================================================
// Pure lookup helpers
// ============================================================

export function getCommercialFeatureCatalogItem(
  featureKey: string,
): CommercialFeatureCatalogItem | null {
  return CATALOG_INDEX.get(featureKey) ?? null;
}

export function isCommercialFeatureCataloged(featureKey: string): boolean {
  return CATALOG_INDEX.has(featureKey);
}

// ============================================================
// Integrity guard
// ============================================================

// Same regex used by normalizeFeatureKey (SCP-006). Kept local to avoid
// cross-module coupling on a private constant.
const FEATURE_KEY_RE = /^[a-z0-9_.:-]{1,120}$/;
const FORBIDDEN_NAMESPACES = ["stripe", "hotmart", "kiwify"];
const FORBIDDEN_TERMS = ["webhook", "checkout", "customer_portal", "customer-portal"];
const ALLOWED_DOMAINS: ReadonlySet<CommercialFeatureDomain> = new Set([
  "crm",
  "cms",
  "site",
  "ai",
  "users",
  "storage",
  "integrations",
]);
const ALLOWED_STATUSES: ReadonlySet<CommercialFeatureStatus> = new Set([
  "active",
  "reserved",
  "deprecated",
]);
const ALLOWED_VALUE_TYPES: ReadonlySet<CommercialFeatureValueType> = new Set([
  "boolean",
  "number",
  "text",
]);

export function assertCommercialFeatureCatalogIntegrity(): void {
  const seen = new Set<string>();
  for (const item of COMMERCIAL_FEATURE_CATALOG) {
    const k = item.key;
    if (typeof k !== "string" || k.length === 0) {
      throw new Error(`Invalid catalog key: ${JSON.stringify(k)}`);
    }
    if (seen.has(k)) {
      throw new Error(`Duplicate catalog key: ${k}`);
    }
    seen.add(k);

    if (k !== k.toLowerCase()) throw new Error(`Key not lowercase: ${k}`);
    if (/\s/.test(k)) throw new Error(`Key contains whitespace: ${k}`);
    // Reject any non-ASCII char (accents, symbols).
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7f]/.test(k)) throw new Error(`Key contains non-ascii: ${k}`);
    if (!FEATURE_KEY_RE.test(k)) throw new Error(`Key fails SCP-006 regex: ${k}`);

    const segments = k.split(/[.:_-]/);
    for (const ns of FORBIDDEN_NAMESPACES) {
      if (segments.includes(ns)) {
        throw new Error(`Forbidden provider namespace in key: ${k}`);
      }
    }
    for (const term of FORBIDDEN_TERMS) {
      if (k.includes(term)) {
        throw new Error(`Forbidden billing runtime term in key: ${k}`);
      }
    }

    if (!ALLOWED_DOMAINS.has(item.domain)) {
      throw new Error(`Invalid domain for key ${k}: ${item.domain}`);
    }
    if (!ALLOWED_STATUSES.has(item.status)) {
      throw new Error(`Invalid status for key ${k}: ${item.status}`);
    }
    if (!ALLOWED_VALUE_TYPES.has(item.valueType)) {
      throw new Error(`Invalid valueType for key ${k}: ${item.valueType}`);
    }
    if (typeof item.description !== "string" || item.description.length === 0) {
      throw new Error(`Missing description for key: ${k}`);
    }
  }
}

// ============================================================
// SCP-006 integration gate
//
// Pure helper consumed by getCommercialFeatureDecision. If the
// (already-normalized) featureKey is NOT in the catalog, we return a
// sanitized `not_evaluated` decision immediately — no snapshot lookup,
// no billing read, no mutation, no provider call. If it IS cataloged,
// we return null and let the existing SCP-006 decision proceed.
// ============================================================

export function evaluateFeatureCatalogGate(input: {
  tenantId: string;
  featureKey: string;
}): CommercialFeatureDecision | null {
  if (isCommercialFeatureCataloged(input.featureKey)) return null;
  return {
    tenantId: input.tenantId,
    featureKey: input.featureKey,
    allowed: false,
    reason: "not_evaluated",
    source: "none",
  };
}
