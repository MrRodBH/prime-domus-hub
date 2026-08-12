import { createFileRoute } from "@tanstack/react-router";
import {
  billingErrorResponse,
  billingJson,
  billingMethodNotAllowed,
  parseExactJsonObject,
} from "@/lib/billing/billing-http.server";
import { resolveAuthorizedBillingRequest } from "@/lib/billing/billing-request-context.server";
import { openBillingPortal } from "@/lib/billing/billing-service.server";

const methodNotAllowed = () => billingMethodNotAllowed("POST");

export const Route = createFileRoute("/api/internal/billing-portal")({
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
            "portal",
          );
          const session = await openBillingPortal(authorization);
          return billingJson({ ok: true, redirectUrl: session.redirectUrl });
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
