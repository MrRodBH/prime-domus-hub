import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { authorizeTenantCampaignOperation } from "./tenant-cms-authority.server";
import { ajustarCopy, LIMITES_COPY, ROTULOS_DESTINO, type DestinoCampanha } from "@/lib/rm-marketing/campanhas";
import { montarRoteiroValidado } from "@/lib/rm-marketing/social-campaign-contract";

export const gerarTextoCampanhaSocial = createServerFn({method:"POST"}).middleware([requireTenant]).inputValidator(z.object({id:z.string().uuid(),tipo:z.enum(["copy","roteiro"])}).strict()).handler(async({context,data})=>{
  const auth=await authorizeTenantCampaignOperation(context,"save_draft");
  const {data:c}=await context.supabase.from("tenant_social_campaigns").select("*").eq("tenant_id",auth.tenantId).eq("id",data.id).single();
  if(!c) throw new Error("Campanha não encontrada nesta empresa.");
  const {data:im}=await context.supabase.from("imoveis").select("titulo,descricao,tipo,preco,status,campanha,endereco,cidade,estado,quartos,banheiros,vagas,area_util,caracteristicas").eq("tenant_id",auth.tenantId).eq("id",c.imovel_id).single();
  if(!im || im.status!=="ativo" || !im.campanha) throw new Error("Imóvel vendido, inativo ou indisponível para campanha.");
  const key=process.env["LOVABLE_API_KEY"];
  if(!key) throw new Error("A geração por IA não está disponível no momento.");
  const {campaignText}=await import("@/lib/rm-marketing/ai/campaign-text.server");
  const prompt=`Ficha real: ${JSON.stringify(im)}\nDestino: ${c.destino}; formato: ${c.formato}; finalidade: ${c.finalidade}; direção criativa: ${c.prompt ?? ""}`;
  if(data.tipo==="roteiro") {
    if(c.formato!=="carrossel" || c.fotos.length<2) throw new Error("Roteiro disponível somente para carrosséis com duas ou mais fotos.");
    const out=await campaignText(key,z.object({cards:z.array(z.object({texto:z.string()}).strict())}).strict(),`Escreva em português brasileiro exatamente ${c.fotos.length} textos únicos para carrossel imobiliário, no máximo 90 caracteres cada. Use somente fatos da ficha. Nunca invente fatos, comércios ou distâncias. Não inclua CARD, SLIDE, numeração, CTA, Saiba Mais, Clique aqui ou Agende sua visita.`,prompt);
    const roteiro=montarRoteiroValidado(c.fotos,out.cards.map((card)=>card.texto));
    return {tipo:"roteiro" as const,roteiro};
  }
  const destino=c.destino as DestinoCampanha;
  const out=await campaignText(key,z.object({copy_principal:z.string(),legenda:z.string(),cta:z.string(),hashtags:z.array(z.string())}).strict(),`Você escreve anúncios imobiliários em português brasileiro. Use somente fatos da ficha, sem promessas de valorização, distâncias ou lugares inventados. Tom elegante e direto. Exatamente ${c.fotos.length} imagens. Limites de ${ROTULOS_DESTINO[destino]}: ${JSON.stringify(LIMITES_COPY[destino])}. CTA somente no campo CTA. Hashtags sem #.`,prompt);
  return {tipo:"copy" as const,copy:ajustarCopy(destino,out)};
});