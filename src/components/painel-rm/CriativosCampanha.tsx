import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, Loader2, MessageCircle, Save, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { editarConteudoCampanhaSocial, listarCriativosSociais, type Campanha } from "@/lib/api/rm-campanhas.functions";
import { buscarFormato, ROTULOS_DESTINO, type DestinoCampanha } from "@/lib/rm-marketing/campanhas";
import type { CardRoteiro } from "@/lib/rm-marketing/social-campaign-contract";
import { CopyDownloadsCampanha } from "./CopyDownloadsCampanha";

export function CriativosCampanha({ campanha, editavel, urlLp, titulo }: { campanha: Campanha; editavel: boolean; urlLp: string | null; titulo: string; preco: string; cidade?: string }) {
  const qc = useQueryClient();
  const [current, setCurrent] = useState(campanha);
  const [prompt, setPrompt] = useState(campanha.prompt ?? "");
  const [atual, setAtual] = useState(0);
  const [pending, setPending] = useState(false);
  const [roteiro, setRoteiro] = useState<CardRoteiro[]>(Array.isArray(campanha.roteiro) ? campanha.roteiro.filter((c): c is unknown & CardRoteiro => typeof c === "object" && c !== null && "texto" in c && typeof c.texto === "string") as CardRoteiro[] : []);
  const [reviewChanged, setReviewChanged] = useState(false);
  const { data: artes = [], isLoading, error } = useQuery({ queryKey: ["campanhas", "criativos", campanha.id], queryFn: () => listarCriativosSociais({ data: { id: campanha.id } }) });
  const formato = buscarFormato(current.destino,current.formato);
  const total = current.fotos.length;
  const imagem = artes.find((a)=>a.ordem===atual)?.url;
  const exigeRoteiro = current.formato === "carrossel" && total > 1;
  const vertical = (formato?.altura ?? 1)/(formato?.largura ?? 1)>1.5;
  async function salvar(payload: { prompt?: string; roteiro?: CardRoteiro[]; roteiro_aprovado?: boolean; aprovar?: boolean }) {
    setPending(true);
    try {
      const row=await editarConteudoCampanhaSocial({ data: { id:current.id, expectedRevision:current.revision,...payload } });
      setCurrent(row); setReviewChanged(false);
      toast.success(payload.aprovar ? "Criativos aprovados." : payload.roteiro_aprovado ? "Roteiro aprovado." : "Prompt salvo. Seus criativos foram mantidos.");
      await qc.invalidateQueries({queryKey:["campanhas"]});
    } catch(e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); } finally {setPending(false);}
  }
  const arte = <div className={`relative mx-auto w-full overflow-hidden rounded-md bg-muted ${vertical ? "max-w-[18rem] aspect-[9/16]" : "max-w-md aspect-square"}`}>
    {imagem ? <img src={imagem} alt={`Criativo ${atual+1}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : error ? "Não foi possível abrir a arte." : "Criativo ainda não gerado"}</div>}
    {total>1 ? <><Button variant="secondary" size="icon" aria-label="Anterior" disabled={atual===0} onClick={()=>setAtual((a)=>a-1)} className="absolute left-2 top-1/2 -translate-y-1/2"><ChevronLeft className="h-4 w-4" /></Button><Button variant="secondary" size="icon" aria-label="Próximo" disabled={atual===total-1} onClick={()=>setAtual((a)=>a+1)} className="absolute right-2 top-1/2 -translate-y-1/2"><ChevronRight className="h-4 w-4" /></Button><span className="absolute right-2 top-2 bg-foreground/70 px-2 py-0.5 text-xs text-background">{atual+1}/{total}</span></> : null}
  </div>;
  return <div className="grid gap-5">
    <section className="grid gap-3 border-b border-border pb-5"><div className="flex items-center justify-between gap-3"><h3 className="font-heading font-semibold">Direção criativa</h3><Badge variant="outline">{current.finalidade==="post_organico" ? "Post orgânico" : "Anúncio pago"}</Badge></div><Textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} maxLength={2000} rows={3} disabled={!editavel} /><Button variant="outline" className="justify-self-start" disabled={!editavel || pending} onClick={()=>void salvar({prompt})}><Save className="mr-2 h-4 w-4" />Salvar prompt</Button></section>
    {exigeRoteiro ? <section className="grid gap-3 border-b border-border pb-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-heading font-semibold">Roteiro do carrossel</h3><Badge variant={current.roteiro_aprovado && !reviewChanged ? "default" : "secondary"}>{current.roteiro_aprovado && !reviewChanged ? "Roteiro aprovado" : "Aguardando revisão"}</Badge></div>{current.fotos.map((foto,i)=><div key={foto} className="grid gap-2"><Label htmlFor={`roteiro-${i}`}>Imagem {i+1}</Label><Textarea id={`roteiro-${i}`} rows={2} maxLength={90} value={roteiro[i]?.texto ?? ""} disabled={!editavel} onChange={(e)=>{setReviewChanged(true);setRoteiro(current.fotos.map((f,ordem)=>({foto:f,ordem,texto:ordem===i ? e.target.value : roteiro[ordem]?.texto ?? ""})));}} /></div>)}<div className="flex flex-wrap gap-2"><Button variant="outline" disabled title="Geração por IA ainda não integrada"><Sparkles className="mr-2 h-4 w-4" />Gerar roteiro com IA</Button><Button disabled={!editavel || pending || roteiro.length!==total} onClick={()=>void salvar({roteiro,roteiro_aprovado:true})}>Revisado — liberar imagens</Button></div></section> : null}
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem]"><Tabs defaultValue="arte" className="min-w-0"><TabsList className="mb-3"><TabsTrigger value="arte">Arte final</TabsTrigger><TabsTrigger value="previa">Prévia no Meta</TabsTrigger></TabsList><TabsContent value="arte">{arte}</TabsContent><TabsContent value="previa"><div className="mx-auto max-w-md overflow-hidden rounded-lg border border-border bg-card"><div className="flex items-center gap-2 p-3 text-sm font-semibold"><span className="h-8 w-8 rounded-full bg-primary" /><div><p>{titulo}</p><p className="text-xs font-normal text-muted-foreground">Patrocinado · {ROTULOS_DESTINO[current.destino as DestinoCampanha]}</p></div></div>{arte}<div className="flex gap-4 p-3"><Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Send className="h-5 w-5" /></div></div></TabsContent></Tabs><div className="flex flex-col gap-3"><div className="flex flex-wrap gap-2"><Badge>{current.status==="aprovada" ? "Aprovada" : "Rascunho"}</Badge><span className="text-xs text-muted-foreground">{artes.length}/{total} prontos</span></div><div className="grid grid-cols-4 gap-2">{current.fotos.map((foto,i)=><Button key={foto} variant="ghost" aria-label={`Ver criativo ${i+1}`} aria-pressed={atual===i} onClick={()=>setAtual(i)} className={`h-auto aspect-square overflow-hidden rounded-md border-2 p-0 ${atual===i ? "border-primary" : "border-transparent"}`}>{artes.find((a)=>a.ordem===i)?.url ? <img src={artes.find((a)=>a.ordem===i)?.url} alt="" className="h-full w-full object-cover" /> : i+1}</Button>)}</div><Button disabled title="Geração de imagens ainda não integrada"><Sparkles className="mr-2 h-4 w-4" />Gerar criativos</Button><Button variant="outline" disabled={!editavel || pending || artes.length!==total || (exigeRoteiro && (!current.roteiro_aprovado || reviewChanged)) || Boolean(formato?.video && !current.video_url) || current.status==="aprovada"} onClick={()=>void salvar({aprovar:true})}><BadgeCheck className="mr-2 h-4 w-4" />Aprovar criativos</Button><p className="text-xs text-muted-foreground">Geração de imagens e vídeo por IA ainda indisponível.</p></div></div>
    {formato?.video ? <section className="border-t border-border pt-5"><h3 className="font-heading font-semibold">Vídeo da campanha</h3>{current.video_url ? <video controls src={current.video_url} className="mt-3 max-h-96 w-full" /> : <p className="mt-2 text-sm text-muted-foreground">Produção e envio de vídeo ainda indisponíveis.</p>}</section> : null}
    <CopyDownloadsCampanha campanha={current} editavel={editavel} criativos={artes} urlLp={urlLp} aprovada={current.status==="aprovada"} aoSalvar={setCurrent} />
    {current.finalidade==="anuncio_pago" && ["instagram","facebook"].includes(current.destino) ? <section className="border-t border-border pt-5"><h3 className="font-heading font-semibold">Publicação no Meta</h3><p className="mt-2 text-sm text-muted-foreground">Publicação automática indisponível. Nenhum anúncio será enviado.</p></section> : null}
  </div>;
}