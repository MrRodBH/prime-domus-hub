// Portal Connector Engine (outbound)
// Adaptadores por portal para publicar/atualizar/remover imóveis via API própria.
// Fase 1: apenas stubs + roteamento. Adaptadores reais serão adicionados por portal
// (Zap/VivaReal API B2B, ChavesNaMão feed pull, OLX API parceiros, MercadoLivre API).
//
// Uso:
//   const engine = getPortalEngine("zap");
//   const result = await engine.push(imovelPayload);
//
// Cada adaptador implementa PortalAdapter e é responsável por:
//   - Autenticar com credenciais do portal_connectors.credenciais (jsonb)
//   - Traduzir o schema interno para o schema do portal
//   - Retornar { ok, portal_reference?, erro? }
//
// Falhas são enfileiradas em portal_sync_dlq via portalDlqEnqueue().

export type ImovelPushPayload = {
  imovel_id: string;
  tenant_id: string;
  codigo: string;
  acao: "publicar" | "atualizar" | "remover";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imovel: any;
  credenciais: Record<string, string> | null;
};

export type PortalAdapterResult = {
  ok: boolean;
  portal_reference?: string;
  erro?: string;
};

export interface PortalAdapter {
  slug: string;
  push(payload: ImovelPushPayload): Promise<PortalAdapterResult>;
}

// Stub genérico — retorna "não implementado" e força o item para a DLQ do caller
class NotImplementedAdapter implements PortalAdapter {
  constructor(public slug: string) {}
  async push(): Promise<PortalAdapterResult> {
    return { ok: false, erro: `Conector ${this.slug} ainda não implementado (Fase 2)` };
  }
}

// Adaptador VRSync/feed (Zap, VivaReal) — o portal puxa o XML;
// aqui apenas confirmamos que o imóvel está marcado como ativo no imovel_portais.
class FeedPullAdapter implements PortalAdapter {
  constructor(public slug: string) {}
  async push(payload: ImovelPushPayload): Promise<PortalAdapterResult> {
    if (payload.acao === "remover") return { ok: true };
    // O portal puxa via /api/public/feeds/:portal/:token; nada a fazer aqui.
    return { ok: true, portal_reference: `feed:${this.slug}:${payload.codigo}` };
  }
}

const registry: Record<string, PortalAdapter> = {
  zap: new FeedPullAdapter("zap"),
  vivareal: new FeedPullAdapter("vivareal"),
  chavesnamao: new FeedPullAdapter("chavesnamao"),
  imovelweb: new NotImplementedAdapter("imovelweb"),
  olx: new NotImplementedAdapter("olx"),
  mercadolivre: new NotImplementedAdapter("mercadolivre"),
};

export function getPortalEngine(slug: string): PortalAdapter {
  return registry[slug.toLowerCase()] ?? new NotImplementedAdapter(slug);
}

export function isPortalImplemented(slug: string): boolean {
  return !(registry[slug.toLowerCase()] instanceof NotImplementedAdapter);
}
