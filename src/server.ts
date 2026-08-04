import "./lib/error-capture";

import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createRouter } from "./router";
import { resolveCanonicalRedirectByHost } from "./lib/tenant.server";
import { processScheduledDomainJobs } from "./lib/domains/domain-jobs.server";

function withCanonicalHostname(request: Request, canonicalHostname: string): string {
  const url = new URL(request.url);
  url.hostname = canonicalHostname;
  url.port = "";
  url.protocol = "https:";
  return url.toString();
}

const startHandler = createStartHandler({
  createRouter,
  defaultStreamHandler,
});

export default {
  async fetch(request: Request): Promise<Response> {
    const host = request.headers.get("host");
    const redirect = await resolveCanonicalRedirectByHost(host);
    if (redirect) {
      return new Response(null, {
        status: 308,
        headers: {
          location: withCanonicalHostname(request, redirect.canonicalHostname),
          "cache-control": "public, max-age=300",
          vary: "Host",
        },
      });
    }
    return startHandler(request);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Record<string, unknown>,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(processScheduledDomainJobs({ runtimeEnv: env }).then(() => undefined));
  },
};
