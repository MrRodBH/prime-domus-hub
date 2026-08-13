import { createFileRoute } from "@tanstack/react-router";
import { assertChargeIntentId } from "@/lib/billing/billing-contracts";
import {
  billingErrorResponse,
  billingJson,
  billingMethodNotAllowed,
  parseExactJsonObject,
} from "@/lib/billing/billing-http.server";
import { resolveAuthorizedBillingRequest } from "@/lib/billing/billing-request-context.server";
import { startBillingInvoice } from "@/lib/billing/billing-service.server";

const methodNotAllowed = () => billingMethodNotAllowed("POST");

export const Route = createFileRoute("/api/internal/billing-invoice")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      POST: async ({ request }) => {
        try {
          const body = await parseExactJsonObject(request, ["chargeIntentId"]);
          const chargeIntentId = assertChargeIntentId(body.chargeIntentId);
          const { authorization } = await resolveAuthorizedBillingRequest(
            request,
            "invoice",
          );
          const invoice = await startBillingInvoice(
            authorization,
            chargeIntentId,
          );

          return billingJson({
            ok: true,
            redirectUrl: invoice.redirectUrl,
          });
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
