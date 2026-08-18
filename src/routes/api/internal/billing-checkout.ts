import { createFileRoute } from "@tanstack/react-router";
import { assertPlanPriceId } from "@/lib/billing/billing-contracts";
import {
  billingErrorResponse,
  billingJson,
  billingMethodNotAllowed,
  parseExactJsonObject,
} from "@/lib/billing/billing-http.server";
import { resolveAuthorizedBillingRequest } from "@/lib/billing/billing-request-context.server";
import { startBillingCheckout } from "@/lib/billing/billing-service.server";

const methodNotAllowed = () => billingMethodNotAllowed("POST");

export const Route = createFileRoute("/api/internal/billing-checkout")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      POST: async ({ request }) => {
        try {
          const body = await parseExactJsonObject(request, ["planPriceId"]);
          const planPriceId = assertPlanPriceId(body.planPriceId);
          const { authorization } = await resolveAuthorizedBillingRequest(
            request,
            "checkout",
          );
          const session = await startBillingCheckout(
            authorization,
            planPriceId,
          );
          return billingJson({
            ok: true,
            redirectUrl: session.redirectUrl,
          });
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
