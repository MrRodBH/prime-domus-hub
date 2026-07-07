import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Star, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import {
  adminListarImagensLancamento,
  adminAdicionarImagemLancamento,
  adminRemoverImagemLancamento,
  adminReordenarImagensLancamento,
} from "@/lib/api/lancamentos.functions";
import { adminAssinarUrl } from "@/lib/api/admin.functions";

const MAX = 40;

type Img = { id: string; storage_path: string; legenda: string | null; ordem: number };
type Props = { projectId: string; slug: string; imagemCapa: string | null; onCapaChange?: (path: string | null) => void };

export function GaleriaLancamento({ projectId, slug, imagemCapa, onCapaChange }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [ordens, setOrdens] = useState<Record<string, string>>({});

  const { data: imgs = [] } = useQuery<Img[]>({
    queryKey: ["admin", "lancamento", projectId, "imagens"],
    queryFn: () => adminListarImagensLancamento({ data: { project_id: projectId } }),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const i of imgs) {
        try {
          const { url } = await adminAssinarUrl({ data: { bucket: "lancamentos", path: i.storage_path, width: 400, quality: 65 } });
          map[i.id] = url;
        } catch { /* ignore */ }
      }
      if (!cancelled) setSigned(map);
    })();
    return () => { cancelled = true; };
  }, [imgs]);

  useEffect(() => {
    setOrdens((prev) => {
      const next: Record<string, string> = {};
      for (const i of imgs) next[i.id] = prev[i.id] ?? String(i.ordem ?? 0);
      return next;
    });
  }, [imgs]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const restante = MAX - imgs.length;
    if (restante <= 0) { toast.error(`Limite de ${MAX} imagens.`); e.target.value = ""; return; }
    const arr = Array.from(files).slice(0, restante);
    setUploading(true);
    try {
      let nextOrdem = (imgs.reduce((m, i) => Math.max(m, i.ordem ?? 0), 0) || 0) + 1;
      for (const file of arr) {
        // M3.2 — servidor injeta tenantId e valida ownership do lançamento.
        const target = await createUploadTarget({
          data: {
            domain: "lancamento-galeria",
            entityId: projectId,
            originalFileName: file.name,
            mimeType: file.type,
            size: file.size,
          },
        });
        const { error: upErr } = await supabase.storage
          .from(target.bucket)
          .upload(target.path, file, { upsert: false });
        if (upErr) throw upErr;
        await adminAdicionarImagemLancamento({
          data: { project_id: projectId, storage_path: target.path, legenda: null, ordem: nextOrdem++ },
        });
      }
      toast.success(`${arr.length} imagem(ns) enviada(s)`);
      qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "imagens"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const remover = useMutation({
    mutationFn: (img: Img) => adminRemoverImagemLancamento({ data: { id: img.id, storage_path: img.storage_path } }),
    onSuccess: (_d, img) => {
      toast.success("Imagem removida");
      if (imagemCapa === img.storage_path) onCapaChange?.(null);
      qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "imagens"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reordenar = useMutation({
    mutationFn: () => adminReordenarImagensLancamento({
      data: {
        project_id: projectId,
        ordem: Object.entries(ordens).map(([id, v]) => ({ id, ordem: Number(v) || 0 })),
      },
    }),
    onSuccess: () => {
      toast.success("Ordem salva");
      qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "imagens"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function definirCapa(path: string) {
    onCapaChange?.(path);
    toast.success("Capa definida (clique em Salvar empreendimento para confirmar).");
  }

  return (
    <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-medium">Galeria de fotos</h2>
          <p className="text-xs text-muted-foreground">{imgs.length} / {MAX} imagens</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={reordenar.isPending} onClick={() => reordenar.mutate()}>
            {reordenar.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
            Salvar ordem
          </Button>
          <Button type="button" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Upload className="size-4 mr-1" />}
            Enviar imagens
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        </div>
      </div>

      {imgs.length === 0 ? (
        <div className="border border-dashed border-foreground/15 rounded-lg p-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="size-8 mx-auto mb-2 opacity-50" strokeWidth={1.5} />
          Nenhuma imagem enviada. Use o botão acima para adicionar.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {imgs.map((img) => {
            const isCapa = imagemCapa === img.storage_path;
            return (
              <div key={img.id} className={`relative rounded-md overflow-hidden border ${isCapa ? "border-gold" : "border-foreground/10"}`}>
                <div className="aspect-[4/3] bg-muted">
                  {signed[img.id] ? (
                    <img src={signed[img.id]} alt={img.legenda ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Carregando…</div>
                  )}
                </div>
                <div className="absolute top-2 left-2 right-2 flex justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => definirCapa(img.storage_path)}
                    title={isCapa ? "Capa atual" : "Definir como capa"}
                    className={`size-7 rounded-full flex items-center justify-center text-xs ${isCapa ? "bg-gold text-petroleum" : "bg-black/60 text-white hover:bg-gold hover:text-petroleum"}`}
                  >
                    <Star className="size-3.5" fill={isCapa ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm("Remover esta imagem?")) remover.mutate(img); }}
                    className="size-7 rounded-full bg-black/60 text-white hover:bg-red-600 flex items-center justify-center"
                    title="Remover"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="p-2 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ordem</span>
                  <Input
                    type="number"
                    value={ordens[img.id] ?? "0"}
                    onChange={(e) => setOrdens((p) => ({ ...p, [img.id]: e.target.value }))}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
