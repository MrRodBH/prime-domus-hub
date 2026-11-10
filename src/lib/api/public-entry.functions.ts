import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { resolvePublicHostAuthority } from "@/lib/tenant.server";

// Presentation routing only. Never supplies tenant identity or grants access.
export const getPublicEntryResolutionReason = createServerFn({ method: "GET" })
  .handler(async (): Promise<string | null> => {
    const authority = resolvePublicHostAuthority(getRequestHeader("host"));
    return authority.kind === "none" ? authority.reason : null;
  });