export const STRUCTURED_LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type StructuredLogLevel = (typeof STRUCTURED_LOG_LEVELS)[number];
type JsonScalar = string | number | boolean | null;
type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

export interface StructuredLogInput {
  level: StructuredLogLevel;
  event: string;
  code: string;
  route?: string;
  requestId?: string | null;
  context?: Record<string, unknown>;
  error?: unknown;
}

const SAFE_CONTEXT_KEYS = new Set([
  "attempt",
  "boundary",
  "code",
  "count",
  "email_type",
  "failed",
  "failed_attempts",
  "form_id",
  "has_message_id",
  "is_retry",
  "leased",
  "level",
  "message_id",
  "operation",
  "outcome",
  "queue",
  "read_count",
  "reason",
  "request_id",
  "retried",
  "retry_count",
  "route",
  "source",
  "stage",
  "status",
  "succeeded",
  "template",
  "tenant_id",
  "ttl_minutes",
  "version",
]);

const SENSITIVE_KEY = /(?:authorization|cookie|credential|email|jwt|key|password|secret|stack|token)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const SECRET = /\b(?:sk|rk|pk|whsec|sb_secret|sb_publishable)_[A-Za-z0-9_-]{8,}\b/gi;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;
const QUERY_SECRET = /([?&](?:authorization|code|credential|jwt|key|password|secret|token)=)[^&#\s]+/gi;
const SAFE_ATOM = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const SAFE_ROUTE = /^(?:\/[A-Za-z0-9._~/-]{0,199}|[A-Za-z0-9][A-Za-z0-9._:/-]{0,199})$/;

function sanitizeText(value: string): string {
  return value
    .slice(0, 1000)
    .replace(EMAIL, "[redacted-email]")
    .replace(BEARER, "Bearer [redacted]")
    .replace(JWT, "[redacted-jwt]")
    .replace(SECRET, "[redacted-secret]")
    .replace(LONG_TOKEN, "[redacted-token]")
    .replace(QUERY_SECRET, "$1[redacted]");
}

function safeAtom(value: string, fallback: string): string {
  const normalized = value.trim();
  return SAFE_ATOM.test(normalized) ? normalized : fallback;
}

function safeError(error: unknown): { name: string; code: string; message: string; stack?: string } {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : null;
  const name = error instanceof Error ? error.name : typeof record?.name === "string" ? record.name : "UnknownError";
  const code = typeof record?.code === "string" || typeof record?.code === "number"
    ? String(record.code)
    : "unclassified_error";
  const message = error instanceof Error
    ? error.message
    : typeof record?.message === "string"
      ? record.message
      : "An operational error occurred";
  const result: { name: string; code: string; message: string; stack?: string } = {
    name: safeAtom(name, "UnknownError"),
    code: safeAtom(code, "unclassified_error"),
    message: sanitizeText(message),
  };
  const runtimeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (
    runtimeProcess?.env?.NODE_ENV !== "production"
    && runtimeProcess?.env?.STRUCTURED_LOG_STACKS === "true"
    && error instanceof Error
    && error.stack
  ) {
    result.stack = sanitizeText(error.stack);
  }
  return result;
}

function safeValue(value: unknown, seen: WeakSet<object>, depth: number): JsonValue | undefined {
  if (value === null) return null;
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (value instanceof Error) return safeError(value) as unknown as JsonValue;
  if (depth >= 4 || typeof value !== "object") return undefined;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    const items = value.slice(0, 20)
      .map((item) => safeValue(item, seen, depth + 1))
      .filter((item): item is JsonValue => item !== undefined);
    return items;
  }
  const result: Record<string, JsonValue> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key) || !SAFE_CONTEXT_KEYS.has(key)) continue;
    const sanitized = safeValue(nested, seen, depth + 1);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

export function sanitizeStructuredLogContext(input: Record<string, unknown> | undefined): Record<string, JsonValue> {
  if (!input) return {};
  return (safeValue(input, new WeakSet<object>(), 0) as Record<string, JsonValue> | undefined) ?? {};
}

function writeLine(level: StructuredLogLevel, line: string): void {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function structuredLog(input: StructuredLogInput): void {
  const timestamp = new Date().toISOString();
  const record = {
    timestamp,
    level: input.level,
    event: safeAtom(input.event, "application.invalid_event"),
    code: safeAtom(input.code, "application_invalid_code"),
    route: input.route && SAFE_ROUTE.test(input.route) ? input.route : input.route ? "unknown_route" : null,
    request_id: input.requestId ? safeAtom(input.requestId, "invalid_request_id") : null,
    context: sanitizeStructuredLogContext(input.context),
    ...(input.error === undefined ? {} : { error: safeError(input.error) }),
  };
  try {
    writeLine(input.level, JSON.stringify(record));
  } catch {
    const fallback = JSON.stringify({
      timestamp,
      level: "error",
      event: "structured_log.write_failed",
      code: "structured_log_sink_failed",
      route: null,
      request_id: null,
      context: {},
    });
    try {
      if (input.level === "error") console.log(fallback);
      else console.error(fallback);
    } catch {
      // Logging must never recursively break application control flow.
    }
  }
}
