import { createFileRoute } from "@tanstack/react-router";
import {
  billingErrorResponse,
  billingJson,
  billingMethodNotAllowed,
  parseExactJsonObject,
} from "@/lib/billing/billing-http.server";
import { resolveAuthorizedBillingRequest } from "@/lib/billing/billing-request-context.server";
import { reconcileTenantBilling } from "@/lib/billing/billing-reconciliation.server";

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
          await parseExactJsonObject(request, []);
          const { authorization } = await resolveAuthorizedBillingRequest(
            request,
            "reconcile",
          );
          const result = await reconcileTenantBilling(authorization);
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
