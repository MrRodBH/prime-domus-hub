import { createFileRoute } from "@tanstack/react-router";

function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ ok: false, code: "method_not_allowed" }), {
    status: 405,
    headers: { "content-type": "application/json", allow: "POST" },
  });
}

export const Route = createFileRoute("/api/internal/pca-11-managed-binding-provision")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      POST: async ({ request }) => {
        if (request.headers.has("x-tenant-id")) {
          return new Response(
            JSON.stringify({ ok: false, code: "pca11_tenant_header_prohibited" }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            },
          );
        }
        const authorization = request.headers.get("authorization") ?? "";
        if (!authorization.startsWith("Bearer ") || !authorization.slice("Bearer ".length).trim()) {
          return new Response(JSON.stringify({ ok: false, code: "pca11_unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, code: "pca11_invalid_json" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const { executePca11ManagedBindingProvisioning, Spr03ProvisioningError } =
          await import("@/lib/spr-03/managed-secret-provisioning.server");
        try {
          const result = await executePca11ManagedBindingProvisioning(request, body);
          return new Response(JSON.stringify(result), {
            status: result.reconciledExistingVersion ? 200 : 201,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        } catch (error) {
          if (error instanceof Spr03ProvisioningError) {
            return new Response(JSON.stringify({ ok: false, code: error.code }), {
              status: error.status,
              headers: { "content-type": "application/json", "cache-control": "no-store" },
            });
          }
          return new Response(JSON.stringify({ ok: false, code: "pca11_internal_failure" }), {
            status: 500,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        }
      },
    },
  },
});
