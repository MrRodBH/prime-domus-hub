export const PLATFORM_OPERATION_KEYS = [
  "release_gate",
  "portal_publication_worker",
  "marketing_ingestion_worker",
  "tracking_runtime",
  "crm_sla_evaluator",
  "cms_publication_scheduler",
  "billing_visibility",
  "domain_visibility",
] as const;
export type PlatformOperationKey = (typeof PLATFORM_OPERATION_KEYS)[number];

export type PlatformOperationDefinition = {
  readonly key: PlatformOperationKey;
  readonly category: "job" | "queue" | "webhook" | "diagnostic" | "external_gate";
  readonly authority: "global_platform" | "tenant_via_explicit_impersonation";
  readonly executionState: "implemented" | "adapter_not_implemented" | "blocked_by_DCA01" | "blocked_by_BCA01";
  readonly healthSources: readonly string[];
  readonly retryContract: string;
  readonly idempotencyContract: string;
  readonly externalExecutionProof: "not_implied_by_local_state";
};

export const PLATFORM_OPERATIONS_REGISTRY: Record<PlatformOperationKey, PlatformOperationDefinition> = {
  release_gate: {
    key: "release_gate", category: "diagnostic", authority: "global_platform", executionState: "implemented",
    healthSources: ["GitHub Actions exact-head artifact"], retryContract: "new exact-head run", idempotencyContract: "artifact bound to commit SHA", externalExecutionProof: "not_implied_by_local_state",
  },
  portal_publication_worker: {
    key: "portal_publication_worker", category: "queue", authority: "tenant_via_explicit_impersonation", executionState: "implemented",
    healthSources: ["tenant_portal_jobs", "tenant_portal_job_attempts", "portal_sync_logs"], retryContract: "bounded explicit retry", idempotencyContract: "tenant + idempotency_key", externalExecutionProof: "not_implied_by_local_state",
  },
  marketing_ingestion_worker: {
    key: "marketing_ingestion_worker", category: "webhook", authority: "tenant_via_explicit_impersonation", executionState: "implemented",
    healthSources: ["tenant_marketing_ingestion_events", "tenant_marketing_ingestion_attempts"], retryContract: "explicit retry state", idempotencyContract: "connector + provider payload id + hash", externalExecutionProof: "not_implied_by_local_state",
  },
  tracking_runtime: {
    key: "tracking_runtime", category: "diagnostic", authority: "tenant_via_explicit_impersonation", executionState: "implemented",
    healthSources: ["tenant_tracking_connectors", "tenant_tracking_diagnostics"], retryContract: "configuration correction and republish", idempotencyContract: "provider loader singleton", externalExecutionProof: "not_implied_by_local_state",
  },
  crm_sla_evaluator: {
    key: "crm_sla_evaluator", category: "job", authority: "tenant_via_explicit_impersonation", executionState: "implemented",
    healthSources: ["crm_sla_policies", "crm_alerts", "crm_automation_rules"], retryContract: "deterministic reevaluation", idempotencyContract: "tenant + lead + alert key + due window", externalExecutionProof: "not_implied_by_local_state",
  },
  cms_publication_scheduler: {
    key: "cms_publication_scheduler", category: "job", authority: "tenant_via_explicit_impersonation", executionState: "implemented",
    healthSources: ["cms_publication_schedules", "cms_page_versions"], retryContract: "explicit failed schedule retry", idempotencyContract: "tenant + schedule idempotency key", externalExecutionProof: "not_implied_by_local_state",
  },
  billing_visibility: {
    key: "billing_visibility", category: "external_gate", authority: "global_platform", executionState: "blocked_by_BCA01",
    healthSources: ["commercial_plans", "commercial_entitlement_definitions", "tenant_billing_provider_mappings", "billing_events"], retryContract: "not applicable before BCA-01", idempotencyContract: "read-only visibility", externalExecutionProof: "not_implied_by_local_state",
  },
  domain_visibility: {
    key: "domain_visibility", category: "external_gate", authority: "global_platform", executionState: "blocked_by_DCA01",
    healthSources: ["tenants.dominio_principal", "configuration future gate state"], retryContract: "not applicable before DCA-01", idempotencyContract: "read-only visibility", externalExecutionProof: "not_implied_by_local_state",
  },
};

export const SUPER_CONTROL_PLANE_CONTRACT = {
  globalPlatformData: "direct_super_admin_authority",
  tenantScopedData: "explicit_impersonation_required",
  billingMutation: "deferred_to_BCA01",
  domainActivation: "deferred_to_DCA01",
  externalSuccessInference: false,
  operationCount: PLATFORM_OPERATION_KEYS.length,
} as const;
