// BCR-01 - Stripe test-mode BillingProvider adapter, server-only.
// Uses the pinned official stripe-node SDK. Provider objects are observations/
// consequences only; internal persisted mappings remain tenant/commercial authority.

import { createHash } from "node:crypto";
import Stripe from "stripe";
import {
  BILLING_WEBHOOK_TOLERANCE_SECONDS,
  type BillingProviderCode,
  type BillingSubscriptionState,
  type NormalizedBillingEvent,
  type NormalizedBillingEventType,
  type ProviderInvoiceObservation,
  type ProviderSubscriptionObservation,
} from "@/lib/billing/billing-contracts";
import {
  BillingPortError,
  type BillingProvider,
  type CreateCheckoutSessionInput,
  type CreateCustomerPortalSessionInput,
  type CreateStandaloneInvoiceInput,
  type EnsureProviderCustomerInput,
  type VerifiedProviderWebhook,
} from "@/lib/billing/billing-port.server";

const PROVIDER_CODE: BillingProviderCode = "stripe";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value: unknown, code: string): JsonObject {
  if (!isObject(value)) throw new BillingPortError(code);
  return value;
}

function requireString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BillingPortError(code);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function providerObjectId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (isObject(value) && typeof value.id === "string" && value.id.length > 0) {
    return value.id;
  }
  return null;
}

function unixSecondsToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function requireStripeSecretKey(): string {
  const secret = process.env.STRIPE_SECRET_KEY;
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !secret.startsWith("whsec_") || secret.length < 10) {
    throw new BillingPortError("bcr01_stripe_webhook_secret_absent_or_invalid");
  }
  return secret;
}

function createStripeClient(): Stripe {
  return new Stripe(requireStripeSecretKey(), {
    maxNetworkRetries: 0,
  });
}

function ensureTestModeObject(value: unknown): JsonObject {
  const object = requireObject(value, "bcr01_stripe_response_shape_invalid");
  if (object.livemode === true) {
    throw new BillingPortError("bcr01_stripe_live_object_prohibited");
  }
  return object;
}

function providerIdempotencyKey(scope: string, source: string): string {
  const digest = createHash("sha256").update(source, "utf8").digest("hex");
  return `bcr01:${scope}:${digest}`;
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
    throw new BillingPortError(
      "bcr01_stripe_subscription_item_cardinality_invalid",
    );
  }
  const item = items.data[0];
  if (!isObject(item) || !isObject(item.price)) {
    throw new BillingPortError("bcr01_stripe_subscription_price_absent");
  }
  return requireString(
    item.price.id,
    "bcr01_stripe_subscription_price_absent",
  );
}

function subscriptionRefFromObject(object: JsonObject): string | null {
  const direct = providerObjectId(object.subscription);
  if (direct) return direct;

  const parent = isObject(object.parent) ? object.parent : null;
  const details =
    parent && isObject(parent.subscription_details)
      ? parent.subscription_details
      : null;
  return details ? providerObjectId(details.subscription) : null;
}

function observationFromSubscription(
  value: unknown,
): ProviderSubscriptionObservation {
  const subscription = ensureTestModeObject(value);
  const { state, requiresReconciliation } = mapStripeSubscriptionState(
    subscription.status,
  );
  const customerRef = providerObjectId(subscription.customer);
  if (!customerRef) {
    throw new BillingPortError("bcr01_stripe_subscription_customer_absent");
  }

  const items =
    isObject(subscription.items) && Array.isArray(subscription.items.data)
      ? subscription.items.data
      : [];
  const firstItem =
    items.length === 1 && isObject(items[0]) ? items[0] : null;

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

function mapInvoiceStatus(value: unknown): ProviderInvoiceObservation["status"] {
  switch (value) {
    case "draft":
    case "open":
      return "open";
    case "paid":
      return "paid";
    case "uncollectible":
      return "failed";
    case "void":
      return "void";
    default:
      throw new BillingPortError("bcr01_stripe_invoice_status_unknown");
  }
}

async function resolveInvoicePaymentObservation(
  stripe: Stripe,
  providerInvoiceRef: string,
): Promise<{
  providerPaymentRef: string | null;
  fullyRefunded: boolean;
}> {
  const payments = await stripe.invoicePayments.list({
    invoice: providerInvoiceRef,
    limit: 2,
  });

  if (payments.has_more || payments.data.length > 1) {
    throw new BillingPortError(
      "bcr01_stripe_invoice_payment_cardinality_ambiguous",
    );
  }
  if (payments.data.length === 0) {
    return { providerPaymentRef: null, fullyRefunded: false };
  }

  const payment = payments.data[0];
  if (payment.livemode) {
    throw new BillingPortError("bcr01_stripe_live_object_prohibited");
  }
  const invoiceRef = providerObjectId(payment.invoice);
  if (invoiceRef !== providerInvoiceRef) {
    throw new BillingPortError(
      "bcr01_stripe_invoice_payment_identity_mismatch",
    );
  }

  if (payment.payment.type === "payment_intent") {
    const paymentIntentRef = providerObjectId(
      payment.payment.payment_intent,
    );
    if (!paymentIntentRef) {
      throw new BillingPortError(
        "bcr01_stripe_invoice_payment_intent_absent",
      );
    }

    const paymentIntent = ensureTestModeObject(
      await stripe.paymentIntents.retrieve(paymentIntentRef),
    );
    if (paymentIntent.id !== paymentIntentRef) {
      throw new BillingPortError(
        "bcr01_stripe_payment_intent_identity_mismatch",
      );
    }

    const chargeRef = providerObjectId(paymentIntent.latest_charge);
    if (!chargeRef) {
      return {
        providerPaymentRef: paymentIntentRef,
        fullyRefunded: false,
      };
    }

    const charge = ensureTestModeObject(
      await stripe.charges.retrieve(chargeRef),
    );
    const chargePaymentIntentRef = providerObjectId(
      charge.payment_intent,
    );
    if (
      chargePaymentIntentRef &&
      chargePaymentIntentRef !== paymentIntentRef
    ) {
      throw new BillingPortError(
        "bcr01_stripe_charge_payment_intent_mismatch",
      );
    }

    const amount =
      typeof charge.amount === "number" &&
      Number.isSafeInteger(charge.amount)
        ? charge.amount
        : null;
    const amountRefunded =
      typeof charge.amount_refunded === "number" &&
      Number.isSafeInteger(charge.amount_refunded)
        ? charge.amount_refunded
        : null;

    return {
      providerPaymentRef: paymentIntentRef,
      fullyRefunded:
        charge.refunded === true ||
        (amount !== null &&
          amount > 0 &&
          amountRefunded !== null &&
          amountRefunded === amount),
    };
  }

  if (payment.payment.type === "charge") {
    const chargeRef = providerObjectId(payment.payment.charge);
    if (!chargeRef) {
      throw new BillingPortError(
        "bcr01_stripe_invoice_charge_absent",
      );
    }
    const charge = ensureTestModeObject(
      await stripe.charges.retrieve(chargeRef),
    );
    const amount =
      typeof charge.amount === "number" &&
      Number.isSafeInteger(charge.amount)
        ? charge.amount
        : null;
    const amountRefunded =
      typeof charge.amount_refunded === "number" &&
      Number.isSafeInteger(charge.amount_refunded)
        ? charge.amount_refunded
        : null;

    return {
      providerPaymentRef: chargeRef,
      fullyRefunded:
        charge.refunded === true ||
        (amount !== null &&
          amount > 0 &&
          amountRefunded !== null &&
          amountRefunded === amount),
    };
  }

  return {
    providerPaymentRef: providerObjectId(
      payment.payment.payment_record,
    ),
    fullyRefunded: false,
  };
}

function observationFromInvoice(value: unknown): ProviderInvoiceObservation {
  const invoice = ensureTestModeObject(value);
  const customerRef = providerObjectId(invoice.customer);
  if (!customerRef) {
    throw new BillingPortError("bcr01_stripe_invoice_customer_absent");
  }

  const currency =
    typeof invoice.currency === "string" && /^[a-zA-Z]{3}$/.test(invoice.currency)
      ? invoice.currency.toUpperCase()
      : null;

  return {
    providerInvoiceRef: requireString(
      invoice.id,
      "bcr01_stripe_invoice_id_absent",
    ),
    providerCustomerRef: customerRef,
    providerSubscriptionRef: subscriptionRefFromObject(invoice),
    providerPaymentRef:
      providerObjectId(invoice.payment_intent) ??
      providerObjectId(invoice.charge),
    status: mapInvoiceStatus(invoice.status),
    amountPaidMinor:
      typeof invoice.amount_paid === "number" &&
      Number.isSafeInteger(invoice.amount_paid)
        ? invoice.amount_paid
        : null,
    currency,
    hostedInvoiceUrl: optionalString(invoice.hosted_invoice_url),
    observedAt: new Date().toISOString(),
  };
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
  return {
    providerEventType,
    objectId: optionalString(object.id),
    objectType: optionalString(object.object),
    status: optionalString(object.status),
    livemode: object.livemode === true,
  };
}

function subscriptionFromEventObject(
  providerEventType: string,
  object: JsonObject,
): ProviderSubscriptionObservation | null {
  if (!providerEventType.startsWith("customer.subscription.")) return null;
  return observationFromSubscription(object);
}

function invoiceRefsFromEvent(
  eventType: NormalizedBillingEventType,
  object: JsonObject,
): {
  providerInvoiceRef: string | null;
  providerPaymentRef: string | null;
} {
  if (eventType === "InvoicePaid" || eventType === "InvoicePaymentFailed") {
    return {
      providerInvoiceRef: providerObjectId(object.id),
      providerPaymentRef:
        providerObjectId(object.payment_intent) ??
        providerObjectId(object.charge),
    };
  }

  if (eventType === "ChargeRefunded") {
    return {
      providerInvoiceRef: null,
      providerPaymentRef: providerObjectId(object.payment_intent),
    };
  }

  return {
    providerInvoiceRef: null,
    providerPaymentRef: null,
  };
}

export function createStripeBillingProvider(): BillingProvider {
  return {
    code: PROVIDER_CODE,

    async ensureCustomer(input: EnsureProviderCustomerInput) {
      const stripe = createStripeClient();
      const customer = await stripe.customers.create(
        {
          name: input.tenantName.slice(0, 256),
          // Diagnostic only. Persisted RM Prime mappings remain authority.
          metadata: {
            rm_prime_tenant_id: input.tenantId,
            rm_prime_stage: "BCR-01",
          },
        },
        { idempotencyKey: input.idempotencyKey },
      );

      return {
        providerCustomerRef: requireString(
          customer.id,
          "bcr01_stripe_customer_id_absent",
        ),
      };
    },

    async createCheckoutSession(input: CreateCheckoutSessionInput) {
      const stripe = createStripeClient();
      const session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer: input.providerCustomerRef,
          line_items: [{ price: input.providerPriceRef, quantity: 1 }],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          client_reference_id: input.tenantId,
          subscription_data: {
            metadata: {
              rm_prime_stage: "BCR-01",
            },
          },
        },
        { idempotencyKey: input.idempotencyKey },
      );

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

    async createCustomerPortalSession(input: CreateCustomerPortalSessionInput) {
      const stripe = createStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: input.providerCustomerRef,
        return_url: input.returnUrl,
      });

      return {
        redirectUrl: requireString(
          session.url,
          "bcr01_stripe_portal_url_absent",
        ),
      };
    },

    async createStandaloneInvoice(input: CreateStandaloneInvoiceInput) {
      if (
        !/^[A-Z]{3}$/.test(input.currency) ||
        input.items.length === 0 ||
        input.items.some(
          (item) =>
            !Number.isSafeInteger(item.amountTotalMinor) ||
            item.amountTotalMinor <= 0 ||
            item.description.trim().length === 0,
        )
      ) {
        throw new BillingPortError("bcr01_stripe_invoice_input_invalid");
      }

      const stripe = createStripeClient();
      const invoiceKey = providerIdempotencyKey(
        "invoice",
        `${input.idempotencyKey}:${input.chargeIntentId}`,
      );

      const invoice = await stripe.invoices.create(
        {
          customer: input.providerCustomerRef,
          collection_method: "send_invoice",
          days_until_due: 7,
          auto_advance: false,
          metadata: {
            rm_prime_charge_intent_id: input.chargeIntentId,
            rm_prime_stage: "BCR-01",
          },
        },
        { idempotencyKey: invoiceKey },
      );

      const providerInvoiceRef = requireString(
        invoice.id,
        "bcr01_stripe_invoice_id_absent",
      );

      for (const item of input.items) {
        await stripe.invoiceItems.create(
          {
            customer: input.providerCustomerRef,
            invoice: providerInvoiceRef,
            amount: item.amountTotalMinor,
            currency: input.currency.toLowerCase(),
            description: item.description.slice(0, 500),
            metadata: {
              rm_prime_charge_item_id: item.itemId,
              rm_prime_charge_intent_id: input.chargeIntentId,
            },
          },
          {
            idempotencyKey: providerIdempotencyKey(
              "invoice-item",
              `${input.idempotencyKey}:${item.itemId}`,
            ),
          },
        );
      }

      const finalized = await stripe.invoices.finalizeInvoice(
        providerInvoiceRef,
        { auto_advance: false },
        {
          idempotencyKey: providerIdempotencyKey(
            "invoice-finalize",
            input.idempotencyKey,
          ),
        },
      );

      const sent = await stripe.invoices.sendInvoice(
        providerInvoiceRef,
        {},
        {
          idempotencyKey: providerIdempotencyKey(
            "invoice-send",
            input.idempotencyKey,
          ),
        },
      );

      return {
        providerInvoiceRef,
        redirectUrl: requireString(
          sent.hosted_invoice_url ?? finalized.hosted_invoice_url,
          "bcr01_stripe_hosted_invoice_url_absent",
        ),
      };
    },

    async verifyWebhook(
      rawBody: string,
      signatureHeader: string | null,
    ): Promise<VerifiedProviderWebhook> {
      if (!signatureHeader) {
        throw new BillingPortError("bcr01_stripe_signature_absent");
      }

      const stripe = createStripeClient();
      const secret = requireStripeWebhookSecret();

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signatureHeader,
          secret,
          BILLING_WEBHOOK_TOLERANCE_SECONDS,
        );
      } catch {
        throw new BillingPortError("bcr01_stripe_signature_invalid");
      }

      if (event.livemode) {
        throw new BillingPortError("bcr01_stripe_live_webhook_prohibited");
      }

      return {
        providerEventId: requireString(
          event.id,
          "bcr01_stripe_event_id_absent",
        ),
        providerEventType: requireString(
          event.type,
          "bcr01_stripe_event_type_absent",
        ),
        occurredAt: unixSecondsToIso(event.created),
        payload: event,
        payloadHash: createHash("sha256")
          .update(rawBody, "utf8")
          .digest("hex"),
      };
    },

    normalizeWebhook(
      verified: VerifiedProviderWebhook,
    ): NormalizedBillingEvent {
      const payload = ensureTestModeObject(verified.payload);
      const data = requireObject(
        payload.data,
        "bcr01_stripe_webhook_shape_invalid",
      );
      const object = ensureTestModeObject(data.object);

      const eventType = normalizedEventType(verified.providerEventType);
      const subscription = subscriptionFromEventObject(
        verified.providerEventType,
        object,
      );
      const invoiceRefs = invoiceRefsFromEvent(eventType, object);

      return {
        providerCode: PROVIDER_CODE,
        providerEventId: verified.providerEventId,
        eventType,
        occurredAt: verified.occurredAt,
        payloadHash: verified.payloadHash,
        payloadSanitized: sanitizedObjectSummary(
          verified.providerEventType,
          object,
        ),
        providerCustomerRef:
          subscription?.providerCustomerRef ?? providerObjectId(object.customer),
        providerSubscriptionRef:
          subscription?.providerSubscriptionRef ??
          subscriptionRefFromObject(object),
        providerPriceRef: subscription?.providerPriceRef ?? null,
        providerInvoiceRef: invoiceRefs.providerInvoiceRef,
        providerPaymentRef: invoiceRefs.providerPaymentRef,
        subscriptionState: subscription?.subscriptionState ?? null,
        requiresReconciliation:
          subscription?.requiresReconciliation ?? false,
        currentPeriodStart: subscription?.currentPeriodStart ?? null,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        canceledAt: subscription?.canceledAt ?? null,
      };
    },

    async resolveInvoiceByPaymentRef(
      providerPaymentRef: string,
    ): Promise<string | null> {
      const stripe = createStripeClient();
      const payments = await stripe.invoicePayments.list({
        payment: {
          type: "payment_intent",
          payment_intent: providerPaymentRef,
        },
        limit: 2,
      });

      if (payments.has_more || payments.data.length > 1) {
        throw new BillingPortError(
          "bcr01_stripe_payment_invoice_cardinality_ambiguous",
        );
      }
      if (payments.data.length === 0) return null;

      const payment = payments.data[0];
      if (payment.livemode) {
        throw new BillingPortError("bcr01_stripe_live_object_prohibited");
      }
      if (
        payment.payment.type !== "payment_intent" ||
        providerObjectId(payment.payment.payment_intent) !==
          providerPaymentRef
      ) {
        throw new BillingPortError(
          "bcr01_stripe_invoice_payment_identity_mismatch",
        );
      }

      return requireString(
        providerObjectId(payment.invoice),
        "bcr01_stripe_invoice_payment_invoice_absent",
      );
    },

    async retrieveSubscription(
      providerSubscriptionRef: string,
    ): Promise<ProviderSubscriptionObservation> {
      const stripe = createStripeClient();
      const subscription = await stripe.subscriptions.retrieve(
        providerSubscriptionRef,
      );
      return observationFromSubscription(subscription);
    },

    async retrieveInvoice(
      providerInvoiceRef: string,
    ): Promise<ProviderInvoiceObservation> {
      const stripe = createStripeClient();
      const invoice = await stripe.invoices.retrieve(providerInvoiceRef);
      const observation = observationFromInvoice(invoice);
      const payment = await resolveInvoicePaymentObservation(
        stripe,
        providerInvoiceRef,
      );

      return {
        ...observation,
        providerPaymentRef:
          payment.providerPaymentRef ?? observation.providerPaymentRef,
        status:
          observation.status === "paid" && payment.fullyRefunded
            ? "refunded"
            : observation.status,
      };
    },
  };
}
