import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { campanhasQueryOptions } from "@/lib/rm-marketing/campaign-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Images, Lock, Megaphone, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { CriativosCampanha } from "@/components/painel-rm/CriativosCampanha";
import { PainelLayout } from "@/components/painel-rm/PainelLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { salvarCampanhaSocial, type Campanha, type ImovelCampanha } from "@/lib/api/rm-campanhas.functions";
import {
  buscarFormato,
  campanhaEditavel,
  FORMATOS_POR_DESTINO,
  ROTULOS_DESTINO,
  type DestinoCampanha,
} from "@/lib/rm-marketing/campanhas";
import { formatarPreco, bairroDoEndereco } from "@/lib/rm-crm/imoveis";

import { cn } from "@/lib/utils";

const DESTINOS = Object.keys(ROTULOS_DESTINO) as DestinoCampanha[];

function enderecoTexto(im: ImovelCampanha) {
  const base = [bairroDoEndereco(im.endereco), im.cidade, im.estado].filter(Boolean).join(", ");
  return im.mostrar_endereco_completo ? [im.rua, im.numero, base].filter(Boolean).join(" — ") : base;
}

export function CampanhasPage() {
  const queryClient = useQueryClient();
  const [edicao, setEdicao] = useState<{ imovel: ImovelCampanha; campanha: Campanha | null } | null>(null);
  const [criativos, setCriativos] = useState<{ imovel: ImovelCampanha; campanha: Campanha } | null>(null);

  const { data } = useSuspenseQuery(campanhasQueryOptions());
  const isLoading = false;

  return (
    <PainelLayout titulo="Campanhas" descricao="Imóveis disponíveis para campanha e suas configurações.">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : data.length === 0 ? (
        <div className="superficie-cartao p-10 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhum imóvel marcado para campanha.</p>
          <p className="mt-1 text-sm text-muted-foreground">Marque "Disponível para campanha" no cadastro do imóvel.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((imovel) => {
            const editavel = campanhaEditavel(imovel.status);
            return (
              <article key={imovel.id} className="superficie-cartao flex flex-col overflow-hidden">
                <div className="aspect-[16/9] bg-muted">
                  {imovel.fotos?.[0] ? <img src={imovel.fotos[0]} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading font-semibold">{imovel.titulo}</h2>
                      <p className="text-sm text-muted-foreground">{formatarPreco(imovel.preco)}</p>
                    </div>
                    <Badge variant={editavel ? "default" : "secondary"}>{imovel.status}</Badge>
                  </div>
                  {!editavel ? (
                    <p className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" /> Imóvel vendido ou inativo: campanhas bloqueadas para edição.
                    </p>
                  ) : null}
                  <ul className="space-y-1.5">
                    {imovel.campanhas.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                        <span>
                          <strong>{c.codigo}</strong> · {ROTULOS_DESTINO[c.destino as DestinoCampanha] ?? c.destino} ·{" "}
                          {buscarFormato(c.destino, c.formato)?.rotulo ?? c.formato}
                          <span className="block text-xs text-muted-foreground">{c.finalidade === "post_organico" ? "Post orgânico" : "Anúncio pago"}</span>
                        </span>
                        <span className="flex items-center">
                        {c.status === "aprovada" ? <Badge className="mr-1">Aprovada</Badge> : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Criativos ${c.codigo}`}
                          onClick={() => setCriativos({ imovel, campanha: c })}
                        >
                          <Images className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${c.codigo}`}
                          disabled={!editavel}
                          onClick={() => setEdicao({ imovel, campanha: c })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-auto" disabled={!editavel} onClick={() => setEdicao({ imovel, campanha: null })}>
                    <Plus className="mr-2 h-4 w-4" /> Nova campanha
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(edicao)} onOpenChange={(open) => !open && setEdicao(null)}>
        <DialogContent className="rm-painel font-sans max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {edicao ? (
            <FormularioCampanha
              key={edicao.campanha?.id ?? "nova"}
              imovel={edicao.imovel}
              campanha={edicao.campanha}
              aoSalvar={(salva) => {
                const imovelEdicao = edicao.imovel;
                setEdicao(null);
                // Depois de salvar, abre direto os criativos (mockup, aprovação e vídeo).
                setCriativos({ imovel: imovelEdicao, campanha: salva });
                void queryClient.invalidateQueries({ queryKey: ["campanhas"] });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(criativos)} onOpenChange={(open) => !open && setCriativos(null)}>
        <DialogContent className="rm-painel font-sans max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          {criativos ? (
            <>
              <DialogHeader>
                <DialogTitle>Criativos {criativos.campanha.codigo}</DialogTitle>
                <DialogDescription>
                  {criativos.imovel.titulo} · {ROTULOS_DESTINO[criativos.campanha.destino as DestinoCampanha]} ·{" "}
                  {buscarFormato(criativos.campanha.destino, criativos.campanha.formato)?.rotulo}
                </DialogDescription>
              </DialogHeader>
              {!campanhaEditavel(criativos.imovel.status) ? (
                <p className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> Imóvel vendido ou inativo: somente consulta.
                </p>
              ) : null}
              <CriativosCampanha
                campanha={criativos.campanha}
                editavel={campanhaEditavel(criativos.imovel.status)}
                titulo={criativos.imovel.titulo}
                cidade={criativos.imovel.cidade ?? ""}
                preco={formatarPreco(Number(criativos.imovel.preco))}
                urlLp={typeof window === "undefined" ? null : `${window.location.origin}/${criativos.imovel.lp_slug ? `lp/${criativos.imovel.lp_slug}` : `imovel/${criativos.imovel.slug}`}`}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </PainelLayout>
  );
}

function FormularioCampanha({
  imovel,
  campanha,
  aoSalvar,
}: {
  imovel: ImovelCampanha;
  campanha: Campanha | null;
  aoSalvar: (campanha: Campanha) => void;
}) {
  const [destino, setDestino] = useState<DestinoCampanha>((campanha?.destino as DestinoCampanha) ?? "instagram");
  const [formato, setFormato] = useState(campanha?.formato ?? (FORMATOS_POR_DESTINO.instagram[0]?.id ?? "feed_1x1"));
  const [fotos, setFotos] = useState<string[]>(campanha ? campanha.fotos.map((path) => Object.keys(imovel.fotoPaths).find((url) => imovel.fotoPaths[url] === path)).filter((u): u is string => Boolean(u)) : imovel.fotos.slice(0, 1));
  const [prompt, setPrompt] = useState(campanha?.prompt ?? "");
  const [finalidade, setFinalidade] = useState(campanha?.finalidade ?? "anuncio_pago");

  const formatoAtual = buscarFormato(destino, formato);
  const max = formatoAtual?.maxFotos ?? 1;
  const c = { quartos: imovel.quartos, banheiros: imovel.banheiros, vagas: imovel.vagas, area_m2: imovel.area_util };
  const origem = typeof window === "undefined" ? "" : window.location.origin;

  function trocarDestino(d: DestinoCampanha) {
    setDestino(d);
    const primeiro = FORMATOS_POR_DESTINO[d][0];
    if (!primeiro) return;
    if (!buscarFormato(d, formato)) { setFormato(primeiro.id); setFotos((atuais) => atuais.slice(0, primeiro.maxFotos)); }
  }

  function alternarFoto(url: string) {
    setFotos((atual) => {
      if (atual.includes(url)) return atual.filter((f) => f !== url);
      if (atual.length >= max) {
        toast.error(`Este formato aceita até ${max} foto(s).`);
        return atual;
      }
      return [...atual, url];
    });
  }

  const salvar = useMutation({
    mutationFn: async () => {
      if (!formatoAtual) throw new Error("Escolha um formato válido para o destino.");
      if (fotos.length === 0) throw new Error("Escolha pelo menos uma foto.");
      const fotosFinais = fotos.slice(0, max);
      return salvarCampanhaSocial({ data: {
        ...(campanha ? { id: campanha.id, expectedRevision: campanha.revision } : {}),
        imovel_id: imovel.id, destino, formato,
        finalidade: finalidade as "anuncio_pago" | "post_organico",
        fotos: fotosFinais.map((url) => imovel.fotoPaths[url] ?? ""), prompt: prompt.trim() || null,
      } });
    },
    onSuccess: (salva) => {
      toast.success("Campanha salva.");
      aoSalvar(salva);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{campanha ? `Editar ${campanha.codigo}` : "Nova campanha"}</DialogTitle>
        <DialogDescription>{imovel.titulo}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-1 rounded-md bg-muted p-3 text-sm">
        <p><strong>Valor:</strong> {formatarPreco(imovel.preco)}</p>
        <p><strong>Endereço:</strong> {enderecoTexto(imovel) || "—"}</p>
        <p>
          <strong>Características:</strong> {c.quartos ?? 0} quartos · {c.banheiros ?? 0} banheiros · {c.vagas ?? 0} vagas ·{" "}
          {c.area_m2 ?? 0} m²
        </p>
        <p className="break-all">
          <strong>URL da LP:</strong>{" "}
          {imovel.lp_slug ? `${origem}/lp/${imovel.lp_slug}` : <span className="text-muted-foreground">sem landing page publicada (página do imóvel: {origem}/imovel/{imovel.slug})</span>}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Finalidade</Label>
          <Select value={finalidade} onValueChange={setFinalidade}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="anuncio_pago">Anúncio pago</SelectItem>
              <SelectItem value="post_organico">Post orgânico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Destino</Label>
          <Select value={destino} onValueChange={(v) => trocarDestino(v as DestinoCampanha)}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DESTINOS.map((d) => <SelectItem key={d} value={d}>{ROTULOS_DESTINO[d]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Formato</Label>
          <Select value={formato} onValueChange={(v) => { setFormato(v); setFotos((atuais) => atuais.slice(0, buscarFormato(destino, v)?.maxFotos ?? 1)); }}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMATOS_POR_DESTINO[destino].map((f) => <SelectItem key={f.id} value={f.id}>{f.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
          {formatoAtual ? (
            <p className="mt-1 text-xs text-muted-foreground">{formatoAtual.largura} × {formatoAtual.altura} px</p>
          ) : null}
        </div>
      </div>

      <div>
        <Label>Fotos do criativo ({fotos.length}/{max})</Label>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {imovel.fotos.map((url) => {
            const marcada = fotos.includes(url);
            return (
              <Button
                variant="ghost"
                aria-label={`Selecionar foto ${imovel.fotos.indexOf(url) + 1}`}
                aria-pressed={marcada}
                key={url}
                type="button"
                onClick={() => alternarFoto(url)}
                className={cn("relative block h-auto min-h-0 w-full aspect-square overflow-hidden rounded-md border-2 p-0", marcada ? "border-primary" : "border-transparent opacity-70")}
              >
                <img src={url} alt={`Foto ${imovel.fotos.indexOf(url) + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                {marcada ? <Check className="absolute right-1 top-1 h-5 w-5 rounded-full bg-primary p-0.5 text-primary-foreground" /> : null}
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="prompt-campanha">Como você quer o criativo? (prompt)</Label>
        <Textarea
          id="prompt-campanha"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={2000}
          rows={4}
          className="mt-2"
          placeholder="Ex.: estilo sofisticado, destacar a varanda e o preço, chamada 'Agende sua visita'."
        />
      </div>

      <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar campanha</Button>
    </>
  );
}
