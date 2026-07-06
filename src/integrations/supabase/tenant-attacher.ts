// Client middleware — anexa header x-tenant-id quando super_admin está impersonando.
// Complementa o attachSupabaseAuth (bearer). Registrar depois dele em src/start.ts.
//
// Patch 2.3.1: leitura do estado local passa pelo módulo único
// `impersonation-state.ts` (fonte única de verdade para o client).
import { createMiddleware } from "@tanstack/react-start";
import { getImpersonationTenantId } from "@/integrations/supabase/impersonation-state";

export const attachTenantHeader = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const impersonating = getImpersonationTenantId();
    return next({
      headers: impersonating ? { "x-tenant-id": impersonating } : {},
    });
  },
);
