// Tela de Landing pages aprovada da RM Prime, alimentada pelas funções de landing page do tenant.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PainelLayout } from "@/components/painel-rm/PainelLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  excluirLandingPage,
  gerarDescricaoLandingPage,
  listarLandingPagesAdmin,
  salvarLandingPage,
  type LandingPageAdmin,
} from "@/lib/api/rm-landing-pages.functions";
import { adminListarImoveis as listarImoveisAdmin } from "@/lib/api/property-admin.functions";
import { normalizarSlug, sugerirSlugLandingPage, type ConteudoLandingPage } from "@/lib/rm-marketing/landing-page-form";


function mensagemErro(erro: unknown) {
  const bruta = erro instanceof Error ? erro.message : String(erro);
  try {
    const lista = JSON.parse(bruta) as Array<{ message?: string }>;
    if (Array.isArray(lista) && lista[0]?.message) return lista.map((i) => i.message).join(" ");
  } catch {
    /* mensagem já é legível */
  }
  return bruta;
}

export function LandingPagesPage() {
  const listar = useServerFn(listarLandingPagesAdmin);
  const listarImoveis = useServerFn(listarImoveisAdmin);
  const salvar = useServerFn(salvarLandingPage);
  const excluir = useServerFn(excluirLandingPage);
  const queryClient = useQueryClient();

  const { data: paginas = [], isLoading } = useQuery({ queryKey: ["painel", "lps"], queryFn: () => listar() });
  const { data: imoveis = [] } = useQuery({ queryKey: ["painel", "imoveis-lp"], queryFn: () => listarImoveis() });

  const [editando, setEditando] = useState<LandingPageAdmin | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [publicada, setPublicada] = useState(true);
  const [imovelSelecionado, setImovelSelecionado] = useState("");
  const [texto, setTexto] = useState("");
  const [slug, setSlug] = useState("");
  const [titulo, setTitulo] = useState("");

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["painel", "lps"] });

  const salvarMutation = useMutation({
    mutationFn: salvar,
    onSuccess: () => {
      toast.success("Landing page salva.");
      setDialogAberto(false);
      void invalidar();
    },
    onError: (erro) => toast.error(mensagemErro(erro)),
  });

  const excluirMutation = useMutation({
    mutationFn: excluir,
    onSuccess: () => {
      toast.success("Landing page excluída.");
      void invalidar();
    },
    onError: (erro) => toast.error(erro.message),
  });

  function conteudoDe(lp: LandingPageAdmin | null): ConteudoLandingPage {
    return ((lp?.conteudo ?? {}) as ConteudoLandingPage) || {};
  }

  const gerarIa = useMutation({
    mutationFn: gerarDescricaoLandingPage,
    onSuccess: (resultado) => {
      setTexto(resultado.texto);
      toast.success("Sugestão gerada. Revise antes de salvar.");
    },
    onError: (erro) => toast.error(mensagemErro(erro)),
  });

  function abrirNovo() {
    setEditando(null);
    setPublicada(true);
    setImovelSelecionado("");
    setTexto("");
    setSlug("");
    setTitulo("");
    setDialogAberto(true);
  }

  function abrirEdicao(lp: LandingPageAdmin) {
    setEditando(lp);
    setPublicada(lp.publicada);
    setImovelSelecionado(lp.imovel_id);
    setTexto(((lp.conteudo ?? {}) as ConteudoLandingPage).texto ?? "");
    setSlug(lp.slug);
    setTitulo(conteudoDe(lp).titulo ?? lp.imovel?.titulo ?? "");
    setDialogAberto(true);
  }

  function aoSalvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const valor = (campo: string) => String(form.get(campo) ?? "").trim();
    salvarMutation.mutate({
      data: {
        id: editando?.id,
        imovel_id: valor("imovel_id"),
        slug: normalizarSlug(valor("slug")),
        titulo: valor("titulo"),
        subtitulo: valor("subtitulo") || undefined,
        texto: valor("texto") || undefined,
        cor_destaque: "",
        publicada,
      },
    });
  }

  const conteudo = conteudoDe(editando);

  return (
    <PainelLayout
      titulo="Landing pages"
      descricao="Páginas de captura por imóvel, para campanhas e anúncios."
      acoes={
        <Button onClick={abrirNovo}>
          <Plus className="mr-2 h-4 w-4" />
          Nova landing page
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando landing pages…</p>
      ) : paginas.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma landing page ainda. Clique em “Nova landing page” para criar a primeira.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Endereço</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Imóvel</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginas.map((lp) => (
                <tr key={lp.id}>
                  <td className="px-4 py-3 font-medium">/lp/{lp.slug}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{lp.imovel?.titulo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant={lp.publicada ? "default" : "secondary"}>
                        {lp.publicada ? "Publicada" : "Rascunho"}
                      </Badge>
                      {lp.publicada && lp.imovel && lp.imovel.status !== "ativo" ? (
                        <span className="text-xs text-destructive">
                          Imóvel inativo — a página não abre para visitantes
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {lp.publicada ? (
                        <Button variant="ghost" size="icon" asChild title="Abrir página">
                          <a href={`/lp/${lp.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(lp)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => {
                          if (window.confirm(`Excluir a landing page /lp/${lp.slug}?`)) {
                            excluirMutation.mutate({ data: { id: lp.id } });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar landing page" : "Nova landing page"}</DialogTitle>
            <DialogDescription>
              A página ficará disponível em /lp/endereco-escolhido quando publicada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={aoSalvar} className="space-y-4" key={editando?.id ?? "novo"}>
            <div>
              <Label htmlFor="lp-imovel">Imóvel</Label>
              <select
                id="lp-imovel"
                name="imovel_id"
                required
                value={imovelSelecionado}
                onChange={(e) => {
                  const imovel = imoveis.find((item) => item.id === e.target.value);
                  setImovelSelecionado(e.target.value);
                  if (!imovel) return;
                  setTitulo(imovel.titulo);
                  if (!editando) setSlug(sugerirSlugLandingPage(imovel.titulo));
                }}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Selecione o imóvel
                </option>
                {imoveis.filter((imovel) => imovel.status === "ativo").map((imovel) => (
                  <option key={imovel.id} value={imovel.id}>
                    {imovel.titulo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="lp-slug">Endereço da página (slug)</Label>
              <Input
                id="lp-slug"
                name="slug"
                required
                maxLength={120}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-2"
                placeholder="ex.: apartamento-savassi-3-quartos"
                onBlur={(e) => {
                  setSlug(normalizarSlug(e.currentTarget.value));
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens — acentos, espaços e “_” são ajustados automaticamente.
              </p>
            </div>
            <div>
              <Label htmlFor="lp-titulo">Título da página</Label>
              <Input id="lp-titulo" name="titulo" required maxLength={180} value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="lp-subtitulo">Subtítulo (opcional)</Label>
              <Input id="lp-subtitulo" name="subtitulo" maxLength={300} defaultValue={conteudo.subtitulo ?? ""} className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="lp-texto">Texto de apresentação (opcional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!imovelSelecionado || gerarIa.isPending}
                  onClick={() =>
                    gerarIa.mutate({ data: { imovel_id: imovelSelecionado, texto_base: texto || undefined } })
                  }
                >
                  {gerarIa.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Gerar com IA
                </Button>
              </div>
              <Textarea
                id="lp-texto"
                name="texto"
                rows={7}
                maxLength={5000}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A sugestão da IA é apenas um rascunho — revise e ajuste antes de publicar.
              </p>
            </div>
            <div>
              <Label>Identidade RM Prime</Label>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-6 w-6 rounded border border-border bg-primary" aria-hidden="true" />
                <span className="h-6 w-6 rounded border border-border bg-sidebar-primary" aria-hidden="true" />
                Verde-petróleo e dourado
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publicada} onChange={(e) => setPublicada(e.target.checked)} />
              <span>Publicada (visível para visitantes)</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvarMutation.isPending}>
                {salvarMutation.isPending ? "Salvando…" : "Salvar landing page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PainelLayout>
  );
}
