import type { ReactNode } from "react";
import { BadgeCheck, Building2, CircleOff, Mail, Phone, UserRound } from "lucide-react";
import type { BrokerDirectoryItem } from "./broker-team-directory-read-model";

export function BrokerProfileReadOnlyDetail({ broker }: { broker?: BrokerDirectoryItem }) {
  if (!broker) {
    return (
      <aside
        className="rounded-2xl border border-dashed border-border bg-workspace-elevated/60 p-5"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserRound className="size-4 text-primary" aria-hidden="true" />
          Perfil profissional
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Selecione um profissional do diretório para visualizar os dados autorizados em modo somente leitura.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft"
      aria-labelledby="broker-profile-heading"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary/10 text-base font-semibold text-primary">
          <span aria-hidden="true">{broker.initials}</span>
          {broker.photoUrl ? (
            <img
              src={broker.photoUrl}
              alt={`Foto profissional de ${broker.displayName}`}
              className="absolute inset-0 size-full object-cover"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Perfil somente leitura</p>
          <h2 id="broker-profile-heading" className="mt-1 truncate text-lg font-semibold text-foreground">
            {broker.displayName}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{broker.title}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 text-xs">
        <Detail icon={<BadgeCheck className="size-4" aria-hidden="true" />} label="Registro" value={broker.creci} />
        <Detail icon={<Building2 className="size-4" aria-hidden="true" />} label="Equipe" value={broker.teamName} />
        <Detail icon={<Mail className="size-4" aria-hidden="true" />} label="E-mail" value={broker.email} />
        <Detail icon={<Phone className="size-4" aria-hidden="true" />} label="Contato" value={broker.phone} />
      </div>

      <div className="mt-5 rounded-xl border border-border bg-background/55 p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Apresentação profissional</p>
        <p className="mt-2 text-xs leading-5 text-foreground/85">{broker.bio}</p>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-state-warning/25 bg-state-warning/10 p-3 text-[11px] leading-5 text-muted-foreground">
        <CircleOff className="mt-0.5 size-4 shrink-0 text-state-warning" aria-hidden="true" />
        <p>
          Convites, edição, envio de arquivos, atribuições, ativação e mudanças de acesso permanecem indisponíveis nesta superfície.
        </p>
      </div>
    </aside>
  );
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-background/55 p-3">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="mt-0.5 block break-words font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}
