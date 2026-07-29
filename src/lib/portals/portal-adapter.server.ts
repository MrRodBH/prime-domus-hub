import type { Json } from "@/integrations/supabase/types";
import {
  DEFAULT_PORTAL_MAPPING,
  getPortalConnectorDefinition,
  type PortalAutomatedMethod,
  type PortalHybridConfig,
  type PortalMapping,
} from "@/lib/portals/portal-connector-registry";

export type PortalPropertyRecord = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  codigo: string | null;
  tipo: string;
  finalidade: string;
  preco: number | null;
  preco_sob_consulta: boolean;
  cidade: string | null;
  estado: string | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  area_util: number | null;
  status: string;
  publicado_em: string | null;
  updated_at: string;
};

export type PortalMediaRecord = {
  id: string;
  tenant_id: string;
  imovel_id: string;
  url: string;
  ordem: number;
};

export type PortalPublicationPayload = {
  schemaVersion: 1;
  property: {
    id: string;
    title: string;
    description: string | null;
    code: string | null;
    type: string;
    purpose: string;
    price: number | null;
    priceOnRequest: boolean;
    city: string | null;
    state: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    parkingSpaces: number | null;
    usableArea: number | null;
    publishedAt: string;
    updatedAt: string;
  };
  media: Array<{ id: string; persistedReference: string; order: number }>;
};

export type PortalAdapterResult =
  | {
      ok: true;
      externalReference: string;
      responseCode: string;
      responseMetadata: Json;
    }
  | {
      ok: false;
      retryable: boolean;
      errorCode: string;
      sanitizedMessage: string;
    };

export interface PortalAdapter {
  connectorKey: PortalAutomatedMethod;
  validateConfiguration(config: PortalHybridConfig): void;
  buildPublicationPayload(input: {
    property: PortalPropertyRecord;
    media: PortalMediaRecord[];
    mapping: PortalMapping;
  }): PortalPublicationPayload;
  publish(input: {
    endpoint: string | null;
    credentialReference: string | null;
    payload: PortalPublicationPayload;
    timeoutMs: number;
  }): Promise<PortalAdapterResult>;
  unpublish(input: {
    endpoint: string | null;
    credentialReference: string | null;
    externalReference: string;
    timeoutMs: number;
  }): Promise<PortalAdapterResult>;
  reconcile(input: {
    endpoint: string | null;
    credentialReference: string | null;
    externalReference: string;
    timeoutMs: number;
  }): Promise<PortalAdapterResult>;
  healthCheck(input: {
    endpoint: string | null;
    credentialReference: string | null;
    timeoutMs: number;
  }): Promise<PortalAdapterResult>;
}

export function validatePortalEndpoint(
  endpoint: string | null | undefined,
): string | null {
  if (!endpoint) return null;
  const parsed = new URL(endpoint);
  if (parsed.protocol !== "https:") throw new Error("portal_endpoint_https_required");
  if (parsed.username || parsed.password) throw new Error("portal_endpoint_credentials_prohibited");
  if (
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "0.0.0.0" ||
    parsed.hostname === "::1" ||
    /^10\./.test(parsed.hostname) ||
    /^192\.168\./.test(parsed.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)
  ) {
    throw new Error("portal_endpoint_private_network_prohibited");
  }
  return parsed.toString();
}

export function buildPortalPublicationPayload(input: {
  property: PortalPropertyRecord;
  media: PortalMediaRecord[];
  mapping?: PortalMapping;
}): PortalPublicationPayload {
  const { property } = input;
  const mapping = input.mapping ?? DEFAULT_PORTAL_MAPPING;
  if (property.status !== "publicado" || !property.publicado_em) {
    throw new Error("tenant_portal_property_ineligible");
  }
  if (!property.id || !property.tenant_id || !property.titulo) {
    throw new Error("tenant_portal_property_invalid");
  }
  if (mapping.media !== "tenant_scoped_media") {
    throw new Error("tenant_portal_mapping_invalid");
  }

  const media = [...input.media]
    .sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))
    .map((item) => {
      if (item.tenant_id !== property.tenant_id || item.imovel_id !== property.id) {
        throw new Error("tenant_portal_cross_tenant_media");
      }
      return {
        id: item.id,
        persistedReference: item.url,
        order: item.ordem,
      };
    });

  return {
    schemaVersion: 1,
    property: {
      id: property.id,
      title: property.titulo,
      description: property.descricao,
      code: property.codigo,
      type: property.tipo,
      purpose: property.finalidade,
      price: property.preco,
      priceOnRequest: property.preco_sob_consulta,
      city: property.cidade,
      state: property.estado,
      bedrooms: property.quartos,
      bathrooms: property.banheiros,
      parkingSpaces: property.vagas,
      usableArea: property.area_util,
      publishedAt: property.publicado_em,
      updatedAt: property.updated_at,
    },
    media,
  };
}

export async function hashPortalPayload(payload: Json): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(stableJson(payload)).digest("hex");
}

export function stableJson(value: Json): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const entries = Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child as Json)}`).join(",")}}`;
}

function notImplementedResult(connectorKey: PortalAutomatedMethod): PortalAdapterResult {
  return {
    ok: false,
    retryable: false,
    errorCode: "adapter_not_implemented",
    sanitizedMessage: `${connectorKey} adapter is not implemented. Use a manual export.`,
  };
}

export function getPortalAdapter(connectorKey: PortalAutomatedMethod): PortalAdapter {
  const definition = getPortalConnectorDefinition(connectorKey);
  return {
    connectorKey,
    validateConfiguration(config) {
      if (config.operation_mode !== "HYBRID" || config.automated_method !== connectorKey) {
        throw new Error("portal_adapter_configuration_mismatch");
      }
      if (definition.availabilityState !== "adapter_not_implemented") {
        throw new Error("portal_adapter_registry_inconsistent");
      }
      const endpoint = connectorKey === "WEBHOOK" ? null : null;
      validatePortalEndpoint(endpoint);
    },
    buildPublicationPayload,
    async publish() {
      return notImplementedResult(connectorKey);
    },
    async unpublish() {
      return notImplementedResult(connectorKey);
    },
    async reconcile() {
      return notImplementedResult(connectorKey);
    },
    async healthCheck() {
      return notImplementedResult(connectorKey);
    },
  };
}

export function csvEscape(value: unknown): string {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function buildPortalCsv(
  rows: PortalPublicationPayload[],
): string {
  const header = [
    "id",
    "title",
    "description",
    "code",
    "type",
    "purpose",
    "price",
    "price_on_request",
    "city",
    "state",
    "bedrooms",
    "bathrooms",
    "parking_spaces",
    "usable_area",
    "published_at",
    "updated_at",
    "media_references",
  ];
  const ordered = [...rows].sort((a, b) => a.property.id.localeCompare(b.property.id));
  const body = ordered.map(({ property, media }) => [
    property.id,
    property.title,
    property.description,
    property.code,
    property.type,
    property.purpose,
    property.price,
    property.priceOnRequest,
    property.city,
    property.state,
    property.bedrooms,
    property.bathrooms,
    property.parkingSpaces,
    property.usableArea,
    property.publishedAt,
    property.updatedAt,
    media.map((item) => item.persistedReference).join("|"),
  ].map(csvEscape).join(","));
  return [header.map(csvEscape).join(","), ...body].join("\n");
}

export async function buildPortalXlsx(
  rows: PortalPublicationPayload[],
): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const ordered = [...rows].sort((a, b) => a.property.id.localeCompare(b.property.id));
  const worksheetRows = ordered.map(({ property, media }) => ({
    id: property.id,
    title: property.title,
    description: property.description ?? "",
    code: property.code ?? "",
    type: property.type,
    purpose: property.purpose,
    price: property.price ?? "",
    price_on_request: property.priceOnRequest,
    city: property.city ?? "",
    state: property.state ?? "",
    bedrooms: property.bedrooms ?? "",
    bathrooms: property.bathrooms ?? "",
    parking_spaces: property.parkingSpaces ?? "",
    usable_area: property.usableArea ?? "",
    published_at: property.publishedAt,
    updated_at: property.updatedAt,
    media_references: media.map((item) => item.persistedReference).join("|"),
  }));
  const sheet = XLSX.utils.json_to_sheet(worksheetRows, {
    header: [
      "id",
      "title",
      "description",
      "code",
      "type",
      "purpose",
      "price",
      "price_on_request",
      "city",
      "state",
      "bedrooms",
      "bathrooms",
      "parking_spaces",
      "usable_area",
      "published_at",
      "updated_at",
      "media_references",
    ],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "properties");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true });
}
