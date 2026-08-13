import { createFileRoute } from "@tanstack/react-router";
import {
  billingErrorResponse,
  billingJson,
  billingMethodNotAllowed,
} from "@/lib/billing/billing-http.server";
import { listTenantChargeIntents } from "@/lib/billing/billing-charge-repository.server";
import { resolveAuthorizedBillingRequest } from "@/lib/billing/billing-request-context.server";

const methodNotAllowed = () => billingMethodNotAllowed("GET");

export const Route = createFileRoute("/api/internal/billing-charges")({
  server: {
    handlers: {
      POST: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      GET: async ({ request }) => {
        try {
          const { authorization } = await resolveAuthorizedBillingRequest(
            request,
            "view",
          );
          const charges = await listTenantChargeIntents(
            authorization.tenantId,
          );

          return billingJson({
            ok: true,
            charges: charges.map((charge) => ({
              chargeIntentId: charge.chargeIntentId,
              chargeType: charge.chargeType,
              status: charge.status,
              currency: charge.currency,
              amountTotalMinor: charge.amountTotalMinor,
              providerStatus: charge.providerStatus,
            })),
          });
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
