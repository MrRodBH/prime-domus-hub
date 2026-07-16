// LSH-01 — Lead Authorization Boundary (typed, server-only).
//
// Recovery Mode · Lote A — Runtime Authorization Integration.
//
// Autoridade única e tipada de autorização TypeScript para as operações
// Lead cobertas pela LSH-01. Este módulo NÃO substitui a autoridade
// transacional da RPC `create_manual_lead`, nem as policies RLS: ele é a
// primeira camada — resolve tenant no servidor (via `get_current_tenant_id`),
// valida membership ATIVA com cardinalidade explícita, deriva evidência
// canônica de Super Admin (via `is_super_admin`) e decide a operação com
// scope.
//
// A comprovação operacional contra Postgres real (múltiplos JWTs, RLS
// efetivo, grants, impersonation runtime) é escopo exclusivo da LSV-01;
// aqui os testes são unitários e determinísticos por injeção de dependência.
//
// IMPORTANTE:
//  - O contexto público `LeadAuthorizationContext` NÃO aceita mais um
//    booleano livre `impersonating`. A evidência é derivada no servidor.
//  - Super Admin é detectado pela RPC canônica `is_super_admin`. Um usuário
//    com role `admin` (app_role) NÃO é Super Admin.
//  - Se o runtime atual não expuser evidência canônica adicional de
//    impersonação (ex.: contexto de tenant-middleware fora deste boundary),
//    o campo `impersonating` reflete apenas `isSuperAdmin`. Fail-closed
//    reforçado a nível SQL fica reservado ao Lote B.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type LeadOperation =
  | "lead.list"
  | "lead.list_assignees"
  | "lead.list_properties"
  | "lead.create_manual"
  | "lead.update_fields"
  | "lead.workspace_action";

export type LeadAccessScope = "tenant_wide" | "own_assigned";

export type LeadAppRole =
  | "admin"
  | "corretor"
  | "secretaria"
  | "gerente"
  | "captador";

export interface LeadAuthorizationDecision {
  actorUserId: string;
  tenantId: string;
  membershipKey: string;
  operation: LeadOperation;
  scope: LeadAccessScope;
  /** Evidence from `public.is_super_admin` RPC only. */
  isSuperAdmin: boolean;
  /**
   * Impersonation evidence is authoritative only inside the SQL RPC (via the
   * `x-tenant-id` transport header, mirrored by `get_current_tenant_id`). The
   * boundary keeps this fail-closed: never derived from `isSuperAdmin`.
   */
  impersonating: boolean;
  appRoles: ReadonlyArray<LeadAppRole>;
}

export type TypedSupabase = SupabaseClient<Database>;

/**
 * Contexto público consumido por callers server-side. `impersonating` NÃO
 * é aceito aqui — a evidência é derivada internamente via repo canônico.
 */
export interface LeadAuthorizationContext {
  supabase: TypedSupabase;
  userId: string;
}

export class LeadAuthorizationError extends Error {
  readonly code:
    | "unauthenticated"
    | "tenant_not_resolved"
    | "membership_missing"
    | "membership_ambiguous"
    | "operation_forbidden"
    | "super_admin_requires_impersonation";
  constructor(code: LeadAuthorizationError["code"], message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "LeadAuthorizationError";
  }
}

// -----------------------------------------------------------------------
// Repository — abstração testável sobre Supabase.
// -----------------------------------------------------------------------

export interface LeadAuthorizationRepository {
  resolveTenant(): Promise<string | null>;
  listActiveMemberships(
    userId: string,
    tenantId: string,
  ): Promise<Array<{ id: string; membership_status: string }>>;
  listAppRoles(userId: string): Promise<ReadonlyArray<LeadAppRole>>;
  /** Evidência canônica via RPC `is_super_admin`. Nunca via `has_role admin`. */
  isSuperAdmin(userId: string): Promise<boolean>;
}

export function createSupabaseLeadAuthorizationRepository(
  supabase: TypedSupabase,
): LeadAuthorizationRepository {
  return {
    async resolveTenant() {
      const { data, error } = await supabase.rpc("get_current_tenant_id");
      if (error) throw new Error(error.message);
      return (data as string | null) ?? null;
    },
    async listActiveMemberships(userId, tenantId) {
      const { data, error } = await supabase
        .from("tenant_members")
        .select("tenant_id, user_id, membership_status")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .eq("membership_status", "active");
      if (error) throw new Error(error.message);
      const rows =
        (data ?? []) as Array<{
          tenant_id: string;
          user_id: string;
          membership_status: string;
        }>;
      return rows.map((r) => ({
        id: `${r.tenant_id}:${r.user_id}`,
        membership_status: r.membership_status,
      }));
    },
    async listAppRoles(userId) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ role: LeadAppRole }>).map((r) => r.role);
    },
    async isSuperAdmin(_userId) {
      // RPC canônica sem argumentos (usa `auth.uid()` internamente).
      const { data, error } = await supabase.rpc("is_super_admin");
      if (error) throw new Error(error.message);
      return data === true;
    },
  };
}

// -----------------------------------------------------------------------
// Matriz de autorização — pura, sem I/O.
//
// operação                       | autorizados                     | tenant_wide
// -------------------------------+---------------------------------+---------------------
// lead.list                      | admin, gerente, corretor        | admin, gerente
// lead.list_assignees            | admin, gerente                  | admin, gerente
// lead.list_properties           | admin, gerente, corretor        | admin, gerente
// lead.create_manual             | admin, corretor                 | admin
// lead.update_fields             | admin, gerente, corretor        | admin, gerente
// lead.workspace_action          | (nenhum — sempre denied)        | —
//
// Papéis `secretaria` e `captador` não possuem evidência de autoridade
// sobre o domínio Lead; preferimos negar (fail-closed).
// -----------------------------------------------------------------------

interface OperationRule {
  requiredAnyRole: ReadonlyArray<LeadAppRole>;
  tenantWideRoles: ReadonlyArray<LeadAppRole>;
}

const OPERATION_MATRIX: Readonly<Record<LeadOperation, OperationRule>> = {
  "lead.list": {
    requiredAnyRole: ["admin", "gerente", "corretor"],
    tenantWideRoles: ["admin", "gerente"],
  },
  "lead.list_assignees": {
    requiredAnyRole: ["admin", "gerente"],
    tenantWideRoles: ["admin", "gerente"],
  },
  "lead.list_properties": {
    requiredAnyRole: ["admin", "gerente", "corretor"],
    tenantWideRoles: ["admin", "gerente"],
  },
  "lead.create_manual": {
    requiredAnyRole: ["admin", "corretor"],
    tenantWideRoles: ["admin"],
  },
  "lead.update_fields": {
    requiredAnyRole: ["admin", "gerente", "corretor"],
    tenantWideRoles: ["admin", "gerente"],
  },
  "lead.workspace_action": {
    requiredAnyRole: [],
    tenantWideRoles: [],
  },
};

export function decideOperationScope(
  operation: LeadOperation,
  appRoles: ReadonlyArray<LeadAppRole>,
): { authorized: boolean; scope: LeadAccessScope } {
  const rule = OPERATION_MATRIX[operation];
  const authorized = rule.requiredAnyRole.some((r) => appRoles.includes(r));
  const tenantWide = rule.tenantWideRoles.some((r) => appRoles.includes(r));
  return { authorized, scope: tenantWide ? "tenant_wide" : "own_assigned" };
}

// -----------------------------------------------------------------------
// Autorização — algoritmo puro sobre o repositório.
// -----------------------------------------------------------------------

export async function authorizeLeadOperation(
  ctx: LeadAuthorizationContext,
  operation: LeadOperation,
  repo: LeadAuthorizationRepository = createSupabaseLeadAuthorizationRepository(
    ctx.supabase,
  ),
): Promise<LeadAuthorizationDecision> {
  if (!ctx.userId) {
    throw new LeadAuthorizationError("unauthenticated");
  }

  const tenantId = await repo.resolveTenant();
  if (!tenantId) {
    throw new LeadAuthorizationError("tenant_not_resolved");
  }

  const memberships = await repo.listActiveMemberships(ctx.userId, tenantId);
  if (memberships.length === 0) {
    throw new LeadAuthorizationError("membership_missing");
  }
  if (memberships.length > 1) {
    throw new LeadAuthorizationError("membership_ambiguous");
  }

  const [appRoles, isSuperAdmin] = await Promise.all([
    repo.listAppRoles(ctx.userId),
    repo.isSuperAdmin(ctx.userId),
  ]);

  const { authorized, scope } = decideOperationScope(operation, appRoles);
  if (!authorized) {
    throw new LeadAuthorizationError(
      "operation_forbidden",
      `forbidden: ${operation}`,
    );
  }

  return {
    actorUserId: ctx.userId,
    tenantId,
    membershipKey: memberships[0].id,
    operation,
    scope,
    isSuperAdmin,
    // Fail-closed: impersonation is proven only by the RPC (header transport).
    impersonating: false,
    appRoles,
  };
}

// -----------------------------------------------------------------------
// Adaptador server-only — converte o contexto do middleware
// (`requireSupabaseAuth`) no contexto público do boundary. Server-side
// apenas; nenhum campo derivado do client é aceito.
// -----------------------------------------------------------------------

export interface AuthenticatedRequestLike {
  supabase: TypedSupabase;
  userId: string;
}

export function buildLeadAuthorizationContext(
  authenticated: AuthenticatedRequestLike,
): LeadAuthorizationContext {
  return {
    supabase: authenticated.supabase,
    userId: authenticated.userId,
  };
}
