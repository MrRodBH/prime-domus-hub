/**
 * Helpers compartilhados dos módulos CMS (Fase 4 — Governança).
 * - assertCmsPermission: valida no servidor se o usuário tem determinada action num módulo CMS.
 * - logCmsAudit: registra mutação no audit_log com before/after + metadados (ip/user_agent).
 */
import { getRequest, getRequestIP } from "@tanstack/react-start/server";

export type CmsModule =
  | "cms.paginas"
  | "cms.campanhas"
  | "cms.formularios"
  | "cms.midias"
  | "cms.menu"
  | "cms.branding"
  | "cms.versoes"
  | "cms.configuracoes";

export type CmsAction = "visualizar" | "criar" | "editar" | "excluir" | "publicar";

interface AuthedCtx {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  userId: string;
}

/** Lança erro se o usuário autenticado não tiver a permissão CMS solicitada. */
export async function assertCmsPermission(ctx: AuthedCtx, modulo: CmsModule, action: CmsAction) {
  // Super admin e admin passam sempre
  const isAdmin = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if ((isAdmin.data as boolean | null) === true) return;
  const isSuper = await ctx.supabase.rpc("is_super_admin", {});
  if ((isSuper.data as boolean | null) === true) return;

  const { data, error } = await ctx.supabase.rpc("has_cms_permission", {
    _user_id: ctx.userId,
    _module_codigo: modulo,
    _action: action,
  });
  if (error) throw new Error("Falha ao validar permissão CMS.");
  if (!data) throw new Error(`Acesso negado: sua permissão ${modulo}/${action} não está habilitada.`);
}

/** Registra evento CMS no audit_log com metadados de request (ip / user_agent). */
export async function logCmsAudit(
  ctx: { userId: string },
  entity: string,
  action: string,
  entity_id: string | null,
  before: unknown,
  after: unknown,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let email: string | null = null;
    try {
      const u = await supabaseAdmin.auth.admin.getUserById(ctx.userId);
      email = u?.data?.user?.email ?? null;
    } catch { /* ignore */ }

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      const req = getRequest();
      ua = req.headers.get("user-agent");
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
    } catch { /* not in request scope */ }

    await supabaseAdmin.from("audit_log").insert({
      user_id: ctx.userId,
      user_email: email,
      action,
      entity,
      entity_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      before: (before ?? null) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      after: (after ?? null) as any,
      ip,
      user_agent: ua,
    });
  } catch (e) {
    // Nunca quebrar a operação por falha de auditoria.
    console.error("[cms-audit] falhou", e);
  }
}
