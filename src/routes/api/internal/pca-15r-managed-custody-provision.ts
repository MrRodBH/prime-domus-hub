import { createFileRoute } from "@tanstack/react-router";
import type { Pca15rManagedCustodyProvisioningResult } from "@/lib/pca-15r/managed-custody-provisioning.server";

const MAX_BODY_BYTES = 16_384;

type Pca15rExecutor = (
  request: Request,
  body: unknown,
) => Promise<Pca15rManagedCustodyProvisioningResult>;

export interface Pca15rManagedCustodyHandlerDependencies {
  execute?: Pca15rExecutor;
}

function json(status: number, payload: unknown, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

function methodNotAllowed(): Response {
  return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
}

function safeOperationalError(error: unknown): { code: string; status: number } | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; status?: unknown };
  if (
    typeof candidate.code !== "string" ||
    !/^(?:pca15r|pca11)_[a-z0-9_]+$/.test(candidate.code) ||
    typeof candidate.status !== "number" ||
    !Number.isInteger(candidate.status) ||
    candidate.status < 400 ||
    candidate.status > 599
  ) {
    return null;
  }
  return { code: candidate.code, status: candidate.status };
}

export async function handlePca15rManagedCustodyProvisionRequest(
  request: Request,
  dependencies: Pca15rManagedCustodyHandlerDependencies = {},
): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();
  if (request.headers.has("x-tenant-id")) {
    return json(400, { ok: false, code: "pca15r_tenant_header_prohibited" });
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [^\s]+$/.test(authorization)) {
    return json(401, { ok: false, code: "pca15r_unauthorized" });
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json(413, { ok: false, code: "pca15r_request_too_large" });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json(400, { ok: false, code: "pca15r_invalid_json" });
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json(413, { ok: false, code: "pca15r_request_too_large" });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { ok: false, code: "pca15r_invalid_json" });
  }

  try {
    const { executePca15rManagedCustodyProvisioning } =
      await import("@/lib/pca-15r/managed-custody-provisioning.server");
    const execute = dependencies.execute ?? executePca15rManagedCustodyProvisioning;
    const result = await execute(request, body);
    return json(result.reconciledExistingVersion ? 200 : 201, result);
  } catch (error) {
    const operational = safeOperationalError(error);
    return operational
      ? json(operational.status, { ok: false, code: operational.code })
      : json(500, { ok: false, code: "pca15r_internal_failure" });
  }
}

export const Route = createFileRoute("/api/internal/pca-15r-managed-custody-provision")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      POST: ({ request }) => handlePca15rManagedCustodyProvisionRequest(request),
    },
  },
});
