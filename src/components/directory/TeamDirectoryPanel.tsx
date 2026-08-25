import { UsersRound } from "lucide-react";
import type { TeamDirectoryItem } from "./broker-team-directory-read-model";

export function TeamDirectoryPanel({
  teams,
  activeTeam,
  onTeamChange,
}: {
  teams: readonly TeamDirectoryItem[];
  activeTeam?: string;
  onTeamChange: (teamId?: string) => void;
}) {
  return (
    <section
      className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5"
      aria-labelledby="team-directory-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UsersRound className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id="team-directory-heading" className="text-sm font-semibold text-foreground">
            Contexto de equipes
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Filtro local sobre vínculos já retornados pelo servidor. Nenhuma autoridade é criada no navegador.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2" role="group" aria-label="Filtro por equipe">
        <button
          type="button"
          aria-pressed={!activeTeam}
          onClick={() => onTeamChange(undefined)}
          className={`rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${
            !activeTeam ? "border-primary/40 bg-primary/10" : "border-border bg-background/55 hover:border-primary/25"
          }`}
        >
          <span className="text-xs font-semibold text-foreground">Todas as equipes</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">Exibir todo o diretório autorizado.</span>
        </button>

        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            aria-pressed={activeTeam === team.id}
            onClick={() => onTeamChange(team.id)}
            className={`min-w-0 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${
              activeTeam === team.id
                ? "border-primary/40 bg-primary/10"
                : "border-border bg-background/55 hover:border-primary/25"
            }`}
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <span className="truncate text-xs font-semibold text-foreground">{team.name}</span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {team.totalMembers} membro{team.totalMembers === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{team.description}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
              <span
                className={`size-2 rounded-full ${team.isActive ? "bg-state-success" : "bg-muted-foreground/45"}`}
                aria-hidden="true"
              />
              {team.isActive ? "Equipe ativa" : "Equipe não ativa"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
