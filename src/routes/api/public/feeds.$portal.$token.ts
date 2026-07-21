import { createFileRoute } from "@tanstack/react-router";
import {
  PublicWriterError,
  resolvePortalConnectorAuthority,
} from "@/lib/public-writers/public-writer-authority.server";
import {
  loadPortalFeedSnapshot,
  recordPortalFeedFailure,
  recordPortalFeedSuccess,
} from "@/lib/public-writers/portal-writer.server";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: unknown): string {
  const v = String(s ?? "");
  return `<![CDATA[${v.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

const TIPO_VRSYNC: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  cobertura: "Cobertura",
  sobrado: "Sobrado",
  terreno: "Terreno",
  sala_comercial: "Conjunto Comercial/Sala",
  loja: "Loja",
  galpao: "Galpão/Depósito/Armazém",
  chacara: "Chácara",
  sitio: "Sítio",
  fazenda: "Fazenda",
};

function tipoImovel(tipo: string | null | undefined): string {
  if (!tipo) return "Apartamento";
  return TIPO_VRSYNC[tipo.toLowerCase()] ?? "Apartamento";
}

function finalidadeVrsync(fin: string | null | undefined): string {
  if (fin === "aluguel") return "For Rent";
  if (fin === "temporada") return "Seasonal";
  return "For Sale";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildVrSyncXml(tenant: any, imoveis: any[], images: Map<string, string[]>): string {
  const now = new Date().toISOString();
  const providerName = tenant?.nome ?? "Imobiliária";
  const providerEmail = "contato@imobiliaria.com.br";

  const items = imoveis
    .map((im) => {
      const imgs = images.get(im.id) ?? [];
      const capa = im.imagem_capa ? [im.imagem_capa, ...imgs] : imgs;
      const fotosXml = capa
        .slice(0, 30)
        .map(
          (u, i) =>
            `<Foto><NomeArquivo>${esc(`foto-${i + 1}.jpg`)}</NomeArquivo><URLArquivo>${esc(u)}</URLArquivo><Principal>${i === 0 ? "true" : "false"}</Principal></Foto>`,
        )
        .join("");
      return `
    <Imovel>
      <CodigoImovel>${esc(im.codigo ?? im.id)}</CodigoImovel>
      <TipoImovel>${esc(tipoImovel(im.tipo))}</TipoImovel>
      <SubTipoImovel>${esc(tipoImovel(im.tipo))}</SubTipoImovel>
      <CategoriaImovel>${esc(im.finalidade === "aluguel" ? "Aluguel" : "Padrão")}</CategoriaImovel>
      <Modelo>${esc(finalidadeVrsync(im.finalidade))}</Modelo>
      <TituloImovel>${cdata(im.titulo ?? "")}</TituloImovel>
      <Observacao>${cdata(im.descricao ?? "")}</Observacao>
      <UF>${esc(im.estado ?? "")}</UF>
      <Cidade>${esc(im.cidade ?? "")}</Cidade>
      <Bairro>${esc(im.bairro_nome ?? "")}</Bairro>
      <CEP>${esc((im.cep ?? "").replace(/\D/g, ""))}</CEP>
      <Endereco>${esc(im.rua ?? im.endereco ?? "")}</Endereco>
      <Numero>${esc(im.numero ?? "")}</Numero>
      <Complemento>${esc(im.complemento ?? "")}</Complemento>
      <Latitude>${esc(im.latitude ?? "")}</Latitude>
      <Longitude>${esc(im.longitude ?? "")}</Longitude>
      <PrecoVenda>${im.finalidade === "venda" ? Number(im.preco ?? 0).toFixed(2) : "0.00"}</PrecoVenda>
      <PrecoLocacao>${im.finalidade === "aluguel" ? Number(im.preco ?? 0).toFixed(2) : "0.00"}</PrecoLocacao>
      <PrecoCondominio>${Number(im.condominio ?? 0).toFixed(2)}</PrecoCondominio>
      <PrecoIptu>${Number(im.iptu ?? 0).toFixed(2)}</PrecoIptu>
      <AreaTotal>${Number(im.area_total ?? 0)}</AreaTotal>
      <AreaUtil>${Number(im.area_util ?? 0)}</AreaUtil>
      <QtdDormitorios>${Number(im.quartos ?? 0)}</QtdDormitorios>
      <QtdSuites>${Number(im.suites ?? 0)}</QtdSuites>
      <QtdBanheiros>${Number(im.banheiros ?? 0)}</QtdBanheiros>
      <QtdVagas>${Number(im.vagas ?? 0)}</QtdVagas>
      <Fotos>${fotosXml}</Fotos>
    </Imovel>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Carga xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Provedor>${esc(providerName)}</Provedor>
    <Email>${esc(providerEmail)}</Email>
    <DataHora>${esc(now)}</DataHora>
  </Header>
  <Imoveis>${items}
  </Imoveis>
</Carga>`;
}

export const Route = createFileRoute("/api/public/feeds/$portal/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const started = Date.now();
        const { logEvent, clientIp } = await import("@/lib/observability.server");
        const ip = clientIp(request);
        const portal = params.portal.toLowerCase();
        const source = `/api/public/feeds/${portal}`;

        let connector;
        try {
          connector = await resolvePortalConnectorAuthority({
            portalSlug: portal,
            token: params.token,
          });
        } catch (error) {
          const status = error instanceof PublicWriterError ? error.status : 500;
          const message = error instanceof Error ? error.message : "connector resolution failed";
          await logEvent({ category: "feed", source, event: "connector_rejected", severity: status >= 500 ? "error" : "warn", statusCode: status, ip, meta: { portal }, latencyMs: Date.now() - started, errorMessage: message });
          return new Response(message, { status });
        }

        const { rateLimit, rateLimitResponse } = await import("@/lib/rate-limit.server");
        const rlTok = await rateLimit({ scope: "feed", key: `${connector.id}:${connector.portalSlug}`, limit: 30 });
        if (!rlTok.allowed) {
          await logEvent({ category: "feed", source, event: "rate_limited", severity: "warn", statusCode: 429, tenantId: connector.tenant.id, ip, meta: { portal, scope: "token" }, latencyMs: Date.now() - started });
          return rateLimitResponse(rlTok.retryAfter, "rate limit excedido (30/min por token)");
        }
        const rlIp = await rateLimit({ scope: "feed-ip", key: ip ?? "unknown", limit: 60 });
        if (!rlIp.allowed) {
          await logEvent({ category: "feed", source, event: "rate_limited", severity: "warn", statusCode: 429, tenantId: connector.tenant.id, ip, meta: { portal, scope: "ip" }, latencyMs: Date.now() - started });
          return rateLimitResponse(rlIp.retryAfter, "rate limit excedido (60/min por IP)");
        }

        try {
          const snapshot = await loadPortalFeedSnapshot({ connector });
          const xml = buildVrSyncXml(snapshot.tenant, snapshot.properties, snapshot.images);
          await recordPortalFeedSuccess({
            connector,
            properties: snapshot.properties,
            durationMs: Date.now() - started,
          });
          await logEvent({ category: "feed", source, event: "success", severity: "info", statusCode: 200, tenantId: connector.tenant.id, ip, meta: { portal, count: snapshot.properties.length }, latencyMs: Date.now() - started });
          return new Response(xml, {
            status: 200,
            headers: {
              "content-type": "application/xml; charset=utf-8",
              "cache-control": "public, max-age=300",
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao gerar feed";
          const status = error instanceof PublicWriterError ? error.status : 500;
          await recordPortalFeedFailure({
            connector,
            durationMs: Date.now() - started,
            errorMessage: message,
          }).catch(() => undefined);
          await logEvent({ category: "feed", source, event: "feed_failed", severity: status >= 500 ? "error" : "warn", statusCode: status, tenantId: connector.tenant.id, ip, meta: { portal }, latencyMs: Date.now() - started, errorMessage: message });
          return new Response(status >= 500 ? "Erro ao gerar feed" : message, { status });
        }
      },
    },
  },
});
