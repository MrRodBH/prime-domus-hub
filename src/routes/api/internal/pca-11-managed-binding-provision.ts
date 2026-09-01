import { createFileRoute } from "@tanstack/react-router";

function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ ok: false, code: "method_not_allowed" }), {
    status: 405,
    headers: { "content-type": "application/json", allow: "POST" },
  });
}

type Pca11ProvisioningResult = {
  reconciledExistingVersion: boolean;
  [key: string]: unknown;
};

type Pca11ProvisioningExecutor = (
  request: Request,
  body: unknown,
) => Promise<Pca11ProvisioningResult>;

export interface Pca11ManagedBindingHandlerDependencies {
  execute?: Pca11ProvisioningExecutor;
}

export async function handlePca11ManagedBindingProvisionRequest(
  request: Request,
  dependencies: Pca11ManagedBindingHandlerDependencies = {},
): Promise<Response> {
  if (request.headers.has("x-tenant-id")) {
    return new Response(JSON.stringify({ ok: false, code: "pca11_tenant_header_prohibited" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
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
  const execute = dependencies.execute ?? executePca11ManagedBindingProvisioning;
  try {
    const result = await execute(request, body);
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
}

export const Route = createFileRoute("/api/internal/pca-11-managed-binding-provision")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      POST: ({ request }) => handlePca11ManagedBindingProvisionRequest(request),
    },
  },
});
