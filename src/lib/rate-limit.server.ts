// Universal rate-limiter usando RPC rate_limit_hit.
// Uso: const rl = await rateLimit({ scope: 'feed', key: token, limit: 30 });
// if (!rl.allowed) return 429 with Retry-After: rl.retryAfter.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RateLimitOptions = {
  scope: string;
  key: string;
  limit: number;
  windowSeconds?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  retryAfter: number;
};

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { scope, key, limit, windowSeconds = 60 } = opts;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc("rate_limit_hit", {
      _scope: scope,
      _key: key,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      // Fail-open: se o RPC falhar, permitimos a requisição para não derrubar o serviço
      return { allowed: true, count: 0, retryAfter: 0 };
    }
    const row = data[0] as { allowed: boolean; current_count: number; retry_after_seconds: number };
    return {
      allowed: row.allowed,
      count: row.current_count,
      retryAfter: row.retry_after_seconds,
    };
  } catch {
    return { allowed: true, count: 0, retryAfter: 0 };
  }
}

export function rateLimitResponse(retryAfter: number, message = "rate limit excedido"): Response {
  return new Response(JSON.stringify({ error: message, retry_after: retryAfter }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(Math.max(1, retryAfter)),
      "access-control-allow-origin": "*",
    },
  });
}

// Enqueue de falha na DLQ de portais
export async function portalDlqEnqueue(params: {
  tenantId: string | null;
  portal: string;
  acao: string;
  payload: unknown;
  erro: string;
}): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any).rpc("portal_dlq_enqueue", {
      _tenant: params.tenantId,
      _portal: params.portal,
      _acao: params.acao,
      _payload: params.payload ?? {},
      _erro: params.erro,
    });
    return (data as string) ?? null;
  } catch {
    return null;
  }
}
