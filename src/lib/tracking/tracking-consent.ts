import type { TrackingConsentCategory } from "@/lib/tracking/tracking-registry";

export const TRACKING_CONSENT_STORAGE_KEY = "rmp_tracking_consent_v1";
export const TRACKING_CONSENT_EVENT = "rmprime:tracking-consent";

export type TrackingConsentChoice = {
  schemaVersion: 1;
  policyRevision: number;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
  source: "user_choice";
};

export type TrackingConsentState =
  | { status: "unknown"; choice: null }
  | { status: "granted_or_restricted"; choice: TrackingConsentChoice };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function parseChoice(input: unknown, expectedPolicyRevision: number): TrackingConsentChoice | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (
    value.schemaVersion !== 1 ||
    value.policyRevision !== expectedPolicyRevision ||
    typeof value.analytics !== "boolean" ||
    typeof value.marketing !== "boolean" ||
    typeof value.decidedAt !== "string" ||
    value.source !== "user_choice"
  ) return null;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value.decidedAt)) return null;
  return {
    schemaVersion: 1,
    policyRevision: expectedPolicyRevision,
    analytics: value.analytics,
    marketing: value.marketing,
    decidedAt: value.decidedAt,
    source: "user_choice",
  };
}

export function readTrackingConsent(expectedPolicyRevision: number): TrackingConsentState {
  const target = storage();
  if (!target) return { status: "unknown", choice: null };
  try {
    const raw = target.getItem(TRACKING_CONSENT_STORAGE_KEY);
    if (!raw) return { status: "unknown", choice: null };
    const parsed = parseChoice(JSON.parse(raw), expectedPolicyRevision);
    if (!parsed) {
      target.removeItem(TRACKING_CONSENT_STORAGE_KEY);
      return { status: "unknown", choice: null };
    }
    return { status: "granted_or_restricted", choice: parsed };
  } catch {
    return { status: "unknown", choice: null };
  }
}

export function saveTrackingConsent(input: {
  policyRevision: number;
  analytics: boolean;
  marketing: boolean;
}): TrackingConsentChoice {
  if (!Number.isSafeInteger(input.policyRevision) || input.policyRevision < 1) {
    throw new Error("tracking_consent_policy_revision_invalid");
  }
  const choice: TrackingConsentChoice = {
    schemaVersion: 1,
    policyRevision: input.policyRevision,
    analytics: input.analytics,
    marketing: input.marketing,
    decidedAt: new Date().toISOString(),
    source: "user_choice",
  };
  const target = storage();
  if (target) target.setItem(TRACKING_CONSENT_STORAGE_KEY, JSON.stringify(choice));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRACKING_CONSENT_EVENT, { detail: choice }));
  }
  return choice;
}

export function clearTrackingConsent(): void {
  storage()?.removeItem(TRACKING_CONSENT_STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRACKING_CONSENT_EVENT, { detail: null }));
  }
}

export function trackingConsentAllows(
  state: TrackingConsentState,
  category: TrackingConsentCategory,
): boolean {
  if (state.status !== "granted_or_restricted" || !state.choice) return false;
  return category === "ANALYTICS" ? state.choice.analytics : state.choice.marketing;
}
