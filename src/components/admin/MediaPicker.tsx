/**
 * MediaPicker — seletor reutilizável de mídias da biblioteca.
 * Usar em qualquer editor (páginas, campanhas, blog) que precise escolher/enviar imagens.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarMidias } from "@/lib/api/media.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image as ImageIcon, Loader2, Search, X } from "lucide-react";

interface Props {
  value: string | null;               // URL atual
  onChange: (v: { url: string; media_id: string; path: string } | null) => void;
  tipo?: "image" | "video" | "pdf" | "audio";
  label?: string;
}

export function MediaPicker({ value, onChange, tipo = "image", label = "Selecionar mídia" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listarFn = useServerFn(listarMidias);
  const { data, isLoading } = useQuery({
    queryKey: ["mediapicker", tipo, search],
    queryFn: () => listarFn({ data: { search, tipo, page: 0, pageSize: 60 } }),
    enabled: open,
  });

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-40 h-40 border rounded-md overflow-hidden bg-muted">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <div className="w-40 h-40 border border-dashed rounded-md flex items-center justify-center text-muted-foreground">
          <ImageIcon className="size-8" />
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Biblioteca de Mídias</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
            ) : (data?.items ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma mídia. Envie arquivos em <a href="/admin/midias" className="underline">Mídias</a>.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {data!.items.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      const url = m.url_medium || m.url;
                      if (url) onChange({ url, media_id: m.id, path: m.arquivo });
                      setOpen(false);
                    }}
                    className="aspect-square border rounded-md overflow-hidden hover:ring-2 hover:ring-primary"
                  >
                    {m.tipo === "image" && (m.url_thumbnail || m.url) ? (
                      <img src={m.url_thumbnail || m.url!} alt={m.nome} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-2">{m.nome}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
