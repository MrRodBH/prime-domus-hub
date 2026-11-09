import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { Download, FileText, Loader2, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { editarConteudoCampanhaSocial, type Campanha } from "@/lib/api/rm-campanhas.functions";
import { gerarTextoCampanhaSocial } from "@/lib/api/rm-campaign-ai.functions";

import { buscarFormato, LIMITES_COPY, textoCopyTxt, type DestinoCampanha } from "@/lib/rm-marketing/campanhas";

export interface CampanhaCopy {
  id: string;
  codigo: string;
  destino: string;
  formato: string;
  status: string;
  copy_principal: string | null;
  legenda: string | null;
  cta: string | null;
  hashtags: string | null;
}

/** Redimensiona (cobrindo) a imagem para o tamanho exato do formato e devolve PNG. */
async function imagemNoTamanho(url: string, largura: number, altura: number): Promise<Blob> {
  const blob = await (await fetch(url)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem.");
  const escala = Math.max(largura / bitmap.width, altura / bitmap.height);
  const w = bitmap.width * escala;
  const h = bitmap.height * escala;
  ctx.drawImage(bitmap, (largura - w) / 2, (altura - h) / 2, w, h);
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("png"))), "image/png"));
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function CopyDownloadsCampanha({
  campanha,
  editavel,
  criativos,
  urlLp,
  aprovada,
  aoSalvar,
}: {
  campanha: Campanha;
  editavel: boolean;
  criativos: { ordem: number; url: string }[];
  urlLp: string | null;
  aprovada: boolean;
  aoSalvar: (campanha: Campanha) => void;
}) {
  const queryClient = useQueryClient();
  const limites = LIMITES_COPY[campanha.destino as DestinoCampanha];
  const formato = buscarFormato(campanha.destino, campanha.formato);
  const [copy, setCopy] = useState({
    copy_principal: campanha.copy_principal ?? "",
    legenda: campanha.legenda ?? "",
    cta: campanha.cta ?? "",
    hashtags: campanha.hashtags ?? "",
  });
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  async function gerar() {
    setGerando(true);
    try {
      const result=await gerarTextoCampanhaSocial({data:{id:campanha.id,tipo:"copy"}});
      if(result.tipo==="copy") {setCopy(result.copy);toast.success("Copy gerada. Revise e salve.");}
    } catch(e) {toast.error(e instanceof Error ? e.message : "Não foi possível gerar a copy.");}
    finally {setGerando(false);}
  }

  async function salvar() {
    setSalvando(true);
    try {
      const row = await editarConteudoCampanhaSocial({ data: { id: campanha.id, expectedRevision: campanha.revision, copy } });
      aoSalvar(row); toast.success("Copy salva.");
      await queryClient.invalidateQueries({queryKey:["campanhas"]});
    } catch(e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar a copy."); }
    finally {setSalvando(false);}
  }

  const txt = () => new Blob([textoCopyTxt({ ...campanha, ...copy, url_lp: urlLp })], { type: "text/plain;charset=utf-8" });
  const nomeImagem = (ordem: number) => `${campanha.codigo}_${campanha.destino}_${ordem + 1}.png`;

  async function baixarImagem(c: { ordem: number; url: string }) {
    if (!formato) return;
    baixar(await imagemNoTamanho(c.url, formato.largura, formato.altura), nomeImagem(c.ordem));
  }

  async function baixarZip() {
    if (!formato) return;
    setBaixando(true);
    try {
      const zip = new JSZip();
      for (const c of criativos) zip.file(nomeImagem(c.ordem), await imagemNoTamanho(c.url, formato.largura, formato.altura));
      zip.file(`${campanha.codigo}_copy.txt`, txt());
      baixar(await zip.generateAsync({ type: "blob" }), `${campanha.codigo}.zip`);
    } catch {
      toast.error("Não foi possível montar o ZIP.");
    } finally {
      setBaixando(false);
    }
  }

  const campo = (chave: keyof typeof copy, rotulo: string, limite: number, longo = false) => (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={`copy-${chave}`}>{rotulo}</Label>
        <span className="text-xs text-muted-foreground">{copy[chave].length}/{limite}</span>
      </div>
      {longo ? (
        <Textarea id={`copy-${chave}`} rows={5} maxLength={limite} value={copy[chave]} disabled={!editavel} onChange={(e) => setCopy({ ...copy, [chave]: e.target.value })} className="mt-1" />
      ) : (
        <Input id={`copy-${chave}`} maxLength={limite} value={copy[chave]} disabled={!editavel} onChange={(e) => setCopy({ ...copy, [chave]: e.target.value })} className="mt-1" />
      )}
    </div>
  );

  return (
    <div className="grid gap-5 border-t border-border pt-5 md:grid-cols-2">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading font-semibold">Copy, legenda e hashtags</h3>
          <Button size="sm" variant="outline" disabled={!editavel || gerando} onClick={()=>void gerar()}>
            {gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Gerar com IA
          </Button>
        </div>
        {campo("copy_principal", "Copy principal", limites.copy)}
        {campo("legenda", "Legenda", limites.legenda, true)}
        {campo("cta", "Chamada (CTA)", limites.cta)}
        {limites.hashtags > 0 ? campo("hashtags", `Hashtags (até ${limites.hashtags})`, 600) : null}
        <Button onClick={() => void salvar()} disabled={!editavel || salvando}>Salvar copy</Button>
      </div>

      <div className="grid content-start gap-3">
        <h3 className="font-heading font-semibold">Downloads</h3>
        {!aprovada ? (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Aprove os criativos para liberar os downloads.</p>
        ) : (
          <>
            <Button onClick={() => void baixarZip()} disabled={baixando || criativos.length === 0}>
              {baixando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />} Baixar tudo (ZIP)
            </Button>
            <Button variant="outline" onClick={() => baixar(txt(), `${campanha.codigo}_copy.txt`)}>
              <FileText className="mr-2 h-4 w-4" /> Baixar copy (.txt)
            </Button>
            <div className="grid gap-1.5">
              {criativos.map((c) => (
                <Button key={c.ordem} variant="ghost" size="sm" className="justify-start" onClick={() => void baixarImagem(c)}>
                  <Download className="mr-2 h-4 w-4" /> Criativo {c.ordem + 1} ({formato?.largura}×{formato?.altura})
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
