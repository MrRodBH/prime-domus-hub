import type {
  TrackingAvailabilityState,
  TrackingConsentCategory,
  TrackingEventKey,
  TrackingProviderKey,
} from "@/lib/tracking/tracking-registry";

export type PublicTrackingConnectorDto = {
  providerKey: TrackingProviderKey;
  providerIdentifier: string;
  schemaVersion: 1;
  consentCategory: TrackingConsentCategory;
  availabilityState: TrackingAvailabilityState;
  configurationVersion: number;
  eventBindingVersion: number;
  bindings: Array<{ eventKey: TrackingEventKey; enabled: boolean }>;
};

export type PublicTrackingConsentConfigurationDto = {
  schemaVersion: 1;
  noticeEnabled: boolean;
  analyticsMode: "opt_in";
  marketingMode: "opt_in";
  policyRevision: number;
};

export type PublicTrackingCspContractDto = {
  strategy: "external_loader_module_no_inline_provider_script";
  nonceRequiredForProviderRuntime: false;
  wildcardOrigins: false;
  scriptOrigins: string[];
  connectOrigins: string[];
  imageOrigins: string[];
};

export type PublicTrackingSnapshotDto = {
  schemaVersion: 1;
  tenantResolution: "host_derived_server_authority";
  generatedAt: string;
  configurationRevision: number;
  connectors: PublicTrackingConnectorDto[];
  consent: PublicTrackingConsentConfigurationDto;
  csp: PublicTrackingCspContractDto;
  arbitraryTenantJavaScript: false;
  fakeProviderDelivery: false;
};

export type TrackingDispatchProviderResult = {
  providerKey: TrackingProviderKey;
  state:
    | "consent_required"
    | "inactive"
    | "provider_runtime_loaded"
    | "dispatch_attempted"
    | "csp_blocked"
    | "failed";
  errorCode: string | null;
};

export type TrackingDispatchResult = {
  eventKey: TrackingEventKey;
  payloadAccepted: true;
  providerResults: TrackingDispatchProviderResult[];
  externalDeliveryProved: false;
};
