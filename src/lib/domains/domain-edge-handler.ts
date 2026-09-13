/** Sole scheduler boundary. Browser JWTs and caller-supplied jobs confer no authority. */
export function createDomainEdgeHandler(
  env: Record<string, unknown>,
  processJobs: (input: { runtimeEnv: Record<string, unknown>; limit: number }) => Promise<unknown>,
) {
  return async (request: Request): Promise<Response> => {
    const reply = (status: number, code: string, result?: unknown) => Response.json(
      { code, ...(result === undefined ? {} : { result }) },
      { status, headers: { "cache-control": "no-store" } },
    );
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    const secret = env.DOMAIN_PROCESSOR_SECRET;
    if (typeof secret !== "string" || secret.length < 32) return reply(503, "processor_not_configured");
    const given = request.headers.get("x-domain-processor-secret") ?? "";
    if (given.length > 256) return reply(401, "unauthorized");
    const digest = (text: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    const [expected, received] = await Promise.all([digest(secret), digest(given)]);
    let difference = 0;
    new Uint8Array(expected).forEach((value, index) => { difference |= value ^ new Uint8Array(received)[index]; });
    if (difference !== 0) return reply(401, "unauthorized");
    // Empty object only: global authority and lease selection come from the server.
    const reader = request.body?.getReader();
    if (reader) {
      let bytes = new Uint8Array();
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (bytes.length + chunk.value.length > 2) { await reader.cancel(); return reply(400, "body_not_allowed"); }
        bytes = new Uint8Array([...bytes, ...chunk.value]);
      }
      if (bytes.length && new TextDecoder().decode(bytes) !== "{}") return reply(400, "body_not_allowed");
    }
    if (env.DOMAIN_PROCESSOR_ENABLED !== "true") return reply(503, "processor_disabled");
    for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DCA01_MANAGED_CNAME_TARGET", "DOMAIN_ROUTING_PROOF_SECRET"]) {
      if (typeof env[name] !== "string" || !(env[name] as string).length) return reply(503, "processor_not_configured");
    }
    try {
      // One lease per invocation bounds duration and prevents later jobs expiring in a batch.
      return reply(200, "processed", await processJobs({ runtimeEnv: env, limit: 1 }));
    } catch {
      return reply(503, "processor_execution_failed");
    }
  };
}
