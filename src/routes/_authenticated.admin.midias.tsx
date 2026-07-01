import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentTenantIdSync } from "@/lib/tenant-cache";
import { optimizeImage, fileKindFromMime, sanitizeFilename } from "@/lib/image-optimize";
import {
  listarMidias,
  registrarMidia,
  atualizarMidia,
  excluirMidia,
  listarUsosMidia,
} from "@/lib/api/media.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Search, Trash2, Copy, Edit2, Image as ImageIcon, FileText, Video, Music, File as FileIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/midias")({
  component: MidiasPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

type Media = Awaited<ReturnType<typeof listarMidias>>["items"][number];

function iconForType(t: string) {
  if (t === "image") return ImageIcon;
  if (t === "video") return Video;
  if (t === "audio") return Music;
  if (t === "pdf") return FileText;
  return FileIcon;
}

function MidiasPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<"all" | "image" | "video" | "pdf" | "audio" | "other">("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Media | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Media | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const listarFn = useServerFn(listarMidias);
  const { data, isLoading } = useQuery({
    queryKey: ["midias", search, tipo, page],
    queryFn: () => listarFn({ data: { search, tipo, page, pageSize: 48 } }),
  });

  const registrarFn = useServerFn(registrarMidia);
  const atualizarFn = useServerFn(atualizarMidia);
  const excluirFn = useServerFn(excluirMidia);

  const atualizarM = useMutation({
    mutationFn: (payload: { id: string; nome?: string; tags?: string[]; descricao?: string | null }) =>
      atualizarFn({ data: payload }),
    onSuccess: () => {
      toast.success("Mídia atualizada");
      qc.invalidateQueries({ queryKey: ["midias"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirM = useMutation({
    mutationFn: (payload: { id: string; force?: boolean }) => excluirFn({ data: payload }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.warning(res.message ?? "Confirme para excluir");
        return;
      }
      toast.success("Mídia excluída");
      qc.invalidateQueries({ queryKey: ["midias"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    let fail = 0;
    let tenantId: string;
    try {
      tenantId = getCurrentTenantIdSync();
    } catch {
      toast.error("Tenant não carregado");
      setUploading(false);
      return;
    }
    for (const file of Array.from(files)) {
      try {
        const kind = fileKindFromMime(file.type);
        const uid = crypto.randomUUID();
        const safe = sanitizeFilename(file.name) || `${uid}.bin`;
        const basePath = `${tenantId}/media/${uid}-${safe}`;

        const opt = await optimizeImage(file);

        const up1 = await supabase.storage.from("site").upload(basePath, opt.originalBlob, {
          contentType: file.type,
          upsert: false,
        });
        if (up1.error) throw new Error(up1.error.message);

        let mediumPath: string | null = null;
        let thumbPath: string | null = null;
        if (opt.mediumBlob) {
          const p = `${tenantId}/media/${uid}-medium.webp`;
          const up2 = await supabase.storage.from("site").upload(p, opt.mediumBlob, {
            contentType: "image/webp",
            upsert: false,
          });
          if (!up2.error) mediumPath = p;
        }
        if (opt.thumbBlob) {
          const p = `${tenantId}/media/${uid}-thumb.webp`;
          const up3 = await supabase.storage.from("site").upload(p, opt.thumbBlob, {
            contentType: "image/webp",
            upsert: false,
          });
          if (!up3.error) thumbPath = p;
        }

        await registrarFn({
          data: {
            nome: file.name,
            arquivo: basePath,
            arquivo_medium: mediumPath,
            arquivo_thumbnail: thumbPath,
            tipo: kind,
            mime_type: file.type || "application/octet-stream",
            tamanho: file.size,
            width: opt.width,
            height: opt.height,
            tags: [],
          },
        });
        ok++;
      } catch (e) {
        console.error(e);
        fail++;
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (ok) toast.success(`${ok} arquivo(s) enviado(s)`);
    if (fail) toast.error(`${fail} arquivo(s) falharam`);
    qc.invalidateQueries({ queryKey: ["midias"] });
  }

  async function copyUrl(m: Media) {
    const url = m.url_medium || m.url;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  }

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const pages = Math.ceil(total / 48);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Biblioteca de Mídias</h1>
          <p className="text-sm text-muted-foreground">Central de arquivos reutilizáveis do tenant.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
            {uploading ? "Enviando..." : "Enviar arquivos"}
          </Button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Select value={tipo} onValueChange={(v) => { setTipo(v as typeof tipo); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="image">Imagens</SelectItem>
            <SelectItem value="video">Vídeos</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
            <SelectItem value="audio">Áudios</SelectItem>
            <SelectItem value="other">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          Nenhum arquivo encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((m) => {
            const Icon = iconForType(m.tipo);
            return (
              <div key={m.id} className="group border rounded-lg overflow-hidden bg-card">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {m.tipo === "image" && (m.url_thumbnail || m.url) ? (
                    <img src={m.url_thumbnail || m.url!} alt={m.nome} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Icon className="size-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                    <Button size="icon" variant="secondary" onClick={() => copyUrl(m)} title="Copiar URL"><Copy className="size-3.5" /></Button>
                    <Button size="icon" variant="secondary" onClick={() => setEditing(m)} title="Editar"><Edit2 className="size-3.5" /></Button>
                    <Button size="icon" variant="destructive" onClick={() => setConfirmDelete(m)} title="Excluir"><Trash2 className="size-3.5" /></Button>
                  </div>
                </div>
                <div className="p-2 text-xs">
                  <p className="truncate font-medium" title={m.nome}>{m.nome}</p>
                  <p className="text-muted-foreground">{(m.tamanho / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-sm py-2">{page + 1} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}

      <EditDialog media={editing} onClose={() => setEditing(null)} onSave={(p) => atualizarM.mutate(p)} />
      <DeleteDialog media={confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={(force) => confirmDelete && excluirM.mutate({ id: confirmDelete.id, force })} />
    </div>
  );
}

function EditDialog({
  media,
  onClose,
  onSave,
}: {
  media: Media | null;
  onClose: () => void;
  onSave: (p: { id: string; nome: string; tags: string[]; descricao: string | null }) => void;
}) {
  const [nome, setNome] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [descricao, setDescricao] = useState("");
  useEffect(() => {
    if (media) {
      setNome(media.nome);
      setTagsStr((media.tags ?? []).join(", "));
      setDescricao(media.descricao ?? "");
    }
  }, [media]);
  if (!media) return null;
  return (
    <Dialog open={!!media} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar mídia</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {media.tipo === "image" && (media.url_medium || media.url) && (
            <img src={media.url_medium || media.url!} alt="" className="w-full max-h-64 object-contain bg-muted rounded" />
          )}
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="hero, home, banner" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() =>
              onSave({
                id: media.id,
                nome,
                tags: tagsStr.split(",").map((s) => s.trim()).filter(Boolean),
                descricao: descricao.trim() || null,
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  media,
  onClose,
  onConfirm,
}: {
  media: Media | null;
  onClose: () => void;
  onConfirm: (force: boolean) => void;
}) {
  const listarUsosFn = useServerFn(listarUsosMidia);
  const { data: usos } = useQuery({
    queryKey: ["media-usos", media?.id],
    queryFn: () => listarUsosFn({ data: { media_id: media!.id } }),
    enabled: !!media,
  });
  if (!media) return null;
  const emUso = (usos ?? []).length > 0;
  return (
    <Dialog open={!!media} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir mídia</DialogTitle>
          <DialogDescription>{media.nome}</DialogDescription>
        </DialogHeader>
        {emUso ? (
          <div className="space-y-2">
            <Badge variant="destructive">Em uso em {usos!.length} local(is)</Badge>
            <ul className="text-xs text-muted-foreground list-disc pl-5">
              {usos!.slice(0, 10).map((u) => (
                <li key={u.id}>{u.entidade}{u.campo ? ` · ${u.campo}` : ""}</li>
              ))}
            </ul>
            <p className="text-sm">Excluir mesmo assim removerá o arquivo permanentemente.</p>
          </div>
        ) : (
          <p className="text-sm">Esta ação é irreversível.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={() => onConfirm(emUso)}>Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
