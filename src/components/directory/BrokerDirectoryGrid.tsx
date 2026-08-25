import { BadgeCheck, Building2, Mail, Phone } from "lucide-react";
import type { BrokerDirectoryItem } from "./broker-team-directory-read-model";

export function BrokerDirectoryGrid({
  brokers,
  selectedId,
  onSelect,
}: {
  brokers: readonly BrokerDirectoryItem[];
  selectedId?: string;
  onSelect: (brokerId: string) => void;
}) {
  if (brokers.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border bg-workspace-elevated/60 p-8 text-center"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-foreground">Nenhum perfil corresponde aos filtros.</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Ajuste somente os filtros de apresentação; nenhum dado ou vínculo será alterado.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Diretório de corretores" className="min-w-0">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {brokers.map((broker) => {
          const selected = broker.id === selectedId;
          return (
            <button
              key={broker.id}
              type="button"
              aria-pressed={selected}
              aria-label={`Abrir perfil somente leitura de ${broker.displayName}`}
              onClick={() => onSelect(broker.id)}
              className={`group min-w-0 rounded-2xl border bg-workspace-elevated p-4 text-left shadow-soft transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${
                selected ? "border-primary/45 ring-1 ring-primary/20" : "border-border hover:border-primary/25"
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary/10 text-sm font-semibold text-primary">
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
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">{broker.displayName}</h2>
                      <p className="truncate text-xs text-muted-foreground">{broker.title}</p>
                    </div>
                    <span
                      className={`mt-0.5 size-2.5 shrink-0 rounded-full ${
                        broker.isActive ? "bg-state-success" : "bg-muted-foreground/45"
                      }`}
                      aria-label={broker.isActive ? "Registro ativo" : "Registro não ativo"}
                    />
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px] leading-5 text-muted-foreground">
                    <div className="flex min-w-0 items-center gap-2">
                      <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">{broker.creci}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{broker.teamName}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{broker.email}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{broker.phone}</span>
                    </div>
                  </div>

                  <div className="mt-3 inline-flex max-w-full rounded-full border border-border bg-background/65 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    <span className="truncate">{broker.status}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
