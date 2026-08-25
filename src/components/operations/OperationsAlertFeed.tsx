import { BellRing, CircleCheck, Radio } from "lucide-react";
import type { OperationsRecord } from "./operations-read-model";

export function OperationsAlertFeed({ alerts }: { alerts: readonly OperationsRecord[] }) {
  const open = alerts.filter((alert) => alert.state === "open" || alert.state === "aberto");

  return (
    <aside
      className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-4 shadow-soft sm:p-5"
      aria-labelledby="operations-alerts-title"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-state-warning" aria-hidden="true" />
            <h2 id="operations-alerts-title" className="text-sm font-semibold text-foreground">
              Alertas operacionais
            </h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Sinais server-owned para acompanhamento, sem resolução ou comando no cliente.
          </p>
        </div>
        <span className="rounded-full bg-state-warning/10 px-2.5 py-1 text-xs font-semibold text-state-warning">
          {open.length} abertos
        </span>
      </div>

      <ul className="mt-4 space-y-2" aria-label="Sinais operacionais somente leitura">
        {alerts.length === 0 ? (
          <li className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-6 text-xs text-muted-foreground">
            <CircleCheck className="size-4 text-state-success" aria-hidden="true" />
            Nenhum alerta autorizado foi retornado.
          </li>
        ) : (
          alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex min-w-0 items-start gap-3 rounded-xl border border-border/80 bg-workspace-surface/55 px-3.5 py-3"
            >
              <Radio className="mt-0.5 size-3.5 shrink-0 text-state-warning" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">{alert.title}</p>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {alert.state}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/80">{alert.meta}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
