// BCR-01 — Stripe test-mode BillingProvider adapter, server-only.
//
// Deliberately uses Stripe's documented HTTPS API instead of adding a package
// dependency. This keeps package.json/bun.lock untouched while retaining the
// provider-agnostic port. Webhook signatures are verified manually according to
// Stripe's documented t= / v1= HMAC-SHA256 scheme over `${timestamp}.${rawBody}`.

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import {
  BILLING_WEBHOOK_TOLERANCE_SECONDS,
  type BillingProviderCode,
  type BillingSubscriptionState,
  type NormalizedBillingEvent,
  type NormalizedBillingEventType,
  type ProviderSubscriptionObservation,
} from "@/lib/billing/billing-contracts";
import {
  BillingPortError,
  type BillingProvider,
  type CreateCheckoutSessionInput,
  type CreateCustomerPortalSessionInput,
  type EnsureProviderCustomerInput,
  type VerifiedProviderWebhook,
} from "@/lib/billing/billing-port.server";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const PROVIDER_CODE: BillingProviderCode = "stripe";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(
  value: unknown,
  code: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BillingPortError(code);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function unixSecondsToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function requireStripeSecretKey(): string {
  const secret = process.env.STRIPE_SECRET_KEY_BCA01;
  if (!secret) throw new BillingPortError("bcr01_stripe_secret_absent");

  if (secret.startsWith("sk_live_") || secret.startsWith("rk_live_")) {
    throw new BillingPortError("bcr01_stripe_live_secret_prohibited");
  }
  if (!secret.startsWith("sk_test_") && !secret.startsWith("rk_test_")) {
    throw new BillingPortError("bcr01_stripe_test_secret_required");
  }
  return secret;
}

function requireStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_BCA01;
  if (!secret || !secret.startsWith("whsec_") || secret.length < 10) {
    throw new BillingPortError("bcr01_stripe_webhook_secret_absent_or_invalid");
  }
  return secret;
}

function authHeader(secret: string): string {
  return `Basic ${Buffer.from(`${secret}:`, "utf8").toString("base64")}`;
}

function appendFormValue(
  form: URLSearchParams,
  key: string,
  value: string | number | boolean | null | undefined,
): void {
  if (value === null || value === undefined) return;
  form.append(key, String(value));
}

async function stripeRequest(
  method: "GET" | "POST",
  path: string,
  options?: {
    readonly form?: URLSearchParams;
    readonly idempotencyKey?: string;
  },
): Promise<JsonObject> {
  const secret = requireStripeSecretKey();
  const headers = new Headers({
    Authorization: authHeader(secret),
  });

  if (method === "POST") {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }
  if (options?.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers,
    body: method === "POST" ? options?.form?.toString() ?? "" : undefined,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BillingPortError("bcr01_stripe_response_not_json");
  }

  if (!response.ok) {
    // Never return Stripe's message/body: it can contain provider or customer
    // details. Keep the application error vocabulary deterministic and sanitized.
    throw new BillingPortError(`bcr01_stripe_http_${response.status}`);
  }
  if (!isObject(payload)) {
    throw new BillingPortError("bcr01_stripe_response_shape_invalid");
  }
  if (payload.livemode === true) {
    throw new BillingPortError("bcr01_stripe_live_object_prohibited");
  }
  return payload;
}

function providerObjectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (isObject(value) && typeof value.id === "string") return value.id;
  return null;
}

function mapStripeSubscriptionState(status: unknown): {
  state: BillingSubscriptionState;
  requiresReconciliation: boolean;
} {
  switch (status) {
    case "trialing":
      return { state: "trialing", requiresReconciliation: false };
    case "active":
      return { state: "active", requiresReconciliation: false };
    case "past_due":
      return { state: "past_due", requiresReconciliation: false };
    case "canceled":
      return { state: "canceled", requiresReconciliation: false };
    case "incomplete":
      return { state: "past_due", requiresReconciliation: true };
    case "incomplete_expired":
      return { state: "canceled", requiresReconciliation: true };
    case "unpaid":
    case "paused":
      return { state: "suspended", requiresReconciliation: true };
    default:
      throw new BillingPortError("bcr01_stripe_subscription_status_unknown");
  }
}

function extractSingleSubscriptionPriceRef(subscription: JsonObject): string {
  const items = subscription.items;
  if (!isObject(items) || !Array.isArray(items.data) || items.data.length !== 1) {
    throw new BillingPortError("bcr01_stripe_subscription_item_cardinality_invalid");
  }
  const item = items.data[0];
  if (!isObject(item) || !isObject(item.price)) {
    throw new BillingPortError("bcr01_stripe_subscription_price_absent");
  }
  return requireString(item.price.id, "bcr01_stripe_subscription_price_absent");
}

function observationFromSubscription(
  subscription: JsonObject,
): ProviderSubscriptionObservation {
  if (subscription.livemode === true) {
    throw new BillingPortError("bcr01_stripe_live_object_prohibited");
  }

  const { state, requiresReconciliation } = mapStripeSubscriptionState(
    subscription.status,
  );
  const customerRef = providerObjectId(subscription.customer);
  if (!customerRef) {
    throw new BillingPortError("bcr01_stripe_subscription_customer_absent");
  }

  const items = isObject(subscription.items) && Array.isArray(subscription.items.data)
    ? subscription.items.data
    : [];
  const firstItem = items.length === 1 && isObject(items[0]) ? items[0] : null;

  return {
    providerSubscriptionRef: requireString(
      subscription.id,
      "bcr01_stripe_subscription_id_absent",
    ),
    providerCustomerRef: customerRef,
    providerPriceRef: extractSingleSubscriptionPriceRef(subscription),
    subscriptionState: state,
    requiresReconciliation,
    currentPeriodStart:
      unixSecondsToIso(subscription.current_period_start) ??
      unixSecondsToIso(firstItem?.current_period_start),
    currentPeriodEnd:
      unixSecondsToIso(subscription.current_period_end) ??
      unixSecondsToIso(firstItem?.current_period_end),
    canceledAt: unixSecondsToIso(subscription.canceled_at),
    observedAt: new Date().toISOString(),
  };
}

function parseStripeSignatureHeader(header: string): {
  timestamp: number;
  v1: string[];
} {
  let timestamp: number | null = null;
  const v1: string[] = [];

  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t" && /^\d+$/.test(value)) timestamp = Number(value);
    if (key === "v1" && /^[0-9a-f]{64}$/i.test(value)) v1.push(value.toLowerCase());
  }

  if (!timestamp || !Number.isSafeInteger(timestamp) || v1.length === 0) {
    throw new BillingPortError("bcr01_stripe_signature_header_invalid");
  }
  return { timestamp, v1 };
}

function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): void {
  if (!signatureHeader) {
    throw new BillingPortError("bcr01_stripe_signature_absent");
  }

  const parsed = parseStripeSignatureHeader(signatureHeader);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    Math.abs(nowSeconds - parsed.timestamp) >
    BILLING_WEBHOOK_TOLERANCE_SECONDS
  ) {
    throw new BillingPortError("bcr01_stripe_signature_timestamp_outside_tolerance");
  }

  const expectedHex = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expected = Buffer.from(expectedHex, "hex");

  const matched = parsed.v1.some((candidateHex) => {
    const candidate = Buffer.from(candidateHex, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });

  if (!matched) {
    throw new BillingPortError("bcr01_stripe_signature_invalid");
  }
}

function normalizedEventType(type: string): NormalizedBillingEventType {
  switch (type) {
    case "checkout.session.completed":
      return "CheckoutCompleted";
    case "customer.subscription.created":
      return "SubscriptionCreated";
    case "customer.subscription.updated":
      return "SubscriptionUpdated";
    case "customer.subscription.deleted":
      return "SubscriptionCanceled";
    case "invoice.paid":
      return "InvoicePaid";
    case "invoice.payment_failed":
      return "InvoicePaymentFailed";
    case "customer.subscription.trial_will_end":
      return "TrialEnding";
    case "charge.refunded":
      return "ChargeRefunded";
    default:
      return "Unknown";
  }
}

function sanitizedObjectSummary(
  providerEventType: string,
  object: JsonObject,
): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    providerEventType,
    objectId: optionalString(object.id),
    objectType: optionalString(object.object),
    status: optionalString(object.status),
    livemode: object.livemode === true,
  };
  // No email/name/address/payment/card/billing detail is persisted.
  return summary;
}

function subscriptionFromEventObject(
  providerEventType: string,
  object: JsonObject,
): ProviderSubscriptionObservation | null {
  if (!providerEventType.startsWith("customer.subscription.")) return null;
  return observationFromSubscription(object);
}

export function createStripeBillingProvider(): BillingProvider {
  return {
    code: PROVIDER_CODE,

    async ensureCustomer(
      input: EnsureProviderCustomerInput,
    ) {
      const form = new URLSearchParams();
      appendFormValue(form, "name", input.tenantName.slice(0, 256));
      // Diagnostic only. Runtime tenant authority is the persisted RM Prime
      // provider-customer mapping, never this provider metadata.
      appendFormValue(form, "metadata[rm_prime_tenant_id]", input.tenantId);
      appendFormValue(form, "metadata[rm_prime_stage]", "BCR-01");

      const customer = await stripeRequest("POST", "/customers", {
        form,
        idempotencyKey: input.idempotencyKey,
      });
      return {
        providerCustomerRef: requireString(
          customer.id,
          "bcr01_stripe_customer_id_absent",
        ),
      };
    },

    async createCheckoutSession(
      input: CreateCheckoutSessionInput,
    ) {
      const form = new URLSearchParams();
      appendFormValue(form, "mode", "subscription");
      appendFormValue(form, "customer", input.providerCustomerRef);
      appendFormValue(form, "line_items[0][price]", input.providerPriceRef);
      appendFormValue(form, "line_items[0][quantity]", 1);
      appendFormValue(form, "success_url", input.successUrl);
      appendFormValue(form, "cancel_url", input.cancelUrl);
      appendFormValue(form, "client_reference_id", input.tenantId);
      appendFormValue(form, "subscription_data[metadata][rm_prime_stage]", "BCR-01");

      const session = await stripeRequest("POST", "/checkout/sessions", {
        form,
        idempotencyKey: input.idempotencyKey,
      });
      return {
        providerSessionId: requireString(
          session.id,
          "bcr01_stripe_checkout_session_id_absent",
        ),
        redirectUrl: requireString(
          session.url,
          "bcr01_stripe_checkout_url_absent",
        ),
      };
    },

    async createCustomerPortalSession(
      input: CreateCustomerPortalSessionInput,
    ) {
      const form = new URLSearchParams();
      appendFormValue(form, "customer", input.providerCustomerRef);
      appendFormValue(form, "return_url", input.returnUrl);

      const session = await stripeRequest(
        "POST",
        "/billing_portal/sessions",
        { form },
      );
      return {
        redirectUrl: requireString(
          session.url,
          "bcr01_stripe_portal_url_absent",
        ),
      };
    },

    async verifyWebhook(
      rawBody: string,
      signatureHeader: string | null,
    ): Promise<VerifiedProviderWebhook> {
      const secret = requireStripeWebhookSecret();
      verifyStripeSignature(rawBody, signatureHeader, secret);

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        throw new BillingPortError("bcr01_stripe_webhook_json_invalid");
      }
      if (!isObject(payload) || !isObject(payload.data)) {
        throw new BillingPortError("bcr01_stripe_webhook_shape_invalid");
      }
      if (payload.livemode === true) {
        throw new BillingPortError("bcr01_stripe_live_webhook_prohibited");
      }

      return {
        providerEventId: requireString(
          payload.id,
          "bcr01_stripe_event_id_absent",
        ),
        providerEventType: requireString(
          payload.type,
          "bcr01_stripe_event_type_absent",
        ),
        occurredAt: unixSecondsToIso(payload.created),
        payload,
        payloadHash: createHash("sha256")
          .update(rawBody, "utf8")
          .digest("hex"),
      };
    },

    normalizeWebhook(
      verified: VerifiedProviderWebhook,
    ): NormalizedBillingEvent {
      if (!isObject(verified.payload) || !isObject(verified.payload.data)) {
        throw new BillingPortError("bcr01_stripe_webhook_shape_invalid");
      }
      const object = verified.payload.data.object;
      if (!isObject(object)) {
        throw new BillingPortError("bcr01_stripe_event_object_invalid");
      }
      if (object.livemode === true) {
        throw new BillingPortError("bcr01_stripe_live_object_prohibited");
      }

      const observation = subscriptionFromEventObject(
        verified.providerEventType,
        object,
      );

      return {
        providerCode: PROVIDER_CODE,
        providerEventId: verified.providerEventId,
        eventType: normalizedEventType(verified.providerEventType),
        occurredAt: verified.occurredAt,
        payloadHash: verified.payloadHash,
        payloadSanitized: sanitizedObjectSummary(
          verified.providerEventType,
          object,
        ),
        providerCustomerRef:
          observation?.providerCustomerRef ?? providerObjectId(object.customer),
        providerSubscriptionRef:
          observation?.providerSubscriptionRef ??
          providerObjectId(object.subscription),
        providerPriceRef: observation?.providerPriceRef ?? null,
        subscriptionState: observation?.subscriptionState ?? null,
        requiresReconciliation:
          observation?.requiresReconciliation ?? false,
        currentPeriodStart: observation?.currentPeriodStart ?? null,
        currentPeriodEnd: observation?.currentPeriodEnd ?? null,
        canceledAt: observation?.canceledAt ?? null,
      };
    },

    async retrieveSubscription(
      providerSubscriptionRef: string,
    ): Promise<ProviderSubscriptionObservation> {
      const subscription = await stripeRequest(
        "GET",
        `/subscriptions/${encodeURIComponent(providerSubscriptionRef)}`,
      );
      return observationFromSubscription(subscription);
    },
  };
}
