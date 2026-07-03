// MediaContentEditor — metadados da mídia (Bloco 3.1). Preview do arquivo + edição.
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, FileText, Video, Music, File as FileIcon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useContentSession } from "../session";

function iconForType(t: string) {
  if (t === "image") return ImageIcon;
  if (t === "video") return Video;
  if (t === "audio") return Music;
  if (t === "pdf") return FileText;
  return FileIcon;
}

export function MediaContentEditor() {
  const s = useContentSession();
  const d = s.draft.data as {
    tipo?: string; url?: string; url_medium?: string; url_thumbnail?: string;
    tamanho?: number; mime?: string; width?: number; height?: number; tags?: string[];
  };
  const Icon = iconForType(d.tipo ?? "other");
  const tagsStr = (d.tags ?? []).join(", ");
  const previewUrl = d.url_medium ?? d.url;

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="rounded-md border border-foreground/10 bg-muted/30 flex items-center justify-center overflow-hidden" style={{ minHeight: 240 }}>
        {d.tipo === "image" && previewUrl ? (
          <img src={previewUrl} alt="" className="max-h-[400px] object-contain" />
        ) : (
          <Icon className="size-16 text-muted-foreground" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Nome</Label>
          <Input value={s.draft.titulo} onChange={(e) => s.patch({ titulo: e.target.value })} />
        </div>
        <div><Label>Tags (separadas por vírgula)</Label>
          <Input value={tagsStr} onChange={(e) => s.updateData({ tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
        </div>
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea rows={2} value={s.draft.descricao} onChange={(e) => s.patch({ descricao: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div><span className="uppercase text-[10px]">Tipo</span><div>{d.mime ?? "—"}</div></div>
        <div><span className="uppercase text-[10px]">Tamanho</span><div>{d.tamanho ? `${(d.tamanho / 1024).toFixed(0)} KB` : "—"}</div></div>
        {d.width && d.height && (
          <div className="col-span-2"><span className="uppercase text-[10px]">Dimensões</span><div>{d.width} × {d.height}</div></div>
        )}
      </div>

      {d.url && (
        <div className="rounded-md border border-foreground/10 p-3 flex items-center gap-2">
          <code className="text-[11px] font-mono truncate flex-1">{d.url}</code>
          <Button size="sm" variant="ghost" onClick={() => { if (d.url) { navigator.clipboard.writeText(d.url); toast.success("URL copiada"); } }}>
            <Copy className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
