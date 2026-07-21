import {
  assertTenantScopedCollection,
  type PortalConnectorAuthority,
  PublicWriterError,
  selectExactlyOneRow,
  selectExactlyOneTenantScopedRow,
} from "@/lib/public-writers/public-writer-authority.server";
import { writePublicLead } from "@/lib/public-writers/public-lead-writer.server";

export interface PortalLeadInput {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  mensagem?: string | null;
  imovel_codigo?: string | null;
  imovel_id?: string | null;
  portal_reference?: string | null;
  valor_estimado?: number | null;
}

type PortalPropertyRow = {
  id: string;
  tenant_id: string;
  codigo: string | null;
  corretor_id: string | null;
};

export type PortalFeedLinkRow = {
  tenant_id?: string | null;
  imovel_id?: string | null;
  portal_slug?: string | null;
  status?: string | null;
};

export type PortalFeedLinkSelection =
  | { mode: "all_active_tenant_properties"; propertyIds: [] }
  | { mode: "explicit_property_ids"; propertyIds: string[] }
  | { mode: "no_properties"; propertyIds: [] };

const ELIGIBLE_PORTAL_LINK_STATUSES = new Set([
  "ativo",
  "aguardando",
  "publicado",
  "processando",
]);

const NON_ELIGIBLE_PORTAL_LINK_STATUSES = new Set([
  "inativo",
  "erro",
]);

export interface PortalFeedSnapshot {
  tenant: { id: string; nome: string | null };
  properties: Array<Record<string, unknown> & { id: string; bairro_nome: string }>;
  images: Map<string, string[]>;
}

async function resolvePropertyById(
  connector: PortalConnectorAuthority,
  id: string,
): Promise<PortalPropertyRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("imoveis")
    .select("id, tenant_id, codigo, corretor_id")
    .eq("tenant_id", connector.tenant.id)
    .eq("id", id)
    .limit(2);
  if (error) throw new Error(error.message);
  const row = selectExactlyOneTenantScopedRow(
    connector.tenant,
    data as PortalPropertyRow[] | null,
    {
      zeroMessage: "Portal property id was not found in the connector tenant.",
      ambiguousMessage: "Portal property id is ambiguous in the connector tenant.",
    },
  );
  if (!row) throw new Error("Portal property not found.");
  return row;
}

async function resolvePropertyByCode(
  connector: PortalConnectorAuthority,
  codigo: string,
): Promise<PortalPropertyRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("imoveis")
    .select("id, tenant_id, codigo, corretor_id")
    .eq("tenant_id", connector.tenant.id)
    .eq("codigo", codigo)
    .limit(2);
  if (error) throw new Error(error.message);
  const row = selectExactlyOneTenantScopedRow(
    connector.tenant,
    data as PortalPropertyRow[] | null,
    {
      zeroMessage: "Portal property code was not found in the connector tenant.",
      ambiguousMessage: "Portal property code is ambiguous in the connector tenant.",
    },
  );
  if (!row) throw new Error("Portal property not found.");
  return row;
}

export async function resolvePortalProperty(input: {
  connector: PortalConnectorAuthority;
  imovelId?: string | null;
  codigo?: string | null;
}): Promise<PortalPropertyRow | null> {
  const id = input.imovelId?.trim() || null;
  const codigo = input.codigo?.trim() || null;
  if (!id && !codigo) return null;

  const [byId, byCode] = await Promise.all([
    id ? resolvePropertyById(input.connector, id) : Promise.resolve(null),
    codigo ? resolvePropertyByCode(input.connector, codigo) : Promise.resolve(null),
  ]);
  if (byId && byCode && byId.id !== byCode.id) {
    throw new PublicWriterError(
      "writer_input_invalid",
      "Portal property id and code identify different properties.",
      409,
    );
  }
  return byId ?? byCode;
}

export async function ingestPortalLead(input: {
  connector: PortalConnectorAuthority;
  lead: PortalLeadInput;
}): Promise<{ leadId: string; imovelId: string | null }> {
  const property = await resolvePortalProperty({
    connector: input.connector,
    imovelId: input.lead.imovel_id,
    codigo: input.lead.imovel_codigo,
  });
  const result = await writePublicLead({
    tenant: input.connector.tenant,
    command: {
      nome: input.lead.nome,
      email: input.lead.email,
      telefone: input.lead.telefone,
      mensagem: input.lead.mensagem,
      origem: `portal:${input.connector.portalSlug}`,
      imovelId: property?.id ?? null,
      valorEstimado: input.lead.valor_estimado ?? null,
      attribution: {
        utm_source: input.connector.portalSlug,
        utm_medium: "portal",
      },
      notificationMode: "none",
    },
  });
  return { leadId: result.id, imovelId: result.imovelId };
}

export async function recordPortalLeadOutcome(input: {
  connector: PortalConnectorAuthority;
  status: "ok" | "erro";
  payload: unknown;
  durationMs: number;
  leadId?: string | null;
  imovelId?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("portal_sync_logs").insert({
    tenant_id: input.connector.tenant.id,
    portal_slug: input.connector.portalSlug,
    acao: "lead_ingest",
    status: input.status,
    payload: input.payload as never,
    erro: input.errorMessage ?? null,
    lead_id: input.leadId ?? null,
    imovel_id: input.imovelId ?? null,
    duration_ms: input.durationMs,
  } as never);
  if (error) throw new Error(error.message);
}

async function resolveFeedTenant(
  connector: PortalConnectorAuthority,
): Promise<{ id: string; nome: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, nome")
    .eq("id", connector.tenant.id)
    .limit(2);
  if (error) throw new Error(error.message);
  const row = selectExactlyOneRow(
    data as Array<{ id: string; nome: string | null }> | null,
    {
      zeroMessage: "Portal connector tenant no longer exists.",
      ambiguousMessage: "Portal connector tenant identity is ambiguous.",
    },
  );
  if (!row || row.id !== connector.tenant.id) {
    throw new PublicWriterError(
      "resource_foreign_tenant",
      "Portal connector tenant response does not match accepted authority.",
      403,
    );
  }
  return row;
}

export function decidePortalFeedLinkSelection(
  connector: PortalConnectorAuthority,
  rows: readonly PortalFeedLinkRow[] | null | undefined,
): PortalFeedLinkSelection {
  const acceptedLinks = assertTenantScopedCollection(connector.tenant, rows);
  if (acceptedLinks.length === 0) {
    return { mode: "all_active_tenant_properties", propertyIds: [] };
  }

  const seenPropertyIds = new Set<string>();
  const eligiblePropertyIds: string[] = [];

  for (const row of acceptedLinks) {
    if (row.portal_slug !== connector.portalSlug) {
      throw new PublicWriterError(
        "resource_foreign_tenant",
        "Portal link response does not match accepted connector.",
        403,
      );
    }

    const propertyId = row.imovel_id?.trim();
    if (!propertyId) {
      throw new PublicWriterError(
        "portal_link_state_ambiguous",
        "Portal link state is missing property identity.",
        409,
      );
    }
    if (seenPropertyIds.has(propertyId)) {
      throw new PublicWriterError(
        "portal_link_state_ambiguous",
        "Portal link state contains duplicate property authority.",
        409,
      );
    }
    seenPropertyIds.add(propertyId);

    const status = row.status?.trim().toLowerCase();
    if (!status) {
      throw new PublicWriterError(
        "portal_link_state_ambiguous",
        "Portal link state is missing status.",
        409,
      );
    }
    if (ELIGIBLE_PORTAL_LINK_STATUSES.has(status)) {
      eligiblePropertyIds.push(propertyId);
      continue;
    }
    if (NON_ELIGIBLE_PORTAL_LINK_STATUSES.has(status)) {
      continue;
    }
    throw new PublicWriterError(
      "portal_link_state_ambiguous",
      `Portal link state contains unsupported status: ${status}.`,
      409,
    );
  }

  if (eligiblePropertyIds.length === 0) {
    return { mode: "no_properties", propertyIds: [] };
  }
  return { mode: "explicit_property_ids", propertyIds: eligiblePropertyIds };
}

export async function loadPortalFeedSnapshot(input: {
  connector: PortalConnectorAuthority;
}): Promise<PortalFeedSnapshot> {
  const { connector } = input;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const tenant = await resolveFeedTenant(connector);

  const { data: links, error: linkError } = await supabaseAdmin
    .from("imovel_portais")
    .select("tenant_id, imovel_id, portal_slug, status")
    .eq("tenant_id", connector.tenant.id)
    .eq("portal_slug", connector.portalSlug);
  if (linkError) throw new Error(linkError.message);

  const linkSelection = decidePortalFeedLinkSelection(
    connector,
    links as PortalFeedLinkRow[] | null,
  );

  let acceptedProperties: Array<
    Record<string, unknown> & {
      id: string;
      tenant_id: string;
      bairro_nome: string;
    }
  > = [];

  if (linkSelection.mode !== "no_properties") {
    let query = supabaseAdmin
      .from("imoveis")
      .select("*, bairros(nome)")
      .eq("tenant_id", connector.tenant.id)
      .eq("status", "ativo")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (linkSelection.mode === "explicit_property_ids") {
      query = query.in("id", linkSelection.propertyIds);
    }

    const { data: properties, error: propertyError } = await query;
    if (propertyError) throw new Error(propertyError.message);

    acceptedProperties = assertTenantScopedCollection(
      connector.tenant,
      properties as Array<
        Record<string, unknown> & {
          id: string;
          tenant_id: string;
          bairros?: { nome?: string } | null;
        }
      > | null,
    ).map((property) => ({
      ...property,
      bairro_nome: property.bairros?.nome ?? "",
    }));

    if (linkSelection.mode === "explicit_property_ids") {
      const acceptedIdSet = new Set(acceptedProperties.map((property) => property.id));
      const unresolved = linkSelection.propertyIds.filter((id) => !acceptedIdSet.has(id));
      if (unresolved.length > 0) {
        throw new PublicWriterError(
          "portal_link_state_ambiguous",
          "Portal link state references unavailable properties.",
          409,
        );
      }
    }
  }

  const propertyIds = acceptedProperties.map((property) => property.id);
  const images = new Map<string, string[]>();
  if (propertyIds.length > 0) {
    const { data: imageRows, error: imageError } = await supabaseAdmin
      .from("imovel_imagens")
      .select("imovel_id, url, ordem")
      .in("imovel_id", propertyIds)
      .order("ordem", { ascending: true });
    if (imageError) throw new Error(imageError.message);
    const allowedIds = new Set(propertyIds);
    for (const row of imageRows ?? []) {
      if (!allowedIds.has(row.imovel_id)) {
        throw new PublicWriterError(
          "resource_foreign_tenant",
          "Portal image response references a property outside the accepted feed.",
          403,
        );
      }
      const list = images.get(row.imovel_id) ?? [];
      list.push(row.url);
      images.set(row.imovel_id, list);
    }
  }

  return { tenant, properties: acceptedProperties, images };
}

export async function recordPortalFeedSuccess(input: {
  connector: PortalConnectorAuthority;
  properties: Array<{ id: string }>;
  durationMs: number;
}): Promise<void> {
  const { connector } = input;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (input.properties.length > 0) {
    const rows = input.properties.map((property) => ({
      tenant_id: connector.tenant.id,
      imovel_id: property.id,
      portal_slug: connector.portalSlug,
      status: "publicado",
      publicado: true,
      ultima_leitura: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin
      .from("imovel_portais")
      .upsert(rows as never, { onConflict: "imovel_id,portal_slug" });
    if (error) throw new Error(error.message);
  }

  const { error: connectorError } = await supabaseAdmin
    .from("portal_connectors")
    .update({
      ultimo_sync_at: new Date().toISOString(),
      status: "ativo",
      ultimo_erro: null,
    } as never)
    .eq("id", connector.id)
    .eq("tenant_id", connector.tenant.id)
    .eq("portal_slug", connector.portalSlug);
  if (connectorError) throw new Error(connectorError.message);

  const { error: logError } = await supabaseAdmin.from("portal_sync_logs").insert({
    tenant_id: connector.tenant.id,
    portal_slug: connector.portalSlug,
    acao: "feed_read",
    status: "ok",
    payload: { count: input.properties.length } as never,
    duration_ms: input.durationMs,
  } as never);
  if (logError) throw new Error(logError.message);
}

export async function recordPortalFeedFailure(input: {
  connector: PortalConnectorAuthority;
  durationMs: number;
  errorMessage: string;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("portal_sync_logs").insert({
    tenant_id: input.connector.tenant.id,
    portal_slug: input.connector.portalSlug,
    acao: "feed_read",
    status: "erro",
    erro: input.errorMessage,
    duration_ms: input.durationMs,
  } as never);
}
