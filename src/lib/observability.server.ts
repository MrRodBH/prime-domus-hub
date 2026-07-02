// Observabilidade técnica — helper server-only.
// Grava eventos em public.system_events via RPC log_system_event (SECURITY DEFINER,
// swallowa erros para nunca quebrar o caller). Use dentro de server functions e
// route handlers via dynamic import: `await import("@/lib/observability.server")`.

export type EventCategory = "api" | "ai" | "portal" | "feed" | "auth" | "rls" | "job" | "storage";
export type EventSeverity = "info" | "warn" | "error" | "critical";

export interface LogEventInput {
  category: EventCategory;
  source: string;
  event: string;
  severity?: EventSeverity;
  statusCode?: number;
  latencyMs?: number;
  tenantId?: string | null;
  userId?: string | null;
  ip?: string | null;
  meta?: Record<string, unknown>;
  errorMessage?: string | null;
}

export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("log_system_event", {
      _category: input.category,
      _source: input.source,
      _event: input.event,
      _severity: input.severity ?? "info",
      _status_code: input.statusCode ?? null,
      _latency_ms: input.latencyMs ?? null,
      _tenant_id: input.tenantId ?? null,
      _user_id: input.userId ?? null,
      _ip: input.ip ?? null,
      _meta: (input.meta ?? {}) as never,
      _error_message: input.errorMessage ?? null,
    } as never);
  } catch (e) {
    // Nunca propaga — logging é best-effort
    console.warn("[observability] logEvent failed:", (e as Error)?.message);
  }
}

/** Envolve uma promise, mede latência e registra um evento api/ai. */
export async function withTiming<T>(
  meta: Omit<LogEventInput, "latencyMs" | "event" | "severity"> & {
    onSuccess?: (result: T) => Partial<LogEventInput>;
  },
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    const extra = meta.onSuccess?.(result) ?? {};
    await logEvent({
      ...meta,
      ...extra,
      event: extra.event ?? "success",
      severity: extra.severity ?? "info",
      latencyMs: Date.now() - started,
    });
    return result;
  } catch (e) {
    await logEvent({
      ...meta,
      event: "error",
      severity: "error",
      latencyMs: Date.now() - started,
      errorMessage: (e as Error)?.message ?? String(e),
    });
    throw e;
  }
}

export function clientIp(request: Request): string | null {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    (h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)
  );
}
