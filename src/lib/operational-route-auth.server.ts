import { createHash, timingSafeEqual } from "node:crypto";

export type OperationalRouteAuthResult =
  | { ok: true }
  | { ok: false; code: "operator_secret_unconfigured" | "operator_route_unauthorized" };

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function readSingleBearer(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value || value.includes(",")) return null;
  const match = /^Bearer ([^\s]+)$/.exec(value);
  return match?.[1] ?? null;
}

export function verifyPortalDlqRetryRequest(
  request: Request,
  configuredSecret: string | undefined = process.env.PORTAL_DLQ_RETRY_SECRET,
): OperationalRouteAuthResult {
  const expected = configuredSecret?.trim();
  if (!expected) return { ok: false, code: "operator_secret_unconfigured" };

  const provided = readSingleBearer(request);
  if (!provided) return { ok: false, code: "operator_route_unauthorized" };

  const expectedDigest = digest(expected);
  const providedDigest = digest(provided);
  return timingSafeEqual(expectedDigest, providedDigest)
    ? { ok: true }
    : { ok: false, code: "operator_route_unauthorized" };
}

export function operationalUnauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
