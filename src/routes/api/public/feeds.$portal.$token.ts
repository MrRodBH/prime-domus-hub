import { createFileRoute } from "@tanstack/react-router";

// XML escape
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
  // "venda" | "aluguel" | "temporada"
  if (fin === "aluguel") return "For Rent";
  if (fin === "temporada") return "Seasonal";
  return "For Sale";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildVrSyncXml(tenant: any, imoveis: any[], images: Map<string, string[]>): string {
  const now = new Date().toISOString();
  const providerName = tenant?.nome ?? "Imobiliária";
  const providerEmail = tenant?.email ?? "contato@imobiliaria.com.br";

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
      GET: async ({ params }) => {
        const started = Date.now();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const portal = params.portal.toLowerCase();
        const token = params.token;

        const { data: conn } = await supabaseAdmin
          .from("portal_connectors")
          .select("*, tenants!inner(id, nome, slug)")
          .eq("feed_token", token)
          .eq("portal_slug", portal)
          .maybeSingle();

        if (!conn) {
          return new Response("Token inválido", { status: 401 });
        }
        if (!conn.ativo) {
          return new Response("Portal desativado", { status: 403 });
        }

        // Verifica tenant ativo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenant = (conn as any).tenants;

        // Busca imóveis publicados do tenant que estão marcados p/ este portal (ou todos, se nenhum vínculo)
        const { data: vinculos } = await supabaseAdmin
          .from("imovel_portais")
          .select("imovel_id")
          .eq("tenant_id", tenant.id)
          .eq("portal_slug", portal)
          .in("status", ["ativo", "aguardando", "publicado", "processando"]);

        const ids = (vinculos ?? []).map((v) => v.imovel_id);

        let q = supabaseAdmin
          .from("imoveis")
          .select("*, bairros(nome)")
          .eq("tenant_id", tenant.id)
          .eq("status", "ativo")
          .order("updated_at", { ascending: false })
          .limit(500);
        if (ids.length > 0) q = q.in("id", ids);

        const { data: imoveis, error } = await q;
        if (error) {
          await supabaseAdmin.from("portal_sync_logs").insert({
            tenant_id: tenant.id, portal_slug: portal, acao: "feed_read",
            status: "erro", erro: error.message, duration_ms: Date.now() - started,
          } as never);
          return new Response("Erro ao gerar feed", { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list = (imoveis ?? []).map((im: any) => ({ ...im, bairro_nome: im.bairros?.nome ?? "" }));

        // Imagens
        const imgMap = new Map<string, string[]>();
        if (list.length > 0) {
          const { data: imgs } = await supabaseAdmin
            .from("imovel_imagens")
            .select("imovel_id, url, ordem")
            .in("imovel_id", list.map((i) => i.id))
            .order("ordem", { ascending: true });
          (imgs ?? []).forEach((i) => {
            const arr = imgMap.get(i.imovel_id) ?? [];
            arr.push(i.url);
            imgMap.set(i.imovel_id, arr);
          });
        }

        const xml = buildVrSyncXml(tenant, list, imgMap);

        // Marca imoveis como publicados (upsert)
        if (list.length > 0) {
          const rows = list.map((im) => ({
            tenant_id: tenant.id,
            imovel_id: im.id,
            portal_slug: portal,
            status: "publicado",
            publicado: true,
            ultima_leitura: new Date().toISOString(),
          }));
          await supabaseAdmin.from("imovel_portais").upsert(rows as never, { onConflict: "imovel_id,portal_slug" });
        }

        await supabaseAdmin.from("portal_connectors").update({
          ultimo_sync_at: new Date().toISOString(),
          status: "ativo",
          ultimo_erro: null,
        } as never).eq("id", conn.id);

        await supabaseAdmin.from("portal_sync_logs").insert({
          tenant_id: tenant.id, portal_slug: portal, acao: "feed_read",
          status: "ok", payload: { count: list.length } as never,
          duration_ms: Date.now() - started,
        } as never);

        return new Response(xml, {
          status: 200,
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
