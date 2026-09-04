import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { resolveCanonicalRedirectByHost } from "./lib/tenant.server";
import { processScheduledDomainJobs } from "./lib/domains/domain-jobs.server";
import { structuredLog } from "./lib/structured-log";
import { resolveP0HomologationEntry } from "./lib/p0-homologation-entry";
import {
  isCloudflareRuntimeRequest,
  readAuthoritativeCloudflareRuntimeContext,
  type CloudflareExecutionContext,
  type CloudflareRuntimeEnv,
  type CloudflareScheduledController,
} from "./lib/runtime/cloudflare-runtime-context.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function parseExactOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function websocketOrigin(httpOrigin: string): string {
  const url = new URL(httpOrigin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

function trackingSecurityHeaders(request: Request, env: unknown): HeadersInit {
  const runtimeEnv = typeof env === "object" && env !== null ? env as CloudflareRuntimeEnv : {};
  const localSupabaseOrigin = isCloudflareRuntimeRequest(request)
    ? undefined
    : process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseOrigin = parseExactOrigin(
    runtimeEnv.SUPABASE_URL ?? runtimeEnv.VITE_SUPABASE_URL ?? localSupabaseOrigin,
  );
  const connectOrigins = [
    "'self'",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
  ];
  const imageOrigins = [
    "'self'",
    "data:",
    "blob:",
    "https://www.facebook.com",
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
  ];
  if (supabaseOrigin) {
    connectOrigins.push(supabaseOrigin, websocketOrigin(supabaseOrigin));
    imageOrigins.push(supabaseOrigin);
  }
  const requestOrigin = parseExactOrigin(request.url);
  if (requestOrigin && requestOrigin !== "null") connectOrigins.push(requestOrigin);

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com",
    `connect-src ${[...new Set(connectOrigins)].join(" ")}`,
    `img-src ${[...new Set(imageOrigins)].join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  return {
    "content-security-policy": csp,
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
}

function applyTrackingSecurityHeaders(request: Request, env: unknown, response: Response): Response {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(trackingSecurityHeaders(request, env))) {
    if (typeof value === "string") headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function requirePublicCloudflareHost(request: Request, host: string | null): void {
  if (!isCloudflareRuntimeRequest(request)) return;
  if (!host) throw new Error("cloudflare_public_host_missing");

  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    throw new Error("cloudflare_public_host_invalid");
  }

  if (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "0.0.0.0"
    || hostname === "[::1]"
  ) {
    throw new Error("cloudflare_public_host_invalid");
  }
}

async function canonicalRedirect(request: Request): Promise<Response | null> {
  const host = request.headers.get("host");
  requirePublicCloudflareHost(request, host);
  const redirect = await resolveCanonicalRedirectByHost(host);
  if (!redirect) return null;
  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = redirect.canonicalHostname;
  target.port = "";
  return new Response(null, {
    status: 308,
    headers: {
      location: target.toString(),
      "cache-control": "public, max-age=300",
      "x-rm-prime-domain-generation": String(redirect.generation),
    },
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  structuredLog({
    level: "error",
    event: "server.ssr_response_failed",
    code: "h3_unhandled_http_error",
    route: "server_fetch",
    error: consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
  });
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function resolveRuntimeContext(
  request: Request,
  env: unknown,
  ctx: unknown,
): { env: unknown; ctx: unknown } {
  if (!isCloudflareRuntimeRequest(request)) return { env, ctx };

  const runtime = readAuthoritativeCloudflareRuntimeContext(request);
  if (!runtime) {
    throw new Error("cloudflare_runtime_context_missing");
  }
  return { env: runtime.env, ctx: runtime.ctx };
}

export async function fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  const homologationEntry = request.method === "GET" || request.method === "HEAD"
    ? resolveP0HomologationEntry(
        request.url,
        request.headers.get("host") ?? request.headers.get("x-forwarded-host"),
      )
    : null;

  let runtime: { env: unknown; ctx: unknown };
  try {
    runtime = resolveRuntimeContext(request, env, ctx);
  } catch (error) {
    structuredLog({
      level: "error",
      event: "wri.runtime_context_unavailable",
      code: "cloudflare_runtime_context_missing",
      route: new URL(request.url).pathname,
      requestId: request.headers.get("x-request-id"),
      error,
    });
    return new Response("Runtime context temporarily unavailable", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  if (!homologationEntry) {
    try {
      const redirect = await canonicalRedirect(request);
      if (redirect) return redirect;
    } catch (error) {
      structuredLog({
        level: "error",
        event: "dca.canonical_redirect_failed_closed",
        code: "canonical_redirect_unavailable",
        route: new URL(request.url).pathname,
        requestId: request.headers.get("x-request-id"),
        context: { source: "[DCA-01] canonical redirect resolution failed closed" },
        error,
      });
      return new Response("Domain resolution temporarily unavailable", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
  }

  try {
    const handler = await getServerEntry();
    if (homologationEntry) {
      request = new Request(homologationEntry, request);
    }
    const response = await handler.fetch(request, runtime.env, runtime.ctx);
    const normalized = await normalizeCatastrophicSsrResponse(response);
    return applyTrackingSecurityHeaders(request, runtime.env, normalized);
  } catch (error) {
    structuredLog({
      level: "error",
      event: "server.fetch_failed",
      code: "server_fetch_unhandled_error",
      route: new URL(request.url).pathname,
      requestId: request.headers.get("x-request-id"),
      error,
    });
    return applyTrackingSecurityHeaders(request, runtime.env, new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    }));
  }
}

export async function scheduled(
  _controller: CloudflareScheduledController,
  env: CloudflareRuntimeEnv,
  ctx: CloudflareExecutionContext,
): Promise<void> {
  const execution = processScheduledDomainJobs({ runtimeEnv: env, limit: 20 }).then((result) => {
    structuredLog({
      level: "info",
      event: "dca.scheduled_reconciliation_completed",
      code: "scheduled_reconciliation_completed",
      route: "cloudflare_scheduled",
      context: {
        source: "[DCA-01] scheduled reconciliation completed",
        leased: result.leased,
        succeeded: result.succeeded,
        retried: result.retried,
        failed: result.failed,
      },
    });
    return result;
  }).catch((error) => {
    structuredLog({
      level: "error",
      event: "dca.scheduled_reconciliation_failed_closed",
      code: "scheduled_reconciliation_failed_closed",
      route: "cloudflare_scheduled",
      context: { source: "[DCA-01] scheduled reconciliation failed closed" },
      error,
    });
    throw error;
  });
  ctx.waitUntil(execution);
}

export default {
  fetch,
  async scheduled(
    controller: CloudflareScheduledController,
    env: CloudflareRuntimeEnv,
    ctx: CloudflareExecutionContext,
  ): Promise<void> {
    return scheduled(controller, env, ctx);
  },
};
