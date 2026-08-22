import { createFileRoute } from "@tanstack/react-router";

function json(status: number, body: unknown, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extraHeaders },
  });
}

function methodNotAllowed(): Response {
  return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
}

export const Route = createFileRoute("/api/internal/dca-02-provider-orphan-recovery")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json(400, { ok: false, code: "dca02_invalid_json" });
        }
        const { executeProviderOrphanDiagnostic, toProviderOrphanRecoveryError } = await import(
          "@/lib/domains/provider-orphan-recovery.server"
        );
        try {
          const result = await executeProviderOrphanDiagnostic(request, body);
          const conflict = ["ambiguous_candidates", "bound_object_missing", "binding_candidate_conflict", "binding_state_unresolved"].includes(result.status);
          return json(conflict ? 409 : 200, result);
        } catch (error) {
          const safe = toProviderOrphanRecoveryError(error);
          return json(safe.status, { ok: false, code: safe.code });
        }
      },
    },
  },
});
