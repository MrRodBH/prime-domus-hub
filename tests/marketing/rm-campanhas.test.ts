import { describe, expect, it } from "bun:test";
import { buscarFormato, campanhaEditavel, ajustarCopy, LIMITE_VIDEO_BYTES, duracaoSlideshow } from "../../src/lib/rm-marketing/campanhas";
import { socialCampaignSchema, estruturaMudou, montarRoteiroValidado } from "../../src/lib/rm-marketing/social-campaign-contract";

describe("RM Prime campaign rules", () => {
  it("only active properties permit edits", () => {
    expect(campanhaEditavel("ativo")).toBe(true);
    for (const status of ["vendido", "inativo", "rascunho", "reservado"]) expect(campanhaEditavel(status)).toBe(false);
  });
  it("carousel accepts ten photos, rejects eleven", () => {
    expect(buscarFormato("instagram","carrossel")?.maxFotos).toBe(10);
    const payload={imovel_id:"9cb54756-24ee-4b4c-8438-ea831d317d65",destino:"instagram",formato:"carrossel",fotos:Array.from({length:10},(_,i)=>`foto${i}`),prompt:null,finalidade:"anuncio_pago"};
    expect(socialCampaignSchema.safeParse(payload).success).toBe(true);
    expect(socialCampaignSchema.safeParse({...payload,fotos:[...payload.fotos,"foto11"]}).success).toBe(false);
  });
  it("static format cannot save two photos", () => {
    expect(socialCampaignSchema.safeParse({imovel_id:"9cb54756-24ee-4b4c-8438-ea831d317d65",destino:"instagram",formato:"feed_1x1",fotos:["a","b"],prompt:null,finalidade:"post_organico"}).success).toBe(false);
  });
  it("unsupported destination-format is rejected",()=>expect(buscarFormato("tiktok","carrossel")).toBeUndefined());
  it("stories use original dimensions",()=>expect(buscarFormato("instagram","stories")).toMatchObject({largura:1080,altura:1920}));
  it("photo order and destination changes invalidate structure",()=>{
    const old={destino:"instagram",formato:"carrossel",fotos:["a","b"]};
    expect(estruturaMudou(old,old)).toBe(false);
    expect(estruturaMudou(old,{...old,fotos:["b","a"]})).toBe(true);
    expect(estruturaMudou(old,{...old,destino:"facebook"})).toBe(true);
  });
  it("carousel texts must be unique and match photo count",()=>{
    expect(montarRoteiroValidado(["a","b"],["Sala ampla","Duas vagas"])).toHaveLength(2);
    expect(()=>montarRoteiroValidado(["a","b"],["Sala ampla"])).toThrow();
    expect(()=>montarRoteiroValidado(["a","b"],["Sala ampla","Sala ampla"])).toThrow();
    expect(()=>montarRoteiroValidado(["a"],["Saiba Mais"])).toThrow();
  });
  it("Facebook copy limits stay at 125 characters and 5 hashtags",()=>{
    const copy=ajustarCopy("facebook",{copy_principal:"x".repeat(126),legenda:"",cta:"",hashtags:["a","b","c","d","e","f"]});
    expect(copy.copy_principal).toHaveLength(125);expect(copy.hashtags.split(" ")).toHaveLength(5);
  });
  it("Google has no hashtags",()=>expect(ajustarCopy("google",{copy_principal:"a",legenda:"b",cta:"c",hashtags:["tag"]}).hashtags).toBe(""));
  it("original video limit is 50 MB",()=>expect(LIMITE_VIDEO_BYTES).toBe(52428800));
  it("ten photo slideshow lasts 27 seconds",()=>expect(duracaoSlideshow(10)).toBe(27));
});