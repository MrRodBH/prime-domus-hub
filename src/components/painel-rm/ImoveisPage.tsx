// Tela de Imóveis aprovada da RM Prime, alimentada pelas funções de imóveis do tenant (property-admin).
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ImagePlus, Loader2, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EditorDescricaoImovel } from "@/components/painel-rm/EditorDescricaoImovel";
import { FotosOrdenaveis } from "@/components/painel-rm/FotosOrdenaveis";
import { PainelLayout } from "@/components/painel-rm/PainelLayout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputMascarado } from "@/components/ui/input-mascarado";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminAdicionarImagem, adminAssinarUrl, adminExcluirImovel, adminListarImoveis, adminObterImovel,
  adminReordenarImagens, adminRemoverImagem, adminSalvarImovel,
} from "@/lib/api/property-admin.functions";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import { bairroDoEndereco, formatarPreco, gerarSlug, montarEndereco, statusPainel, TIPOS_IMOVEL, type StatusPainel } from "@/lib/rm-crm/imoveis";

const campo = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring";
const CHAVE = ["painel", "imoveis"] as const;

type ItemLista = Awaited<ReturnType<typeof adminListarImoveis>>[number];
type Detalhe = Awaited<ReturnType<typeof adminObterImovel>>;
/** Cada foto do formulário é identificada pela URL de prévia (como no original). */
type Foto = { kind: "salva"; id: string } | { kind: "nova"; file: File };

function numero(valor: FormDataEntryValue | null): number | null {
  if (!valor || String(valor).trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

async function assinar(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  try { return (await adminAssinarUrl({ data: { bucket: "imoveis", path, width: 800, quality: 70 } })).url; } catch { return null; }
}

export function ImoveisPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusPainel | "todos">("ativo");
  const [aberto, setAberto] = useState(false);
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);
  const [edicao, setEdicao] = useState<Detalhe | null>(null);
  const [excluir, setExcluir] = useState<ItemLista | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const fotosMapa = useRef(new Map<string, Foto>());
  const [enviando, setEnviando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepPreenchido, setCepPreenchido] = useState(false);
  const consultaCep = useRef<AbortController | null>(null);
  const ultimoCep = useRef("");
  const [destaque, setDestaque] = useState(false);
  const [titulo, setTitulo] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!aberto) {
      consultaCep.current?.abort();
      ultimoCep.current = "";
      setBuscandoCep(false);
      setCepPreenchido(false);
    }
    return () => consultaCep.current?.abort();
  }, [aberto]);

  const { data, isLoading } = useQuery({ queryKey: CHAVE, queryFn: () => adminListarImoveis() });
  const capas = useQuery({
    queryKey: [...CHAVE, "capas", (data ?? []).map((i) => i.imagem_capa ?? "").join("|")],
    enabled: Boolean(data?.length),
    queryFn: async () => Object.fromEntries(await Promise.all((data ?? []).map(async (i) => [i.id, await assinar(i.imagem_capa)] as const))),
  });
  const itens = useMemo(
    () => (data ?? []).filter((item) => (filtroStatus === "todos" || statusPainel(item.status) === filtroStatus) && item.titulo.toLowerCase().includes(busca.toLowerCase())),
    [data, busca, filtroStatus],
  );
  const destaquesUsados = useMemo(
    () => (data ?? []).filter((item) => item.destaque && item.status === "ativo" && item.id !== edicao?.id).length,
    [data, edicao],
  );
  const limiteDestaqueAtingido = destaquesUsados >= 6;

  const salvar = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { id } = await adminSalvarImovel({ data: payload as never });
      await sincronizarFotos(id);
      return id;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: CHAVE }); setAberto(false); toast.success("Imóvel salvo."); },
    onError: (erro) => toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar."),
  });
  const remover = useMutation({
    mutationFn: adminExcluirImovel,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: CHAVE }); setExcluir(null); toast.success("Imóvel excluído."); },
    onError: (erro) => toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir."),
  });

  function limparFotos() {
    for (const [url, f] of fotosMapa.current) if (f.kind === "nova") URL.revokeObjectURL(url);
    fotosMapa.current = new Map();
    setFotos([]);
  }

  async function abrirFormulario(item?: ItemLista) {
    limparFotos();
    setEdicao(null);
    setDestaque(item?.destaque ?? false);
    setTitulo(item?.titulo ?? "");
    if (!item) { setAberto(true); return; }
    setCarregandoEdicao(true);
    setAberto(true);
    try {
      const detalhe = await adminObterImovel({ data: { id: item.id } });
      const ordenadas = [...detalhe.imagens].sort((a, b) => (a.ordem || 9999) - (b.ordem || 9999));
      const assinadas = await Promise.all(ordenadas.map((img) => assinar(img.url)));
      const urls = ordenadas.map((img, i) => {
        const url = assinadas[i] ?? `sem-previa:${img.id}`;
        fotosMapa.current.set(url, { kind: "salva", id: img.id });
        return url;
      });
      setFotos(urls);
      setEdicao(detalhe);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível abrir o imóvel.");
      setAberto(false);
    } finally { setCarregandoEdicao(false); }
  }

  /** Remove fotos excluídas, envia as novas e grava a ordem (a primeira é a capa). */
  async function sincronizarFotos(imovelId: string) {
    const restantes = new Set(fotos.map((u) => fotosMapa.current.get(u)).filter((f): f is Foto => Boolean(f)));
    for (const img of edicao?.imagens ?? []) {
      const ainda = [...restantes].some((f) => f.kind === "salva" && f.id === img.id);
      if (!ainda) await adminRemoverImagem({ data: { id: img.id } });
    }
    const ids: string[] = [];
    for (const url of fotos) {
      const foto = fotosMapa.current.get(url);
      if (!foto) continue;
      if (foto.kind === "salva") { ids.push(foto.id); continue; }
      const alvo = await createUploadTarget({ data: { domain: "imoveis", entityId: imovelId, originalFileName: foto.file.name, mimeType: foto.file.type, size: foto.file.size } });
      const { error } = await supabase.storage.from(alvo.bucket).upload(alvo.path, foto.file, { upsert: false, contentType: foto.file.type });
      if (error) throw error;
      const r = await adminAdicionarImagem({ data: { imovel_id: imovelId, uploadTargetId: alvo.targetId, alt: titulo || foto.file.name, ordem: 0 } });
      ids.push(r.image.id);
    }
    if (ids.length > 0) await adminReordenarImagens({ data: { imovel_id: imovelId, ordem: ids.map((id, i) => ({ id, ordem: i + 1 })) } });
  }

  async function buscarCep(valorCep: string) {
    const cep = valorCep.replace(/\D/g, "");
    if (cep.length !== 8 || cep === ultimoCep.current) return;
    consultaCep.current?.abort();
    const controller = new AbortController();
    consultaCep.current = controller;
    ultimoCep.current = cep;
    setCepPreenchido(false);
    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
      const dados = (await resposta.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (controller.signal.aborted) return;
      if (dados.erro) { toast.error("CEP não encontrado."); return; }
      const form = formRef.current;
      if (!form) return;
      const preencher = (nome: string, valor?: string) => {
        const campoForm = form.elements.namedItem(nome);
        if (campoForm instanceof HTMLInputElement && valor) campoForm.value = valor;
      };
      preencher("logradouro", dados.logradouro);
      preencher("bairro", dados.bairro);
      preencher("cidade", dados.localidade);
      preencher("estado", dados.uf);
      setCepPreenchido(true);
    } catch {
      if (!controller.signal.aborted) {
        ultimoCep.current = "";
        toast.error("Não foi possível consultar o CEP agora.");
      }
    }
    finally { if (!controller.signal.aborted) setBuscandoCep(false); }
  }

  function enviarFotos(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setEnviando(true);
    const novas: string[] = [];
    for (const arquivo of Array.from(arquivos)) {
      if (arquivo.size > 10 * 1024 * 1024) { toast.error(`${arquivo.name} passa de 10 MB.`); continue; }
      const url = URL.createObjectURL(arquivo);
      fotosMapa.current.set(url, { kind: "nova", file: arquivo });
      novas.push(url);
    }
    setFotos((atuais) => [...atuais, ...novas]);
    if (novas.length) toast.success(`${novas.length} foto(s) adicionada(s). Elas serão enviadas ao salvar.`);
    setEnviando(false);
  }

  function aoSalvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const valor = (nome: string) => String(form.get(nome) ?? "").trim();
    const status = valor("status") as StatusPainel;
    // Preserva rascunho/reservado do SaaS quando a situação não foi alterada.
    const statusFinal = edicao && statusPainel(edicao.status) === status ? edicao.status : status;
    const videos = valor("videos").split("\n").map((v) => v.trim()).filter(Boolean);
    salvar.mutate({
      ...(edicao ? { id: edicao.id } : {}),
      codigo: edicao?.codigo || `RM-${Date.now().toString(36).toUpperCase()}`,
      titulo: valor("titulo"),
      slug: edicao?.slug || `${gerarSlug(valor("titulo"))}-${Math.random().toString(36).slice(2, 6)}`,
      descricao: valor("descricao") || null,
      tipo: valor("tipo"),
      finalidade: (edicao?.finalidade as "venda" | undefined) ?? "venda",
      status: statusFinal as "ativo",
      preco: Number(valor("preco").replace(/\./g, "").replace(",", ".")) || 0,
      preco_sob_consulta: edicao?.preco_sob_consulta ?? false,
      condominio: numero(form.get("condominio")) ?? edicao?.condominio ?? null,
      iptu: numero(form.get("iptu")) ?? edicao?.iptu ?? null,
      quartos: numero(form.get("quartos")), banheiros: numero(form.get("banheiros")), vagas: numero(form.get("vagas")),
      area_util: numero(form.get("area_m2")),
      area_total: edicao?.area_total ?? null, suites: edicao?.suites ?? null,
      endereco: montarEndereco({ logradouro: valor("logradouro"), numero: valor("numero"), bairro: valor("bairro") }),
      rua: valor("logradouro") || null, numero: valor("numero") || null, complemento: valor("complemento") || null,
      cidade: valor("cidade") || null, estado: valor("estado") || null, cep: valor("cep") || null,
      bairro_id: edicao?.bairro_id ?? null, corretor_id: edicao?.corretor_id ?? null,
      badge: edicao?.badge ?? null, exclusivo: edicao?.exclusivo ?? false,
      imagem_capa: null,
      latitude: edicao?.latitude ?? null, longitude: edicao?.longitude ?? null,
      caracteristicas: valor("lazer").split(",").map((v) => v.trim()).filter(Boolean),
      video_url: videos[0] ?? null, tour_url: edicao?.tour_url ?? null,
      mostrar_rua: form.get("exibir_endereco_exato") === "on",
      mostrar_endereco_completo: form.get("exibir_endereco_exato") === "on",
      destaque,
      campanha: form.get("campanha") === "on",
    });
  }

  const inicial = edicao;
  const end = {
    cep: inicial?.cep ?? "", logradouro: inicial?.rua ?? "", numero: inicial?.numero ?? "", complemento: inicial?.complemento ?? "",
    bairro: bairroDoEndereco(inicial?.endereco), cidade: inicial?.cidade ?? "", estado: inicial?.estado ?? "",
  };
  const carac = { quartos: inicial?.quartos, banheiros: inicial?.banheiros, vagas: inicial?.vagas, area_m2: inicial?.area_util };
  const chave = edicao?.id ?? "novo";

  return <PainelLayout titulo="Imóveis" descricao="Cadastre, edite e organize os imóveis exibidos no site." acoes={<Button onClick={() => void abrirFormulario()}><Plus className="mr-2 h-4 w-4" />Novo imóvel</Button>}>
    <div className="mb-5 flex flex-wrap gap-3"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar imóvel" className="pl-9" /></div><select aria-label="Filtrar por status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="ativo">Disponíveis</option><option value="inativo">Inativos</option><option value="vendido">Vendidos</option><option value="todos">Todos</option></select></div>
    {isLoading ? <p className="text-sm text-muted-foreground">Carregando imóveis...</p> : itens.length === 0 ? <div className="superficie-cartao p-10 text-center"><Building2 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Nenhum imóvel encontrado para este filtro.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{itens.map((imovel) => { const capa = capas.data?.[imovel.id]; return <article key={imovel.id} className="superficie-cartao overflow-hidden"><div className="relative aspect-[16/9] bg-muted">{capa ? <img src={capa} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem foto</div>}{imovel.destaque ? <Badge className="absolute left-3 top-3"><Star className="mr-1 h-3 w-3" />Destaque na home</Badge> : null}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-heading font-semibold">{imovel.titulo}</h2><p className="mt-1 text-sm text-muted-foreground">{formatarPreco(imovel.preco)}</p></div><Badge variant={imovel.status === "ativo" ? "default" : "secondary"}>{statusPainel(imovel.status)}</Badge></div><div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={() => void abrirFormulario(imovel)}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button variant="ghost" size="icon" aria-label="Excluir imóvel" onClick={() => setExcluir(imovel)}><Trash2 className="h-4 w-4" /></Button></div></div></article>; })}</div>}
    <Dialog open={aberto} onOpenChange={(v) => { setAberto(v); if (!v) limparFotos(); }}><DialogContent className="rm-painel font-sans max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{edicao ? "Editar imóvel" : carregandoEdicao ? "Carregando imóvel..." : "Novo imóvel"}</DialogTitle><DialogDescription>Preencha os dados que serão exibidos no site.</DialogDescription></DialogHeader>{carregandoEdicao ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <form key={chave} ref={formRef} onSubmit={aoSalvar} className="grid gap-5">
      <fieldset className="grid gap-4 md:grid-cols-3"><legend className="mb-3 font-heading font-semibold">Endereço</legend>
        <div><Label htmlFor="cep">CEP</Label><InputMascarado key={`cep-${chave}`} id="cep" name="cep" mascara="cep" maxLength={9} defaultValue={end.cep} placeholder="30535-640" className="mt-2" onChange={(e) => { setCepPreenchido(false); if (e.target.value.replace(/\D/g, "").length === 8) void buscarCep(e.target.value); }} /><p aria-live="polite" className="mt-1 text-xs text-muted-foreground">{buscandoCep ? "Buscando endereço..." : cepPreenchido ? "Endereço preenchido pelo CEP." : "Digite o CEP para preencher o endereço automaticamente."}</p></div>
        {([["logradouro","Logradouro"],["numero","Número"],["complemento","Complemento"],["bairro","Bairro"],["cidade","Cidade"],["estado","UF"]] as const).map(([nome,rotulo]) => <div key={nome} className={nome === "logradouro" ? "md:col-span-2" : ""}><Label htmlFor={nome}>{rotulo}</Label><Input id={nome} name={nome} defaultValue={end[nome]} className="mt-2" /></div>)}
      </fieldset>

      <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-2"><div className="md:col-span-2"><div className="flex items-center justify-between"><Label htmlFor="titulo">Título</Label><span className={titulo.trim().length > 70 || (titulo.trim().length > 0 && titulo.trim().length < 10) ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>{titulo.trim().length}/70</span></div><Input id="titulo" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} minLength={10} maxLength={70} required className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">Ideal entre 40 e 70 caracteres. Endereço da página: <span className="font-medium text-foreground">/{edicao?.slug || gerarSlug(titulo) || "titulo-do-imovel"}</span>{edicao?.slug ? " (o endereço de um imóvel já publicado não muda)" : ""}</p></div><div><Label htmlFor="tipo">Tipo</Label><select id="tipo" name="tipo" defaultValue={inicial?.tipo ?? "apartamento"} required className={`${campo} mt-2`}>{TIPOS_IMOVEL.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div><div><Label htmlFor="preco">Preço de venda</Label><div className="relative mt-2"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span><InputMascarado key={`preco-${chave}`} id="preco" name="preco" mascara="moeda" defaultValue={Number(inicial?.preco ?? 0).toFixed(2)} required className="pl-10" /></div></div><div><Label htmlFor="status">Situação</Label><select id="status" name="status" defaultValue={inicial ? statusPainel(inicial.status) : "ativo"} className={`${campo} mt-2`}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="vendido">Vendido</option></select></div><div className="md:col-span-2"><Label htmlFor="descricao">Descrição</Label><EditorDescricaoImovel key={`descricao-${chave}`} inicial={inicial?.descricao ?? ""} /></div></div>

      <fieldset className="grid gap-4 border-t border-border pt-5 md:grid-cols-4"><legend className="mb-3 font-heading font-semibold">Características</legend>{([["quartos","Quartos"],["banheiros","Banheiros"],["vagas","Vagas"],["area_m2","Área (m²)"]] as const).map(([nome,rotulo]) => <div key={nome}><Label htmlFor={nome}>{rotulo}</Label><Input id={nome} name={nome} type="number" min="0" defaultValue={carac[nome] == null ? "" : String(carac[nome])} className="mt-2" /></div>)}</fieldset>
      <div><Label htmlFor="lazer">Lazer e diferenciais</Label><Input id="lazer" name="lazer" defaultValue={(inicial?.caracteristicas ?? []).join(", ")} placeholder="Piscina, academia, salão de festas" className="mt-2" /></div>
      <div><Label htmlFor="videos">Vídeos (YouTube ou Vimeo)</Label><Textarea id="videos" name="videos" rows={3} defaultValue={inicial?.video_url ?? ""} placeholder={"https://www.youtube.com/watch?v=xxxxxxx\nhttps://vimeo.com/123456789"} className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">Um link por linha. O primeiro vídeo aparece na landing page do imóvel.</p></div>
      <div className="border-t border-border pt-5"><Label>Fotos</Label><label className="mt-2 flex min-h-28 cursor-pointer items-center justify-center rounded-md border border-dashed border-primary/40 bg-primary/5 text-sm text-primary"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(e) => { enviarFotos(e.target.files); e.target.value = ""; }} /><ImagePlus className="mr-2 h-5 w-5" />{enviando ? "Enviando..." : "Selecionar fotos (até 10 MB cada)"}</label>{fotos.length > 0 ? <FotosOrdenaveis fotos={fotos} onChange={setFotos} /> : null}</div>
      <div className="flex flex-wrap gap-6 border-t border-border pt-5"><div><label className="flex items-center gap-2 text-sm"><Switch checked={destaque} onCheckedChange={(v) => { if (v && limiteDestaqueAtingido) { toast.error("A home já tem 6 imóveis em destaque. Remova um antes de adicionar outro."); return; } setDestaque(v); }} /> <Star className="h-4 w-4 text-primary" /> Destaque na home</label><p className="mt-1 text-xs text-muted-foreground">{destaquesUsados} de 6 vagas usadas na home.</p></div><label className="flex items-center gap-2 text-sm"><Switch name="campanha" defaultChecked={inicial?.campanha ?? false} /> Disponível para campanha</label><label className="flex items-center gap-2 text-sm"><Switch name="exibir_endereco_exato" defaultChecked={inicial?.mostrar_endereco_completo ?? false} /> Exibir endereço exato</label></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setAberto(false); limparFotos(); }}>Cancelar</Button><Button type="submit" disabled={salvar.isPending || enviando}>{salvar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar imóvel</Button></div>
    </form>}</DialogContent></Dialog>
    <AlertDialog open={Boolean(excluir)} onOpenChange={(open) => !open && setExcluir(null)}><AlertDialogContent className="rm-painel font-sans"><AlertDialogHeader><AlertDialogTitle>Excluir este imóvel?</AlertDialogTitle><AlertDialogDescription>O imóvel será removido do site e esta ação não poderá ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => excluir && remover.mutate({ data: { id: excluir.id } })}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </PainelLayout>;
}
