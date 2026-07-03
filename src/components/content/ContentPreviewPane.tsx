// Preview universal — usa CmsPageRenderer se blocks; caso contrário mostra placeholder + link público.
import { useUI } from "@/components/workspace/ui-store";
import { CmsPageRenderer } from "@/adapters/cms-legacy";
import { Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentSession } from "./session";

const DEVICE_W: Record<"desktop" | "tablet" | "mobile", string> = {
  desktop: "w-full", tablet: "w-[820px]", mobile: "w-[390px]",
};

export function ContentPreviewPane() {
  const { previewDevice, setPreviewDevice } = useUI();
  const s = useContentSession();
  const device = previewDevice;
  const url = s.adapter.publicUrl ? s.adapter.publicUrl(s.detail, s.draft) : null;

  return (
    <div className="h-full flex flex-col bg-muted/30">
      <div className="h-10 px-3 border-b border-foreground/5 flex items-center gap-2 shrink-0 bg-background">
        <div className="flex items-center gap-0.5 border rounded-md p-0.5">
          <Button size="sm" variant={device === "desktop" ? "secondary" : "ghost"} className="h-6 w-7 p-0" onClick={() => setPreviewDevice("desktop")} title="Desktop"><Monitor className="size-3.5" /></Button>
          <Button size="sm" variant={device === "tablet" ? "secondary" : "ghost"} className="h-6 w-7 p-0" onClick={() => setPreviewDevice("tablet")} title="Tablet"><Tablet className="size-3.5" /></Button>
          <Button size="sm" variant={device === "mobile" ? "secondary" : "ghost"} className="h-6 w-7 p-0" onClick={() => setPreviewDevice("mobile")} title="Mobile"><Smartphone className="size-3.5" /></Button>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Preview ao vivo</span>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="ml-auto">
            <Button size="sm" variant="ghost" className="h-6"><ExternalLink className="size-3 mr-1" />Abrir</Button>
          </a>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div className={`${DEVICE_W[device]} max-w-full bg-background rounded-md border border-foreground/10 overflow-hidden shadow-sm`}>
          {s.draft.blocks.length > 0 ? (
            <CmsPageRenderer blocks={s.draft.blocks} />
          ) : url ? (
            <iframe src={url} title="preview" className="w-full h-[70vh] border-0" />
          ) : (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Preview indisponível para este contexto.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
