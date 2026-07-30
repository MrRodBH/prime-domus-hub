import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, Copy, Download, Instagram, Trash2 } from "lucide-react";
import { igExcluirPost, igListarPosts, igSalvarPost } from "@/lib/api/instagram.functions";
import JSZip from "jszip";

type Image = { id: string; url: string; alt?: string | null; ordem: number };

type Props = {
  imovelId?: string;
  launchProjectId?: string;
  titulo: string;
  imagens: Image[];
  signedUrls?: Record<string, string>;
};

type StoredPost = {
  id: string;
  legenda: string;
  hashtags: string;
  imagem_ids: string[];
  status: "rascunho" | "aprovado" | "publicado";
  modelo_ia: string | null;
};

export function InstagramPostManager({
  imovelId,
  launchProjectId,
  titulo,
  imagens,
  signedUrls = {},
}: Props) {
  const queryClient = useQueryClient();
  const targetKey = imovelId ?? launchProjectId ?? "";
  const targetPayload = imovelId
    ? { imovel_id: imovelId }
    : { launch_project_id: launchProjectId! };
  const [open, setOpen] = useState(false);
  const [legenda, setLegenda] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selected, setSelected] = useState<string[]>(imagens.slice(0, 10).map((image) => image.id));
  const [postId, setPostId] = useState<string | undefined>();
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState<null | "legenda" | "hashtags" | "tudo">(null);

  const posts = useQuery({
    queryKey: ["instagram-drafts", targetKey],
    queryFn: () => igListarPosts({ data: targetPayload }),
    enabled: open && Boolean(targetKey),
  });

  const saveMutation = useMutation({
    mutationFn: (status: "rascunho" | "aprovado" | "publicado") =>
      igSalvarPost({
        data: {
          id: postId,
          ...targetPayload,
          legenda,
          hashtags,
          imagem_ids: selected,
          status,
          modelo_ia: null,
        },
      }),
    onSuccess: (result, status) => {
      setPostId(result.id);
      void queryClient.invalidateQueries({ queryKey: ["instagram-drafts", targetKey] });
      toast.success(status === "publicado" ? "Marcado como publicado." : status === "aprovado" ? "Draft aprovado." : "Draft salvo.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => igExcluirPost({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["instagram-drafts", targetKey] });
      toast.success("Draft removido.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const imageMap = useMemo(() => new Map(imagens.map((image) => [image.id, image])), [imagens]);
  const selectedImages = selected.map((id) => imageMap.get(id)).filter(Boolean) as Image[];

  function toggleImage(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 10) {
        toast.error("Limite de 10 fotos no carrossel.");
        return current;
      }
      return [...current, id];
    });
  }

  async function copy(kind: "legenda" | "hashtags" | "tudo") {
    const text = kind === "legenda" ? legenda : kind === "hashtags" ? hashtags : `${legenda}\n\n${hashtags}`;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    toast.success("Copiado para a área de transferência.");
    window.setTimeout(() => setCopied(null), 1800);
  }

  async function downloadZip() {
    if (selectedImages.length === 0) {
      toast.error("Selecione ao menos uma foto.");
      return;
    }
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("fotos") ?? zip;
      zip.file("legenda.txt", `${legenda}\n\n${hashtags}\n`);
      for (let index = 0; index < selectedImages.length; index += 1) {
        const image = selectedImages[index];
        const url = signedUrls[image.id] ?? (image.url.startsWith("https://") ? image.url : null);
        if (!url) throw new Error("instagram_signed_media_unavailable");
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Falha ao baixar imagem ${index + 1}.`);
        const blob = await response.blob();
        const extension = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        folder.file(`${String(index + 1).padStart(2, "0")}.${extension}`, blob);
      }
      const output = await zip.generateAsync({ type: "blob" });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(output);
      const safeName = titulo.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "imovel";
      anchor.download = `instagram-${safeName}.zip`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      toast.success("ZIP gerado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar ZIP.");
    } finally {
      setDownloading(false);
    }
  }

  function loadPost(post: StoredPost) {
    setPostId(post.id);
    setLegenda(post.legenda);
    setHashtags(post.hashtags);
    setSelected(post.imagem_ids?.length ? post.imagem_ids : imagens.slice(0, 10).map((image) => image.id));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Instagram className="size-4" /> Planejar post Instagram
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">Draft Instagram — {titulo || "imóvel"}</DialogTitle></DialogHeader>

        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          Geração externa de copy não possui adapter factual nesta etapa. Legenda e hashtags são preenchidas manualmente e persistidas no tenant efetivo.
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 mt-4">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Legenda</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => void copy("legenda")}>
                  {copied === "legenda" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}Copiar
                </Button>
              </div>
              <Textarea rows={8} value={legenda} onChange={(event) => setLegenda(event.target.value)} placeholder="Escreva a legenda manualmente…" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hashtags</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => void copy("hashtags")}>
                  {copied === "hashtags" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}Copiar
                </Button>
              </div>
              <Textarea rows={3} value={hashtags} onChange={(event) => setHashtags(event.target.value)} placeholder="#tag1 #tag2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Fotos do carrossel ({selected.length}/10)</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelected([])}>Limpar</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(imagens.slice(0, 10).map((image) => image.id))}>10 primeiras</Button>
                </div>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {imagens.map((image) => {
                  const position = selected.indexOf(image.id);
                  const active = position >= 0;
                  return (
                    <button
                      type="button"
                      key={image.id}
                      onClick={() => toggleImage(image.id)}
                      className={`relative aspect-square rounded overflow-hidden border-2 ${active ? "border-gold ring-2 ring-gold/30" : "border-foreground/10"}`}
                    >
                      {signedUrls[image.id] && <img src={signedUrls[image.id]} alt={image.alt ?? ""} className="w-full h-full object-cover bg-muted" />}
                      {active && <span className="absolute top-1 left-1 bg-gold text-petroleum text-[10px] font-semibold px-1.5 py-0.5 rounded">{position + 1}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-foreground/10">
              <Button type="button" onClick={() => saveMutation.mutate("rascunho")} disabled={saveMutation.isPending}>Salvar draft</Button>
              <Button type="button" variant="outline" onClick={() => saveMutation.mutate("aprovado")} disabled={saveMutation.isPending}>Aprovar</Button>
              <Button type="button" variant="outline" onClick={() => saveMutation.mutate("publicado")} disabled={saveMutation.isPending}>Marcar publicado</Button>
              <Button type="button" variant="outline" onClick={() => void copy("tudo")}><Copy className="size-4 mr-1" />Copiar tudo</Button>
              <Button type="button" variant="outline" disabled={downloading} onClick={() => void downloadZip()}><Download className="size-4 mr-1" />{downloading ? "Gerando…" : "Baixar ZIP"}</Button>
            </div>
          </div>

          <aside className="space-y-3">
            <h3 className="font-medium">Drafts salvos</h3>
            {(posts.data ?? []).map((post) => (
              <div key={post.id} className="rounded border p-3 text-sm space-y-2">
                <button type="button" className="w-full text-left" onClick={() => loadPost(post as StoredPost)}>
                  <div className="font-medium truncate">{post.legenda || "Sem legenda"}</div>
                  <div className="text-xs text-muted-foreground">{post.status}</div>
                </button>
                <Button type="button" size="sm" variant="ghost" onClick={() => window.confirm("Remover este draft?") && deleteMutation.mutate(post.id)}>
                  <Trash2 className="size-3.5 mr-1" />Remover
                </Button>
              </div>
            ))}
            {posts.data?.length === 0 && <p className="text-xs text-muted-foreground">Nenhum draft salvo.</p>}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
