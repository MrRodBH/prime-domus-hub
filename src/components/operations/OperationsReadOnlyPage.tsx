import { useNavigate } from "@tanstack/react-router";
import { CircleOff, Eye, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceState } from "@/components/workspace";
import { OperationsAlertFeed } from "./OperationsAlertFeed";
import { OperationsCollections } from "./OperationsCollections";
import { OperationsMetricGrid } from "./OperationsMetricGrid";
import { useOperationsReadModel } from "./hooks/useOperationsReadModel";
import type { OperationsSearch } from "./search-schema";

export function OperationsReadOnlyPage({ search }: { search: OperationsSearch }) {
  const navigate = useNavigate();
  const operations = useOperationsReadModel(search);

  function updateSearch(patch: Partial<OperationsSearch>) {
    navigate({
      to: "/admin/crm-operacoes",
      search: { ...search, ...patch },
      replace: true,
      resetScroll: false,
    });
  }

  if (operations.query.isPending) {
    return (
      <WorkspaceState
        kind="loading"
        title="Carregando centro operacional"
        description="Consultando as oito leituras autorizadas para o workspace selecionado."
      />
    );
  }

  if (operations.query.isError || !operations.model) {
    const kind = operations.errorKind ?? "error";
    return (
      <WorkspaceState
        kind={kind}
        title={
          kind === "denied"
            ? "Centro operacional não autorizado"
            : kind === "unavailable"
              ? "Centro operacional indisponível"
              : "Não foi possível carregar as operações"
        }
        description={
          kind === "denied"
            ? "O servidor não autorizou este read model para o perfil atual."
            : kind === "unavailable"
              ? "Selecione um workspace elegível; nenhuma autoridade foi inferida no cliente."
              : "A leitura falhou sem alterar qualquer dado. Tente novamente."
        }
        action={
          kind === "error" ? (
            <Button type="button" variant="outline" onClick={() => operations.query.refetch()}>
              Tentar novamente
            </Button>
          ) : undefined
        }
      />
    );
  }

  const model = operations.model;
  if (model.totalRecords === 0) {
    return (
      <WorkspaceState
        kind="empty"
        title="Centro operacional pronto"
        description="Nenhum registro autorizado foi retornado; as capacidades permanecem fail-closed."
      />
    );
  }

  return (
    <main
      className="mx-auto w-full max-w-[var(--workspace-content-max)] space-y-5 sm:space-y-6"
      data-operations-mode="complete-read-only"
    >
      <header className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft sm:p-6 lg:p-7">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_30%),linear-gradient(135deg,color-mix(in_oklab,var(--workspace-surface)_88%,transparent),transparent)]"
          aria-hidden="true"
        />
        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3" aria-hidden="true" />
                CRM Operational Center
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/65 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Eye className="size-3" aria-hidden="true" />
                Estritamente read-only
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Operação clara. Decisão segura.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Contatos, agenda, visitas, propostas, automações, SLAs e alertas reunidos em uma visão
              confiável, responsiva e governada pelo servidor.
            </p>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[27rem]">
            <div className="rounded-xl border border-border bg-background/70 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="size-4 text-state-success" aria-hidden="true" />
                Autoridade preservada
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {model.capabilityCount} capacidades · {model.timezone}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CircleOff className="size-4 text-state-warning" aria-hidden="true" />
                Operações indisponíveis
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                Comunicação, exportação e alterações permanecem desabilitadas.
              </p>
            </div>
          </div>
        </div>
      </header>

      <OperationsMetricGrid metrics={model.metrics} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.65fr)] xl:items-start">
        <OperationsCollections
          model={model}
          search={search}
          section={operations.section}
          visibleRecords={operations.visibleRecords}
          onSearchChange={updateSearch}
        />
        <OperationsAlertFeed alerts={model.alerts} />
      </div>
    </main>
  );
}
