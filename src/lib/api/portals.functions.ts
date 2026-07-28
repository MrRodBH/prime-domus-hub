import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  PORTAL_AUTOMATED_METHODS,
  PORTAL_MANUAL_METHODS,
  PortalHybridConfigSchema,
  parsePortalHybridConfig,
  portalConfigurationState,
  sanitizePortalConnector,
  type PortalConnectorRow,
  type PortalHybridConfig,
} from "@/lib/portals/portal-connector-registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertPortalManager(ctx: any): Promise<string> {
  const tenantId = requireTenantScopedAuthority(ctx.tenant, "Portal");
  const [adminResult, managerResult] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "gerente" }),
  ]);
  if (adminResult.error || managerResult.error) {
    throw new Error("Falha ao validar autorização de portais.");
  }
  if (adminResult.data !== true && managerResult.data !== true) {
    throw new Error("Acesso negado.");
  }
  return tenantId;
}

function assertPortalTransport(
  config: PortalHybridConfig,
  feedUrl: string | null,
  webhookUrl: string | null,
) {
  if (
    (config.automated_method === "JSON_API" || config.automated_method === "XML_FEED") &&
    !feedUrl
  ) {
    throw new Error("Portal connector automated feed/API URL is required.");
  }
  if (config.automated_method === "WEBHOOK" && !webhookUrl) {
    throw new Error("Portal connector webhook URL is required.");
  }
}

/** Contrato estável usado pela interface para expor todas as opções suportadas. */
export const obterContratoPortais = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    await assertPortalManager(context);
    return {
      operation_mode: "HYBRID" as const,
      automated_methods: [...PORTAL_AUTOMATED_METHODS],
      manual_methods: [...PORTAL_MANUAL_METHODS],
      required_fields: [
        "automated_method",
        "manual_method",
        "configuration_schema_version",
        "mapping_profile",
        "retry_policy",
      ],
      optional_fields: [
        "credential_reference",
        "publication_rules",
        "feed_url",
        "webhook_url",
      ],
      configuration_states: ["configuration_required", "ready"],
      statuses: ["ativo", "inativo"],
    };
  });

export const listarPortais = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const tenantId = await assertPortalManager(context);
    const { data, error } = await context.supabase
      .from("portal_connectors")
      .select(
        "id, tenant_id, portal_nome, portal_slug, ativo, status, feed_url, webhook_url, config, ultimo_sync_at, ultimo_erro, created_at, updated_at",
      )
      .eq("tenant_id", tenantId)
      .order("portal_nome", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      sanitizePortalConnector(row as unknown as PortalConnectorRow),
    );
  });

const salvarSchema = z
  .object({
    id: z.string().uuid(),
    ativo: z.boolean().optional(),
    feed_url: z.string().url().optional().nullable(),
    webhook_url: z.string().url().optional().nullable(),
    hybrid_config: PortalHybridConfigSchema.optional(),
    config: PortalHybridConfigSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hybrid_config !== undefined && data.config !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use hybrid_config ou config, nunca ambos.",
      });
    }
  });

export const atualizarPortal = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => salvarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await assertPortalManager(context);
    const { data: current, error: currentError } = await context.supabase
      .from("portal_connectors")
      .select("id, ativo, feed_url, webhook_url, config")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) throw new Error("Portal connector não encontrado.");

    const providedConfig = data.hybrid_config ?? data.config;
    const nextConfig = providedConfig !== undefined
      ? parsePortalHybridConfig(providedConfig)
      : portalConfigurationState(current.config).config;
    const nextFeedUrl = data.feed_url !== undefined ? data.feed_url : current.feed_url;
    const nextWebhookUrl = data.webhook_url !== undefined ? data.webhook_url : current.webhook_url;
    const nextActive = data.ativo !== undefined ? data.ativo : current.ativo;

    if (nextActive) {
      if (!nextConfig) {
        throw new Error("Portal connector hybrid configuration is required before activation.");
      }
      assertPortalTransport(nextConfig, nextFeedUrl, nextWebhookUrl);
    }

    const patch: Record<string, unknown> = {};
    if (data.ativo !== undefined) {
      patch.ativo = data.ativo;
      patch.status = data.ativo ? "ativo" : "inativo";
    }
    if (data.feed_url !== undefined) patch.feed_url = data.feed_url;
    if (data.webhook_url !== undefined) patch.webhook_url = data.webhook_url;
    if (providedConfig !== undefined) patch.config = nextConfig;

    if (Object.keys(patch).length === 0) {
      return { ok: true, changed: false };
    }

    const { data: row, error } = await context.supabase
      .from("portal_connectors")
      .update(patch as never)
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .select(
        "id, tenant_id, portal_nome, portal_slug, ativo, status, feed_url, webhook_url, config, ultimo_sync_at, ultimo_erro, created_at, updated_at",
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Portal connector não encontrado.");
    return {
      ok: true,
      changed: true,
      connector: sanitizePortalConnector(row as unknown as PortalConnectorRow),
    };
  });

/** Rotaciona o feed token e o retorna uma única vez. */
export const rotacionarToken = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await assertPortalManager(context);
    const { data: current, error: currentError } = await context.supabase
      .from("portal_connectors")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) throw new Error("Portal connector não encontrado.");

    const token = randomBytes(32).toString("base64url");
    const { data: updated, error } = await context.supabase
      .from("portal_connectors")
      .update({ feed_token: token } as never)
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Portal connector não encontrado.");
    return { ok: true, token, display_once: true };
  });

export const dashboardPortais = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const tenantId = await assertPortalManager(context);
    const supabase = context.supabase;
    const [publicados, pendentes, erros, ativos, leads, porPortal, logs] = await Promise.all([
      supabase
        .from("imovel_portais")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("publicado", true),
      supabase
        .from("imovel_portais")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("status", ["aguardando", "processando"]),
      supabase
        .from("imovel_portais")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "erro"),
      supabase
        .from("portal_connectors")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("ativo", true),
      supabase
        .from("leads")
        .select("id, origem, created_at")
        .eq("tenant_id", tenantId)
        .not("origem", "is", null)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("imovel_portais")
        .select("portal_slug, status")
        .eq("tenant_id", tenantId),
      supabase
        .from("portal_sync_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    for (const result of [publicados, pendentes, erros, ativos, leads, porPortal, logs]) {
      if (result.error) throw new Error(result.error.message);
    }

    const leadsPorPortal: Record<string, number> = {};
    for (const lead of leads.data ?? []) {
      const key = (lead.origem ?? "outros").toString().toLowerCase();
      leadsPorPortal[key] = (leadsPorPortal[key] ?? 0) + 1;
    }

    const imoveisPorPortal: Record<string, { publicado: number; erro: number; total: number }> = {};
    for (const row of porPortal.data ?? []) {
      const key = row.portal_slug;
      if (!imoveisPorPortal[key]) {
        imoveisPorPortal[key] = { publicado: 0, erro: 0, total: 0 };
      }
      imoveisPorPortal[key].total += 1;
      if (row.status === "publicado") imoveisPorPortal[key].publicado += 1;
      if (row.status === "erro") imoveisPorPortal[key].erro += 1;
    }

    return {
      operation_mode: "HYBRID" as const,
      kpis: {
        imoveis_publicados: publicados.count ?? 0,
        imoveis_pendentes: pendentes.count ?? 0,
        imoveis_erro: erros.count ?? 0,
        portais_ativos: ativos.count ?? 0,
        leads_total: leads.data?.length ?? 0,
      },
      leadsPorPortal,
      imoveisPorPortal,
      logs: logs.data ?? [],
    };
  });

export const listarLogsPortal = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      portal_slug: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await assertPortalManager(context);
    let query = context.supabase
      .from("portal_sync_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.portal_slug) query = query.eq("portal_slug", data.portal_slug);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });