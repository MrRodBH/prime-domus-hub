// PublishWorkflow universal (Bloco 3.1 §7). Workflow states vêm do descriptor.
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, EyeOff, Archive, Undo2, ExternalLink, Loader2 } from "lucide-react";
import { useContentSession } from "./session";
import type { PublicationState } from "./types";

const LABELS: Record<PublicationState, string> = {
  editing: "Editando",
  saved: "Salvo",
  ready_to_publish: "Pronto para publicar",
  published: "Publicado",
  updated: "Atualizado",
  scheduled: "Agendado",
  archived: "Arquivado",
};
const STATE_STYLES: Record<PublicationState, string> = {
  editing: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  saved: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  ready_to_publish: "bg-primary/15 text-primary border-primary/30",
  published: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  updated: "bg-primary/15 text-primary border-primary/30",
  scheduled: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  archived: "bg-muted text-muted-foreground border-foreground/10",
};

export function PublishWorkflow() {
  const s = useContentSession();
  const url = s.adapter.publicUrl ? s.adapter.publicUrl(s.detail, s.draft) : null;
  const isPublished = s.detail?.status === "published" || s.detail?.status === "active";
  const isArchived = s.draft.status === "archived";
  const supportsUnpublish = s.descriptor.supportedActions.includes("despublicar");
  const supportsArchive = s.descriptor.supportedActions.includes("arquivar");
  const supportsPublish = s.descriptor.supportedActions.includes("publicar");
  const steps = s.descriptor.workflowStates;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Estado do workflow</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {steps.map((state) => (
            <Badge key={state} variant="outline" className={s.workflow === state ? STATE_STYLES[state] : "opacity-40"}>
              {LABELS[state]}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-foreground/10 p-4 space-y-3">
        <div className="text-sm font-medium">Publicação</div>
        <p className="text-sm text-muted-foreground">
          {s.workflow === "editing" && "Alterações em andamento — aguardando autosave."}
          {s.workflow === "saved" && "Rascunho salvo. Ainda não está no ar."}
          {s.workflow === "ready_to_publish" && "Rascunho pronto. Publique para tornar visível."}
          {s.workflow === "published" && "No ar sem alterações pendentes."}
          {s.workflow === "updated" && "Publicado + alterações rascunhadas. Publique para atualizar."}
          {s.workflow === "scheduled" && "Agendado para publicação futura."}
          {s.workflow === "archived" && "Arquivado. Não aparece no site."}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {supportsPublish && !isArchived && (
            <Button onClick={() => void s.publish()} disabled={s.publishing || s.isNew}>
              {s.publishing ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Rocket className="size-4 mr-1.5" />}
              {isPublished ? "Publicar alterações" : "Publicar agora"}
            </Button>
          )}
          {supportsUnpublish && isPublished && !isArchived && (
            <Button variant="outline" onClick={() => void s.unpublish()} disabled={s.publishing}>
              <EyeOff className="size-4 mr-1.5" /> Despublicar
            </Button>
          )}
          {supportsArchive && !isArchived && (
            <Button variant="outline" onClick={() => void s.archive()} disabled={s.publishing}>
              <Archive className="size-4 mr-1.5" /> Arquivar
            </Button>
          )}
          {isArchived && (
            <Button variant="outline" onClick={() => void s.restore()} disabled={s.publishing}>
              <Undo2 className="size-4 mr-1.5" /> Reabrir como rascunho
            </Button>
          )}
          {url && isPublished && (
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="ghost"><ExternalLink className="size-4 mr-1.5" /> Ver no site</Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
