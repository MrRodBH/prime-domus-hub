import { createFileRoute } from "@tanstack/react-router";
import { assertChargeIntentId } from "@/lib/billing/billing-contracts";
import {
  billingErrorResponse,
  billingJson,
  billingMethodNotAllowed,
  parseExactJsonObject,
} from "@/lib/billing/billing-http.server";
import { resolveAuthorizedBillingRequest } from "@/lib/billing/billing-request-context.server";
import {
  reconcileTenantBilling,
  reconcileTenantCharge,
} from "@/lib/billing/billing-reconciliation.server";

const methodNotAllowed = () => billingMethodNotAllowed("POST");

export const Route = createFileRoute("/api/internal/billing-reconcile")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      POST: async ({ request }) => {
        try {
          const body = await parseExactJsonObject(request, ["chargeIntentId"]);
          const { authorization } = await resolveAuthorizedBillingRequest(
            request,
            "reconcile",
          );

          const result =
            body.chargeIntentId === undefined
              ? await reconcileTenantBilling(authorization)
              : await reconcileTenantCharge(
                  authorization,
                  assertChargeIntentId(body.chargeIntentId),
                );

          return billingJson({
            ok: true,
            applied: result.applied,
            eventStatus: result.eventStatus,
          });
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
