// BCR-01 — shared thin HTTP response/input helpers for billing routes.

export function billingJson(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function billingMethodNotAllowed(allow: string): Response {
  return billingJson(
    { ok: false, code: "method_not_allowed" },
    405,
    { allow },
  );
}

export async function parseExactJsonObject(
  request: Request,
  allowedKeys: readonly string[],
): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BillingHttpError("bcr01_invalid_json", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BillingHttpError("bcr01_invalid_json_object", 400);
  }
  const object = body as Record<string, unknown>;
  const allowed = new Set(allowedKeys);
  if (Object.keys(object).some((key) => !allowed.has(key))) {
    throw new BillingHttpError("bcr01_unexpected_request_field", 400);
  }
  return object;
}

export class BillingHttpError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "BillingHttpError";
    this.code = code;
    this.status = status;
  }
}

function extractBcrCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = "code" in error ? (error as { code?: unknown }).code : null;
  if (typeof code === "string" && /^bcr01_[a-z0-9_]+$/.test(code)) return code;
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/bcr01_[a-z0-9_]+/i);
  return match ? match[0].toLowerCase() : null;
}

export function billingErrorResponse(error: unknown): Response {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    const status = (error as { status: number }).status;
    const code = extractBcrCode(error) ?? "bcr01_request_failed";
    return billingJson({ ok: false, code }, status);
  }

  const code = extractBcrCode(error);
  if (code) {
    const clientFault =
      code.includes("invalid") ||
      code.includes("required") ||
      code.includes("unsupported") ||
      code.includes("signature") ||
      code.includes("absent") ||
      code.includes("not_allowed");
    return billingJson(
      { ok: false, code },
      clientFault ? 400 : 409,
    );
  }

  return billingJson({ ok: false, code: "bcr01_internal_failure" }, 500);
}
