import { createFileRoute } from "@tanstack/react-router";
import {
  billingErrorResponse,
  billingJson,
  billingMethodNotAllowed,
} from "@/lib/billing/billing-http.server";
import { processBillingWebhook } from "@/lib/billing/billing-webhook.server";

const methodNotAllowed = () => billingMethodNotAllowed("POST");

export const Route = createFileRoute(
  "/api/public/hooks/billing-stripe-webhook",
)({
  server: {
    handlers: {
      GET: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      POST: async ({ request }) => {
        try {
          if (request.headers.has("x-tenant-id")) {
            return billingJson(
              { ok: false, code: "bcr01_webhook_tenant_header_prohibited" },
              400,
            );
          }

          // Must remain raw. Do not call request.json() before signature verification.
          const rawBody = await request.text();
          const result = await processBillingWebhook({
            providerCode: "stripe",
            rawBody,
            signatureHeader: request.headers.get("stripe-signature"),
          });

          return billingJson({
            ok: true,
            duplicate: result.duplicate,
            eventStatus: result.eventStatus,
          });
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
