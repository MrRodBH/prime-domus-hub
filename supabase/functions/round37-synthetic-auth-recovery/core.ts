// Temporary audited recovery. No generic user/attribute update surface.
export const TARGET = '2f0a81d8-bf15-4b88-ae4a-1d893ca6a80f';
export const TENANT = 'a212f9de-0364-427e-8473-2b0742a2d897';
export type Ports = {
  operator: string; expiresAt: number; expectedUpdatedAt: string;
  now(): number;
  authenticate(jwt: string): Promise<string | null>;
  isAdmin(id: string): Promise<boolean>;
  eligible(): Promise<boolean>;
  target(): Promise<{ id: string; updated_at?: string; app_metadata: Record<string, unknown> } | null>;
  updatePassword(password: string): Promise<void>;
};
const reply = (status: number, code: string) => new Response(JSON.stringify({ code }), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});
export function recoveryHandler(p: Ports) {
  // Per-isolate guard only. Distributed exactly-once is NOT claimed.
  // Orchestrator must make exactly one invocation then delete the deployment.
  let attempted = false;
  let busy = false;
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST' || new URL(request.url).search) return reply(405, 'method_denied');
    if (!p.operator || p.operator === TARGET || !p.expectedUpdatedAt || !Number.isFinite(p.expiresAt) || p.now() >= p.expiresAt || p.expiresAt - p.now() > 900_000) return reply(503, 'recovery_not_armed');
    if (busy || attempted) return reply(409, 'recovery_closed');
    busy = true;
    try {
      const match = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') ?? '');
      if (!match) return reply(401, 'authentication_required');
      const actor = await p.authenticate(match[1]);
      if (actor !== p.operator || !actor || !(await p.isAdmin(actor))) return reply(403, 'operator_denied');
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return reply(415, 'json_required');
      // Bounded streaming read: no body, JWT or provider error is logged/returned.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, 'invalid_request');
      let raw = '', bytes = 0;
      const decoder = new TextDecoder();
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 2048) { await reader.cancel(); return reply(413, 'body_too_large'); }
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode();
      let input: unknown;
      try { input = JSON.parse(raw); } catch { return reply(400, 'invalid_request'); }
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !('password' in input) || typeof input.password !== 'string' || input.password.length < 16 || new TextEncoder().encode(input.password).length > 72) return reply(400, 'invalid_request');
      if (!(await p.eligible())) return reply(403, 'synthetic_context_denied');
      const target = await p.target();
      if (!target || target.id !== TARGET || target.app_metadata.synthetic !== true || target.updated_at !== p.expectedUpdatedAt) return reply(409, 'target_changed_or_ineligible');
      if (p.now() >= p.expiresAt) return reply(503, 'recovery_expired');
      attempted = true; // Ambiguous failure must never be retried by this instance.
      await p.updatePassword(input.password);
      return reply(200, 'password_updated');
    } catch { return reply(503, attempted ? 'outcome_unconfirmed_do_not_retry' : 'recovery_unavailable'); }
    finally { busy = false; }
  };
}
