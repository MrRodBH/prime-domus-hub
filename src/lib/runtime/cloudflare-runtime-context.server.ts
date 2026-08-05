export type CloudflareRuntimeEnv = Record<string, unknown>;

export interface CloudflareExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

export interface CloudflareScheduledController {
  cron?: string;
  scheduledTime?: number;
  noRetry?(): void;
}

export interface CloudflareRuntimeContext {
  env: CloudflareRuntimeEnv;
  ctx: CloudflareExecutionContext;
}

type RequestRuntimeShape = {
  name?: unknown;
  cloudflare?: {
    env?: unknown;
    context?: unknown;
  };
};

type RuntimeRequest = Request & {
  runtime?: RequestRuntimeShape;
};

const installedContexts = new WeakMap<Request, CloudflareRuntimeContext>();

export class CloudflareRuntimeContextError extends Error {
  readonly code: "cloudflare_runtime_context_invalid" | "cloudflare_runtime_context_missing";

  constructor(code: CloudflareRuntimeContextError["code"]) {
    super(code);
    this.name = "CloudflareRuntimeContextError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is CloudflareRuntimeEnv {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExecutionContext(value: unknown): value is CloudflareExecutionContext {
  return isRecord(value) && typeof value.waitUntil === "function";
}

export function isCloudflareRuntimeRequest(request: Request): boolean {
  return (request as RuntimeRequest).runtime?.name === "cloudflare";
}

export function readAuthoritativeCloudflareRuntimeContext(
  request: Request,
): CloudflareRuntimeContext | null {
  const runtime = (request as RuntimeRequest).runtime;
  if (runtime?.name !== "cloudflare") return null;

  const env = runtime.cloudflare?.env;
  const ctx = runtime.cloudflare?.context;
  if (!isRecord(env) || !isExecutionContext(ctx)) {
    throw new CloudflareRuntimeContextError("cloudflare_runtime_context_invalid");
  }

  return { env, ctx };
}

export function installCloudflareRuntimeContext(
  request: Request,
  context: CloudflareRuntimeContext,
): void {
  if (!isRecord(context.env) || !isExecutionContext(context.ctx)) {
    throw new CloudflareRuntimeContextError("cloudflare_runtime_context_invalid");
  }

  installedContexts.set(request, context);
}

export function requireCloudflareRuntimeContext(request: Request): CloudflareRuntimeContext {
  const context = installedContexts.get(request);
  if (!context) {
    throw new CloudflareRuntimeContextError("cloudflare_runtime_context_missing");
  }
  return context;
}

export function clearCloudflareRuntimeContext(request: Request): void {
  installedContexts.delete(request);
}
