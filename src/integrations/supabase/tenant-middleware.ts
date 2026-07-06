// Tenant Middleware — Fase 2.2 (IA-001)
//
// Resolução determinística de tenantId server-side. Compõe-se sobre
// `requireSupabaseAuth`. Não participa do runtime do Workspace, não muta
// Registry / Snapshot / ResolutionGraph / Executor / PluginContext /
// Bootstrap. Camada exclusiva de autenticação + tenant resolution.
//
// Algoritmo (IA-001 §12.2):
//   1. Impersonação: header `x-tenant-id` → exige super-admin + tenant válido.
//   2. Memberships: consulta TODAS as memberships (sem LIMIT, sem ordenação).
//   3. Cardinalidade explícita:
//        A) 1 membership → usa esse tenantId.
//        B) N memberships → erro "Multiple tenant memberships. Tenant selection required."
//        C) 0 memberships → erro "Forbidden: no tenant membership".
//
// PROIBIDO: fallback implícito, heurísticas, LIMIT 1 como regra, cache
// global, singleton, SQL direto no algoritmo (usar TenantRepository).

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createSupabaseTenantRepository,
  type TenantRepository,
} from "@/integrations/supabase/tenant-repository";

export interface TenantContext {
  tenantId: string;
  userId: string;
  isSuperAdmin: boolean;
  impersonation: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Algoritmo puro de resolução — testável sem HTTP. */
export async function resolveTenantContext(params: {
  userId: string;
  isSuperAdmin: boolean;
  impersonateHeader: string | null;
  repo: TenantRepository;
}): Promise<TenantContext> {
  const { userId, isSuperAdmin, impersonateHeader, repo } = params;

  // ETAPA 1 — Impersonação
  if (impersonateHeader && impersonateHeader.length > 0) {
    if (!isSuperAdmin) {
      throw new Error("Forbidden: impersonation not allowed");
    }
    if (!UUID_RE.test(impersonateHeader)) {
      throw new Error("Invalid tenant");
    }
    const exists = await repo.exists(impersonateHeader);
    if (!exists) {
      throw new Error("Invalid tenant");
    }
    return {
      tenantId: impersonateHeader,
      userId,
      isSuperAdmin,
      impersonation: true,
    };
  }

  // ETAPA 2 — Memberships (sem LIMIT, sem ordenação implícita)
  const memberships = await repo.listByUser(userId);

  // ETAPA 3 — Cardinalidade explícita
  if (memberships.length === 1) {
    return {
      tenantId: memberships[0].tenantId,
      userId,
      isSuperAdmin,
      impersonation: false,
    };
  }
  if (memberships.length > 1) {
    throw new Error("Multiple tenant memberships. Tenant selection required.");
  }
  throw new Error("Forbidden: no tenant membership");
}

/**
 * Middleware server-side. Compõe sobre `requireSupabaseAuth` e enriquece
 * o contexto com `tenant` (TenantContext).
 *
 * Uso:
 *   export const myFn = createServerFn({ method: "POST" })
 *     .middleware([requireTenant])
 *     .handler(async ({ context }) => {
 *       const { tenantId } = context.tenant;
 *       ...
 *     });
 */
export const requireTenant = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const request = getRequest();
    const impersonateHeader =
      request?.headers?.get("x-tenant-id")?.trim() || null;

    const { data: isAdminData } = await context.supabase.rpc("is_super_admin");
    const isSuperAdmin = isAdminData === true;

    const repo = createSupabaseTenantRepository(context.supabase);

    const tenant = await resolveTenantContext({
      userId: context.userId,
      isSuperAdmin,
      impersonateHeader,
      repo,
    });

    return next({ context: { tenant } });
  });
