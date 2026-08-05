import { definePlugin } from "nitro";

import { scheduled } from "../../server";
import {
  clearCloudflareRuntimeContext,
  installCloudflareRuntimeContext,
  isCloudflareRuntimeRequest,
  readAuthoritativeCloudflareRuntimeContext,
  type CloudflareRuntimeEnv,
  type CloudflareExecutionContext,
  type CloudflareScheduledController,
} from "./cloudflare-runtime-context.server";

type NitroRequestEvent = { req: Request };
type NitroErrorContext = { event?: NitroRequestEvent };
type CloudflareScheduledPayload = {
  controller: CloudflareScheduledController;
  env: CloudflareRuntimeEnv;
  context: CloudflareExecutionContext;
};

interface Wri01HookRegistrar {
  hook(name: "request", handler: (event: NitroRequestEvent) => void | Promise<void>): void;
  hook(
    name: "response",
    handler: (response: Response, event: NitroRequestEvent) => void | Promise<void>,
  ): void;
  hook(
    name: "error",
    handler: (error: Error, context: NitroErrorContext) => void | Promise<void>,
  ): void;
  hook(
    name: "cloudflare:scheduled",
    handler: (payload: CloudflareScheduledPayload) => void | Promise<void>,
  ): void;
}

export default definePlugin((nitroApp) => {
  const hooks = nitroApp.hooks as unknown as Wri01HookRegistrar;

  hooks.hook("request", (event) => {
    if (!isCloudflareRuntimeRequest(event.req)) return;

    const context = readAuthoritativeCloudflareRuntimeContext(event.req);
    if (!context) {
      throw new Error("cloudflare_runtime_context_missing");
    }
    installCloudflareRuntimeContext(event.req, context);
  });

  hooks.hook("response", (_response, event) => {
    clearCloudflareRuntimeContext(event.req);
  });

  hooks.hook("error", (_error, context) => {
    if (context.event?.req) {
      clearCloudflareRuntimeContext(context.event.req);
    }
  });

  hooks.hook("cloudflare:scheduled", ({ controller, env, context }) =>
    scheduled(controller, env, context),
  );
});
