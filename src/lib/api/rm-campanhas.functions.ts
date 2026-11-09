import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { authorizeTenantCampaignOperation } from "@/lib/api/tenant-cms-authority.server";
import { adminListarImoveis, adminObterImovel, adminAssinarUrl } from "./property-admin.functions";
import { listarLandingPagesAdmin } from "./rm-landing-pages.functions";
import { socialCampaignSchema, estruturaMudou, montarRoteiroValidado } from "@/lib/rm-marketing/social-campaign-contract";
import { ajustarCopy, type DestinoCampanha } from "@/lib/rm-marketing/campanhas";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Campanha = Database["public"]["Tables"]["tenant_social_campaigns"]["Row"];
type Client = SupabaseClient<Database>;
async function campanhaAtual(client: Client, tenantId: string, id: string, editavel = false) {
  const { data, error } = await client.from("tenant_social_campaigns").select("*").eq("tenant_id", tenantId).eq("id", id).single();
  if (error || !data) throw new Error("Campanha não encontrada nesta empresa.");
  if (editavel) {
    const { data: im } = await client.from("imoveis").select("status,campanha").eq("tenant_id", tenantId).eq("id", data.imovel_id).single();
    if (!im || im.status !== "ativo" || !im.campanha) throw new Error("Imóvel vendido, inativo ou indisponível para campanha.");
  }
  return data;
}
async function atualizar(client: Client, tenantId: string, id: string, revision: number, payload: Database["public"]["Tables"]["tenant_social_campaigns"]["Update"]) {
  const { data, error } = await client.from("tenant_social_campaigns").update(payload).eq("tenant_id", tenantId).eq("id", id).eq("revision", revision).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("A campanha mudou em outra sessão. Reabra antes de salvar.");
  return data;
}

export const listarCampanhasSociais = createServerFn({ method: "GET" }).middleware([requireTenant]).handler(async ({ context }) => {
  const auth = await authorizeTenantCampaignOperation(context, "list");
  const { data, error } = await context.supabase.from("tenant_social_campaigns").select("*").eq("tenant_id", auth.tenantId).order("criado_em");
  if (error) throw new Error("Não foi possível carregar as campanhas.");
  return data;
});

export async function carregarImoveisCampanhas() {
  const [imoveis, campanhas, lps] = await Promise.all([adminListarImoveis(), listarCampanhasSociais(), listarLandingPagesAdmin()]);
  return Promise.all(imoveis.filter((im) => im.campanha || campanhas.some((c) => c.imovel_id === im.id)).map(async (item) => {
    const im = await adminObterImovel({ data: { id: item.id } });
    const fotos = await Promise.all([...im.imagens].sort((a,b) => a.ordem-b.ordem).map(async (foto) => ({ path: foto.url, url: (await adminAssinarUrl({ data: { bucket: "imoveis", path: foto.url } })).url })));
    return { ...im, preco: Number(im.preco), fotos: fotos.map((f) => f.url), fotoPaths: Object.fromEntries(fotos.map((f) => [f.url,f.path])), campanhas: campanhas.filter((c) => c.imovel_id === im.id), lp_slug: lps.find((lp) => lp.imovel_id===im.id && lp.publicada)?.slug ?? null };
  }));
}
export type ImovelCampanha = Awaited<ReturnType<typeof carregarImoveisCampanhas>>[number];

export const salvarCampanhaSocial = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator(socialCampaignSchema).handler(async ({ context, data }) => {
  const auth = await authorizeTenantCampaignOperation(context, data.id ? "save_draft" : "create_draft");
  const { id, expectedRevision, ...payload } = data;
  if (!id) {
    const result = await context.supabase.from("tenant_social_campaigns").insert({ ...payload, tenant_id: auth.tenantId }).select("*").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }
  const old = await campanhaAtual(context.supabase, auth.tenantId, id, true);
  if (old.imovel_id !== data.imovel_id) throw new Error("O imóvel da campanha não pode mudar.");
  const reset = estruturaMudou(old, data) ? { roteiro: [], roteiro_aprovado: false, status: "rascunho", aprovada_em: null } : {};
  return atualizar(context.supabase, auth.tenantId, id, expectedRevision ?? 0, { ...payload, ...reset });
});

export const editarConteudoCampanhaSocial = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator(z.object({
  id: z.string().uuid(), expectedRevision: z.number().int().positive(),
  prompt: z.string().trim().max(2000).optional(),
  roteiro: z.array(z.object({ ordem:z.number().int(), foto:z.string(), texto:z.string().max(90) }).strict()).max(10).optional(),
  roteiro_aprovado: z.boolean().optional(),
  copy: z.object({ copy_principal:z.string().max(300), legenda:z.string().max(3000), cta:z.string().max(100), hashtags:z.string().max(600) }).strict().optional(),
  aprovar: z.boolean().optional(),
}).strict()).handler(async ({ context, data }) => {
  const auth = await authorizeTenantCampaignOperation(context, data.aprovar ? "publish" : "save_draft");
  const old = await campanhaAtual(context.supabase,auth.tenantId,data.id,true);
  const payload: Database["public"]["Tables"]["tenant_social_campaigns"]["Update"] = {};
  if (data.prompt !== undefined) payload.prompt = data.prompt || null;
  if (data.roteiro) {
    payload.roteiro = montarRoteiroValidado(old.fotos, data.roteiro.map((c) => c.texto)).map((card) => ({ ordem:card.ordem, foto:card.foto, texto:card.texto }));
    payload.roteiro_aprovado = data.roteiro_aprovado ?? false;
    payload.status="rascunho"; payload.aprovada_em=null;
  }
  if (data.copy) Object.assign(payload,ajustarCopy(old.destino as DestinoCampanha,{ ...data.copy,hashtags:data.copy.hashtags.split(/\s+/) }));
  if (data.aprovar) payload.status="aprovada";
  return atualizar(context.supabase,auth.tenantId,data.id,data.expectedRevision,payload);
});

export const listarCriativosSociais = createServerFn({ method:"GET" }).middleware([requireTenant]).inputValidator(z.object({id:z.string().uuid()}).strict()).handler(async ({context,data}) => {
  const auth=await authorizeTenantCampaignOperation(context,"read");
  const campanha=await campanhaAtual(context.supabase,auth.tenantId,data.id);
  const {data:rows,error}=await context.supabase.from("tenant_social_campaign_creatives").select("*").eq("tenant_id",auth.tenantId).eq("campanha_id",data.id).order("ordem");
  if(error) throw new Error("Não foi possível carregar os criativos.");
  // Storage signing follows the existing property-media authority boundary:
  // verified tenant/campaign/path first, privileged signing only afterwards.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(rows.filter((row)=>campanha.fotos[row.ordem]===row.foto_origem).map(async(row)=> {
    if(!row.caminho.startsWith(`${auth.tenantId}/${campanha.imovel_id}/`)) throw new Error("Arte fora da empresa.");
    const signed=await supabaseAdmin.storage.from("imoveis").createSignedUrl(row.caminho,900);
    if(signed.error) throw new Error("Não foi possível abrir a arte.");
    return {...row,url:signed.data.signedUrl};
  }));
});