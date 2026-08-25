import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceState } from "@/components/workspace";
import { BrokerDirectoryGrid } from "./BrokerDirectoryGrid";
import { BrokerProfileReadOnlyDetail } from "./BrokerProfileReadOnlyDetail";
import { TeamDirectoryPanel } from "./TeamDirectoryPanel";
import { useBrokerTeamDirectoryReadModel } from "./hooks/useBrokerTeamDirectoryReadModel";
import type { BrokerTeamDirectorySearch } from "./search-schema";

export function BrokerTeamDirectoryReadOnlyPage({
  search,
}: {
  search: BrokerTeamDirectorySearch;
}) {
  const navigate = useNavigate();
  const directory = useBrokerTeamDirectoryReadModel(search);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);

  function updateSearch(patch: Partial<BrokerTeamDirectorySearch>) {
    navigate({
      to: "/admin/corretores",
      search: { ...search, ...patch },
      replace: true,
      resetScroll: false,
    });
  }

  if (directory.query.isPending) {
    return (
      <WorkspaceState
        kind="loading"
        title="Carregando diretório profissional"
        description="Consultando corretores e equipes exclusivamente pelas leituras autorizadas do servidor."
      />
    );
  }

  if (directory.query.isError || !directory.model) {
    const kind = directory.errorKind ?? "error";
    return (
      <WorkspaceState
        kind={kind}
        title={
          kind === "denied"
            ? "Diretório não autorizado"
            : kind === "unavailable"
              ? "Diretório indisponível"
              : "Não foi possível carregar o diretório"
        }
        description={
          kind === "denied"
            ? "O servidor não autorizou este read model para o contexto atual."
            : kind === "unavailable"
              ? "Selecione um workspace elegível; nenhuma autoridade será inferida no navegador."
              : "A leitura falhou sem alterar qualquer dado. Tente novamente."
        }
        action={
          kind === "error" ? (
            <Button type="button" variant="outline" onClick={() => directory.query.refetch()}>
              Tentar novamente
            </Button>
          ) : undefined
        }
      />
    );
  }

  const model = directory.model;
  if (model.totalRecords === 0) {
    return (
      <WorkspaceState
        kind="empty"
        title="Diretório pronto para receber dados"
        description="Nenhum corretor ou equipe autorizado foi retornado; a superfície permanece fail-closed e somente leitura."
      />
    );
  }

  const selectedBroker =
    directory.visibleBrokers.find((broker) => broker.id === selectedBrokerId) ??
    directory.visibleBrokers[0];

  return (
    <main
      className="mx-auto w-full max-w-[var(--workspace-content-max)] space-y-5 sm:space-y-6"
      data-directory-mode="complete-read-only"
    >
      <header className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft sm:p-6 lg:p-7">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_16%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_30%),linear-gradient(135deg,color-mix(in_oklab,var(--workspace-surface)_90%,transparent),transparent)]"
          aria-hidden="true"
        />
        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3" aria-hidden="true" />
                Broker & Team Directory
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/65 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Eye className="size-3" aria-hidden="true" />
                Estritamente read-only
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Pessoas certas. Contexto confiável.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Perfis profissionais e equipes reunidos em uma experiência responsiva, com informações projetadas a partir de leituras server-owned e sem comandos de alteração.
            </p>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[28rem]">
            <div className="rounded-xl border border-border bg-background/70 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="size-4 text-state-success" aria-hidden="true" />
                Autoridade preservada
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                Tenant, papel, escopo e acesso permanecem exclusivamente server-owned.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <UsersRound className="size-4 text-primary" aria-hidden="true" />
                Contexto profissional
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {model.brokers.length} perfis · {model.teams.length} equipes
              </p>
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Métricas do diretório" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {model.metrics.map((metric) => (
          <div
            key={metric.key}
            className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft transition motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5" aria-label="Filtros de apresentação">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative min-w-0 flex-1 lg:max-w-xl">
            <span className="sr-only">Buscar no diretório</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search.q ?? ""}
              onChange={(event) => updateSearch({ q: event.target.value.trim() ? event.target.value : undefined })}
              placeholder="Buscar por nome, CRECI, contato ou equipe"
              className="pl-9"
              aria-label="Buscar no diretório"
            />
          </label>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Visualização do diretório">
            <Button
              type="button"
              size="sm"
              variant={directory.view === "directory" ? "default" : "outline"}
              aria-pressed={directory.view === "directory"}
              onClick={() => updateSearch({ view: "directory" })}
            >
              Diretório
            </Button>
            <Button
              type="button"
              size="sm"
              variant={directory.view === "teams" ? "default" : "outline"}
              aria-pressed={directory.view === "teams"}
              onClick={() => updateSearch({ view: "teams" })}
            >
              Equipes
            </Button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground" aria-live="polite">
          {directory.visibleBrokers.length} de {model.brokers.length} profissionais visíveis nos filtros atuais.
        </p>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.65fr)] xl:items-start">
        <div className="min-w-0 space-y-4">
          {directory.view === "teams" ? (
            <TeamDirectoryPanel
              teams={model.teams}
              activeTeam={search.team}
              onTeamChange={(team) => updateSearch({ team })}
            />
          ) : null}

          <BrokerDirectoryGrid
            brokers={directory.visibleBrokers}
            selectedId={selectedBroker?.id}
            onSelect={setSelectedBrokerId}
          />
        </div>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-4">
          {directory.view === "directory" ? (
            <TeamDirectoryPanel
              teams={model.teams}
              activeTeam={search.team}
              onTeamChange={(team) => updateSearch({ team })}
            />
          ) : null}
          <BrokerProfileReadOnlyDetail broker={selectedBroker} />
        </div>
      </div>
    </main>
  );
}
