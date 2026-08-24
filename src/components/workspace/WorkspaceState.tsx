import type { ReactNode } from "react";
import {
  CircleOff,
  Inbox,
  LoaderCircle,
  ShieldX,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const WORKSPACE_STATE_KINDS = [
  "loading",
  "empty",
  "denied",
  "unavailable",
  "error",
] as const;

export type WorkspaceStateKind = (typeof WORKSPACE_STATE_KINDS)[number];

type WorkspaceStateDefinition = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: string;
  surface: string;
};

const DEFINITIONS: Record<WorkspaceStateKind, WorkspaceStateDefinition> = {
  loading: {
    icon: LoaderCircle,
    title: "Carregando informações",
    description: "Aguarde enquanto os dados autorizados são consultados.",
    tone: "text-state-info",
    surface: "bg-state-info/10",
  },
  empty: {
    icon: Inbox,
    title: "Nenhum dado disponível",
    description: "Ainda não existem registros para os filtros selecionados.",
    tone: "text-muted-foreground",
    surface: "bg-muted",
  },
  denied: {
    icon: ShieldX,
    title: "Acesso não autorizado",
    description: "Seu perfil não possui permissão para visualizar este conteúdo.",
    tone: "text-state-warning",
    surface: "bg-state-warning/10",
  },
  unavailable: {
    icon: CircleOff,
    title: "Funcionalidade indisponível",
    description: "Este recurso ainda não está habilitado para uso seguro.",
    tone: "text-state-warning",
    surface: "bg-state-warning/10",
  },
  error: {
    icon: TriangleAlert,
    title: "Não foi possível carregar",
    description: "Ocorreu uma falha ao consultar os dados. Tente novamente.",
    tone: "text-state-danger",
    surface: "bg-state-danger/10",
  },
};

export type WorkspaceStateProps = {
  kind: WorkspaceStateKind;
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function WorkspaceState({
  kind,
  title,
  description,
  action,
  compact = false,
  className,
}: WorkspaceStateProps) {
  const definition = DEFINITIONS[kind];
  const Icon = definition.icon;
  const isLoading = kind === "loading";
  const isAssertive = kind === "error";

  return (
    <section
      className={cn(
        "flex w-full items-center justify-center rounded-xl border border-border bg-workspace-elevated px-6 text-center shadow-soft",
        compact ? "min-h-48 py-8" : "min-h-[min(60vh,34rem)] py-12",
        className,
      )}
      data-workspace-state={kind}
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      aria-atomic="true"
      aria-busy={isLoading}
    >
      <div className="max-w-md space-y-4">
        <div
          className={cn(
            "mx-auto flex size-12 items-center justify-center rounded-full",
            definition.surface,
            definition.tone,
          )}
          aria-hidden="true"
        >
          <Icon className={cn("size-6", isLoading && "animate-spin")} strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">{title ?? definition.title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {description ?? definition.description}
          </p>
        </div>
        {action ? <div className="flex justify-center pt-1">{action}</div> : null}
      </div>
    </section>
  );
}
