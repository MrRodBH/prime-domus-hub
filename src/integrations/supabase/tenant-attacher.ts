// Client middleware — anexa header x-tenant-id quando super_admin está impersonando.
// Complementa o attachSupabaseAuth (bearer). Registrar depois dele em src/start.ts.
import { createMiddleware } from "@tanstack/react-start";

export const attachTenantHeader = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let impersonating: string | null = null;
    if (typeof window !== "undefined") {
      try {
        impersonating = window.localStorage.getItem("impersonate_tenant_id");
      } catch {
        impersonating = null;
      }
    }
    return next({
      headers: impersonating ? { "x-tenant-id": impersonating } : {},
    });
  },
);
