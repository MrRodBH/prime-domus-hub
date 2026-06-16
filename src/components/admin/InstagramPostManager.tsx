import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Copy, Download, Check, Instagram, Trash2 } from "lucide-react";
import { igGerarPost, igSalvarPost, igListarPosts, igExcluirPost } from "@/lib/api/instagram.functions";
import { adminAssinarUrl } from "@/lib/api/admin.functions";
import JSZip from "jszip";

type Imagem = { id: string; url: string; alt?: string | null; ordem: number };

interface Props {
  imovelId: string;
  titulo: string;
  imagens: Imagem[];
  signedUrls?: Record<string, string>;
}

export function InstagramPostManager({ imovelId, titulo, imagens, signedUrls = {} }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tom, setTom] = useState<"sofisticado" | "objetivo" | "acolhedor">("sofisticado");
  const [formato, setFormato] = useState<"feed" | "story" | "reels">("feed");
  const [legenda, setLegenda] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [modelo, setModelo] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>(imagens.slice(0, 10).map((i) => i.id));
  const [postId, setPostId] = useState<string | undefined>();
  const [baixando, setBaixando] = useState(false);
  const [copiou, setCopiou] = useState<null | "legenda" | "hashtags" | "tudo">(null);

  const posts = useQuery({
    queryKey: ["ig-posts", imovelId],
    queryFn: () => igListarPosts({ data: { imovel_id: imovelId } }),
    enabled: open,
  });

  const gerar = useMutation({
    mutationFn: () => igGerarPost({ data: { imovel_id: imovelId, tom, formato } }),
    onSuccess: (r) => {
      setLegenda(r.legenda);
      setHashtags(r.hashtags);
      setModelo(r.modelo);
      setPostId(undefined);
      toast.success("Post gerado com IA");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const salvar = useMutation({
    mutationFn: (status: "rascunho" | "aprovado" | "publicado") =>
      igSalvarPost({
        data: {
          id: postId,
          imovel_id: imovelId,
          legenda,
          hashtags,
          imagem_ids: selecionadas,
          status,
          modelo_ia: modelo,
        },
      }),
    onSuccess: (r, status) => {
      setPostId(r.id);
      qc.invalidateQueries({ queryKey: ["ig-posts", imovelId] });
      toast.success(
        status === "publicado" ? "Marcado como publicado" : status === "aprovado" ? "Post aprovado" : "Rascunho salvo",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => igExcluirPost({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ig-posts", imovelId] });
      toast.success("Post removido");
    },
  });

  const imgMap = useMemo(() => new Map(imagens.map((i) => [i.id, i])), [imagens]);
  const selecionadasObj = selecionadas.map((id) => imgMap.get(id)).filter(Boolean) as Imagem[];

  function toggleImg(id: string) {
    setSelecionadas((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 10 ? s : [...s, id],
    );
  }

  async function copiar(tipo: "legenda" | "hashtags" | "tudo") {
    const txt = tipo === "legenda" ? legenda : tipo === "hashtags" ? hashtags : `${legenda}\n\n${hashtags}`;
    await navigator.clipboard.writeText(txt);
    setCopiou(tipo);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopiou(null), 1800);
  }

  async function baixarZip() {
    if (selecionadasObj.length === 0) {
      toast.error("Selecione ao menos uma foto.");
      return;
    }
    setBaixando(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("fotos") ?? zip;
      // Adiciona arquivo de texto com legenda + hashtags
      zip.file("legenda.txt", `${legenda}\n\n${hashtags}\n`);
      for (let i = 0; i < selecionadasObj.length; i++) {
        const img = selecionadasObj[i];
        let url = img.url;
        if (!url.startsWith("http")) {
          const r = await adminAssinarUrl({ data: { bucket: "imoveis", path: img.url } });
          url = r.url;
        }
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Falha ao baixar imagem ${i + 1}`);
        const blob = await resp.blob();
        const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        folder.file(`${String(i + 1).padStart(2, "0")}.${ext}`, blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out);
      const safe = titulo.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "imovel";
      a.download = `instagram-${safe}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("ZIP gerado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBaixando(false);
    }
  }

  function carregarPost(p: {
    id: string;
    legenda: string;
    hashtags: string;
    imagem_ids: string[];
    modelo_ia: string | null;
  }) {
    setPostId(p.id);
    setLegenda(p.legenda);
    setHashtags(p.hashtags);
    setSelecionadas(p.imagem_ids?.length ? p.imagem_ids : imagens.slice(0, 10).map((i) => i.id));
    setModelo(p.modelo_ia);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Instagram className="size-4" /> Gerar post Instagram
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Post Instagram — {titulo || "imóvel"}</DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-2">
          <div className="space-y-5">
            {/* Geração */}
            <div className="border border-foreground/10 rounded-lg p-4 space-y-3">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Tom</Label>
                  <Select value={tom} onValueChange={(v) => setTom(v as typeof tom)}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sofisticado">Sofisticado</SelectItem>
                      <SelectItem value="objetivo">Objetivo</SelectItem>
                      <SelectItem value="acolhedor">Acolhedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Formato</Label>
                  <Select value={formato} onValueChange={(v) => setFormato(v as typeof formato)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feed">Feed / Carrossel</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="reels">Reels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" onClick={() => gerar.mutate()} disabled={gerar.isPending} className="gap-2">
                  <Sparkles className="size-4" />
                  {gerar.isPending ? "Gerando…" : "Gerar com IA"}
                </Button>
              </div>
            </div>

            {/* Legenda */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Legenda</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => copiar("legenda")} className="gap-1.5 h-7">
                  {copiou === "legenda" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Copiar
                </Button>
              </div>
              <Textarea rows={8} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Gere com IA ou escreva manualmente…" />
              <p className="text-[11px] text-muted-foreground">{legenda.length} caracteres (Instagram aceita até 2.200)</p>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hashtags</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => copiar("hashtags")} className="gap-1.5 h-7">
                  {copiou === "hashtags" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Copiar
                </Button>
              </div>
              <Textarea rows={3} value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#tag1 #tag2 …" />
              <p className="text-[11px] text-muted-foreground">{hashtags.split(/\s+/).filter((s) => s.startsWith("#")).length} hashtags (máx. 30)</p>
            </div>

            {/* Seleção de imagens */}
            <div className="space-y-2">
              <Label>Fotos do carrossel ({selecionadas.length}/10)</Label>
              {imagens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Adicione fotos ao imóvel para incluir no post.</p>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {imagens.map((img) => {
                    const idx = selecionadas.indexOf(img.id);
                    const ativo = idx >= 0;
                    return (
                      <button
                        type="button"
                        key={img.id}
                        onClick={() => toggleImg(img.id)}
                        className={`relative aspect-square rounded overflow-hidden border-2 transition ${ativo ? "border-gold ring-2 ring-gold/30" : "border-foreground/10"}`}
                      >
                        <img
                          src={img.url.startsWith("http") ? img.url : ""}
                          alt=""
                          className="w-full h-full object-cover bg-muted"
                        />
                        {ativo && (
                          <span className="absolute top-1 left-1 bg-gold text-petroleum text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            {idx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-foreground/10">
              <Button type="button" variant="outline" onClick={() => copiar("tudo")} className="gap-2">
                <Copy className="size-4" /> Copiar legenda + hashtags
              </Button>
              <Button type="button" onClick={baixarZip} disabled={baixando} className="gap-2">
                <Download className="size-4" /> {baixando ? "Preparando…" : "Baixar fotos (ZIP)"}
              </Button>
              <div className="grow" />
              <Button type="button" variant="ghost" onClick={() => salvar.mutate("rascunho")} disabled={salvar.isPending}>
                Salvar rascunho
              </Button>
              <Button type="button" variant="outline" onClick={() => salvar.mutate("aprovado")} disabled={salvar.isPending || !legenda}>
                Aprovar
              </Button>
              <Button type="button" onClick={() => salvar.mutate("publicado")} disabled={salvar.isPending || !legenda}>
                Marcar como publicado
              </Button>
            </div>

            <details className="text-xs text-muted-foreground bg-muted/40 rounded p-3">
              <summary className="cursor-pointer font-medium">Como publicar no Instagram</summary>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Clique em <b>Copiar legenda + hashtags</b>.</li>
                <li>Clique em <b>Baixar fotos (ZIP)</b> e descompacte no celular (apps como WinZip, iZip).</li>
                <li>Abra o Instagram → Novo post → selecione as fotos na ordem desejada.</li>
                <li>Cole a legenda + hashtags e publique.</li>
                <li>Volte aqui e clique em <b>Marcar como publicado</b> para registrar.</li>
              </ol>
            </details>
          </div>

          {/* Histórico de posts */}
          <aside className="space-y-3">
            <h3 className="font-display text-sm uppercase tracking-wide text-muted-foreground">Histórico</h3>
            {posts.isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
            {posts.data?.length === 0 && <p className="text-xs text-muted-foreground">Nenhum post criado ainda.</p>}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {posts.data?.map((p) => (
                <div key={p.id} className={`border rounded p-2 text-xs ${postId === p.id ? "border-gold bg-gold/5" : "border-foreground/10"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={p.status === "publicado" ? "default" : p.status === "aprovado" ? "secondary" : "outline"} className="text-[10px]">
                      {p.status}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => { if (confirm("Remover este post?")) excluir.mutate(p.id); }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                  <p className="line-clamp-3 mb-1">{p.legenda}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")}</span>
                    <button type="button" onClick={() => carregarPost(p)} className="text-petroleum hover:underline">
                      Carregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
