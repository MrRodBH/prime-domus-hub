import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import {
  consumeTenantLaunchGalleryImage,
  setTenantLaunchCoverFromImage,
  signTenantLaunchMedia,
} from "@/lib/api/content-media.functions";
import {
  adminListarImagensLancamento,
  adminRemoverImagemLancamento,
  adminReordenarImagensLancamento,
} from "@/lib/api/lancamentos.functions";

const MAX = 40;

type Img = {
  id: string;
  storage_path: string;
  legenda: string | null;
  ordem: number;
};

type Props = {
  projectId: string;
  currentCoverPath: string | null;
  onCoverChange?: (path: string) => void;
};

export function GaleriaLancamento({ projectId, currentCoverPath, onCoverChange }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<Record<string, string>>({});

  const { data: images = [] } = useQuery<Img[]>({
    queryKey: ["admin", "lancamento", projectId, "imagens"],
    queryFn: () => adminListarImagensLancamento({ data: { project_id: projectId } }),
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      const next: Record<string, string> = {};
      for (const image of images) {
        try {
          const result = await signTenantLaunchMedia({
            data: {
              projectId,
              resource: "gallery",
              resourceId: image.id,
              width: 400,
              quality: 65,
            },
          });
          if (result.url) next[image.id] = result.url;
        } catch {
          // Preview failure never weakens the persisted metadata authority.
        }
      }
      if (active) setSigned(next);
    })();
    return () => { active = false; };
  }, [images, projectId]);

  useEffect(() => {
    setOrders((current) => Object.fromEntries(
      images.map((image) => [image.id, current[image.id] ?? String(image.ordem || 0)]),
    ));
  }, [images]);

  async function uploadImages(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    const allowed = selected.slice(0, Math.max(0, MAX - images.length));
    if (allowed.length === 0) {
      toast.error(`Limite de ${MAX} imagens atingido.`);
      return;
    }

    setUploading(true);
    try {
      let nextOrder = Math.max(0, ...images.map((image) => image.ordem || 0)) + 1;
      for (const file of allowed) {
        const target = await createUploadTarget({
          data: {
            domain: "lancamento-galeria",
            entityId: projectId,
            originalFileName: file.name,
            mimeType: file.type,
            size: file.size,
          },
        });
        const { error } = await supabase.storage
          .from(target.bucket)
          .upload(target.path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        await consumeTenantLaunchGalleryImage({
          data: {
            projectId,
            targetId: target.targetId,
            legend: null,
            order: nextOrder++,
          },
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "imagens"] });
      toast.success(`${allowed.length} imagem(ns) registrada(s) por provenance.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no upload da galeria.");
    } finally {
      setUploading(false);
    }
  }

  const removeMutation = useMutation({
    mutationFn: (image: Img) => adminRemoverImagemLancamento({ data: { id: image.id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "imagens"] });
      toast.success("Imagem removida.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: () => {
      const rows = images.map((image) => ({ id: image.id, ordem: Number(orders[image.id]) }));
      const values = rows.map((row) => row.ordem);
      const valid = values.every((value) => Number.isInteger(value) && value >= 1 && value <= images.length)
        && new Set(values).size === images.length
        && values.includes(1);
      if (!valid) throw new Error(`Utilize cada número de 1 a ${images.length} exatamente uma vez.`);
      return adminReordenarImagensLancamento({ data: { project_id: projectId, ordem: rows } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "imagens"] });
      toast.success("Ordem salva.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function defineCover(image: Img) {
    try {
      const result = await setTenantLaunchCoverFromImage({
        data: { projectId, imageId: image.id },
      });
      onCoverChange?.(result.path);
      toast.success("Capa atualizada por referência persistida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao definir capa.");
    }
  }

  return (
    <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-medium">Galeria de fotos</h2>
          <p className="text-xs text-muted-foreground">{images.length} / {MAX} imagens</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={reorderMutation.isPending || images.length === 0} onClick={() => reorderMutation.mutate()}>
            {reorderMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
            Salvar ordem
          </Button>
          <Button type="button" size="sm" disabled={uploading || images.length >= MAX} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Upload className="size-4 mr-1" />}
            Enviar imagens
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadImages} />
        </div>
      </div>

      {images.length === 0 ? (
        <div className="border border-dashed border-foreground/15 rounded-lg p-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="size-8 mx-auto mb-2 opacity-50" strokeWidth={1.5} />
          Nenhuma imagem enviada.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image) => {
            const isCover = currentCoverPath === image.storage_path;
            return (
              <div key={image.id} className={`relative rounded-md overflow-hidden border ${isCover ? "border-gold" : "border-foreground/10"}`}>
                <div className="aspect-[4/3] bg-muted">
                  {signed[image.id]
                    ? <img src={signed[image.id]} alt={image.legenda ?? ""} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sem preview</div>}
                </div>
                <div className="absolute top-2 left-2 right-2 flex justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => void defineCover(image)}
                    title={isCover ? "Capa atual" : "Definir como capa"}
                    className={`size-7 rounded-full flex items-center justify-center ${isCover ? "bg-gold text-petroleum" : "bg-black/60 text-white hover:bg-gold hover:text-petroleum"}`}
                  >
                    <Star className="size-3.5" fill={isCover ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm("Remover esta imagem?") && removeMutation.mutate(image)}
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
                    min={1}
                    max={images.length}
                    value={orders[image.id] ?? "0"}
                    onChange={(event) => setOrders((current) => ({ ...current, [image.id]: event.target.value }))}
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
