// PublishWorkflow — publicação desacoplada da edição (Bloco 3 §4).
// Renderiza o painel de estados + ações. Não fecha a sessão de edição.
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, EyeOff, Archive, Undo2, ExternalLink, Loader2 } from "lucide-react";
import { useContentSession, type PublicationState } from "./session";

const WORKFLOW_STEPS: Array<{ state: PublicationState; label: string }> = [
  { state: "editing", label: "Editando" },
  { state: "saved", label: "Salvo" },
  { state: "ready_to_publish", label: "Pronto para publicar" },
  { state: "published", label: "Publicado" },
  { state: "updated", label: "Atualizado" },
  { state: "archived", label: "Arquivado" },
];

const STATE_STYLES: Record<PublicationState, string> = {
  editing: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  saved: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  ready_to_publish: "bg-primary/15 text-primary border-primary/30",
  published: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  updated: "bg-primary/15 text-primary border-primary/30",
  archived: "bg-muted text-muted-foreground border-foreground/10",
};

export function PublishWorkflow() {
  const s = useContentSession();
  const publicUrl = s.draft.slug ? `${s.descriptor.publicPathPrefix}${s.draft.slug}` : null;
  const isPublished = s.detail?.status === "published";
  const isArchived = s.draft.status === "archived";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Estado do workflow</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {WORKFLOW_STEPS.map((step) => (
            <Badge
              key={step.state}
              variant="outline"
              className={s.workflow === step.state ? STATE_STYLES[step.state] : "opacity-40"}
            >
              {step.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-foreground/10 p-4 space-y-3">
        <div className="text-sm font-medium">Publicação</div>
        <p className="text-sm text-muted-foreground">
          {s.workflow === "editing" && "Alterações em andamento — aguardando autosave."}
          {s.workflow === "saved" && "Rascunho salvo. Ainda não está no ar."}
          {s.workflow === "ready_to_publish" && "Rascunho pronto. Publique para tornar visível no site."}
          {s.workflow === "published" && "No ar sem alterações pendentes."}
          {s.workflow === "updated" && "Publicado + alterações rascunhadas. Publique para atualizar."}
          {s.workflow === "archived" && "Arquivado. Não aparece no site."}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {!isArchived && (
            <Button onClick={() => void s.publish()} disabled={s.publishing || s.isNew}>
              {s.publishing ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Rocket className="size-4 mr-1.5" />}
              {isPublished ? "Publicar alterações" : "Publicar agora"}
            </Button>
          )}
          {isPublished && !isArchived && (
            <Button variant="outline" onClick={() => void s.unpublish()} disabled={s.publishing}>
              <EyeOff className="size-4 mr-1.5" /> Despublicar
            </Button>
          )}
          {!isArchived && (
            <Button variant="outline" onClick={() => void s.archive()} disabled={s.publishing}>
              <Archive className="size-4 mr-1.5" /> Arquivar
            </Button>
          )}
          {isArchived && (
            <Button variant="outline" onClick={() => void s.restore()} disabled={s.publishing}>
              <Undo2 className="size-4 mr-1.5" /> Reabrir como rascunho
            </Button>
          )}
          {publicUrl && isPublished && (
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost"><ExternalLink className="size-4 mr-1.5" /> Ver no site</Button>
            </a>
          )}
        </div>
      </div>

      <div className="rounded-md border border-dashed border-foreground/10 p-4 text-xs text-muted-foreground">
        Agendamento e aprovação por revisor serão adicionados em blocos futuros.
        A arquitetura já suporta os estados <code>ready_to_publish</code> e <code>updated</code>.
      </div>
    </div>
  );
}
