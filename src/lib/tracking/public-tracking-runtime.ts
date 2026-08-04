import {
  assertTrackingProviderPublishable,
  getTrackingEventDefinition,
  getTrackingProviderDefinition,
  parseTrackingEventPayload,
  type TrackingEventKey,
  type TrackingPayload,
  type TrackingProviderKey,
} from "@/lib/tracking/tracking-registry";
import type {
  PublicTrackingConnectorDto,
  PublicTrackingSnapshotDto,
  TrackingDispatchProviderResult,
  TrackingDispatchResult,
} from "@/lib/tracking/tracking-contracts";
import {
  trackingConsentAllows,
  type TrackingConsentState,
} from "@/lib/tracking/tracking-consent";

type RuntimeFunction = ((...args: unknown[]) => void) & {
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

type TrackingWindow = Window & {
  dataLayer?: unknown[];
  gtag?: RuntimeFunction;
  fbq?: RuntimeFunction;
  _fbq?: RuntimeFunction;
  __rmPrimeTrackingLoaded?: Partial<Record<TrackingProviderKey, string>>;
};

const SCRIPT_ID: Record<TrackingProviderKey, string> = {
  META_PIXEL: "rmprime-tracking-meta-pixel",
  GOOGLE_ANALYTICS: "rmprime-tracking-google-analytics",
  GOOGLE_TAG_MANAGER: "rmprime-tracking-google-tag-manager",
};

function trackingWindow(): TrackingWindow {
  if (typeof window === "undefined") throw new Error("tracking_browser_runtime_required");
  return window as TrackingWindow;
}

function appendExternalScript(input: {
  id: string;
  src: string;
  allowedOrigin: string;
}): Promise<void> {
  const parsed = new URL(input.src);
  if (parsed.origin !== input.allowedOrigin) throw new Error("tracking_script_origin_not_allowed");
  const existing = document.getElementById(input.id) as HTMLScriptElement | null;
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = input.id;
    script.async = true;
    script.src = parsed.toString();
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("tracking_provider_script_load_failed")), { once: true });
    document.head.appendChild(script);
  });
}

function ensureMetaQueue(target: TrackingWindow): RuntimeFunction {
  if (typeof target.fbq === "function") return target.fbq;
  const queue: unknown[][] = [];
  const fbq: RuntimeFunction = (...args: unknown[]) => { queue.push(args); };
  fbq.queue = queue;
  fbq.loaded = false;
  fbq.version = "2.0";
  target.fbq = fbq;
  target._fbq = fbq;
  return fbq;
}

function ensureGoogleQueue(target: TrackingWindow): RuntimeFunction {
  target.dataLayer = target.dataLayer ?? [];
  if (typeof target.gtag === "function") return target.gtag;
  const gtag: RuntimeFunction = (...args: unknown[]) => { target.dataLayer?.push(args); };
  target.gtag = gtag;
  return gtag;
}

async function loadMetaPixel(identifier: string): Promise<void> {
  const target = trackingWindow();
  const fbq = ensureMetaQueue(target);
  await appendExternalScript({
    id: SCRIPT_ID.META_PIXEL,
    src: "https://connect.facebook.net/en_US/fbevents.js",
    allowedOrigin: "https://connect.facebook.net",
  });
  fbq.loaded = true;
  fbq("init", identifier);
}

async function loadGoogleAnalytics(identifier: string): Promise<void> {
  const target = trackingWindow();
  const gtag = ensureGoogleQueue(target);
  await appendExternalScript({
    id: SCRIPT_ID.GOOGLE_ANALYTICS,
    src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(identifier)}`,
    allowedOrigin: "https://www.googletagmanager.com",
  });
  gtag("js", new Date());
  gtag("config", identifier, { send_page_view: false, allow_google_signals: false });
}

export async function ensureTrackingProviderLoaded(
  connector: PublicTrackingConnectorDto,
): Promise<"provider_runtime_loaded"> {
  const definition = getTrackingProviderDefinition(connector.providerKey);
  assertTrackingProviderPublishable(definition.providerKey);
  if (connector.availabilityState === "csp_blocked") throw new Error("tracking_csp_blocked");

  const target = trackingWindow();
  target.__rmPrimeTrackingLoaded = target.__rmPrimeTrackingLoaded ?? {};
  const loadedIdentifier = target.__rmPrimeTrackingLoaded[connector.providerKey];
  if (loadedIdentifier === connector.providerIdentifier) return "provider_runtime_loaded";
  if (loadedIdentifier && loadedIdentifier !== connector.providerIdentifier) {
    throw new Error("tracking_duplicate_provider_configuration");
  }
  if (connector.providerKey === "META_PIXEL") await loadMetaPixel(connector.providerIdentifier);
  if (connector.providerKey === "GOOGLE_ANALYTICS") await loadGoogleAnalytics(connector.providerIdentifier);
  if (connector.providerKey === "GOOGLE_TAG_MANAGER") throw new Error("tracking_csp_blocked");
  target.__rmPrimeTrackingLoaded[connector.providerKey] = connector.providerIdentifier;
  return "provider_runtime_loaded";
}

function dispatchToProvider(
  connector: PublicTrackingConnectorDto,
  eventKey: TrackingEventKey,
  payload: TrackingPayload,
): void {
  const target = trackingWindow();
  const eventDefinition = getTrackingEventDefinition(eventKey);
  const providerEvent = eventDefinition.providerMappings[connector.providerKey];
  if (!providerEvent) throw new Error("tracking_provider_event_mapping_missing");
  if (connector.providerKey === "META_PIXEL") {
    if (typeof target.fbq !== "function") throw new Error("tracking_meta_runtime_missing");
    target.fbq("track", providerEvent, payload);
    return;
  }
  if (connector.providerKey === "GOOGLE_ANALYTICS") {
    if (typeof target.gtag !== "function") throw new Error("tracking_ga_runtime_missing");
    target.gtag("event", providerEvent, payload);
    return;
  }
  throw new Error("tracking_csp_blocked");
}

export async function dispatchCataloguedTrackingEvent(input: {
  snapshot: PublicTrackingSnapshotDto;
  consent: TrackingConsentState;
  eventKey: TrackingEventKey;
  payload: unknown;
}): Promise<TrackingDispatchResult> {
  const definition = getTrackingEventDefinition(input.eventKey);
  const payload = parseTrackingEventPayload(input.eventKey, input.payload);
  const providerResults: TrackingDispatchProviderResult[] = [];

  for (const connector of input.snapshot.connectors) {
    const binding = connector.bindings.find((item) => item.eventKey === input.eventKey);
    if (!binding?.enabled || !definition.providerMappings[connector.providerKey]) continue;
    const providerDefinition = getTrackingProviderDefinition(connector.providerKey);
    if (providerDefinition.availabilityState === "csp_blocked" || connector.availabilityState === "csp_blocked") {
      providerResults.push({
        providerKey: connector.providerKey,
        state: "csp_blocked",
        errorCode: "tracking_csp_blocked",
      });
      continue;
    }
    if (!trackingConsentAllows(input.consent, connector.consentCategory)) {
      providerResults.push({ providerKey: connector.providerKey, state: "consent_required", errorCode: null });
      continue;
    }
    if (connector.availabilityState !== "active" && connector.availabilityState !== "preview_ready") {
      providerResults.push({ providerKey: connector.providerKey, state: "inactive", errorCode: null });
      continue;
    }
    try {
      await ensureTrackingProviderLoaded(connector);
      dispatchToProvider(connector, input.eventKey, payload);
      providerResults.push({ providerKey: connector.providerKey, state: "dispatch_attempted", errorCode: null });
    } catch (error) {
      const errorCode = error instanceof Error ? error.message.slice(0, 120) : "tracking_runtime_failed";
      providerResults.push({
        providerKey: connector.providerKey,
        state: errorCode === "tracking_csp_blocked" ? "csp_blocked" : "failed",
        errorCode,
      });
    }
  }

  return {
    eventKey: input.eventKey,
    payloadAccepted: true,
    providerResults,
    externalDeliveryProved: false,
  };
}

export function removeTrackingProviderRuntime(providerKey: TrackingProviderKey): void {
  if (typeof document !== "undefined") document.getElementById(SCRIPT_ID[providerKey])?.remove();
  if (typeof window === "undefined") return;
  const target = window as TrackingWindow;
  if (target.__rmPrimeTrackingLoaded) delete target.__rmPrimeTrackingLoaded[providerKey];
  if (providerKey === "META_PIXEL") {
    delete target.fbq;
    delete target._fbq;
  }
  if (providerKey === "GOOGLE_ANALYTICS") delete target.gtag;
  if (providerKey === "GOOGLE_TAG_MANAGER" || providerKey === "GOOGLE_ANALYTICS") target.dataLayer = [];
}

export function removeAllTrackingProviderRuntimes(): void {
  for (const providerKey of Object.keys(SCRIPT_ID) as TrackingProviderKey[]) {
    removeTrackingProviderRuntime(providerKey);
  }
}
