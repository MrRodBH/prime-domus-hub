import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Fase 4B — Auditoria CMS.
 * Consulta o audit_log filtrando apenas eventos de módulos CMS (action LIKE 'cms.%').
 * Suporta filtros por módulo, sub-ação (criar/editar/publicar/excluir), usuário,
 * entidade, intervalo de datas e busca textual em entity_id / user_email.
 */

const CMS_MODULES = [
  "cms.paginas",
  "cms.campanhas",
  "cms.formularios",
  "cms.midias",
  "cms.menu",
  "cms.branding",
  "cms.versoes",
  "cms.configuracoes",
  // Sinônimos usados nas actions do backend (traduzir para módulos):
  "cms.pagina",
  "cms.campanha",
  "cms.formulario",
  "cms.midia",
  "cms.rascunho",
  "cms.versao",
  "cms.settings",
] as const;

const filterSchema = z.object({
  modulo: z.string().optional().nullable(),
  sub_action: z.enum(["criar", "editar", "publicar", "excluir", "reordenar", "upload", "restaurar", "descartar", "salvar", "campos"]).optional().nullable(),
  user_email: z.string().optional().nullable(),
  entity: z.string().optional().nullable(),
  entity_id: z.string().optional().nullable(),
  from: z.string().optional().nullable(),
  to: z.string().optional().nullable(),
  search: z.string().optional().nullable(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdminOrCmsView(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (isAdmin === true) return;
  // Permite quem tem qualquer permissão de visualização em cms.versoes ou cms.configuracoes
  const { data: canVer } = await ctx.supabase.rpc("has_cms_permission", {
    _user_id: ctx.userId,
    _module_codigo: "cms.versoes",
    _action: "visualizar",
  });
  const { data: canConf } = await ctx.supabase.rpc("has_cms_permission", {
    _user_id: ctx.userId,
    _module_codigo: "cms.configuracoes",
    _action: "visualizar",
  });
  if (canVer === true || canConf === true) return;
  throw new Error("Acesso negado à auditoria CMS.");
}

export const listarCmsAuditoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(filterSchema.optional())
  .handler(async ({ context, data }) => {
    await ensureAdminOrCmsView(context);
    const f = data ?? {};
    const limit = f.limit ?? 100;
    const offset = f.offset ?? 0;

    let q = context.supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .like("action", "cms.%")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (f.modulo) {
      // action = "cms.<modulo>.<sub>[:sufixo]"; casamos por prefixo com dot.
      q = q.like("action", `${f.modulo}.%`);
    }
    if (f.sub_action) {
      q = q.like("action", `%.${f.sub_action}%`);
    }
    if (f.user_email) q = q.ilike("user_email", `%${f.user_email}%`);
    if (f.entity) q = q.eq("entity", f.entity);
    if (f.entity_id) q = q.ilike("entity_id", `%${f.entity_id}%`);
    if (f.from) q = q.gte("created_at", f.from);
    if (f.to) q = q.lte("created_at", f.to);
    if (f.search) {
      // busca simples em user_email OR entity_id OR action
      q = q.or(
        `user_email.ilike.%${f.search}%,entity_id.ilike.%${f.search}%,action.ilike.%${f.search}%`,
      );
    }

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const modulosCmsAuditoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdminOrCmsView(context);
    return CMS_MODULES;
  });
